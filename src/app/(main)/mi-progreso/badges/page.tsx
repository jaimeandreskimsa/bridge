import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { checkAndAwardBadges } from "@/lib/badges";

export const metadata = { title: "Mis Insignias" };

export default async function BadgesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await checkAndAwardBadges(session.user.id);

  const userBadges = await db.userBadge.findMany({
    where: { userId: session.user.id },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
  });

  const allBadges = await db.badge.findMany({ orderBy: { name: "asc" } });
  const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-5">
        <Link href="/mi-progreso" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Mi progreso
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Award className="w-6 h-6 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Mis Insignias</h1>
        <span className="ml-2 bg-yellow-100 text-yellow-700 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {userBadges.length} / {allBadges.length}
        </span>
      </div>

      {userBadges.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Obtenidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {userBadges.map((ub) => (
              <div key={ub.id} className="bg-white rounded-xl border p-4 text-center">
                <div className="text-4xl mb-2">{ub.badge.icon}</div>
                <p className="font-semibold text-gray-900 text-sm">{ub.badge.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ub.badge.description}</p>
                <p className="text-xs text-yellow-600 mt-2">{formatDate(ub.earnedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {allBadges.filter((b) => !earnedIds.has(b.id)).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Por obtener</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {allBadges.filter((b) => !earnedIds.has(b.id)).map((badge) => (
              <div key={badge.id} className="bg-white rounded-xl border p-4 text-center opacity-50">
                <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                <p className="font-semibold text-gray-700 text-sm">{badge.name}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {allBadges.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Las insignias serán configuradas pronto.</p>
        </div>
      )}
    </div>
  );
}
