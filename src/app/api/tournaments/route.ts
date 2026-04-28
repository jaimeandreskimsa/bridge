import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const records = await db.tournamentRecord.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, date, format, result, mpPoints } = body;

  if (!name || !date) return NextResponse.json({ error: "Nombre y fecha son requeridos" }, { status: 400 });

  const record = await db.tournamentRecord.create({
    data: {
      userId: session.user.id,
      name,
      date: new Date(date),
      format: format ?? "N/A",
      result: result ?? null,
      mpPoints: mpPoints ?? null,
    },
  });
  return NextResponse.json({ record }, { status: 201 });
}
