import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { getLevelProgress } from "@/lib/level-calculator";
import { ProgressBar } from "@/components/progress/progress-bar";
import { StreakCalendar } from "@/components/progress/streak-calendar";
import type { DayActivity } from "@/components/progress/streak-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { levelLabel, formatDate, getInitials } from "@/lib/utils";
import {
  Trophy,
  Flame,
  Star,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import type { PlayerLevel } from "@prisma/client";

const LEVEL_ICONS: Record<PlayerLevel, string> = {
  BEGINNER: "♣",
  INTERMEDIATE: "♦",
  ADVANCED: "♥",
  EXPERT: "♠",
};

const LEVEL_COLORS: Record<PlayerLevel, string> = {
  BEGINNER: "text-gray-600 bg-gray-100",
  INTERMEDIATE: "text-blue-700 bg-blue-100",
  ADVANCED: "text-purple-700 bg-purple-100",
  EXPERT: "text-yellow-700 bg-yellow-100",
};

const LEVEL_BAR_COLOR: Record<PlayerLevel, "blue" | "green" | "yellow" | "purple" | "red" | "navy"> = {
  BEGINNER: "blue",
  INTERMEDIATE: "green",
  ADVANCED: "purple",
  EXPERT: "yellow",
};

async function getProgressData(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    user,
    levelProgress,
    userBadges,
    enrollments,
    quizAttempts,
    dailySubmissions,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { streak: true, lastActiveAt: true, name: true, image: true },
    }),
    getLevelProgress(userId),
    db.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),
    db.enrollment.findMany({
      where: { userId, isActive: true },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            level: true,
            totalLessons: true,
            hasCertificate: true,
            modules: {
              include: {
                lessons: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { purchasedAt: "desc" },
    }),
    db.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.dailyHandSubmission.findMany({
      where: { userId, submittedAt: { gte: thirtyDaysAgo } },
      include: { dailyHand: { select: { date: true } } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  // Calculate completion for each course
  const allLessonIds = enrollments.flatMap((e) =>
    e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
  );

  const progressRecords = await db.progress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
    select: { lessonId: true, completed: true, watchedPct: true, lastWatchedAt: true },
  });

  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  // Build progress data per course
  const courseProgressData = enrollments.map((enrollment) => {
    const lessonIds = enrollment.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completedCount = lessonIds.filter((id) => progressMap.get(id)?.completed).length;
    const totalCount = lessonIds.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isCompleted = totalCount > 0 && completedCount === totalCount;

    // Last watched lesson
    let lastWatchedLesson: string | null = null;
    let lastWatchedAt: Date | null = null;
    for (const id of lessonIds) {
      const p = progressMap.get(id);
      if (p?.lastWatchedAt && (!lastWatchedAt || p.lastWatchedAt > lastWatchedAt)) {
        lastWatchedAt = p.lastWatchedAt;
        lastWatchedLesson = id;
      }
    }

    return {
      ...enrollment,
      completedCount,
      totalCount,
      pct,
      isCompleted,
      lastWatchedAt,
      lastWatchedLesson,
    };
  });

  const inProgress = courseProgressData.filter((c) => !c.isCompleted && c.pct > 0);
  const notStarted = courseProgressData.filter((c) => c.pct === 0);
  const completed = courseProgressData.filter((c) => c.isCompleted);

  // Build activity calendar data
  const submissionMap = new Map(
    dailySubmissions.map((s) => [
      s.dailyHand.date.toISOString().slice(0, 10),
      s.isCorrect,
    ])
  );

  // Get daily progress activity (lessons watched per day in last 30 days)
  const lessonActivityRaw = await db.progress.findMany({
    where: {
      userId,
      lastWatchedAt: { gte: thirtyDaysAgo },
    },
    select: { lastWatchedAt: true },
  });

  const lessonActivityMap = new Map<string, number>();
  for (const p of lessonActivityRaw) {
    if (!p.lastWatchedAt) continue;
    const dateKey = p.lastWatchedAt.toISOString().slice(0, 10);
    lessonActivityMap.set(dateKey, (lessonActivityMap.get(dateKey) ?? 0) + 1);
  }

  const calendarData: DayActivity[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const lessonCount = lessonActivityMap.get(dateStr) ?? 0;
    const dailyHandCorrect = submissionMap.get(dateStr) === true;
    const active = lessonCount > 0 || submissionMap.has(dateStr);
    calendarData.push({ date: dateStr, active, dailyHandCorrect, lessonCount });
  }

  // Quiz stats per quiz (best score, attempt count)
  const quizStats = new Map<
    string,
    { quizId: string; title: string; type: string; attempts: number; bestScore: number; passed: boolean }
  >();
  for (const attempt of quizAttempts) {
    const existing = quizStats.get(attempt.quizId);
    if (!existing) {
      quizStats.set(attempt.quizId, {
        quizId: attempt.quizId,
        title: attempt.quiz.title,
        type: attempt.quiz.type,
        attempts: 1,
        bestScore: attempt.score,
        passed: attempt.passed,
      });
    } else {
      existing.attempts++;
      if (attempt.score > existing.bestScore) existing.bestScore = attempt.score;
      if (attempt.passed) existing.passed = true;
    }
  }

  // Anonymous community ranking: count users with more completed lessons
  const totalCompletedLessons = progressRecords.filter((p) => p.completed).length;
  const usersAhead = await db.progress.groupBy({
    by: ["userId"],
    where: { completed: true },
    _count: { lessonId: true },
    having: { lessonId: { _count: { gt: totalCompletedLessons } } },
  });
  const communityRank = usersAhead.length + 1;

  return {
    user,
    levelProgress,
    userBadges,
    inProgress,
    notStarted,
    completed,
    calendarData,
    quizStats: Array.from(quizStats.values()),
    streak: user?.streak ?? 0,
    communityRank,
    totalCompletedLessons,
  };
}

export default async function MiProgresoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const data = await getProgressData(userId);
  const { levelProgress } = data;

  const nextLevel = levelProgress.current === "EXPERT"
    ? null
    : (["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as PlayerLevel[])[
        (["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as PlayerLevel[]).indexOf(levelProgress.current) + 1
      ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={data.user?.image ?? undefined} />
          <AvatarFallback className="bg-gray-200 font-semibold">
            {getInitials(session.user.name ?? "U")}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Progreso</h1>
          <p className="text-gray-500 text-sm">{session.user.name ?? session.user.email}</p>
        </div>
      </div>

      {/* Level card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Nivel de jugador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 ${LEVEL_COLORS[levelProgress.current]}`}
            >
              {LEVEL_ICONS[levelProgress.current]}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xl font-bold text-gray-900">
                    {levelLabel(levelProgress.current)}
                  </span>
                  {nextLevel && (
                    <span className="text-sm text-gray-400 ml-2">
                      → {levelLabel(nextLevel)}
                    </span>
                  )}
                </div>
                {levelProgress.current !== "EXPERT" && (
                  <span className="text-sm text-gray-500">
                    {levelProgress.percentToNext}% completado
                  </span>
                )}
              </div>
              {levelProgress.current !== "EXPERT" ? (
                <ProgressBar
                  value={levelProgress.percentToNext}
                  showLabel={false}
                  colorVariant={LEVEL_BAR_COLOR[levelProgress.current]}
                  height="md"
                />
              ) : (
                <p className="text-sm text-yellow-700 font-medium">Nivel máximo alcanzado</p>
              )}
            </div>
          </div>

          {/* Factor details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{levelProgress.factors.basicQuizzesPassed}</p>
              <p className="text-xs text-gray-500">Quizzes básicos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{levelProgress.factors.introCoursesCompleted}</p>
              <p className="text-xs text-gray-500">Cursos intro</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{levelProgress.factors.intermediateCoursesCompleted}</p>
              <p className="text-xs text-gray-500">Cursos intermedios</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(levelProgress.factors.dailyHandAccuracyLast30 * 100)}%
              </p>
              <p className="text-xs text-gray-500">Precisión mano del día</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak + Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Racha de actividad
            <Badge variant="secondary" className="ml-auto font-bold text-orange-700 bg-orange-100">
              {data.streak} {data.streak === 1 ? "día" : "días"} seguidos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StreakCalendar activityData={data.calendarData} />
        </CardContent>
      </Card>

      {/* Badges */}
      {data.userBadges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Logros obtenidos
              <span className="ml-auto text-sm font-normal text-gray-400">
                {data.userBadges.length} badge{data.userBadges.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {data.userBadges.map((ub) => (
                <div
                  key={ub.id}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-50 border text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ub.badge.imageUrl ?? undefined}
                    alt={ub.badge.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <p className="text-xs font-semibold text-gray-900">{ub.badge.name}</p>
                  <p className="text-xs text-gray-400">{ub.badge.description}</p>
                  <p className="text-xs text-gray-300">{formatDate(ub.earnedAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses in progress */}
      {data.inProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              Cursos en progreso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.inProgress.map((c) => (
              <Link
                key={c.id}
                href={`/mi-progreso/${c.course.id}`}
                className="block group"
              >
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
                  {c.course.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.course.thumbnail}
                      alt={c.course.title}
                      className="w-16 h-12 object-cover rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm truncate">
                      {c.course.title}
                    </p>
                    <p className="text-xs text-gray-400 mb-2">
                      {c.completedCount} de {c.totalCount} lecciones completadas
                    </p>
                    <ProgressBar
                      value={c.pct}
                      showLabel={true}
                      colorVariant="blue"
                      height="sm"
                      animate={false}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Not started courses */}
      {data.notStarted.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              Cursos sin iniciar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.notStarted.map((c) => (
              <Link
                key={c.id}
                href={`/cursos/${c.course.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border transition-colors group"
              >
                {c.course.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.course.thumbnail}
                    alt={c.course.title}
                    className="w-12 h-9 object-cover rounded shrink-0"
                  />
                )}
                <p className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                  {c.course.title}
                </p>
                <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                  {c.totalCount} lecciones
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed courses */}
      {data.completed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Cursos completados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.completed.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
              >
                {c.course.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.course.thumbnail}
                    alt={c.course.title}
                    className="w-12 h-9 object-cover rounded shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.course.title}</p>
                  {c.lastWatchedAt && (
                    <p className="text-xs text-gray-400">Completado el {formatDate(c.lastWatchedAt)}</p>
                  )}
                </div>
                {c.course.hasCertificate && (
                  <div className="flex items-center gap-1 text-yellow-600 shrink-0">
                    <Trophy className="w-4 h-4" />
                    <span className="text-xs font-medium">Certificado</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quiz history */}
      {data.quizStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Historial de quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.quizStats.map((q) => (
                <div key={q.quizId} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{q.title}</p>
                    <p className="text-xs text-gray-400">
                      {q.attempts} {q.attempts === 1 ? "intento" : "intentos"} ·{" "}
                      <span className="capitalize text-gray-500">{q.type.replace("_", " ").toLowerCase()}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900">{Math.round(q.bestScore)}%</p>
                    <Badge
                      variant={q.passed ? "default" : "secondary"}
                      className={q.passed ? "bg-green-100 text-green-700" : ""}
                    >
                      {q.passed ? "Aprobado" : "En progreso"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Community ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Comparación con la comunidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-700">#{data.communityRank}</p>
              <p className="text-xs text-gray-400 mt-1">Tu posición</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">
                Completaste <span className="font-bold text-gray-900">{data.totalCompletedLessons}</span> lecciones.
              </p>
              <p className="text-sm text-gray-500">
                Estás por encima de la mayoría de usuarios activos.
                Seguí aprendiendo para escalar posiciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
