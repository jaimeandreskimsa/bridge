import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BarChart2, Pencil, Archive, Users, Star, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  UNDER_REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-red-100 text-red-700",
};

export default async function MisCursosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await db.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/");

  const courses = await db.course.findMany({
    where: { teacherProfileId: profile.id },
    include: {
      _count: { select: { enrollments: true, reviews: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate income per course
  const courseIncomes = await Promise.all(
    courses.map(async (course) => {
      const result = await db.payment.aggregate({
        where: {
          status: "COMPLETED",
          enrollments: { some: { courseId: course.id } },
        },
        _sum: { teacherRevenue: true },
      });
      return { courseId: course.id, income: result._sum.teacherRevenue ?? 0 };
    })
  );
  const incomeMap = Object.fromEntries(courseIncomes.map((c) => [c.courseId, c.income]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-gray-500 mt-1">{courses.length} curso{courses.length !== 1 ? "s" : ""} en total</p>
        </div>
        <Button asChild>
          <Link href="/profesor/cursos/crear">
            <PlusCircle className="w-4 h-4" />
            Crear nuevo curso
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <BookOpenIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-gray-700">Aún no tienes cursos</p>
              <p className="text-sm text-gray-400 mt-1">Crea tu primer curso para comenzar a enseñar</p>
            </div>
            <Button asChild>
              <Link href="/profesor/cursos/crear">
                <PlusCircle className="w-4 h-4" />
                Crear primer curso
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:border-gray-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-20 h-14 rounded-lg object-cover shrink-0 border border-gray-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{course.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[course.status]}`}
                        >
                          {STATUS_LABELS[course.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{course.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {course.totalStudents} alumnos
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          {course.averageRating > 0 ? course.averageRating.toFixed(1) : "Sin rating"}
                          {course._count.reviews > 0 && ` (${course._count.reviews})`}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatPrice(incomeMap[course.id] ?? 0)} generados
                        </span>
                        <span>Actualizado {formatDate(course.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/profesor/cursos/${course.id}/editar`}>
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/profesor/analytics?courseId=${course.id}`}>
                        <BarChart2 className="w-3.5 h-3.5" />
                        Analytics
                      </Link>
                    </Button>
                    {course.status !== "ARCHIVED" && (
                      <ArchiveCourseButton courseId={course.id} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ArchiveCourseButton({ courseId }: { courseId: string }) {
  return (
    <form action={async () => {
      "use server";
      const { auth } = await import("@/lib/auth");
      const { db } = await import("@/lib/db");
      const session = await auth();
      if (!session?.user) return;
      const profile = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
      if (!profile) return;
      await db.course.updateMany({
        where: { id: courseId, teacherProfileId: profile.id },
        data: { status: "ARCHIVED" },
      });
    }}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors"
      >
        <Archive className="w-3.5 h-3.5" />
        Archivar
      </button>
    </form>
  );
}
