import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const DEFAULT_COMMISSION = 0.25;
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { courseId, couponCode, priceType } = body as {
      courseId: string;
      couponCode?: string;
      priceType: "one_time" | "subscription";
    };

    if (!courseId) {
      return NextResponse.json({ error: "courseId es requerido" }, { status: 400 });
    }

    // Check course exists and is published
    const course = await db.course.findFirst({
      where: { id: courseId, status: "PUBLISHED" },
      include: {
        teacherProfile: {
          select: { id: true, commissionRate: true, userId: true },
        },
      },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    // Verify user is not already enrolled
    const existingEnrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment?.isActive) {
      return NextResponse.json({ error: "Ya estás inscripto en este curso" }, { status: 409 });
    }

    // Calculate price
    let finalPrice = course.price ?? 0;
    let appliedCoupon: { id: string; type: string; value: number } | null = null;

    if (couponCode) {
      const coupon = await db.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          OR: [{ courseId }, { isGlobal: true }],
        },
      });

      if (!coupon) {
        return NextResponse.json({ error: "Cupón inválido o no aplicable a este curso" }, { status: 400 });
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return NextResponse.json({ error: "El cupón ha expirado" }, { status: 400 });
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "El cupón ha alcanzado el límite de usos" }, { status: 400 });
      }

      if (coupon.type === "PERCENTAGE") {
        finalPrice = finalPrice * (1 - coupon.value / 100);
      } else {
        finalPrice = Math.max(0, finalPrice - coupon.value);
      }
      appliedCoupon = { id: coupon.id, type: coupon.type, value: coupon.value };
    }

    const commissionPct = course.teacherProfile?.commissionRate ?? DEFAULT_COMMISSION;

    // Create Payment record
    const payment = await db.payment.create({
      data: {
        userId,
        amount: finalPrice,
        currency: "USD",
        status: "PENDING",
        gateway: "STRIPE",
        commissionPct,
        description: `Compra: ${course.title}`,
      },
    });

    // Determine Stripe mode
    const mode = priceType === "subscription" ? "subscription" : "payment";

    const priceData =
      mode === "subscription"
        ? {
            currency: "usd",
            product_data: { name: course.title },
            unit_amount: Math.round(finalPrice * 100),
            recurring: { interval: "month" as const },
          }
        : {
            currency: "usd",
            product_data: { name: course.title },
            unit_amount: Math.round(finalPrice * 100),
          };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price_data: priceData, quantity: 1 }],
      metadata: {
        courseId,
        userId,
        paymentId: payment.id,
        couponCode: couponCode ?? "",
      },
      success_url: `${APP_URL}/mis-compras?success=1&paymentId=${payment.id}`,
      cancel_url: `${APP_URL}/cursos/${courseId}?canceled=1`,
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (err) {
    console.error("[STRIPE_CHECKOUT]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
