import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { TrendingUp, Crown, Award } from "lucide-react";
import { levelLabel } from "@/lib/utils";

export const metadata = { title: "Ranking Global" };

export default async function RankingPage() {
  const topPlayers = await db.playerLevel_.findMany({
    orderBy: [{ reputationPoints: "desc" }],
    include: {
      user: { select: { id: true, name: true, image: true, role: true } },
    },
    take: 50,
  });

  const topStreak = await db.playerLevel_.findMany({
    orderBy: [{ bestStreak: "desc" }],
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    take: 10,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Crown className="w-6 h-6 text-yellow-500" /> Ranking Global
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-navy-600" /> Por puntos de reputación
              </h2>
            </div>
            <div className="divide-y">
              {topPlayers.map((p, i) => (
                <Link
                  key={p.userId}
                  href={`/perfil/${p.userId}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-8 text-center font-bold text-sm ${
                    i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-400"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center overflow-hidden shrink-0">
                    {p.user.image ? (
                      <img src={p.user.image} alt={p.user.name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-navy-700">{p.user.name?.[0]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{p.user.name}</p>
                    <p className="text-xs text-gray-400">{levelLabel(p.level)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{p.reputationPoints.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">puntos</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                🔥 Mejor racha
              </h2>
            </div>
            <div className="divide-y">
              {topStreak.map((p, i) => (
                <Link
                  key={p.userId}
                  href={`/perfil/${p.userId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center overflow-hidden">
                    {p.user.image ? (
                      <img src={p.user.image} alt={p.user.name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-navy-700">{p.user.name?.[0]}</span>
                    )}
                  </div>
                  <span className="flex-1 text-sm text-gray-700 truncate">{p.user.name}</span>
                  <span className="text-sm font-bold text-orange-500">{p.bestStreak}d</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
