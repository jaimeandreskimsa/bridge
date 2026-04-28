import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ProgressBar } from "@/components/progress/progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, levelLabel, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  Lock,
  ArrowLeft,
  BookOpen,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

async function getCourseProgress(courseId: string, userId: string) {
  const [enrollment, course, following] = await Promise.all([
    db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }),
    db.course.findUnique({
      where: { id: courseId },
      include: {
        teacherProfile: { include: { user: { select: { id: true, name: true, image: true } } } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                duration: true,
                order: true,
                type: true,
                isPreview: true,
              },
            },
          },
        },
        enrollments: {
          where: { isActive: true },
          select: { userId: true },
        },
      },
    }),
    // Get users this person follows, to find shared course companions
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
  ]);

  if (!course) return null;

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));

  // Get user's progress
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

  // Find last watched lesson
  let lastWatchedLessonId: string | null = null;
  let lastWatchedAt: Date | null = null;
  for (const p of progressRecords) {
    if (p.lastWatchedAt && (!lastWatchedAt || p.lastWatchedAt > lastWatchedAt)) {
      lastWatchedAt = p.lastWatchedAt;
      lastWatchedLessonId = p.lessonId;
    }
  }

  // Course ranking: get all enrolled users' completion counts
  const allEnrolledUserIds = course.enrollments.map((e) => e.userId);

  // Get completion counts for all enrolled users
  const allProgress = await db.progress.groupBy({
    by: ["userId"],
    where: {
      userId: { in: allEnrolledUserIds },
      lessonId: { in: allLessonIds },
      completed: true,
    },
    _count: { lessonId: true },
  });

  const myCompletedCount = completedCount;
  const usersAhead = allProgress.filter(
    (p) => p.userId !== userId && p._count.lessonId > myCompletedCount
  ).length;
  const courseRank = usersAhead + 1;
  const totalEnrolled = allEnrolledUserIds.length;

  // Find a followed user also enrolled in this course
  const followingIds = following.map((f) => f.followingId);
  const followedEnrolled = course.enrollments
    .filter((e) => followingIds.includes(e.userId) && e.userId !== userId)
    .map((e) => e.userId);

  let followedCompanion: {
    userId: string;
    name: string | null;
    image: string | null;
    completedCount: number;
    pct: number;
  } | null = null;

  if (followedEnrolled.length > 0) {
    const companionId = followedEnrolled[0];
    const companionUser = await db.user.findUnique({
      where: { id: companionId },
      select: { id: true, name: true, image: true },
    });
    const companionProgress = allProgress.find((p) => p.userId === companionId);
    const companionCompleted = companionProgress?._count.lessonId ?? 0;

    if (companionUser) {
      followedCompanion = {
        userId: companionUser.id,
        name: companionUser.name,
        image: companionUser.image,
        completedCount: companionCompleted,
        pct: totalCount > 0 ? Math.round((companionCompleted / totalCount) * 100) : 0,
      };
    }
  }

  return {
    course,
    enrollment,
    progressMap,
    completedCount,
    totalCount,
    overallPct,
    lastWatchedLessonId,
    lastWatchedAt,
    courseRank,
    totalEnrolled,
    followedCompanion,
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CourseProgressPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const data = await getCourseProgress(courseId, userId);

  if (!data) notFound();

  const { course, progressMap, completedCount, totalCount, overallPct, lastWatchedLessonId, lastWatchedAt, courseRank, totalEnrolled, followedCompanion } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back */}
      <Link href="/mi-progreso">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Mi Progreso
        </Button>
      </Link>

      {/* Course Header */}
      <div className="flex items-start gap-4">
        {course.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-20 h-14 object-cover rounded-lg shrink-0"
          />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{levelLabel(course.level)}</Badge>
            <span className="text-sm text-gray-400">
              {course.teacherProfile.user.name}
            </span>
          </div>
        </div>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-gray-900">Progreso total</span>
            </div>
            <span className="text-sm text-gray-500">
              {completedCount} de {totalCount} lecciones
            </span>
          </div>
          <ProgressBar value={overallPct} colorVariant="blue" height="lg" />
          {lastWatchedAt && (
            <p className="text-xs text-gray-400 mt-2">
              Última actividad: {formatDate(lastWatchedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ranking & Companion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Tu posición en el curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-700">#{courseRank}</p>
            <p className="text-xs text-gray-400 mt-1">
              de {totalEnrolled} alumno{totalEnrolled !== 1 ? "s" : ""} inscripto{totalEnrolled !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {followedCompanion && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                Comparación con seguido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={followedCompanion.image ?? undefined} />
                  <AvatarFallback className="text-xs bg-gray-200">
                    {getInitials(followedCompanion.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">
                  {followedCompanion.name}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Tú</span>
                    <span>{overallPct}%</span>
                  </div>
                  <ProgressBar value={overallPct} showLabel={false} colorVariant="blue" height="sm" animate={false} />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{followedCompanion.name}</span>
                    <span>{followedCompanion.pct}%</span>
                  </div>
                  <ProgressBar value={followedCompanion.pct} showLabel={false} colorVariant="green" height="sm" animate={false} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modules & Lessons */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Lecciones del curso</h2>
        {course.modules.map((module) => {
          const moduleLessonIds = module.lessons.map((l) => l.id);
          const moduleCompleted = moduleLessonIds.filter((id) => progressMap.get(id)?.completed).length;

          return (
            <Card key={module.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700">
                    Módulo {module.order}: {module.title}
                  </CardTitle>
                  <span className="text-xs text-gray-400">
                    {moduleCompleted}/{module.lessons.length}
                  </span>
                </div>
                <ProgressBar
                  value={module.lessons.length > 0 ? Math.round((moduleCompleted / module.lessons.length) * 100) : 0}
                  showLabel={false}
                  colorVariant="blue"
                  height="xs"
                  animate={false}
                  className="mt-1"
                />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {module.lessons.map((lesson) => {
                    const p = progressMap.get(lesson.id);
                    const isCompleted = p?.completed ?? false;
                    const isInProgress = !isCompleted && (p?.watchedPct ?? 0) > 0;
                    const isLastWatched = lesson.id === lastWatchedLessonId;

                    let icon = <Circle className="w-4 h-4 text-gray-300 shrink-0" />;
                    let rowClass = "text-gray-500";

                    if (isCompleted) {
                      icon = <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
                      rowClass = "text-gray-700";
                    } else if (isInProgress) {
                      icon = <PlayCircle className="w-4 h-4 text-blue-500 shrink-0" />;
                      rowClass = "text-gray-700";
                    } else if (!data.enrollment) {
                      icon = <Lock className="w-4 h-4 text-gray-300 shrink-0" />;
                    }

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-3 py-1.5 px-2 rounded-md ${isLastWatched ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}
                      >
                        {icon}
                        <span className={`text-sm flex-1 ${rowClass}`}>{lesson.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isInProgress && (
                            <span className="text-xs text-blue-600 font-medium">
                              {Math.round(p?.watchedPct ?? 0)}%
                            </span>
                          )}
                          {isLastWatched && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              Último visto
                            </Badge>
                          )}
                          {lesson.duration && (
                            <span className="text-xs text-gray-400">
                              {formatDuration(lesson.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
