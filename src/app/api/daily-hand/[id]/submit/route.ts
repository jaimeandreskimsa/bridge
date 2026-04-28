import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ answer: z.string().length(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const dailyHand = await db.dailyHand.findUnique({ where: { id } });
  if (!dailyHand) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existing = await db.dailyHandSubmission.findUnique({
    where: { userId_dailyHandId: { userId: session.user.id, dailyHandId: id } },
  });
  if (existing) return NextResponse.json({ error: "Ya respondiste hoy" }, { status: 409 });

  const isCorrect = body.data.answer === dailyHand.correctAnswer;

  const submission = await db.dailyHandSubmission.create({
    data: { userId: session.user.id, dailyHandId: id, answer: body.data.answer, isCorrect },
  });

  // Update streak
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { streak: true, lastActiveAt: true } });
  const lastActive = user?.lastActiveAt ? new Date(user.lastActiveAt) : null;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const lastDay = lastActive ? new Date(lastActive) : null;
  lastDay?.setHours(0, 0, 0, 0);

  let newStreak = user?.streak ?? 0;
  if (!lastDay || lastDay.getTime() < yesterday.getTime()) {
    newStreak = 1;
  } else if (lastDay.getTime() === yesterday.getTime()) {
    newStreak += 1;
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { streak: newStreak, lastActiveAt: now, reputationPoints: { increment: isCorrect ? 10 : 2 } },
  });

  // Global stats
  const globalStats = await db.dailyHandSubmission.groupBy({
    by: ["answer"],
    where: { dailyHandId: id },
    _count: { answer: true },
  });
  const statsMap = Object.fromEntries(globalStats.map((g) => [g.answer, g._count.answer]));

  return NextResponse.json({
    isCorrect,
    correctAnswer: dailyHand.correctAnswer,
    explanation: dailyHand.explanation,
    globalStats: statsMap,
    newStreak,
  });
}
