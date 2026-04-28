import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId, moduleId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const course = await db.course.findFirst({ where: { id: courseId, teacherProfileId: teacher.id } });
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const count = await db.lesson.count({ where: { moduleId } });

  const lesson = await db.lesson.create({
    data: {
      moduleId,
      title: body.title ?? "Nueva lección",
      description: body.description ?? null,
      type: body.type ?? "VIDEO",
      isPreview: body.isPreview ?? false,
      order: count + 1,
      muxAssetId: body.muxAssetId ?? null,
      muxPlaybackId: body.muxPlaybackId ?? null,
      content: body.content ?? null,
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
