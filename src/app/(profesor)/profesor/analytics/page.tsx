import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TrendingUp, Users, BookOpen, Award } from "lucide-react";
import { AdminRevenueChart as RevenueChart } from "@/components/admin/revenue-chart";

export const metadata = { title: "Analytics — Profesor" };

export default async function ProfesorAnalyticsPage() {
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
    include: {
      enrollments: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { enrollments: true } },
    },
  });

  const courseIds = courses.map((c) => c.id);

  const progresses = await db.progress.findMany({
    where: { lesson: { module: { courseId: { in: courseIds } } } },
    select: { completed: true, lesson: { select: { module: { select: { courseId: true } } } } },
  });

  const quizAttempts = await db.quizAttempt.findMany({
    where: { quiz: { courseId: { in: courseIds } } },
    select: { passed: true, score: true },
  });

  const totalStudents = courses.reduce((s, c) => s + c._count.enrollments, 0);
  const completedEnrollments = await db.enrollment.count({
    where: { courseId: { in: courseIds }, isActive: true },
  });
  const completionRate = totalStudents > 0 ? Math.round((completedEnrollments / totalStudents) * 100) : 0;
  const quizPassRate = quizAttempts.length > 0
    ? Math.round((quizAttempts.filter((a) => a.passed).length / quizAttempts.length) * 100)
    : 0;

  const revenueData = await db.payment.groupBy({
    by: ["createdAt"],
    where: {
      status: "COMPLETED",
      enrollments: { some: { courseId: { in: courseIds } } },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { teacherRevenue: true },
  });

  const chartData = revenueData.map((d) => ({
    date: d.createdAt.toISOString().split("T")[0],
    revenue: d._sum.teacherRevenue ?? 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-navy-700" /> Analytics
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: "Alumnos totales", value: totalStudents },
          { icon: BookOpen, label: "Cursos activos", value: courses.filter((c) => c.status === "PUBLISHED").length },
          { icon: Award, label: "Tasa completación", value: `${completionRate}%` },
          { icon: TrendingUp, label: "Aprobación quizzes", value: `${quizPassRate}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl border p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-2 text-navy-600" />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Ingresos últimos 30 días</h2>
        <RevenueChart data={chartData} />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Cursos por rendimiento</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Curso</th>
              <th className="px-5 py-3 text-right">Alumnos</th>
              <th className="px-5 py-3 text-right">Completados</th>
              <th className="px-5 py-3 text-right">Lecciones</th>
              <th className="px-5 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {courses.map((c) => {
              const completed = progresses.filter(
                (p) => p.lesson.module.courseId === c.id && p.completed
              ).length;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.title}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{c._count.enrollments}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{c.totalLessons}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {c.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {courses.length === 0 && (
          <p className="text-center text-gray-400 py-8">Sin cursos creados aún.</p>
        )}
      </div>
    </div>
  );
}
