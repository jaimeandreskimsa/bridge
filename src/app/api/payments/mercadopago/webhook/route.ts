import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL, APP_NAME } from "@/lib/resend";

const MP_API = "https://api.mercadopago.com";

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 500 });
    }

    // MercadoPago sends IPN as query params or JSON body
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic") ?? searchParams.get("type");
    const resourceId = searchParams.get("id");

    // Also try reading body for newer webhook format
    let mpPaymentId: string | null = resourceId;
    if (!mpPaymentId) {
      try {
        const body = await req.json();
        mpPaymentId = body?.data?.id ?? body?.id ?? null;
      } catch {
        // ignore
      }
    }

    if (!mpPaymentId || (topic && topic !== "payment")) {
      return NextResponse.json({ received: true });
    }

    // Query MercadoPago API for payment status
    const mpRes = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) {
      console.error("[MP_WEBHOOK] Error consultando pago MP", mpPaymentId);
      return NextResponse.json({ error: "No se pudo consultar el pago" }, { status: 502 });
    }

    const mpPayment = await mpRes.json();
    const { status, external_reference, metadata } = mpPayment;

    // external_reference is our internal paymentId
    const paymentId = external_reference ?? metadata?.paymentId;
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return NextResponse.json({ received: true });
    }

    if (status === "approved" && payment.status !== "COMPLETED") {
      const courseId = metadata?.courseId;
      const userId = metadata?.userId ?? payment.userId;
      const couponCode = metadata?.couponCode;

      const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
          teacherProfile: { select: { id: true, commissionRate: true } },
        },
      });

      const commissionPct = course?.teacherProfile?.commissionRate ?? payment.commissionPct;
      const platformRevenue = payment.amount * commissionPct;
      const teacherRevenue = payment.amount - platformRevenue;

      // Update payment
      await db.payment.update({
        where: { id: paymentId },
        data: {
          status: "COMPLETED",
          gatewayRef: String(mpPaymentId),
          platformRevenue,
          teacherRevenue,
          gatewayData: mpPayment,
        },
      });

      // Create or reactivate enrollment
      if (courseId) {
        await db.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          create: {
            userId,
            courseId,
            pricePaid: payment.amount,
            paymentId,
            isActive: true,
          },
          update: {
            isActive: true,
            paymentId,
            pricePaid: payment.amount,
            purchasedAt: new Date(),
          },
        });

        // Increment teacher balance
        if (course?.teacherProfile) {
          await db.teacherProfile.update({
            where: { id: course.teacherProfile.id },
            data: {
              balance: { increment: teacherRevenue },
              totalRevenue: { increment: teacherRevenue },
            },
          });
        }

        // Increment course student count
        await db.course.update({
          where: { id: courseId },
          data: { totalStudents: { increment: 1 } },
        });

        // Increment coupon usedCount
        if (couponCode) {
          await db.coupon.updateMany({
            where: { code: couponCode },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // Send confirmation email
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (user?.email && course) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: `Confirmación de compra – ${APP_NAME}`,
          html: `
            <h2>¡Gracias por tu compra, ${user.name ?? "alumno"}!</h2>
            <p>Tu inscripción al curso <strong>${course.title}</strong> fue confirmada mediante MercadoPago.</p>
            <p>Monto pagado: <strong>$${payment.amount.toFixed(2)} ARS</strong></p>
            <p><a href="${process.env.NEXTAUTH_URL}/cursos/${courseId}">Ir al curso →</a></p>
          `,
        });
      }
    } else if (status === "rejected" || status === "cancelled") {
      await db.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED", gatewayData: mpPayment },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[MP_WEBHOOK]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
