import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Calendar, ArrowLeft, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { EditTournamentModal } from "./edit-tournament-modal";

export default async function TournamentDetailPage({ params }: { params: Promise<{ recordId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { recordId } = await params;

  const record = await db.tournamentRecord.findFirst({
    where: { id: recordId, userId: session.user.id },
  });
  if (!record) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/torneos" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Mis torneos
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{record.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(record.date)}</span>
              </div>
            </div>
          </div>
          <EditTournamentModal record={record} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {record.format && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Formato</p>
              <p className="font-semibold text-gray-900">{record.format}</p>
            </div>
          )}
          {record.result && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Resultado</p>
              <p className="font-semibold text-navy-700">{record.result}</p>
            </div>
          )}
          {record.mpPoints != null && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Puntos MP</p>
              <p className="text-2xl font-bold text-gray-900">{record.mpPoints}</p>
            </div>
          )}

        </div>

        {record.notes && (
          <div className="mt-5 pt-5 border-t">
            <p className="text-sm text-gray-500 mb-2">Notas</p>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{record.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
