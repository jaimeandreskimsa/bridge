import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DailyHandClient } from "./DailyHandClient";
import { HandDisplay } from "@/components/bridge/hand-display";
import { formatDate } from "@/lib/utils";
import { Trophy, Flame, Calendar, Spade } from "lucide-react";

export const metadata = { title: "Mano del Día · Bridge Academy" };

export default async function ManoDeDiaPage() {
  const session = await auth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyHand = await db.dailyHand.findFirst({
    where: { date: today },
    include: { curator: { select: { id: true, name: true, image: true } } },
  });

  const submission =
    session?.user?.id && dailyHand
      ? await db.dailyHandSubmission.findUnique({
          where: { userId_dailyHandId: { userId: session.user.id, dailyHandId: dailyHand.id } },
        })
      : null;

  const globalStats = dailyHand
    ? await db.dailyHandSubmission.groupBy({
        by: ["answer"],
        where: { dailyHandId: dailyHand.id },
        _count: { answer: true },
      })
    : [];
  const totalSubmissions = globalStats.reduce((s, g) => s + g._count.answer, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const ranking = await db.dailyHandSubmission.groupBy({
    by: ["userId"],
    where: { isCorrect: true, submittedAt: { gte: weekStart } },
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
    take: 10,
  });
  const rankingUsers = await db.user.findMany({
    where: { id: { in: ranking.map((r) => r.userId) } },
    select: { id: true, name: true, image: true },
  });
  const rankingWithUsers = ranking.map((r) => ({
    ...r,
    user: rankingUsers.find((u) => u.id === r.userId),
  }));

  const userStreak = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { streak: true } })
    : null;

  const last7Submissions = session?.user?.id
    ? await db.dailyHandSubmission.findMany({
        where: { userId: session.user.id, submittedAt: { gte: weekStart } },
        include: { dailyHand: { select: { date: true } } },
      })
    : [];

  if (!dailyHand) {
    return (
      <div className="page-inner">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0F1C3F] to-[#1E3A5F] flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Spade className="w-10 h-10 text-[#C9A23A]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Sin mano para hoy</h1>
          <p className="text-slate-500">Volvé mañana para el próximo desafío diario.</p>
        </div>
      </div>
    );
  }

  const options = dailyHand.options as Record<string, string>;
  const statsMap = Object.fromEntries(globalStats.map((g) => [g.answer, g._count.answer]));

  const difficultyConfig = {
    BEGINNER:     { label: "Principiante", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    INTERMEDIATE: { label: "Intermedio",   classes: "bg-blue-50 text-blue-700 border-blue-200" },
    ADVANCED:     { label: "Avanzado",     classes: "bg-violet-50 text-violet-700 border-violet-200" },
  } as const;
  const diff = difficultyConfig[dailyHand.difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.INTERMEDIATE;

  return (
    <div className="page-inner">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap animate-fade-in">
          <div>
            <p className="section-label mb-1">Desafío diario</p>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <span className="text-[#C9A23A]">♠</span> Mano del Día
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {formatDate(dailyHand.date)} · curada por{" "}
              <span className="font-semibold text-slate-700">{dailyHand.curator.name}</span>
            </p>
          </div>

          {userStreak && userStreak.streak > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Racha</p>
                <p className="text-lg font-extrabold text-orange-700 leading-none">
                  {userStreak.streak} <span className="text-sm font-medium">días</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Main problem */}
          <div className="lg:col-span-2 animate-slide-in-up">
            <div className="rounded-[18px] p-[1.5px] bg-gradient-to-br from-slate-200 via-[#C9A23A]/20 to-[#0F1C3F]/10 shadow-sm">
              <div className="bg-white rounded-[16.5px] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${diff.classes}`}>
                    {diff.label}
                  </span>
                  <h2 className="font-bold text-slate-900">{dailyHand.title}</h2>
                </div>

                <HandDisplay pbnData={dailyHand.pbnData} problemMode={!submission} compact={false} />

                <DailyHandClient
                  dailyHandId={dailyHand.id}
                  options={options}
                  correctAnswer={dailyHand.correctAnswer}
                  explanation={dailyHand.explanation}
                  videoClipUrl={dailyHand.videoClipUrl ?? undefined}
                  submission={submission ? { answer: submission.answer, isCorrect: submission.isCorrect } : null}
                  globalStats={statsMap}
                  totalSubmissions={totalSubmissions}
                  isLoggedIn={!!session?.user}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 animate-slide-in-up stagger-2">

            {/* Weekly ranking */}
            <div className="gb-card overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#C9A23A]" />
                <h3 className="font-bold text-slate-900 text-sm">Ranking semanal</h3>
              </div>
              <div className="p-4">
                {rankingWithUsers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Sin datos esta semana</p>
                ) : (
                  <ol className="space-y-2.5">
                    {rankingWithUsers.map((r, i) => (
                      <li key={r.userId} className="flex items-center gap-2.5">
                        <span className={`w-5 text-center text-xs font-bold shrink-0 ${
                          i === 0 ? "text-[#C9A23A]" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-slate-300"
                        }`}>
                          {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i + 1}`}
                        </span>
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#0F1C3F] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {r.user?.image
                            ? <img src={r.user.image} alt="" className="w-full h-full object-cover" />
                            : (r.user?.name ?? "?")[0]}
                        </div>
                        <span className="flex-1 text-xs text-slate-700 font-medium truncate">
                          {r.user?.name ?? "Anónimo"}
                        </span>
                        <span className="text-xs font-bold text-[#0F1C3F] shrink-0">{r._count.userId}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Last 7 days */}
            {session?.user && (
              <div className="gb-card overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <h3 className="font-bold text-slate-900 text-sm">Mis últimos 7 días</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - i));
                      d.setHours(0, 0, 0, 0);
                      const sub = last7Submissions.find(
                        (s) => new Date(s.dailyHand.date).toDateString() === d.toDateString()
                      );
                      const isToday = i === 6;
                      return (
                        <div
                          key={i}
                          title={d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}
                          className={`h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all ${
                            !sub
                              ? isToday
                                ? "bg-[#0F1C3F]/5 text-[#0F1C3F] border-2 border-[#0F1C3F]/20"
                                : "bg-slate-100 text-slate-400"
                              : sub.isCorrect
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-red-400 text-white shadow-sm"
                          }`}
                        >
                          {["D","L","M","X","J","V","S"][d.getDay()]}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Correcto</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Incorrecto</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
