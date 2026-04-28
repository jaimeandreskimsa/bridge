import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; action: string }> }
) {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN", "MODERADOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { requestId, action } = await params;
  const { feedback } = await req.json();

  const request = await db.teacherRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (action === "approve") {
    await db.$transaction(async (tx) => {
      await tx.teacherRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedBy: session.user.id, reviewedAt: new Date(), feedback },
      });
      await tx.user.update({ where: { id: request.userId }, data: { role: "PROFESOR" } });
      await tx.teacherProfile.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId, bio: request.bio, experience: request.experience },
        update: { bio: request.bio, experience: request.experience, verifiedAt: new Date() },
      });
    });
    await createNotification({
      userId: request.userId,
      type: "TEACHER_REQUEST_STATUS",
      title: "¡Tu solicitud fue aprobada!",
      body: "Ya puedes subir cursos como Profesor en Bridge Academy.",
      link: "/profesor/dashboard",
    });
    return NextResponse.json({ success: true, action: "approved" });
  }

  if (action === "reject") {
    await db.teacherRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedBy: session.user.id, reviewedAt: new Date(), feedback },
    });
    await createNotification({
      userId: request.userId,
      type: "TEACHER_REQUEST_STATUS",
      title: "Tu solicitud fue rechazada",
      body: feedback ?? "No cumplió los requisitos en esta oportunidad.",
      link: "/perfil/solicitar-profesor",
    });
    return NextResponse.json({ success: true, action: "rejected" });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
