import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { courseId } = await params;
  const userId = session.user.id;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              duration: true,
              type: true,
            },
          },
        },
      },
      enrollments: {
        where: { isActive: true },
        select: { userId: true },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));

  const progressRecords = await db.progress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
    select: {
      lessonId: true,
      completed: true,
      watchedPct: true,
      lastWatchedAt: true,
      watchedSeconds: true,
    },
  });

  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  const completedCount = progressRecords.filter((p) => p.completed).length;
  const totalCount = allLessonIds.length;
  const overallPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Last video watched
  let lastWatchedLessonId: string | null = null;
  let lastWatchedAt: Date | null = null;
  for (const p of progressRecords) {
    if (p.lastWatchedAt && (!lastWatchedAt || p.lastWatchedAt > lastWatchedAt)) {
      lastWatchedAt = p.lastWatchedAt;
      lastWatchedLessonId = p.lessonId;
    }
  }

  // Ranking in course
  const allEnrolledUserIds = course.enrollments.map((e) => e.userId);
  const allProgress = await db.progress.groupBy({
    by: ["userId"],
    where: {
      userId: { in: allEnrolledUserIds },
      lessonId: { in: allLessonIds },
      completed: true,
    },
    _count: { lessonId: true },
  });

  const usersAhead = allProgress.filter(
    (p) => p.userId !== userId && p._count.lessonId > completedCount
  ).length;
  const rank = usersAhead + 1;

  // Build detailed lesson progress
  const lessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => {
      const p = progressMap.get(l.id);
      return {
        lessonId: l.id,
        title: l.title,
        moduleOrder: m.order,
        order: l.order,
        duration: l.duration,
        type: l.type,
        completed: p?.completed ?? false,
        watchedPct: p?.watchedPct ?? 0,
        lastWatchedAt: p?.lastWatchedAt ?? null,
        watchedSeconds: p?.watchedSeconds ?? 0,
        isLastWatched: l.id === lastWatchedLessonId,
      };
    })
  );

  return NextResponse.json({
    courseId,
    enrolled: !!enrollment,
    overallPct,
    completedCount,
    totalCount,
    lastWatchedLessonId,
    lastWatchedAt,
    rank,
    totalEnrolled: allEnrolledUserIds.length,
    lessons,
  });
}
