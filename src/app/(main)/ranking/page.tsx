import { db } from "@/lib/db";
import Link from "next/link";
import { TrendingUp, Crown, Flame, Medal } from "lucide-react";
import { levelLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking Global · Bridge Academy" };

export default async function RankingPage() {
  const topPlayers = await db.playerLevel_.findMany({
    orderBy: [{ reputationPoints: "desc" }],
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
    take: 50,
  });

  const topStreak = await db.playerLevel_.findMany({
    orderBy: [{ bestStreak: "desc" }],
    include: { user: { select: { id: true, name: true, image: true } } },
    take: 10,
  });

  const medals = ["🥇", "🥈", "🥉"];
  const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

  return (
    <div className="page-inner">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <p className="section-label mb-1">Clasificación</p>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C9A23A] to-[#9A7C28] flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5 text-white" />
            </div>
            Ranking Global
          </h1>
        </div>

        {/* Top 3 podium */}
        {topPlayers.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8 animate-slide-in-up">
            {[topPlayers[1], topPlayers[0], topPlayers[2]].map((p, podiumIdx) => {
              const actualIdx = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
              const heights = ["h-28", "h-36", "h-28"];
              const isFirst = actualIdx === 0;
              return (
                <Link key={p.userId} href={`/perfil/${p.userId}`}>
                  <div
                    className={`relative rounded-2xl p-[1.5px] transition-all duration-200 hover:-translate-y-1
                      ${isFirst
                        ? "bg-gradient-to-br from-[#C9A23A]/60 via-[#F0D47A]/80 to-[#9A7C28]/60"
                        : "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300"}`}
                  >
                    <div className={`bg-white rounded-[14.5px] flex flex-col items-center justify-center gap-2 p-4 ${heights[podiumIdx]}`}>
                      <div className="text-2xl">{medals[actualIdx]}</div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden border-2 border-white shadow-sm">
                        {p.user.image
                          ? <img src={p.user.image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-600">{p.user.name?.[0]}</div>
                        }
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[80px] text-center">{p.user.name}</p>
                      <p className={`text-sm font-extrabold ${isFirst ? "text-[#9A7C28]" : "text-slate-600"}`}>
                        {p.reputationPoints.toLocaleString()}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">pts</span>
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">

          {/* Main ranking list */}
          <div className="md:col-span-2 animate-slide-in-up stagger-1">
            <div className="gb-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0F1C3F]" />
                <h2 className="font-bold text-slate-900 text-sm">Por puntos de reputación</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {topPlayers.map((p, i) => (
                  <Link
                    key={p.userId}
                    href={`/perfil/${p.userId}`}
                    className="group flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-8 text-center font-bold text-sm shrink-0 ${
                      i < 3 ? medalColors[i] : "text-slate-400"
                    }`}>
                      {i < 3 ? medals[i] : `#${i + 1}`}
                    </div>
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-slate-100">
                      {p.user.image
                        ? <img src={p.user.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#0F1C3F] flex items-center justify-center text-xs font-bold text-white">{p.user.name?.[0]}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm group-hover:text-[#0F1C3F] transition-colors truncate">
                        {p.user.name}
                      </p>
                      <p className="text-xs text-slate-400">{levelLabel(p.level)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-sm">{p.reputationPoints.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">puntos</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Streak sidebar */}
          <div className="animate-slide-in-up stagger-2">
            <div className="gb-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h2 className="font-bold text-slate-900 text-sm">Mejor racha</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {topStreak.map((p, i) => (
                  <Link
                    key={p.userId}
                    href={`/perfil/${p.userId}`}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-100">
                      {p.user.image
                        ? <img src={p.user.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#0F1C3F] flex items-center justify-center text-[10px] font-bold text-white">{p.user.name?.[0]}</div>
                      }
                    </div>
                    <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 truncate font-medium">{p.user.name}</span>
                    <span className="text-sm font-extrabold text-orange-500 shrink-0">{p.bestStreak}d</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Medal legend */}
            <div className="mt-4 gb-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Insignias</p>
              <div className="space-y-2">
                {[
                  { icon: <Medal className="w-4 h-4 text-[#C9A23A]" />, label: "Top 1 — Oro" },
                  { icon: <Medal className="w-4 h-4 text-slate-400" />, label: "Top 2 — Plata" },
                  { icon: <Medal className="w-4 h-4 text-amber-600" />, label: "Top 3 — Bronce" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
