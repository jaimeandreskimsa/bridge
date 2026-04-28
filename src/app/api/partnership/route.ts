import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notebooks = await db.partnershipNotebook.findMany({
    where: {
      OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }],
    },
    include: {
      player1: { select: { id: true, name: true, image: true } },
      player2: { select: { id: true, name: true, image: true } },
      _count: { select: { agreements: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ notebooks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { partnerEmail, name } = body;

  let partnerId = session.user.id;
  if (partnerEmail) {
    const partner = await db.user.findUnique({ where: { email: partnerEmail } });
    if (!partner) return NextResponse.json({ error: "Compañero no encontrado" }, { status: 404 });
    partnerId = partner.id;
  }

  const existing = await db.partnershipNotebook.findFirst({
    where: {
      OR: [
        { player1Id: session.user.id, player2Id: partnerId },
        { player1Id: partnerId, player2Id: session.user.id },
      ],
    },
  });
  if (existing) return NextResponse.json({ notebook: existing });

  const notebook = await db.partnershipNotebook.create({
    data: {
      player1Id: session.user.id,
      player2Id: partnerId,
      name: name ?? (partnerEmail ? `Con ${partnerEmail}` : "Mi libreta"),
    },
  });
  return NextResponse.json({ notebook }, { status: 201 });
}
