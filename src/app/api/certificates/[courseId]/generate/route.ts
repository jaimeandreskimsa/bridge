import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

function generateCode(): string {
  return randomBytes(9).toString("base64url").toUpperCase().slice(0, 12);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    include: {
      course: {
        include: {
          teacherProfile: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!enrollment) return NextResponse.json({ error: "No inscrito en este curso" }, { status: 403 });

  const lessonCount = await db.lesson.count({ where: { module: { courseId } } });
  const completedLessons = await db.progress.count({
    where: { userId: session.user.id, lesson: { module: { courseId } }, completed: true },
  });
  if (lessonCount === 0 || completedLessons < lessonCount) {
    return NextResponse.json({ error: "Curso no completado" }, { status: 400 });
  }

  const existing = await db.certificate.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (existing) return NextResponse.json({ certificate: existing });

  const verificationCode = generateCode();

  const certificate = await db.certificate.create({
    data: {
      userId: session.user.id,
      courseId,
      verificationCode,
      issuedAt: new Date(),
    },
  });

  return NextResponse.json({ certificate }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { courseId } = await params;

  const certificate = await db.certificate.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    include: {
      course: { select: { title: true, level: true } },
      user: { select: { name: true } },
    },
  });

  if (!certificate) return NextResponse.json({ certificate: null });
  return NextResponse.json({ certificate });
}
