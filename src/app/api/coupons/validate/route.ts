import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { code, courseId } = await req.json() as {
      code: string;
      courseId: string;
    };

    if (!code || !courseId) {
      return NextResponse.json({ error: "code y courseId son requeridos" }, { status: 400 });
    }

    // Get course price for calculating final price
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { price: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    const coupon = await db.coupon.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        isActive: true,
      },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Cupón no encontrado o inactivo" });
    }

    // Validate expiry
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, message: "El cupón ha expirado" });
    }

    // Validate max uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: "El cupón ha alcanzado el límite de usos" });
    }

    // Validate applies to this course (course-specific or global)
    if (!coupon.isGlobal && coupon.courseId !== courseId) {
      return NextResponse.json({ valid: false, message: "Este cupón no aplica al curso seleccionado" });
    }

    // Calculate discount and final price
    const originalPrice = course.price ?? 0;
    let discount = 0;
    let finalPrice = originalPrice;

    if (coupon.type === "PERCENTAGE") {
      discount = originalPrice * (coupon.value / 100);
      finalPrice = originalPrice - discount;
    } else {
      // FIXED_AMOUNT
      discount = Math.min(coupon.value, originalPrice);
      finalPrice = Math.max(0, originalPrice - coupon.value);
    }

    return NextResponse.json({
      valid: true,
      discount,
      finalPrice,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        expiresAt: coupon.expiresAt,
      },
    });
  } catch (err) {
    console.error("[VALIDATE_COUPON]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
