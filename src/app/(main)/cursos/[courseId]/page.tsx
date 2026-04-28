import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Users,
  Clock,
  BookOpen,
  Play,
  Lock,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { formatPrice, getInitials, levelLabel } from "@/lib/utils";
import type { PlayerLevel } from "@prisma/client";
import { FollowButton } from "@/components/courses/follow-button";
import { EnrollButton } from "@/components/courses/enroll-button";
import { ModuleAccordion } from "@/components/courses/module-accordion";

const LEVEL_BADGE: Record<PlayerLevel, "principiante" | "intermedio" | "avanzado" | "experto"> = {
  BEGINNER: "principiante",
  INTERMEDIATE: "intermedio",
  ADVANCED: "avanzado",
  EXPERT: "experto",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function getCourseData(courseId: string, userId?: string) {
  const course = await db.course.findFirst({
    where: {
      id: courseId,
      status: "PUBLISHED",
    },
    include: {
      teacherProfile: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              bio: true,
              followers: userId
                ? { where: { followerId: userId }, select: { id: true } }
                : false,
            },
          },
        },
      },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              duration: true,
              isPreview: true,
              status: true,
              order: true,
              type: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      enrollments: userId
        ? { where: { userId, isActive: true }, select: { id: true } }
        : false,
      _count: { select: { enrollments: true, reviews: true } },
    },
  });

  return course;
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${
            s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const course = await getCourseData(courseId, userId);
  if (!course) notFound();

  const isEnrolled = Array.isArray(course.enrollments)
    ? course.enrollments.length > 0
    : false;
  const isFollowing = Array.isArray(course.teacherProfile.user.followers)
    ? course.teacherProfile.user.followers.length > 0
    : false;

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const previewLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.isPreview).length,
    0
  );

  // Rating distribution mock (real: compute from reviews)
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: course.reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        {course.thumbnail && (
          <div className="absolute inset-0 opacity-15">
            <Image src={course.thumbnail} alt="" fill className="object-cover" priority />
          </div>
        )}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={LEVEL_BADGE[course.level]}>{levelLabel(course.level)}</Badge>
              {course.language && (
                <Badge variant="secondary" className="text-xs">
                  {course.language.toUpperCase()}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              {course.title}
            </h1>
            <p className="text-gray-300 text-base mb-5 line-clamp-3">{course.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              {course.averageRating > 0 && (
                <span className="flex items-center gap-1.5">
                  <StarRating rating={course.averageRating} size="sm" />
                  <span className="font-semibold text-yellow-400">
                    {course.averageRating.toFixed(1)}
                  </span>
                  <span>({course._count.reviews} reseñas)</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.totalStudents.toLocaleString()} alumnos
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {totalLessons} clases
              </span>
              {course.totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(course.totalDuration)} en total
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenido principal ──────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Columna izquierda */}
          <div className="flex-1 min-w-0 space-y-10">

            {/* ── Sobre el profesor ─────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sobre el profesor</h2>
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarImage src={course.teacherProfile.user.image ?? undefined} />
                  <AvatarFallback className="bg-gray-200 text-sm font-semibold">
                    {getInitials(course.teacherProfile.user.name ?? "P")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {course.teacherProfile.user.name}
                    </h3>
                    {userId && userId !== course.teacherProfile.user.id && (
                      <FollowButton
                        targetUserId={course.teacherProfile.user.id}
                        initialIsFollowing={isFollowing}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {course.teacherProfile.averageRating.toFixed(1)} rating
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course.teacherProfile.totalStudents} alumnos
                    </span>
                  </div>
                  {course.teacherProfile.user.bio && (
                    <p className="text-sm text-gray-600">{course.teacherProfile.user.bio}</p>
                  )}
                  {course.teacherProfile.bio && !course.teacherProfile.user.bio && (
                    <p className="text-sm text-gray-600">{course.teacherProfile.bio}</p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Módulos y clases ──────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Contenido del curso</h2>
                <p className="text-sm text-gray-500">
                  {course.modules.length} módulos · {totalLessons} clases
                  {previewLessons > 0 && ` · ${previewLessons} previews`}
                </p>
              </div>
              <ModuleAccordion
                modules={course.modules.map((mod) => ({
                  id: mod.id,
                  title: mod.title,
                  order: mod.order,
                  lessons: mod.lessons.map((l) => ({
                    id: l.id,
                    title: l.title,
                    duration: l.duration,
                    isPreview: l.isPreview,
                    type: l.type,
                    order: l.order,
                  })),
                }))}
                isEnrolled={isEnrolled}
                courseId={courseId}
                priceModel={course.priceModel}
                freemiumCount={course.freemiumCount}
              />
            </section>

            {/* ── Reseñas ───────────────────────────────────── */}
            {course.reviews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Reseñas</h2>
                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                  {/* Promedio global */}
                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-6 min-w-[120px]">
                    <p className="text-5xl font-bold text-gray-900">
                      {course.averageRating.toFixed(1)}
                    </p>
                    <StarRating rating={course.averageRating} size="md" />
                    <p className="text-xs text-gray-400 mt-1">
                      {course._count.reviews} reseñas
                    </p>
                  </div>
                  {/* Distribución */}
                  <div className="flex-1 space-y-1.5">
                    {ratingCounts.map(({ star, count }) => {
                      const pct = course._count.reviews > 0
                        ? Math.round((count / course._count.reviews) * 100)
                        : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-right text-gray-500">{star}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-yellow-400 h-1.5 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-gray-400">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de reseñas */}
                <div className="space-y-4">
                  {course.reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={review.user.image ?? undefined} />
                          <AvatarFallback className="text-xs bg-gray-200">
                            {getInitials(review.user.name ?? "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {review.user.name}
                            </span>
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600">{review.comment}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(review.createdAt).toLocaleDateString("es-AR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar de compra ─────────────────────────────── */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-20">
              <div className="rounded-xl border bg-white shadow-lg overflow-hidden">
                {/* Thumbnail pequeño */}
                {course.thumbnail && (
                  <div className="relative aspect-video">
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-5 h-5 text-gray-900 ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-4">
                  {/* Precio */}
                  <div>
                    {course.priceModel === "FREE" && (
                      <p className="text-2xl font-bold text-green-600">Gratis</p>
                    )}
                    {course.priceModel === "FREEMIUM" && (
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Freemium</p>
                        <p className="text-sm text-gray-500">
                          {course.freemiumCount} clases gratis · completo{" "}
                          {course.price ? formatPrice(course.price) : ""}
                        </p>
                      </div>
                    )}
                    {course.priceModel === "ONE_TIME" && course.price != null && (
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(course.price)}
                      </p>
                    )}
                    {course.priceModel === "SUBSCRIPTION" && (
                      <div>
                        <p className="text-lg font-bold text-purple-700">Suscripción</p>
                        {course.price && (
                          <p className="text-sm text-gray-500">
                            {formatPrice(course.price)}/mes
                          </p>
                        )}
                      </div>
                    )}
                    {course.priceModel === "INDIVIDUAL_CLASS" && (
                      <div>
                        <p className="text-lg font-bold text-gray-900">Por clase</p>
                        {course.price && (
                          <p className="text-sm text-gray-500">
                            desde {formatPrice(course.price)} c/u
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botón de acción */}
                  {isEnrolled ? (
                    <Link href={`/cursos/${courseId}/aprender`} className="block">
                      <Button className="w-full gap-2" variant="bridge" size="lg">
                        <Play className="w-4 h-4" />
                        Continuar aprendiendo
                      </Button>
                    </Link>
                  ) : (
                    <EnrollButton
                      courseId={courseId}
                      priceModel={course.priceModel}
                      price={course.price}
                      isLoggedIn={!!userId}
                    />
                  )}

                  {/* Garantías */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      Acceso de por vida
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {previewLessons > 0
                        ? `${previewLessons} clases de preview gratis`
                        : "Material de apoyo incluido"}
                    </p>
                    {course.hasCertificate && (
                      <p className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        Certificado de finalización
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                      {course.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
