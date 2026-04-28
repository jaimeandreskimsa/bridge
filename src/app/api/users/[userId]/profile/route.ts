import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
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
        select: { level: true, reputationPoints: true, currentStreak: true, bestStreak: true },
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
        select: {
          followers: true,
          following: true,
          feedPosts: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ user });
}
