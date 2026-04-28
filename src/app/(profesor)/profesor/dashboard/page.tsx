import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Star, BookOpen, AlertCircle } from "lucide-react";
import { ProfesorIncomesChart } from "@/components/profesor/incomes-chart";
import { subDays, startOfDay, format } from "date-fns";

export const dynamic = "force-dynamic";

async function getTeacherProfile(userId: string) {
  return db.teacherProfile.findUnique({
    where: { userId },
    include: {
      courses: {
        where: { status: "PUBLISHED" },
        include: {
          enrollments: { include: { user: { select: { id: true, name: true, image: true, lastActiveAt: true } } } },
          modules: { include: { lessons: true } },
        },
      },
      withdrawals: true,
    },
  });
}

export default async function ProfesorDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getTeacherProfile(session.user.id);
  if (!profile) redirect("/");

  const thirtyDaysAgo = subDays(new Date(), 30);
  const sevenDaysAgo = subDays(new Date(), 7);
  const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Monthly income
  const monthlyPayments = await db.payment.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: startOfThisMonth },
      enrollments: {
        some: {
          course: { teacherProfileId: profile.id },
        },
      },
    },
  });
  const monthlyIncome = monthlyPayments.reduce((s, p) => s + p.teacherRevenue, 0);

  // Income last 30 days (grouped by day)
  const payments30Days = await db.payment.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: thirtyDaysAgo },
      enrollments: {
        some: {
          course: { teacherProfileId: profile.id },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const incomeByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "dd/MM");
    incomeByDay[d] = 0;
  }
  for (const p of payments30Days) {
    const key = format(p.createdAt, "dd/MM");
    if (key in incomeByDay) incomeByDay[key] += p.teacherRevenue;
  }
  const chartData = Object.entries(incomeByDay).map(([date, income]) => ({ date, income }));

  // Last enrollments
  const lastEnrollments = await db.enrollment.findMany({
    where: { course: { teacherProfileId: profile.id } },
    orderBy: { purchasedAt: "desc" },
    take: 10,
    include: {
      user: { select: { name: true, email: true, image: true } },
      course: { select: { title: true } },
      payment: { select: { amount: true } },
    },
  });

  // Top 3 courses by completion rate
  const courseIds = profile.courses.map((c) => c.id);
  const topCourses = await Promise.all(
    profile.courses.slice(0, 5).map(async (course) => {
      const totalLessons = course.modules.flatMap((m) => m.lessons).length;
      if (!totalLessons || !course.totalStudents) return { ...course, completionRate: 0 };

      const completedProgress = await db.progress.count({
        where: {
          completed: true,
          lesson: { module: { courseId: course.id } },
        },
      });
      const completionRate = course.totalStudents > 0
        ? Math.round((completedProgress / (course.totalStudents * totalLessons)) * 100)
        : 0;
      return { ...course, completionRate };
    })
  );
  const top3 = topCourses.sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);

  // Inactive students (>7 days)
  const inactiveStudents = await db.user.findMany({
    where: {
      enrollments: { some: { course: { teacherProfileId: profile.id } } },
      OR: [
        { lastActiveAt: { lt: sevenDaysAgo } },
        { lastActiveAt: null },
      ],
    },
    select: { id: true, name: true, email: true, image: true, lastActiveAt: true },
    take: 5,
  });

  const publishedCoursesCount = profile.courses.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bienvenido, {session.user.name}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Alumnos totales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{profile.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ingresos del mes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(monthlyIncome)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Calificación promedio</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "—"}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cursos publicados</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{publishedCoursesCount}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingresos últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfesorIncomesChart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last enrollments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas inscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            {lastEnrollments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin inscripciones aún</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Alumno</th>
                      <th className="pb-2 font-medium">Curso</th>
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lastEnrollments.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            {e.user.image ? (
                              <img src={e.user.image} className="w-6 h-6 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                {e.user.name?.[0] ?? "?"}
                              </div>
                            )}
                            <span className="font-medium text-gray-900 truncate max-w-[100px]">{e.user.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600 truncate max-w-[120px]">{e.course.title}</td>
                        <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{formatDate(e.purchasedAt)}</td>
                        <td className="py-2.5 text-right font-medium text-gray-900">
                          {formatPrice(e.payment?.amount ?? e.pricePaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 courses by completion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top cursos por completitud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {top3.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin cursos publicados aún</p>
            ) : (
              top3.map((course, idx) => (
                <div key={course.id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-6">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${course.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{course.completionRate}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inactive students */}
      {inactiveStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Alumnos inactivos (&gt;7 días)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {student.image ? (
                      <img src={student.image} className="w-8 h-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {student.name?.[0] ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {student.lastActiveAt
                      ? `Última actividad: ${formatDate(student.lastActiveAt)}`
                      : "Sin actividad registrada"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
