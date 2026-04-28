import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Award, BookOpen, Users, MessageSquare } from "lucide-react";
import Link from "next/link";
import { levelLabel, roleLabel, formatDate } from "@/lib/utils";
import { FollowButton } from "./follow-button";

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      role: true,
      createdAt: true,
      playerLevel: {
        select: { level: true, reputationPoints: true, currentStreak: true },
      },
      teacherProfile: {
        select: {
          bio: true,
          averageRating: true,
          courses: {
            where: { status: "PUBLISHED" },
            select: { id: true, title: true, level: true, thumbnail: true, _count: { select: { enrollments: true } } },
            take: 6,
          },
        },
      },
      badges: {
        include: { badge: true },
        orderBy: { awardedAt: "desc" },
        take: 6,
      },
      _count: {
        select: { followers: true, following: true, feedPosts: true },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === userId;

  let isFollowing = false;
  if (session?.user && !isOwnProfile) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
    });
    isFollowing = !!follow;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center shrink-0 overflow-hidden">
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-navy-700">{user.name?.[0]?.toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full font-medium">
                    {roleLabel(user.role)}
                  </span>
                  {user.playerLevel && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      {levelLabel(user.playerLevel.level)}
                    </span>
                  )}
                </div>
              </div>

              {!isOwnProfile && session?.user && (
                <div className="flex items-center gap-2">
                  <FollowButton userId={userId} initialFollowing={isFollowing} />
                  <Link
                    href={`/chat?user=${userId}`}
                    className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Mensaje
                  </Link>
                </div>
              )}
              {isOwnProfile && (
                <Link href="/perfil" className="text-sm text-navy-700 hover:underline">Editar perfil</Link>
              )}
            </div>

            {user.bio && <p className="text-sm text-gray-600 mt-2">{user.bio}</p>}

            <div className="flex items-center gap-5 mt-3 text-sm text-gray-500">
              <span><strong className="text-gray-900">{user._count.followers}</strong> seguidores</span>
              <span><strong className="text-gray-900">{user._count.following}</strong> siguiendo</span>
              <span><strong className="text-gray-900">{user._count.feedPosts}</strong> publicaciones</span>
            </div>

            {user.playerLevel && (
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>⭐ {user.playerLevel.reputationPoints} puntos</span>
                <span>🔥 Racha: {user.playerLevel.currentStreak} días</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {user.badges.length > 0 && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-yellow-500" /> Insignias
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges.map((ub) => (
              <div key={ub.id} title={ub.badge.description} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                <span className="text-lg">{ub.badge.icon}</span>
                <span className="text-xs font-medium text-gray-700">{ub.badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user.teacherProfile && user.teacherProfile.courses.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-navy-600" /> Cursos del instructor
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {user.teacherProfile.courses.map((c) => (
              <Link
                key={c.id}
                href={`/cursos/${c.id}`}
                className="border rounded-lg p-3 hover:border-navy-300 transition-colors"
              >
                {c.thumbnail && (
                  <img src={c.thumbnail} alt={c.title} className="w-full h-24 object-cover rounded-lg mb-2" />
                )}
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{c.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{levelLabel(c.level)}</span>
                  <span className="text-xs text-gray-400">{c._count.enrollments} alumnos</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
