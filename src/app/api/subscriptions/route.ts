import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// GET /api/subscriptions – List active subscriptions
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const subscriptions = await db.subscription.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["active", "trialing", "paused"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[GET_SUBSCRIPTIONS]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/subscriptions – Cancel subscription (cancel at period end)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId es requerido" }, { status: 400 });
    }

    const subscription = await db.subscription.findFirst({
      where: { id: subscriptionId, userId: session.user.id },
    });
    if (!subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    // Cancel in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({ subscription: updated });
  } catch (err) {
    console.error("[CANCEL_SUBSCRIPTION]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST /api/subscriptions – Pause subscription (up to 3 months)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { subscriptionId, pauseMonths } = await req.json() as {
      subscriptionId: string;
      pauseMonths?: number;
    };

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId es requerido" }, { status: 400 });
    }

    const months = Math.min(Math.max(pauseMonths ?? 1, 1), 3);
    const pausedUntil = new Date();
    pausedUntil.setMonth(pausedUntil.getMonth() + months);

    const subscription = await db.subscription.findFirst({
      where: { id: subscriptionId, userId: session.user.id },
    });
    if (!subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    // Pause in Stripe using pause_collection
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: {
          behavior: "void",
          resumes_at: Math.floor(pausedUntil.getTime() / 1000),
        },
      });
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: { pausedUntil, status: "paused" },
    });

    return NextResponse.json({ subscription: updated });
  } catch (err) {
    console.error("[PAUSE_SUBSCRIPTION]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
