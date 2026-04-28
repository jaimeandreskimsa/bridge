import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

// GET /api/admin/coupons – List all coupons
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const coupons = await db.coupon.findMany({
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ coupons });
  } catch (err) {
    console.error("[GET_ADMIN_COUPONS]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST /api/admin/coupons – Create a global coupon
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json() as {
      code: string;
      type: "PERCENTAGE" | "FIXED_AMOUNT";
      value: number;
      maxUses?: number;
      expiresAt?: string;
      courseId?: string;
      isGlobal?: boolean;
    };

    const { code, type, value, maxUses, expiresAt, courseId, isGlobal } = body;

    if (!code || !type || value === undefined || value === null) {
      return NextResponse.json({ error: "code, type y value son requeridos" }, { status: 400 });
    }

    if (!["PERCENTAGE", "FIXED_AMOUNT"].includes(type)) {
      return NextResponse.json({ error: "Tipo de cupón inválido" }, { status: 400 });
    }

    if (type === "PERCENTAGE" && (value <= 0 || value > 100)) {
      return NextResponse.json({ error: "El porcentaje debe estar entre 1 y 100" }, { status: 400 });
    }

    // Check code uniqueness
    const existing = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        courseId: courseId ?? null,
        isGlobal: isGlobal ?? !courseId,
        createdById: session.user.id,
        isActive: true,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    console.error("[CREATE_ADMIN_COUPON]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons – Deactivate a coupon
// Body: { couponId }
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { couponId } = await req.json() as { couponId: string };
    if (!couponId) {
      return NextResponse.json({ error: "couponId es requerido" }, { status: 400 });
    }

    const coupon = await db.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });
    }

    const updated = await db.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });

    return NextResponse.json({ coupon: updated });
  } catch (err) {
    console.error("[DELETE_ADMIN_COUPON]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
