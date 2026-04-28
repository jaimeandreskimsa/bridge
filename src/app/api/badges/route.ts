import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndAwardBadges } from "@/lib/badges";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userBadges = await db.userBadge.findMany({
    where: { userId: session.user.id },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
  });

  return NextResponse.json({ badges: userBadges });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const newBadges = await checkAndAwardBadges(session.user.id);
  return NextResponse.json({ newBadges });
}
