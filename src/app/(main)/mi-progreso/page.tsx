import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { getLevelProgress } from "@/lib/level-calculator";
import { ProgressBar } from "@/components/progress/progress-bar";
import { StreakCalendar } from "@/components/progress/streak-calendar";
import type { DayActivity } from "@/components/progress/streak-calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { levelLabel, formatDate, getInitials } from "@/lib/utils";
import {
  Trophy, Flame, Star, BookOpen, CheckCircle2,
  TrendingUp, Award, BarChart3, ChevronRight, Zap,
} from "lucide-react";
import type { PlayerLevel } from "@prisma/client";

const LEVEL_ICONS: Record<PlayerLevel, string> = {
  BEGINNER: "♣", INTERMEDIATE: "♦", ADVANCED: "♥", EXPERT: "♠",
};

const LEVEL_CONFIG: Record<PlayerLevel, { bg: string; text: string; border: string; icon: string }> = {
  BEGINNER:     { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500" },
  INTERMEDIATE: { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    icon: "text-blue-500" },
  ADVANCED:     { bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200",  icon: "text-violet-500" },
  EXPERT:       { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   icon: "text-[#C9A23A]" },
};

const LEVEL_BAR: Record<PlayerLevel, "blue" | "green" | "yellow" | "purple" | "red" | "navy"> = {
  BEGINNER: "green", INTERMEDIATE: "blue", ADVANCED: "purple", EXPERT: "yellow",
};

async function getProgressData(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [user, levelProgress, userBadges, enrollments, quizAttempts, dailySubmissions] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { streak: true, lastActiveAt: true, name: true, image: true },
      }),
      getLevelProgress(userId),
      db.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { earnedAt: "desc" } }),
      db.enrollment.findMany({
        where: { userId, isActive: true },
        include: {
          course: {
            select: {
              id: true, title: true, thumbnail: true, level: true,
              totalLessons: true, hasCertificate: true,
              modules: { include: { lessons: { select: { id: true } } } },
            },
          },
        },
        orderBy: { purchasedAt: "desc" },
      }),
      db.quizAttempt.findMany({
        where: { userId },
        include: { quiz: { select: { id: true, title: true, type: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.dailyHandSubmission.findMany({
        where: { userId, submittedAt: { gte: thirtyDaysAgo } },
        include: { dailyHand: { select: { date: true } } },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

  const allLessonIds = enrollments.flatMap((e) =>
    e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
  );
  const progressRecords = await db.progress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
    select: { lessonId: true, completed: true, watchedPct: true, lastWatchedAt: true },
  });
  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  const courseProgressData = enrollments.map((enrollment) => {
    const lessonIds = enrollment.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completedCount = lessonIds.filter((id) => progressMap.get(id)?.completed).length;
    const totalCount = lessonIds.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isCompleted = totalCount > 0 && completedCount === totalCount;
    let lastWatchedLesson: string | null = null;
    let lastWatchedAt: Date | null = null;
    for (const id of lessonIds) {
      const p = progressMap.get(id);
      if (p?.lastWatchedAt && (!lastWatchedAt || p.lastWatchedAt > lastWatchedAt)) {
        lastWatchedAt = p.lastWatchedAt;
        lastWatchedLesson = id;
      }
    }
    return { ...enrollment, completedCount, totalCount, pct, isCompleted, lastWatchedAt, lastWatchedLesson };
  });

  const inProgress  = courseProgressData.filter((c) => !c.isCompleted && c.pct > 0);
  const notStarted  = courseProgressData.filter((c) => c.pct === 0);
  const completed   = courseProgressData.filter((c) => c.isCompleted);

  const submissionMap = new Map(
    dailySubmissions.map((s) => [s.dailyHand.date.toISOString().slice(0, 10), s.isCorrect])
  );
  const lessonActivityRaw = await db.progress.findMany({
    where: { userId, lastWatchedAt: { gte: thirtyDaysAgo } },
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
    calendarData.push({
      date: dateStr,
      active: (lessonActivityMap.get(dateStr) ?? 0) > 0 || submissionMap.has(dateStr),
      dailyHandCorrect: submissionMap.get(dateStr) === true,
      lessonCount: lessonActivityMap.get(dateStr) ?? 0,
    });
  }

  const quizStats = new Map<string, { quizId: string; title: string; type: string; attempts: number; bestScore: number; passed: boolean }>();
  for (const attempt of quizAttempts) {
    const existing = quizStats.get(attempt.quizId);
    if (!existing) {
      quizStats.set(attempt.quizId, { quizId: attempt.quizId, title: attempt.quiz.title, type: attempt.quiz.type, attempts: 1, bestScore: attempt.score, passed: attempt.passed });
    } else {
      existing.attempts++;
      if (attempt.score > existing.bestScore) existing.bestScore = attempt.score;
      if (attempt.passed) existing.passed = true;
    }
  }

  const totalCompletedLessons = progressRecords.filter((p) => p.completed).length;
  const usersAhead = await db.progress.groupBy({
    by: ["userId"],
    where: { completed: true },
    _count: { lessonId: true },
    having: { lessonId: { _count: { gt: totalCompletedLessons } } },
  });

  return {
    user, levelProgress, userBadges, inProgress, notStarted, completed,
    calendarData, quizStats: Array.from(quizStats.values()),
    streak: user?.streak ?? 0, communityRank: usersAhead.length + 1, totalCompletedLessons,
  };
}

export default async function MiProgresoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const data = await getProgressData(userId);
  const { levelProgress } = data;
  const lc = LEVEL_CONFIG[levelProgress.current];
  const levels: PlayerLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
  const nextLevel = levelProgress.current === "EXPERT"
    ? null
    : levels[levels.indexOf(levelProgress.current) + 1];

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* Header */}
        <div className="animate-fade-in flex items-center gap-4 mb-2">
          <Avatar className="h-14 w-14 ring-2 ring-[#C9A23A]/25 ring-offset-2">
            <AvatarImage src={data.user?.image ?? undefined} />
            <AvatarFallback className="bg-[#0F1C3F] text-white font-bold text-lg">
              {getInitials(session.user.name ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="section-label mb-0.5">Tu progreso</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Mi Progreso</h1>
            <p className="text-slate-500 text-sm">{session.user.name ?? session.user.email}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-in-up">
          {[
            { label: "Lecciones",   value: data.totalCompletedLessons, icon: <BookOpen className="w-4 h-4" />,  color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Completados", value: data.completed.length,      icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Racha",       value: `${data.streak}d`,          icon: <Flame className="w-4 h-4" />,     color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Ranking",     value: `#${data.communityRank}`,   icon: <TrendingUp className="w-4 h-4" />, color: "text-violet-600", bg: "bg-violet-50" },
          ].map((stat, i) => (
            <div key={stat.label} className={`gb-card p-4 animate-scale-in stagger-${i + 1}`}>
              <div className={`w-8 h-8 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Level card */}
        <div className={`gb-card-pulse p-5 animate-slide-in-up stagger-1`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#0F1C3F]" />
            <p className="text-sm font-bold text-slate-700">Nivel de jugador</p>
          </div>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold shrink-0 border-2 ${lc.bg} ${lc.text} ${lc.border}`}>
              {LEVEL_ICONS[levelProgress.current]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-slate-900">{levelLabel(levelProgress.current)}</span>
                  {nextLevel && (
                    <span className="text-sm text-slate-400">→ {levelLabel(nextLevel)}</span>
                  )}
                </div>
                {levelProgress.current !== "EXPERT" && (
                  <span className="text-sm font-semibold text-slate-500">{levelProgress.percentToNext}%</span>
                )}
              </div>
              {levelProgress.current !== "EXPERT" ? (
                <ProgressBar value={levelProgress.percentToNext} showLabel={false} colorVariant={LEVEL_BAR[levelProgress.current]} height="md" />
              ) : (
                <p className="text-sm font-bold text-[#C9A23A]">✦ Nivel máximo alcanzado</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
            {[
              { value: levelProgress.factors.basicQuizzesPassed,           label: "Quizzes básicos" },
              { value: levelProgress.factors.introCoursesCompleted,         label: "Cursos intro" },
              { value: levelProgress.factors.intermediateCoursesCompleted,  label: "Cursos intermedios" },
              { value: `${Math.round(levelProgress.factors.dailyHandAccuracyLast30 * 100)}%`, label: "Precisión mano del día" },
            ].map((f) => (
              <div key={f.label} className="text-center bg-slate-50 rounded-xl p-3">
                <p className="text-xl font-extrabold text-slate-900">{f.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Streak calendar */}
        <div className="gb-card p-5 animate-slide-in-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-bold text-slate-700">Racha de actividad</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold">
              🔥 {data.streak} {data.streak === 1 ? "día" : "días"} seguidos
            </span>
          </div>
          <StreakCalendar activityData={data.calendarData} />
        </div>

        {/* Badges */}
        {data.userBadges.length > 0 && (
          <div className="gb-card p-5 animate-slide-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#C9A23A]" />
                <p className="text-sm font-bold text-slate-700">Logros obtenidos</p>
              </div>
              <Link href="/mi-progreso/badges" className="text-xs font-semibold text-slate-400 hover:text-[#0F1C3F] transition-colors flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {data.userBadges.slice(0, 8).map((ub) => (
                <div key={ub.id} className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 text-center hover:border-[#C9A23A]/30 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ub.badge.imageUrl ?? undefined} alt={ub.badge.name} className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <p className="text-xs font-bold text-slate-800 leading-tight">{ub.badge.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{ub.badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-progress courses */}
        {data.inProgress.length > 0 && (
          <div className="gb-card overflow-hidden animate-slide-in-up stagger-2">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-bold text-slate-700">En progreso</p>
              <span className="ml-auto text-xs text-slate-400">{data.inProgress.length}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {data.inProgress.map((c) => (
                <Link key={c.id} href={`/mi-progreso/${c.course.id}`} className="group block">
                  <div className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    {c.course.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.course.thumbnail} alt="" className="w-16 h-11 object-cover rounded-xl shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 group-hover:text-[#0F1C3F] transition-colors text-sm truncate mb-1">
                        {c.course.title}
                      </p>
                      <p className="text-xs text-slate-400 mb-2">{c.completedCount} de {c.totalCount} lecciones</p>
                      <ProgressBar value={c.pct} showLabel={true} colorVariant="blue" height="sm" animate={false} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Not started courses */}
        {data.notStarted.length > 0 && (
          <div className="gb-card overflow-hidden animate-slide-in-up stagger-3">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-bold text-slate-700">Sin iniciar</p>
              <span className="ml-auto text-xs text-slate-400">{data.notStarted.length}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {data.notStarted.map((c) => (
                <Link key={c.id} href={`/cursos/${c.course.id}`} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  {c.course.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.course.thumbnail} alt="" className="w-12 h-9 object-cover rounded-lg shrink-0" />
                  )}
                  <p className="flex-1 text-sm text-slate-700 group-hover:text-[#0F1C3F] transition-colors font-medium truncate">
                    {c.course.title}
                  </p>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {c.totalCount} lecciones
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed courses */}
        {data.completed.length > 0 && (
          <div className="gb-card overflow-hidden animate-slide-in-up stagger-4">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">Completados</p>
              <span className="ml-auto text-xs text-emerald-600 font-bold">{data.completed.length}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {data.completed.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  {c.course.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.course.thumbnail} alt="" className="w-12 h-9 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.course.title}</p>
                    {c.lastWatchedAt && (
                      <p className="text-xs text-slate-400">Completado el {formatDate(c.lastWatchedAt)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    {c.course.hasCertificate && (
                      <span className="flex items-center gap-1 text-[#C9A23A] text-xs font-bold">
                        <Trophy className="w-3.5 h-3.5" />
                        Cert.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz history */}
        {data.quizStats.length > 0 && (
          <div className="gb-card overflow-hidden animate-slide-in-up stagger-3">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <Star className="w-4 h-4 text-[#C9A23A]" />
              <p className="text-sm font-bold text-slate-700">Historial de quizzes</p>
            </div>
            <div className="divide-y divide-slate-50">
              {data.quizStats.map((q) => (
                <div key={q.quizId} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{q.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{q.attempts} {q.attempts === 1 ? "intento" : "intentos"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-slate-900">{Math.round(q.bestScore)}%</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.passed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {q.passed ? "Aprobado" : "En progreso"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community rank */}
        <div className="gb-card p-5 animate-slide-in-up stagger-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-violet-500" />
            <p className="text-sm font-bold text-slate-700">Tu posición en la comunidad</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center shrink-0">
              <p className="text-5xl font-extrabold text-[#0F1C3F]">#{data.communityRank}</p>
              <p className="text-xs text-slate-400 mt-1">posición global</p>
            </div>
            <div className="h-12 w-px bg-slate-100 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-1">
                Completaste <span className="font-extrabold text-slate-900">{data.totalCompletedLessons}</span> lecciones.
              </p>
              <p className="text-sm text-slate-400">Seguí aprendiendo para escalar posiciones.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
