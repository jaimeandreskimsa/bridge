import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hands = await db.dailyHand.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { submissions: true } } },
    take: 30,
  });

  return NextResponse.json({ hands });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { date, pbnData, title, options, correctAnswer, explanation } = body;

  if (!date || !pbnData || !title || !options || !correctAnswer || !explanation) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  const existing = await db.dailyHand.findFirst({
    where: { date: new Date(date) },
  });

  if (existing) {
    return NextResponse.json({ error: "Ya existe una mano para esa fecha" }, { status: 409 });
  }

  const hand = await db.dailyHand.create({
    data: {
      date: new Date(date),
      pbnData,
      title,
      options,
      correctAnswer,
      explanation,
      curatorId: session.user.id,
    },
  });

  return NextResponse.json({ hand }, { status: 201 });
}
