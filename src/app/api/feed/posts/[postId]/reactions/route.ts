import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const reactionSchema = z.object({
  type: z.enum(["LIKE", "EXCELLENT_PLAY", "QUESTION", "CONTROVERSIAL"]),
});

// POST /api/feed/posts/[postId]/reactions — toggle reaction
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
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tipo de reacción inválido" }, { status: 400 });
  }

  const { type } = parsed.data;
  const userId = session.user.id;

  // Verify post exists
  const post = await db.feedPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  // Check if reaction already exists
  const existing = await db.feedReaction.findUnique({
    where: { userId_postId_type: { userId, postId, type } },
  });

  if (existing) {
    // Toggle off — remove reaction
    await db.feedReaction.delete({
      where: { userId_postId_type: { userId, postId, type } },
    });
    return NextResponse.json({ action: "removed", type });
  }

  // Create reaction
  const reaction = await db.feedReaction.create({
    data: { userId, postId, type },
  });

  return NextResponse.json({ action: "added", reaction });
}
