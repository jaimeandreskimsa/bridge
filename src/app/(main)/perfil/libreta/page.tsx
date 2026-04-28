import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NewNotebookButton } from "./new-notebook-button";

export const metadata = { title: "Libretas de Acuerdos" };

export default async function LibretaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notebooks = await db.partnershipNotebook.findMany({
    where: {
      OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }],
    },
    include: {
      player1: { select: { id: true, name: true, image: true } },
      player2: { select: { id: true, name: true, image: true } },
      _count: { select: { agreements: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-navy-700" /> Libretas de Acuerdos
        </h1>
        <NewNotebookButton />
      </div>

      {notebooks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Sin libretas</p>
          <p className="text-sm mt-1">Crea una libreta para registrar tus acuerdos de convenciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notebooks.map((nb) => {
            const otherUser = nb.player1Id === session.user!.id ? nb.player2 : nb.player1;
            return (
              <Link
                key={nb.id}
                href={`/perfil/libreta/${nb.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border p-4 hover:border-navy-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-navy-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {nb.player1Id === nb.player2Id ? "Libreta personal" : `Con ${otherUser?.name ?? "compañero"}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {nb._count.agreements} acuerdos · Actualizada {formatDate(nb.updatedAt)}
                  </p>
                </div>
                {otherUser?.image && otherUser.id !== session.user!.id && (
                  <img src={otherUser.image} alt={otherUser.name ?? ""} className="w-8 h-8 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
