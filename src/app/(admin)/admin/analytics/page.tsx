import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BarChart3, Users, DollarSign, BookOpen, TrendingUp } from "lucide-react";
import { AdminRevenueChart as RevenueChart } from "@/components/admin/revenue-chart";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Analytics Global — Admin" };

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const [
    totalUsers,
    newUsersThisMonth,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    completedEnrollments,
    totalRevenue,
    revenueThisMonth,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: new Date(new Date().setDate(1)) } } }),
    db.course.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.enrollment.count(),
    db.enrollment.count({ where: { isActive: true } }),
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: new Date(new Date().setDate(1)) } },
      _sum: { amount: true },
    }),
  ]);

  const conversionRate = totalUsers > 0 ? Math.round((totalEnrollments / totalUsers) * 100) : 0;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  const revenueByDay = await db.payment.groupBy({
    by: ["createdAt"],
    where: {
      status: "COMPLETED",
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { amount: true },
    orderBy: { createdAt: "asc" },
  });

  const chartData = revenueByDay.map((d) => ({
    date: d.createdAt.toISOString().split("T")[0],
    revenue: d._sum.amount ?? 0,
  }));

  const topCourses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { enrollments: { _count: "desc" } },
    take: 5,
  });

  const userGrowth = await db.user.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    _count: { id: true },
  });

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-navy-700" /> Analytics Global
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: "Usuarios totales", value: totalUsers.toLocaleString(), sub: `+${newUsersThisMonth} este mes` },
          { icon: BookOpen, label: "Cursos publicados", value: `${publishedCourses} / ${totalCourses}`, sub: `${conversionRate}% conversión` },
          { icon: DollarSign, label: "Ingresos totales", value: formatPrice(totalRevenue._sum.amount ?? 0), sub: `${formatPrice(revenueThisMonth._sum.amount ?? 0)} este mes` },
          { icon: TrendingUp, label: "Tasa completación", value: `${completionRate}%`, sub: `${completedEnrollments} completados` },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border p-5">
            <Icon className="w-5 h-5 text-navy-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
            <p className="text-xs text-navy-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ingresos últimos 30 días</h2>
          <RevenueChart data={chartData} />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Embudo de conversión</h2>
          <div className="space-y-3">
            {[
              { label: "Usuarios registrados", value: totalUsers, pct: 100 },
              { label: "Con al menos 1 inscripción", value: Math.round(totalUsers * conversionRate / 100), pct: conversionRate },
              { label: "Cursos completados", value: completedEnrollments, pct: completionRate },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium text-gray-900">{value.toLocaleString()} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-navy-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Top 5 cursos por inscripciones</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">#</th>
              <th className="px-5 py-3 text-left">Curso</th>
              <th className="px-5 py-3 text-right">Inscripciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {topCourses.map((c, i) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-5 py-3 text-gray-900 font-medium">{c.title}</td>
                <td className="px-5 py-3 text-right text-gray-700">{c._count.enrollments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
