import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "ranking") {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const ranking = await db.dailyHandSubmission.groupBy({
      by: ["userId"],
      where: { isCorrect: true, submittedAt: { gte: weekStart } },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });
    const users = await db.user.findMany({
      where: { id: { in: ranking.map((r) => r.userId) } },
      select: { id: true, name: true, image: true },
    });
    return NextResponse.json({ ranking: ranking.map((r) => ({ ...r, user: users.find((u) => u.id === r.userId) })) });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyHand = await db.dailyHand.findFirst({
    where: { date: today },
    include: { curator: { select: { id: true, name: true } } },
  });

  const submission = session?.user?.id && dailyHand
    ? await db.dailyHandSubmission.findUnique({
        where: { userId_dailyHandId: { userId: session.user.id, dailyHandId: dailyHand.id } },
      })
    : null;

  return NextResponse.json({ dailyHand, submission });
}
