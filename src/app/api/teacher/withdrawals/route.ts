import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL, APP_NAME } from "@/lib/resend";

// GET /api/teacher/withdrawals – List teacher's withdrawals
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "PROFESOR" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const teacherProfile = await db.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!teacherProfile) {
      return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 404 });
    }

    const withdrawals = await db.teacherWithdrawal.findMany({
      where: { teacherProfileId: teacherProfile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      withdrawals,
      balance: teacherProfile.balance,
      minimumPayout: teacherProfile.minimumPayout,
    });
  } catch (err) {
    console.error("[GET_WITHDRAWALS]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST /api/teacher/withdrawals – Request a withdrawal
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "PROFESOR" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const teacherProfile = await db.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!teacherProfile) {
      return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 404 });
    }

    const { amount, method, details } = await req.json() as {
      amount: number;
      method: string;
      details?: Record<string, unknown>;
    };

    if (!amount || !method) {
      return NextResponse.json({ error: "amount y method son requeridos" }, { status: 400 });
    }

    // Validate minimum payout
    if (teacherProfile.balance < teacherProfile.minimumPayout) {
      return NextResponse.json(
        {
          error: `El saldo mínimo para retirar es ${teacherProfile.minimumPayout} USD. Tu saldo actual es ${teacherProfile.balance.toFixed(2)} USD.`,
        },
        { status: 400 }
      );
    }

    if (amount > teacherProfile.balance) {
      return NextResponse.json(
        { error: "El monto solicitado supera tu saldo disponible" },
        { status: 400 }
      );
    }

    if (amount < teacherProfile.minimumPayout) {
      return NextResponse.json(
        { error: `El monto mínimo de retiro es ${teacherProfile.minimumPayout} USD` },
        { status: 400 }
      );
    }

    // Create withdrawal and deduct balance atomically
    const [withdrawal] = await db.$transaction([
      db.teacherWithdrawal.create({
        data: {
          teacherProfileId: teacherProfile.id,
          userId: session.user.id,
          amount,
          currency: "USD",
          status: "PENDING",
          method,
          details: (details ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
        },
      }),
      db.teacherProfile.update({
        where: { id: teacherProfile.id },
        data: { balance: { decrement: amount } },
      }),
    ]);

    // Notify Superadmin
    const superadmin = await db.user.findFirst({
      where: { role: "SUPERADMIN" },
      select: { email: true, name: true },
    });

    const teacher = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    if (superadmin?.email) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: superadmin.email,
        subject: `[${APP_NAME}] Nueva solicitud de retiro`,
        html: `
          <h2>Nueva solicitud de retiro</h2>
          <p><strong>Profesor:</strong> ${teacher?.name ?? "N/A"} (${teacher?.email ?? "N/A"})</p>
          <p><strong>Monto:</strong> $${amount.toFixed(2)} USD</p>
          <p><strong>Método:</strong> ${method}</p>
          <p><strong>ID de retiro:</strong> ${withdrawal.id}</p>
          <p>Por favor procesá esta solicitud en el panel de administración.</p>
        `,
      });
    }

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (err) {
    console.error("[CREATE_WITHDRAWAL]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
