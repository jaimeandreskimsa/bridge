import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculatePlayerLevel, getLevelProgress } from "@/lib/level-calculator";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = session.user.id;

  const level = await calculatePlayerLevel(userId);
  const levelProgress = await getLevelProgress(userId);

  return NextResponse.json({
    level,
    progress: levelProgress,
  });
}
