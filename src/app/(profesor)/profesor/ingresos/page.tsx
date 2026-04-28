import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DollarSign, ArrowDownToLine, Clock } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import { WithdrawButton } from "./withdraw-button";

export const metadata = { title: "Ingresos — Profesor" };

export default async function IngresoPage() {
  const session = await auth();
  if (!session?.user || !["PROFESOR", "MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    redirect("/login");
  }

  const teacherProfile = await db.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacherProfile) redirect("/perfil/solicitar-profesor");

  const courses = await db.course.findMany({
    where: { teacherProfileId: teacherProfile.id },
    select: { id: true },
  });
  const courseIds = courses.map((c) => c.id);

  const payments = await db.payment.findMany({
    where: { enrollments: { some: { courseId: { in: courseIds } } }, status: "COMPLETED" },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const withdrawals = await db.teacherWithdrawal.findMany({
    where: { teacherProfileId: teacherProfile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalEarned = payments.reduce((s, p) => s + (p.teacherRevenue ?? 0), 0);
  const totalWithdrawn = withdrawals.filter((w) => w.status === "COMPLETED").reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawal = withdrawals.find((w) => w.status === "PENDING");
  const available = totalEarned - totalWithdrawn - (pendingWithdrawal?.amount ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-green-600" /> Ingresos
      </h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500 mb-1">Total ganado</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarned)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500 mb-1">Disponible</p>
          <p className="text-2xl font-bold text-green-700">{formatPrice(available)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500 mb-1">Retirado total</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(totalWithdrawn)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" /> Solicitar retiro
          </h2>
          {pendingWithdrawal && (
            <span className="flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" /> Retiro pendiente: {formatPrice(pendingWithdrawal.amount)}
            </span>
          )}
        </div>
        {!pendingWithdrawal && available > 0 ? (
          <WithdrawButton available={available} teacherId={teacherProfile.id} />
        ) : (
          <p className="text-sm text-gray-400">
            {available <= 0 ? "No tienes saldo disponible." : "Ya tienes un retiro en proceso."}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden mb-6">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Historial de pagos recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Alumno</th>
              <th className="px-5 py-3 text-left">Curso</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Tu parte</th>
              <th className="px-5 py-3 text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-700">{p.user?.name ?? "—"}</td>
                <td className="px-5 py-3 text-right text-gray-900">{formatPrice(p.amount)}</td>
                <td className="px-5 py-3 text-right text-green-700 font-medium">{formatPrice(p.teacherRevenue ?? 0)}</td>
                <td className="px-5 py-3 text-right text-gray-400">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="text-center text-gray-400 py-8">Sin pagos registrados aún.</p>
        )}
      </div>

      {withdrawals.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Historial de retiros</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{formatDate(w.createdAt)}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{formatPrice(w.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      w.status === "COMPLETED" ? "bg-green-100 text-green-700"
                      : w.status === "PENDING" ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                    }`}>
                      {w.status === "COMPLETED" ? "Completado" : w.status === "PENDING" ? "Pendiente" : "Rechazado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
