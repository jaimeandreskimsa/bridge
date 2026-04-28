import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedCourse(courseId: string, userId: string) {
  const teacher = await db.teacherProfile.findUnique({ where: { userId } });
  if (!teacher) return null;
  return db.course.findFirst({
    where: { id: courseId, teacherProfileId: teacher.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const course = await getOwnedCourse(courseId, session.user.id);
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ course });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const course = await getOwnedCourse(courseId, session.user.id);
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();

  const updated = await db.course.update({
    where: { id: courseId },
    data: {
      title: body.title ?? course.title,
      description: body.description ?? course.description,
      level: body.level ?? course.level,
      priceModel: body.priceModel ?? course.priceModel,
      price: body.price !== undefined ? body.price : course.price,
      thumbnail: body.thumbnail ?? course.thumbnail,
      tags: body.tags ?? course.tags,
    },
  });

  return NextResponse.json({ course: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const course = await getOwnedCourse(courseId, session.user.id);
  if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (course.status === "PUBLISHED") {
    return NextResponse.json({ error: "No puedes eliminar un curso publicado" }, { status: 400 });
  }

  await db.course.delete({ where: { id: courseId } });
  return NextResponse.json({ success: true });
}
