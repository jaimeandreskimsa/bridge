import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, Star, Clock, BarChart3, Calendar, Flame, Settings } from "lucide-react";
import { getInitials, levelLabel } from "@/lib/utils";
import type { PlayerLevel } from "@prisma/client";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { EditProfileButton } from "@/components/profile/edit-profile-button";

const LEVEL_BADGE: Record<PlayerLevel, "principiante" | "intermedio" | "avanzado" | "experto"> = {
  BEGINNER: "principiante", INTERMEDIATE: "intermedio", ADVANCED: "avanzado", EXPERT: "experto",
};

async function getProfileData(userId: string) {
  const [user, playerLevel, enrollments, progressStats, favorites, recentActivity] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true, bio: true, streak: true, createdAt: true },
      }),
      db.playerLevel_.findUnique({ where: { userId }, select: { level: true } }),
      db.enrollment.findMany({
        where: { userId, isActive: true },
        orderBy: { purchasedAt: "desc" },
        include: {
          course: {
            select: {
              id: true, title: true, thumbnail: true, totalLessons: true, totalDuration: true, level: true,
              teacherProfile: { include: { user: { select: { name: true, image: true } } } },
            },
          },
        },
      }),
      db.progress.count({ where: { userId, completed: true } }),
      db.favorite.findMany({
        where: { userId, entityType: "course" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          course: {
            select: {
              id: true, title: true, thumbnail: true, level: true, averageRating: true,
              reviewCount: true, totalDuration: true, totalStudents: true, priceModel: true, price: true,
              teacherProfile: { include: { user: { select: { name: true, image: true } } } },
            },
          },
        },
      }),
      db.feedPost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, content: true, type: true, createdAt: true, _count: { select: { reactions: true, comments: true } } },
      }),
    ]);

  const enrollmentsWithProgress = await Promise.all(
    enrollments.map(async (enrollment) => {
      if (enrollment.course.totalLessons === 0) return { ...enrollment, progressPct: 0, completedLessons: 0 };
      const completed = await db.progress.count({
        where: { userId, completed: true, lesson: { module: { courseId: enrollment.courseId } } },
      });
      return { ...enrollment, progressPct: Math.round((completed / enrollment.course.totalLessons) * 100), completedLessons: completed };
    })
  );

  const completedCourses = enrollmentsWithProgress.filter((e) => e.progressPct === 100).length;
  return { user, playerLevel, enrollments: enrollmentsWithProgress, completedLessons: progressStats, completedCourses, favorites, recentActivity };
}

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getProfileData(session.user.id);
  const { user, playerLevel, enrollments, completedLessons, completedCourses, favorites, recentActivity } = data;
  if (!user) redirect("/login");

  const level = playerLevel?.level ?? "BEGINNER";
  const memberSince = new Date(user.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long" });

  const stats = [
    { icon: <BookOpen className="w-4 h-4 text-blue-500" />,   value: enrollments.length,  label: "Inscritos",    bg: "bg-blue-50" },
    { icon: <Star className="w-4 h-4 text-[#C9A23A]" />,      value: completedCourses,    label: "Completados",  bg: "bg-amber-50" },
    { icon: <BarChart3 className="w-4 h-4 text-emerald-500" />,value: completedLessons,    label: "Lecciones",    bg: "bg-emerald-50" },
    { icon: <Flame className="w-4 h-4 text-orange-500" />,    value: user.streak,         label: "Racha días",   bg: "bg-orange-50" },
  ];

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Profile header card */}
        <div className="rounded-[18px] p-[1.5px] bg-gradient-to-br from-slate-200 via-[#C9A23A]/20 to-[#0F1C3F]/10 shadow-sm mb-8 animate-fade-in">
          <div className="bg-white rounded-[16.5px] overflow-hidden">

            {/* Cover gradient */}
            <div className="h-32 bg-gradient-to-r from-[#0F1C3F] via-[#1E3A5F] to-[#0F1C3F] relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#C9A23A 1px, transparent 1px), linear-gradient(90deg, #C9A23A 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              <span className="absolute right-8 top-4 text-[80px] font-bold text-white/5 leading-none select-none">♠</span>
            </div>

            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 mb-4">
                <Avatar className="h-24 w-24 border-4 border-white shadow-xl shrink-0">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="bg-[#0F1C3F] text-white text-2xl font-extrabold">
                    {getInitials(user.name ?? user.email ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 pt-2 sm:pt-10">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-extrabold text-slate-900 truncate">{user.name ?? user.email}</h1>
                    <Badge variant={LEVEL_BADGE[level as PlayerLevel]}>{levelLabel(level)}</Badge>
                  </div>
                  <p className="text-sm text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Miembro desde {memberSince}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-0 sm:pt-10">
                  <EditProfileButton />
                  <Link href="/configuracion" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 rounded-xl px-3 py-2 bg-white hover:bg-slate-50">
                    <Settings className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Config.</span>
                  </Link>
                </div>
              </div>

              {user.bio && (
                <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">{user.bio}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                {stats.map((s) => (
                  <div key={s.label} className={`flex items-center gap-3 rounded-2xl ${s.bg} px-3 py-3`}>
                    <div>{s.icon}</div>
                    <div>
                      <p className="text-xl font-extrabold text-slate-900 leading-none">{s.value}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ProfileTabs
          enrollments={enrollments.map((e) => ({
            id: e.id, courseId: e.courseId, purchasedAt: e.purchasedAt,
            progressPct: e.progressPct, completedLessons: e.completedLessons,
            course: {
              id: e.course.id, title: e.course.title, thumbnail: e.course.thumbnail,
              totalLessons: e.course.totalLessons, totalDuration: e.course.totalDuration, level: e.course.level,
              teacher: { name: e.course.teacherProfile.user.name, image: e.course.teacherProfile.user.image },
            },
          }))}
          favorites={favorites.filter((f) => f.course != null).map((f) => ({
            id: f.id,
            course: {
              id: f.course!.id, title: f.course!.title, thumbnail: f.course!.thumbnail,
              level: f.course!.level, averageRating: f.course!.averageRating, reviewCount: f.course!.reviewCount,
              totalDuration: f.course!.totalDuration, totalStudents: f.course!.totalStudents,
              priceModel: f.course!.priceModel, price: f.course!.price,
              teacher: { name: f.course!.teacherProfile.user.name, image: f.course!.teacherProfile.user.image },
            },
          }))}
          recentActivity={recentActivity.map((p) => ({
            id: p.id, content: p.content, type: p.type, createdAt: p.createdAt,
            reactions: p._count.reactions, comments: p._count.comments,
          }))}
        />
      </div>
    </div>
  );
}
