import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getTeacher(userId: string) {
  return db.teacherProfile.findUnique({ where: { userId } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const teacher = await getTeacher(session.user.id);
  if (!teacher) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const course = await db.course.findFirst({ where: { id: courseId, teacherProfileId: teacher.id } });
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const count = await db.module.count({ where: { courseId } });

  const module = await db.module.create({
    data: {
      courseId,
      title: body.title ?? "Nuevo módulo",
      order: count + 1,
    },
  });

  return NextResponse.json({ module }, { status: 201 });
}
