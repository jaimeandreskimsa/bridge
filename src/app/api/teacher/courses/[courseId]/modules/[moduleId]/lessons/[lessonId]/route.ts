import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId, lessonId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const course = await db.course.findFirst({ where: { id: courseId, teacherProfileId: teacher.id } });
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: body.title,
      description: body.description,
      isPreview: body.isPreview,
      content: body.content,
      muxAssetId: body.muxAssetId,
      muxPlaybackId: body.muxPlaybackId,
    },
  });

  return NextResponse.json({ lesson });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId, lessonId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const course = await db.course.findFirst({ where: { id: courseId, teacherProfileId: teacher.id } });
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.lesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ success: true });
}
