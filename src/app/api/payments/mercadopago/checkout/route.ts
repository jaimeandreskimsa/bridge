import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MP_API = "https://api.mercadopago.com";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const DEFAULT_COMMISSION = 0.25;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { courseId, couponCode } = body as {
      courseId: string;
      couponCode?: string;
    };

    if (!courseId) {
      return NextResponse.json({ error: "courseId es requerido" }, { status: 400 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 500 });
    }

    // Get course
    const course = await db.course.findFirst({
      where: { id: courseId, status: "PUBLISHED" },
      include: {
        teacherProfile: { select: { commissionRate: true } },
      },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    // Verify not already enrolled
    const existing = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing?.isActive) {
      return NextResponse.json({ error: "Ya estás inscripto en este curso" }, { status: 409 });
    }

    // Apply coupon if provided
    let finalPrice = course.price ?? 0;
    if (couponCode) {
      const coupon = await db.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          OR: [{ courseId }, { isGlobal: true }],
        },
      });
      if (coupon) {
        if (!coupon.expiresAt || coupon.expiresAt >= new Date()) {
          if (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) {
            if (coupon.type === "PERCENTAGE") {
              finalPrice = finalPrice * (1 - coupon.value / 100);
            } else {
              finalPrice = Math.max(0, finalPrice - coupon.value);
            }
          }
        }
      }
    }

    const commissionPct = course.teacherProfile?.commissionRate ?? DEFAULT_COMMISSION;

    // Create Payment record in DB
    const payment = await db.payment.create({
      data: {
        userId,
        amount: finalPrice,
        currency: "ARS",
        status: "PENDING",
        gateway: "MERCADOPAGO",
        commissionPct,
        description: `Compra: ${course.title}`,
      },
    });

    // Build MercadoPago preference
    const preference = {
      items: [
        {
          id: courseId,
          title: course.title,
          description: course.description.slice(0, 255),
          quantity: 1,
          currency_id: "ARS",
          unit_price: Math.max(1, Math.round(finalPrice)),
        },
      ],
      back_urls: {
        success: `${APP_URL}/mis-compras?success=1&gateway=mp&paymentId=${payment.id}`,
        failure: `${APP_URL}/cursos/${courseId}?canceled=1&gateway=mp`,
        pending: `${APP_URL}/mis-compras?pending=1&gateway=mp&paymentId=${payment.id}`,
      },
      auto_return: "approved",
      external_reference: payment.id,
      metadata: {
        courseId,
        userId,
        paymentId: payment.id,
        couponCode: couponCode ?? "",
      },
      notification_url: `${APP_URL}/api/payments/mercadopago/webhook`,
    };

    const mpRes = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const errData = await mpRes.json().catch(() => ({}));
      console.error("[MP_CHECKOUT]", errData);
      return NextResponse.json({ error: "Error creando preferencia en MercadoPago" }, { status: 502 });
    }

    const mpData = await mpRes.json();

    return NextResponse.json({ initPoint: mpData.init_point });
  } catch (err) {
    console.error("[MP_CHECKOUT]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
