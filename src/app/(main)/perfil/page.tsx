import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Star, Clock, BarChart3, Calendar, Users } from "lucide-react";
import { getInitials, levelLabel, formatRelativeTime } from "@/lib/utils";
import type { PlayerLevel } from "@prisma/client";
import { ProfileTabs } from "@/components/profile/profile-tabs";

const LEVEL_BADGE: Record<
  PlayerLevel,
  "principiante" | "intermedio" | "avanzado" | "experto"
> = {
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

async function getProfileData(userId: string) {
  const [user, playerLevel, enrollments, progressStats, favorites, recentActivity] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          streak: true,
          createdAt: true,
        },
      }),
      db.playerLevel_.findUnique({
        where: { userId },
        select: { level: true },
      }),
      db.enrollment.findMany({
        where: { userId, isActive: true },
        orderBy: { purchasedAt: "desc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              totalLessons: true,
              totalDuration: true,
              level: true,
              teacherProfile: {
                include: {
                  user: { select: { name: true, image: true } },
                },
              },
            },
          },
        },
      }),
      // Stats de progreso: lecciones completadas
      db.progress.count({
        where: { userId, completed: true },
      }),
      // Favoritos (cursos)
      db.favorite.findMany({
        where: { userId, entityType: "course" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              level: true,
              averageRating: true,
              reviewCount: true,
              totalDuration: true,
              totalStudents: true,
              priceModel: true,
              price: true,
              teacherProfile: {
                include: {
                  user: { select: { name: true, image: true } },
                },
              },
            },
          },
        },
      }),
      // Actividad reciente (posts del feed)
      db.feedPost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          _count: { select: { reactions: true, comments: true } },
        },
      }),
    ]);

  // Para cada enrollment, calcular progreso %
  const enrollmentsWithProgress = await Promise.all(
    enrollments.map(async (enrollment) => {
      if (enrollment.course.totalLessons === 0) {
        return { ...enrollment, progressPct: 0, completedLessons: 0 };
      }
      const completed = await db.progress.count({
        where: {
          userId,
          completed: true,
          lesson: { module: { courseId: enrollment.courseId } },
        },
      });
      const progressPct = Math.round(
        (completed / enrollment.course.totalLessons) * 100
      );
      return { ...enrollment, progressPct, completedLessons: completed };
    })
  );

  const completedCourses = enrollmentsWithProgress.filter(
    (e) => e.progressPct === 100
  ).length;

  return {
    user,
    playerLevel,
    enrollments: enrollmentsWithProgress,
    completedLessons: progressStats,
    completedCourses,
    favorites,
    recentActivity,
  };
}

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getProfileData(session.user.id);
  const { user, playerLevel, enrollments, completedLessons, completedCourses, favorites, recentActivity } = data;

  if (!user) redirect("/login");

  const level = playerLevel?.level ?? "BEGINNER";
  const memberSince = new Date(user.createdAt).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Header del perfil ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-8">
        {/* Cover */}
        <div className="h-28 bg-gradient-to-r from-[#1e3a5f] via-[#2d5282] to-[#1e3a5f]" />

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 mb-4">
            {/* Avatar */}
            <Avatar className="h-20 w-20 border-4 border-white shadow-md shrink-0">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-[#2d5282] text-white text-xl font-bold">
                {getInitials(user.name ?? user.email ?? "U")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 pt-2 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {user.name ?? user.email}
                </h1>
                <Badge variant={LEVEL_BADGE[level as PlayerLevel]}>
                  {levelLabel(level)}
                </Badge>
              </div>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Miembro desde {memberSince}
              </p>
            </div>

            {/* Botón editar perfil */}
            <EditProfileButton />
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{user.bio}</p>
          )}

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <StatBox
              icon={<BookOpen className="w-4 h-4 text-[#2d5282]" />}
              value={enrollments.length}
              label="Cursos inscritos"
            />
            <StatBox
              icon={<Star className="w-4 h-4 text-yellow-500" />}
              value={completedCourses}
              label="Cursos completados"
            />
            <StatBox
              icon={<BarChart3 className="w-4 h-4 text-green-600" />}
              value={completedLessons}
              label="Lecciones completadas"
            />
            <StatBox
              icon={<Clock className="w-4 h-4 text-purple-600" />}
              value={user.streak}
              label="Racha de días"
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <ProfileTabs
        enrollments={enrollments.map((e) => ({
          id: e.id,
          courseId: e.courseId,
          purchasedAt: e.purchasedAt,
          progressPct: e.progressPct,
          completedLessons: e.completedLessons,
          course: {
            id: e.course.id,
            title: e.course.title,
            thumbnail: e.course.thumbnail,
            totalLessons: e.course.totalLessons,
            totalDuration: e.course.totalDuration,
            level: e.course.level,
            teacher: {
              name: e.course.teacherProfile.user.name,
              image: e.course.teacherProfile.user.image,
            },
          },
        }))}
        favorites={favorites
          .filter((f) => f.course != null)
          .map((f) => ({
            id: f.id,
            course: {
              id: f.course!.id,
              title: f.course!.title,
              thumbnail: f.course!.thumbnail,
              level: f.course!.level,
              averageRating: f.course!.averageRating,
              reviewCount: f.course!.reviewCount,
              totalDuration: f.course!.totalDuration,
              totalStudents: f.course!.totalStudents,
              priceModel: f.course!.priceModel,
              price: f.course!.price,
              teacher: {
                name: f.course!.teacherProfile.user.name,
                image: f.course!.teacherProfile.user.image,
              },
            },
          }))}
        recentActivity={recentActivity.map((p) => ({
          id: p.id,
          content: p.content,
          type: p.type,
          createdAt: p.createdAt,
          reactions: p._count.reactions,
          comments: p._count.comments,
        }))}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50">
      <div className="mb-1">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// Client component stub — defined in a separate file below
import { EditProfileButton } from "@/components/profile/edit-profile-button";
