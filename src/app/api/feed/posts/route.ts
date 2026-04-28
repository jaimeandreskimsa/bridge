import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().min(1, "El contenido es requerido").max(5000),
  type: z.enum(["TEXT", "IMAGE", "VIDEO_CLIP", "HAND_RECORD"]).default("TEXT"),
  imageUrls: z.array(z.string().url()).max(4).optional().default([]),
  videoUrl: z.string().url().optional().nullable(),
  handRecordId: z.string().optional().nullable(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]).default("PUBLIC"),
  groupId: z.string().optional().nullable(),
  hashtags: z.array(z.string()).max(10).optional().default([]),
});

// GET /api/feed/posts
export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);

  const cursor = searchParams.get("cursor");
  const tab = searchParams.get("tab") ?? "para-ti";
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const userId = session?.user?.id;

  // Build where clause based on tab
  type WhereClause = {
    visibility?: string | { in: string[] };
    OR?: Array<{ visibility?: string; userId?: string; group?: { members?: { some?: { userId?: string } } } }>;
    user?: { role?: string };
    userId?: { in: string[] };
    groupId?: { in: string[] };
  };

  let where: WhereClause = {};

  if (tab === "para-ti") {
    // Public posts or posts in groups user belongs to
    where = {
      visibility: userId ? { in: ["PUBLIC", "GROUP"] } : "PUBLIC",
    };
    if (userId) {
      where = {
        OR: [
          { visibility: "PUBLIC" },
          {
            visibility: "GROUP",
            group: { members: { some: { userId } } },
          },
        ],
      };
    }
  } else if (tab === "siguiendo") {
    if (!userId) {
      return NextResponse.json({ posts: [], nextCursor: null });
    }
    const following = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    where = {
      userId: { in: followingIds } as { in: string[] },
      visibility: "PUBLIC",
    } as WhereClause;
  } else if (tab === "profesores") {
    where = {
      user: { role: "PROFESOR" },
      visibility: "PUBLIC",
    };
  } else if (tab === "grupos") {
    if (!userId) {
      return NextResponse.json({ posts: [], nextCursor: null });
    }
    const memberships = await db.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    where = {
      groupId: { in: groupIds } as { in: string[] },
      visibility: "GROUP",
    } as WhereClause;
  }

  const posts = await db.feedPost.findMany({
    where: where as import("@prisma/client").Prisma.FeedPostWhereInput,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
      reactions: {
        select: { userId: true, type: true },
      },
      comments: {
        where: { parentId: null },
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true },
          },
          replies: {
            take: 2,
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true, image: true, role: true },
              },
            },
          },
        },
      },
      favorites: userId
        ? { where: { userId, entityType: "POST" }, select: { id: true } }
        : false,
      _count: { select: { comments: true, reactions: true } },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    posts.pop();
    nextCursor = posts[posts.length - 1]?.id ?? null;
  }

  return NextResponse.json({ posts, nextCursor });
}

// POST /api/feed/posts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // GROUP visibility requires groupId
  if (data.visibility === "GROUP" && !data.groupId) {
    return NextResponse.json(
      { error: "Se requiere un grupo para visibilidad de grupo" },
      { status: 400 }
    );
  }

  // Verify group membership if posting to group
  if (data.groupId) {
    const membership = await db.groupMember.findUnique({
      where: {
        userId_groupId: { userId: session.user.id, groupId: data.groupId },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No eres miembro de ese grupo" },
        { status: 403 }
      );
    }
  }

  const post = await db.feedPost.create({
    data: {
      userId: session.user.id,
      content: data.content,
      type: data.type,
      imageUrls: data.imageUrls ?? [],
      videoUrl: data.videoUrl ?? null,
      handRecordId: data.handRecordId ?? null,
      visibility: data.visibility,
      groupId: data.groupId ?? null,
      hashtags: data.hashtags ?? [],
    },
    include: {
      user: {
        select: { id: true, name: true, image: true, role: true, username: true },
      },
      group: { select: { id: true, name: true } },
      handRecord: { select: { id: true, title: true, pbnData: true, description: true } },
      reactions: { select: { userId: true, type: true } },
      comments: { where: { parentId: null }, take: 0 },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
