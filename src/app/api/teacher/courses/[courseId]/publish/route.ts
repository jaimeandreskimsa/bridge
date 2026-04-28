import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const course = await db.course.findFirst({
    where: { id: courseId, teacherProfileId: teacher.id },
  });
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const lessonCount = await db.lesson.count({ where: { module: { courseId } } });
  if (lessonCount === 0) {
    return NextResponse.json({ error: "El curso debe tener al menos una lección" }, { status: 400 });
  }

  const updated = await db.course.update({
    where: { id: courseId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  return NextResponse.json({ course: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const course = await db.course.findFirst({ where: { id: courseId, teacherProfileId: teacher.id } });
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await db.course.update({
    where: { id: courseId },
    data: { status: "DRAFT" },
  });

  return NextResponse.json({ course: updated });
}
