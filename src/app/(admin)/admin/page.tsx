import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Users, DollarSign, BookOpen, TrendingUp, UserCheck } from "lucide-react";
import { AdminRevenueChart } from "@/components/admin/revenue-chart";

export const metadata = { title: "Superadmin — Dashboard" };

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalUsers,
    newUsersToday,
    totalRevenue,
    monthRevenue,
    lastMonthRevenue,
    publishedCourses,
    activeTeachers,
    pendingRequests,
    recentPayments,
  ] = await Promise.all([
    db.user.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { createdAt: { gte: new Date(now.setHours(0,0,0,0)) } } }),
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "COMPLETED", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "COMPLETED", createdAt: { gte: lastMonth, lte: lastMonthEnd } }, _sum: { amount: true } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.user.count({ where: { role: "PROFESOR" } }),
    db.teacherRequest.count({ where: { status: "PENDING" } }),
    db.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  // Revenue last 30 days for chart
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const chartData = await db.payment.groupBy({
    by: ["createdAt"],
    where: { status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
    _sum: { amount: true },
  });

  const dailyRevenue = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    const match = chartData.find(
      (c) => new Date(c.createdAt).toDateString() === d.toDateString()
    );
    return { date: dateStr, revenue: match?._sum?.amount ?? 0 };
  });

  const gmvChange = lastMonthRevenue._sum.amount
    ? (((monthRevenue._sum.amount ?? 0) - lastMonthRevenue._sum.amount) / lastMonthRevenue._sum.amount * 100).toFixed(1)
    : null;

  const kpis = [
    {
      label: "Usuarios activos",
      value: totalUsers.toLocaleString(),
      sub: `+${newUsersToday} nuevos hoy`,
      icon: Users,
      gradient: "from-blue-600 to-blue-500",
      glow: "shadow-blue-500/20",
      badge: newUsersToday > 0 ? `+${newUsersToday}` : null,
    },
    {
      label: "GMV del mes",
      value: formatPrice(monthRevenue._sum.amount ?? 0),
      sub: gmvChange ? `${Number(gmvChange) >= 0 ? "↑" : "↓"} ${gmvChange}% vs mes anterior` : "primer mes",
      icon: DollarSign,
      gradient: "from-emerald-600 to-emerald-500",
      glow: "shadow-emerald-500/20",
      badge: gmvChange ? `${gmvChange}%` : null,
    },
    {
      label: "Cursos publicados",
      value: publishedCourses.toString(),
      sub: "en la plataforma",
      icon: BookOpen,
      gradient: "from-violet-600 to-violet-500",
      glow: "shadow-violet-500/20",
      badge: null,
    },
    {
      label: "Profesores activos",
      value: activeTeachers.toString(),
      sub: pendingRequests > 0 ? `${pendingRequests} solicitudes pendientes` : "Sin solicitudes pendientes",
      icon: UserCheck,
      gradient: "from-[#c9a23a] to-[#9a7c28]",
      glow: "shadow-amber-500/20",
      badge: pendingRequests > 0 ? pendingRequests.toString() : null,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/70 mb-1">Administración</p>
          <h1 className="text-3xl font-bold text-navy-950 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visión general en tiempo real de la plataforma</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">GMV total acumulado</p>
          <p className="text-2xl font-bold text-navy-950">{formatPrice(totalRevenue._sum.amount ?? 0)}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
          >
            {/* Top gradient strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${k.gradient}`} />

            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.gradient} flex items-center justify-center shadow-lg ${k.glow}`}>
                <k.icon className="w-5 h-5 text-white" />
              </div>
              {k.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${k.gradient} text-white`}>
                  {k.badge}
                </span>
              )}
            </div>

            <p className="text-2xl font-bold text-navy-950 tabular-nums leading-none mb-1">{k.value}</p>
            <p className="text-xs font-semibold text-gray-600">{k.label}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-navy-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Ingresos últimos 30 días
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Pagos completados diariamente</p>
          </div>
        </div>
        <AdminRevenueChart data={dailyRevenue} />
      </div>

      {/* Recent payments & pending requests */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-navy-950">Últimos pagos</h2>
          </div>
          <ul className="divide-y divide-gray-50">
            {recentPayments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-950 truncate">{p.user.name ?? p.user.email}</p>
                  <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 shrink-0">{formatPrice(p.amount, p.currency)}</span>
              </li>
            ))}
          </ul>
        </div>

        {pendingRequests > 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <h2 className="font-bold text-navy-950">Solicitudes pendientes</h2>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">{pendingRequests}</span>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Hay <strong className="text-navy-950">{pendingRequests}</strong> solicitudes de profesor esperando tu revisión.
              </p>
              <a
                href="/admin/profesores"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                Revisar solicitudes →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
