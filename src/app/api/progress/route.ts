import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { lessonId, watchedSeconds, watchedPct, forceComplete } = body;

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });

  const shouldComplete = forceComplete === true || (watchedPct != null && watchedPct >= 85);
  const shouldUncomplete = forceComplete === false;

  const progress = await db.progress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    update: {
      watchedSeconds: watchedSeconds ?? undefined,
      watchedPct: watchedPct ?? undefined,
      completed: shouldComplete ? true : shouldUncomplete ? false : undefined,
      lastWatchedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      lessonId,
      watchedSeconds: watchedSeconds ?? 0,
      watchedPct: watchedPct ?? 0,
      completed: shouldComplete,
      lastWatchedAt: new Date(),
    },
  });

  return NextResponse.json({ progress });
}
