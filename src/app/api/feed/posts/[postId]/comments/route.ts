import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "El comentario no puede estar vacío").max(2000),
  parentId: z.string().optional().nullable(),
});

// GET /api/feed/posts/[postId]/comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  // Verify post exists
  const post = await db.feedPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  const comments = await db.feedComment.findMany({
    where: { postId, parentId: null },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, image: true, role: true, username: true },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true, username: true },
          },
        },
      },
      _count: { select: { replies: true } },
    },
  });

  let nextCursor: string | null = null;
  if (comments.length > limit) {
    comments.pop();
    nextCursor = comments[comments.length - 1]?.id ?? null;
  }

  return NextResponse.json({ comments, nextCursor });
}

// POST /api/feed/posts/[postId]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { postId } = await params;
  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { content, parentId } = parsed.data;

  // Verify post exists
  const post = await db.feedPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  // If replying, verify parent exists, belongs to this post, and is top-level (max 2 levels)
  if (parentId) {
    const parent = await db.feedComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.postId !== postId) {
      return NextResponse.json(
        { error: "Comentario padre no válido" },
        { status: 400 }
      );
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Solo se permiten dos niveles de comentarios" },
        { status: 400 }
      );
    }
  }

  const comment = await db.feedComment.create({
    data: {
      userId: session.user.id,
      postId,
      content,
      parentId: parentId ?? null,
    },
    include: {
      user: {
        select: { id: true, name: true, image: true, role: true, username: true },
      },
      replies: {
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true, username: true },
          },
        },
      },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
