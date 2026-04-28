import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Users, Lock, Globe } from "lucide-react";
import { levelLabel } from "@/lib/utils";

export const metadata = { title: "Grupos" };

export default async function GruposPage() {
  const session = await auth();

  const [groups, myMemberships] = await Promise.all([
    db.group.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { members: true } } },
    }),
    session?.user
      ? db.groupMember.findMany({ where: { userId: session.user.id }, select: { groupId: true } })
      : Promise.resolve([]),
  ]);

  const myGroupIds = new Set(myMemberships.map((m) => m.groupId));
  const grouped = {
    LEVEL: groups.filter((g) => g.type === "LEVEL"),
    CONVENTION: groups.filter((g) => g.type === "CONVENTION"),
    TOURNAMENT: groups.filter((g) => g.type === "TOURNAMENT"),
  };

  const typeLabels: Record<string, string> = { LEVEL: "Por nivel", CONVENTION: "Por convención", TOURNAMENT: "Por torneo" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-navy-700" /> Grupos
        </h1>
        {session?.user && (
          <Link href="/grupos/crear" className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800">
            + Crear grupo
          </Link>
        )}
      </div>

      {(Object.entries(grouped) as [string, typeof groups][]).map(([type, list]) => (
        list.length > 0 && (
          <section key={type} className="mb-8">
            <h2 className="font-semibold text-gray-700 mb-3">{typeLabels[type]}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((g) => {
                const isMember = myGroupIds.has(g.id);
                return (
                  <Link key={g.id} href={`/grupos/${g.id}`}
                    className="bg-white rounded-xl border hover:border-navy-300 transition-colors p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-xl">
                        {type === "LEVEL" ? "📚" : type === "CONVENTION" ? "♠" : "🏆"}
                      </div>
                      <div className="flex items-center gap-1">
                        {g.isPrivate ? <Lock className="w-3 h-3 text-gray-400" /> : <Globe className="w-3 h-3 text-gray-300" />}
                        {isMember && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Miembro</span>}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{g.name}</h3>
                    {g.level && <p className="text-xs text-navy-600 font-medium mb-1">{levelLabel(g.level)}</p>}
                    {g.description && <p className="text-xs text-gray-500 line-clamp-2">{g.description}</p>}
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" /> {g._count.members} miembros
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )
      ))}
    </div>
  );
}
