import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeedClient } from "./feed-client";

export const metadata: Metadata = {
  title: "Feed — Comunidad",
  description:
    "El feed de la comunidad Bridge Academy. Comparte manos, analiza jugadas y conecta con otros jugadores.",
};

export default async function FeedPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Initial server-side fetch: public posts for "para-ti" tab
  const initialPosts = await db.feedPost.findMany({
    where: userId
      ? {
          OR: [
            { visibility: "PUBLIC" },
            {
              visibility: "GROUP",
              group: { members: { some: { userId } } },
            },
          ],
        }
      : { visibility: "PUBLIC" },
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
          username: true,
        },
      },
      group: { select: { id: true, name: true } },
      handRecord: {
        select: { id: true, title: true, pbnData: true, description: true },
      },
      reactions: { select: { userId: true, type: true } },
      comments: {
        where: { parentId: null },
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true, username: true },
          },
          replies: {
            take: 2,
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true, image: true, role: true, username: true },
              },
            },
          },
        },
      },
      favorites: userId ? { where: { userId, entityType: "POST" }, select: { id: true } } : false,
      _count: { select: { comments: true, reactions: true } },
    },
  });

  // Fetch user's group memberships for CreatePost
  let userGroups: { id: string; name: string }[] = [];
  if (userId) {
    const memberships = await db.groupMember.findMany({
      where: { userId },
      include: { group: { select: { id: true, name: true } } },
    });
    userGroups = memberships.map((m) => m.group);
  }

  // Serialize dates for client
  const serialized = JSON.parse(JSON.stringify(initialPosts));

  return (
    <FeedClient
      initialPosts={serialized}
      sessionUserId={userId}
      userGroups={userGroups}
      isAuthenticated={!!session}
    />
  );
}
