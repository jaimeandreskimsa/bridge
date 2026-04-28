import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Plus, Calendar, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NewTournamentButton } from "./new-tournament-button";

export const metadata = { title: "Mis Torneos" };

export default async function TorneosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const records = await db.tournamentRecord.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  const stats = records.length > 0 ? {
    total: records.length,
    avgMp: records.filter((r) => r.mpPoints).reduce((s, r) => s + (r.mpPoints ?? 0), 0) / records.filter((r) => r.mpPoints).length || 0,
    best: records.sort((a, b) => (b.mpPoints ?? 0) - (a.mpPoints ?? 0))[0]?.result,
  } : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Mis Torneos
        </h1>
        <NewTournamentButton />
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Torneos jugados</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.avgMp.toFixed(1)}</p>
            <p className="text-xs text-gray-500">MP promedio</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-lg font-bold text-gray-900 truncate">{stats.best ?? "—"}</p>
            <p className="text-xs text-gray-500">Mejor resultado</p>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Sin torneos registrados</p>
          <p className="text-sm mt-1">Registra tus partidas para llevar seguimiento de tu progreso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Link key={r.id} href={`/torneos/${r.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border p-4 hover:border-navy-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{r.name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(r.date)}</span>
                  <span>{r.format}</span>
                  {r.result && <span className="text-navy-700 font-medium">{r.result}</span>}
                </div>
              </div>
              {r.mpPoints != null && (
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{r.mpPoints}</p>
                  <p className="text-xs text-gray-400">MP</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
