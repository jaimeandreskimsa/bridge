import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const reportSchema = z.object({
  reason: z
    .string()
    .min(10, "La razón debe tener al menos 10 caracteres")
    .max(500, "La razón no puede superar los 500 caracteres"),
});

// POST /api/feed/posts/[postId]/report
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
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { reason } = parsed.data;
  const reporterId = session.user.id;

  // Verify post exists
  const post = await db.feedPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  // Prevent duplicate reports from same user
  const existing = await db.postReport.findFirst({
    where: { postId, reporterId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya has reportado este post" },
      { status: 409 }
    );
  }

  // Create report and increment reportCount
  await db.$transaction([
    db.postReport.create({
      data: { postId, reporterId, reason },
    }),
    db.feedPost.update({
      where: { id: postId },
      data: {
        reportCount: { increment: 1 },
        // Auto-flag if threshold reached
        isReported: post.reportCount + 1 >= 5 ? true : undefined,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
