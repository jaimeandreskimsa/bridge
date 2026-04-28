import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { resend, FROM_EMAIL, APP_NAME } from "@/lib/resend";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Sin firma" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Firma inválida", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { paymentId, courseId, userId, couponCode } = session.metadata ?? {};

        if (!paymentId || !courseId || !userId) break;

        // Fetch payment and course
        const [payment, course] = await Promise.all([
          db.payment.findUnique({ where: { id: paymentId } }),
          db.course.findUnique({
            where: { id: courseId },
            include: {
              teacherProfile: { select: { id: true, commissionRate: true } },
            },
          }),
        ]);

        if (!payment || !course) break;

        const commissionPct = course.teacherProfile?.commissionRate ?? payment.commissionPct;
        const platformRevenue = payment.amount * commissionPct;
        const teacherRevenue = payment.amount - platformRevenue;

        // Update Payment to COMPLETED
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: "COMPLETED",
            gatewayRef: session.id,
            platformRevenue,
            teacherRevenue,
            gatewayData: session as object,
          },
        });

        // Create or reactivate Enrollment
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

        // Increment teacher balance and totalRevenue
        if (course.teacherProfile) {
          await db.teacherProfile.update({
            where: { id: course.teacherProfile.id },
            data: {
              balance: { increment: teacherRevenue },
              totalRevenue: { increment: teacherRevenue },
            },
          });
        }

        // Increment coupon usedCount if applied
        if (couponCode) {
          await db.coupon.updateMany({
            where: { code: couponCode },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Increment course student count
        await db.course.update({
          where: { id: courseId },
          data: { totalStudents: { increment: 1 } },
        });

        // Send confirmation email
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });
        if (user?.email) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: `Confirmación de compra – ${APP_NAME}`,
            html: `
              <h2>¡Gracias por tu compra, ${user.name ?? "alumno"}!</h2>
              <p>Tu inscripción al curso <strong>${course.title}</strong> fue confirmada.</p>
              <p>Monto pagado: <strong>$${payment.amount.toFixed(2)} USD</strong></p>
              <p><a href="${process.env.NEXTAUTH_URL}/cursos/${courseId}">Ir al curso →</a></p>
            `,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "canceled", cancelAtPeriodEnd: false },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const sub = invoice.subscription;
        const subId = typeof sub === "string" ? sub : (sub as Stripe.Subscription | null)?.id;

        if (!subId) break;

        // Find related subscription and mark payment failed
        const subscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subId },
        });

        if (subscription) {
          // Find latest pending payment for this user
          const pendingPayment = await db.payment.findFirst({
            where: { userId: subscription.userId, status: "PENDING" },
            orderBy: { createdAt: "desc" },
          });
          if (pendingPayment) {
            await db.payment.update({
              where: { id: pendingPayment.id },
              data: { status: "FAILED" },
            });
          }

          // Notify user
          const user = await db.user.findUnique({
            where: { id: subscription.userId },
            select: { email: true, name: true },
          });
          if (user?.email) {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: user.email,
              subject: `Problema con tu pago – ${APP_NAME}`,
              html: `
                <h2>Hola ${user.name ?? ""},</h2>
                <p>No pudimos procesar el pago de tu suscripción.</p>
                <p>Por favor actualizá tu método de pago para continuar accediendo a tus cursos.</p>
                <p><a href="${process.env.NEXTAUTH_URL}/mis-compras">Gestionar suscripción →</a></p>
              `,
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Error procesando evento", event.type, err);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
