import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CourseCard } from "@/components/courses/course-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { PlayerLevel, PriceModel, Prisma } from "@prisma/client";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { CourseFilters } from "@/components/courses/course-filters";

const PAGE_SIZE = 12;

interface SearchParams {
  nivel?: string;
  precio?: string;
  profesor?: string;
  q?: string;
  page?: string;
}

async function getCourses(params: SearchParams, userId?: string) {
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const levelMap: Record<string, PlayerLevel> = {
    principiante: "BEGINNER",
    intermedio: "INTERMEDIATE",
    avanzado: "ADVANCED",
    experto: "EXPERT",
  };

  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
  };

  if (params.nivel && levelMap[params.nivel]) {
    where.level = levelMap[params.nivel];
  }

  if (params.precio === "gratis") {
    where.priceModel = "FREE";
  } else if (params.precio === "pago") {
    where.priceModel = { in: ["ONE_TIME", "SUBSCRIPTION", "FREEMIUM", "INDIVIDUAL_CLASS"] };
  }

  if (params.profesor) {
    where.teacherProfile = {
      userId: params.profesor,
    };
  }

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { tags: { has: params.q } },
    ];
  }

  const [courses, total] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: { totalStudents: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        teacherProfile: { include: { user: { select: { id: true, name: true, image: true } } } },
        enrollments: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        _count: { select: { enrollments: true } },
      },
    }),
    db.course.count({ where }),
  ]);

  return { courses, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

async function getTeachersForFilter() {
  return db.user.findMany({
    where: {
      role: "PROFESOR",
      teacherProfile: { isNot: null },
    },
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  });
}

export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const [{ courses, total, page, totalPages }, teachers] = await Promise.all([
    getCourses(params, userId),
    getTeachersForFilter(),
  ]);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams();
    if (params.nivel) sp.set("nivel", params.nivel);
    if (params.precio) sp.set("precio", params.precio);
    if (params.profesor) sp.set("profesor", params.profesor);
    if (params.q) sp.set("q", params.q);
    sp.set("page", String(p));
    return `/cursos?${sp.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-navy-700" />
          Catálogo de cursos
        </h1>
        <p className="text-gray-500 mt-1">
          {total} {total === 1 ? "curso disponible" : "cursos disponibles"}
          {params.q ? ` para "${params.q}"` : ""}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de filtros */}
        <aside className="w-full lg:w-64 shrink-0">
          <CourseFilters teachers={teachers} currentParams={params} />
        </aside>

        {/* Grid de cursos */}
        <div className="flex-1">
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-6xl mb-4 select-none">♣</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron cursos</h3>
              <p className="text-gray-500 mb-4">
                Intentá con otros filtros o términos de búsqueda.
              </p>
              <Link href="/cursos">
                <Button variant="outline" size="sm">Limpiar filtros</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={{
                      id: course.id,
                      title: course.title,
                      thumbnail: course.thumbnail,
                      priceModel: course.priceModel,
                      price: course.price,
                      level: course.level,
                      averageRating: course.averageRating,
                      reviewCount: course.reviewCount,
                      totalDuration: course.totalDuration,
                      totalStudents: course.totalStudents,
                      teacher: {
                        name: course.teacherProfile.user.name,
                        image: course.teacherProfile.user.image,
                      },
                      isEnrolled: Array.isArray(course.enrollments)
                        ? course.enrollments.length > 0
                        : false,
                    }}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  {hasPrev ? (
                    <Link href={buildPageUrl(page - 1)}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                  )}

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <Link key={p} href={buildPageUrl(p)}>
                          <Button
                            variant={p === page ? "bridge" : "ghost"}
                            size="sm"
                            className="w-9 h-9 p-0"
                          >
                            {p}
                          </Button>
                        </Link>
                      );
                    })}
                    {totalPages > 7 && (
                      <span className="px-2 text-gray-400">…{totalPages}</span>
                    )}
                  </div>

                  {hasNext ? (
                    <Link href={buildPageUrl(page + 1)}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Siguiente
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="gap-1">
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
