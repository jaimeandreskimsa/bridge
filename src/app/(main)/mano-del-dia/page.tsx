import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DailyHandClient } from "./DailyHandClient";
import { HandDisplay } from "@/components/bridge/hand-display";
import { formatDate } from "@/lib/utils";
import { Trophy, Flame, Calendar } from "lucide-react";

export const metadata = { title: "Mano del Día" };

export default async function ManoDeDiaPage() {
  const session = await auth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyHand = await db.dailyHand.findFirst({
    where: { date: today },
    include: { curator: { select: { id: true, name: true, image: true } } },
  });

  const submission = session?.user?.id && dailyHand
    ? await db.dailyHandSubmission.findUnique({
        where: { userId_dailyHandId: { userId: session.user.id, dailyHandId: dailyHand.id } },
      })
    : null;

  // Global stats for this hand
  const globalStats = dailyHand
    ? await db.dailyHandSubmission.groupBy({
        by: ["answer"],
        where: { dailyHandId: dailyHand.id },
        _count: { answer: true },
      })
    : [];
  const totalSubmissions = globalStats.reduce((s, g) => s + g._count.answer, 0);

  // Weekly ranking
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

  // User streak & last 7 days
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
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">♠</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin mano para hoy</h1>
        <p className="text-gray-500">Vuelve mañana para el próximo desafío diario.</p>
      </div>
    );
  }

  const options = dailyHand.options as Record<string, string>;
  const statsMap = Object.fromEntries(globalStats.map((g) => [g.answer, g._count.answer]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            ♠ Mano del Día
          </h1>
          <p className="text-gray-500 mt-1">{formatDate(dailyHand.date)} — curada por {dailyHand.curator.name}</p>
        </div>
        {userStreak && userStreak.streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-orange-700">{userStreak.streak}</span>
            <span className="text-sm text-orange-600">días seguidos</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main problem */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                dailyHand.difficulty === "BEGINNER" ? "bg-green-100 text-green-700" :
                dailyHand.difficulty === "INTERMEDIATE" ? "bg-blue-100 text-blue-700" :
                "bg-purple-100 text-purple-700"
              }`}>
                {dailyHand.difficulty === "BEGINNER" ? "Principiante" :
                 dailyHand.difficulty === "INTERMEDIATE" ? "Intermedio" : "Avanzado"}
              </span>
              <h2 className="font-semibold text-gray-900">{dailyHand.title}</h2>
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

        {/* Sidebar: ranking + history */}
        <div className="space-y-4">
          {/* Weekly ranking */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Ranking semanal
            </h3>
            {rankingWithUsers.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos esta semana</p>
            ) : (
              <ol className="space-y-2">
                {rankingWithUsers.map((r, i) => (
                  <li key={r.userId} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 text-center font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-400"}`}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-navy-200 flex items-center justify-center text-xs font-bold text-navy-800">
                      {(r.user?.name ?? "?")[0]}
                    </div>
                    <span className="flex-1 truncate text-gray-700">{r.user?.name ?? "Anónimo"}</span>
                    <span className="font-semibold text-navy-700">{r._count.userId}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Last 7 days */}
          {session?.user && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                Mis últimos 7 días
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  d.setHours(0, 0, 0, 0);
                  const sub = last7Submissions.find(
                    (s) => new Date(s.dailyHand.date).toDateString() === d.toDateString()
                  );
                  return (
                    <div
                      key={i}
                      title={d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}
                      className={`h-8 rounded flex items-center justify-center text-xs font-bold ${
                        !sub ? "bg-gray-100 text-gray-300" :
                        sub.isCorrect ? "bg-green-500 text-white" :
                        "bg-red-400 text-white"
                      }`}
                    >
                      {["D","L","M","X","J","V","S"][d.getDay()]}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">Verde=correcto, Rojo=incorrecto</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
