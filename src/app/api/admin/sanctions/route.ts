import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const sanctions = await db.sanction.findMany({
    where: userId ? { userId } : {},
    include: {
      user: { select: { id: true, name: true, email: true } },
      issuedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ sanctions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, type, reason, expiresAt } = body;

  if (!userId || !type || !reason) {
    return NextResponse.json({ error: "Usuario, tipo y razón son requeridos" }, { status: 400 });
  }

  const sanction = await db.sanction.create({
    data: {
      userId,
      type,
      reason,
      issuedById: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: `SANCTION_${type}`,
      entityType: "User",
      entityId: userId,
      details: { reason },
    },
  });

  await createNotification({ userId, type: "COURSE_REMINDER" as import("@prisma/client").NotificationType, title: "Sanción recibida", body: `Tu cuenta ha recibido una sanción: ${reason}` });

  return NextResponse.json({ sanction }, { status: 201 });
}
