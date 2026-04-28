import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Calendar, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NewDailyHandModal } from "./new-daily-hand-modal";

export const metadata = { title: "Mano del Día — Admin" };

export default async function AdminDailyHandPage() {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const hands = await db.dailyHand.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { submissions: true } } },
    take: 30,
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-navy-700" /> Mano del Día
        </h1>
        <NewDailyHandModal />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Fecha</th>
              <th className="px-5 py-3 text-left">Pregunta</th>
              <th className="px-5 py-3 text-right">Respuestas</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {hands.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{formatDate(h.date)}</td>
                <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{h.title}</td>
                <td className="px-5 py-3 text-right text-gray-600">{h._count.submissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {hands.length === 0 && (
          <p className="text-center text-gray-400 py-10">Sin manos programadas.</p>
        )}
      </div>
    </div>
  );
}
