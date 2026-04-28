import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN", "MODERADOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { userId } = await params;
  const body = await req.json();

  const updateData: Record<string, string> = {};
  if (body.role) updateData.role = body.role;
  if (body.status) updateData.status = body.status;

  const user = await db.user.update({ where: { id: userId }, data: updateData });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: userId,
      details: body,
    },
  });

  return NextResponse.json({ user });
}
