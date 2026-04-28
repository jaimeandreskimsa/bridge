import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getNotebook(notebookId: string, userId: string) {
  return db.partnershipNotebook.findFirst({
    where: {
      id: notebookId,
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ notebookId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { notebookId } = await params;

  const notebook = await getNotebook(notebookId, session.user.id);
  if (!notebook) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const agreements = await db.partnershipAgreement.findMany({
    where: { notebookId },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
  return NextResponse.json({ agreements });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ notebookId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { notebookId } = await params;

  const notebook = await getNotebook(notebookId, session.user.id);
  if (!notebook) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const { category, bid, meaning, notes } = body;

  if (!category || !bid || !meaning) {
    return NextResponse.json({ error: "Categoría, licitación y significado son requeridos" }, { status: 400 });
  }

  const count = await db.partnershipAgreement.count({ where: { notebookId } });

  const agreement = await db.partnershipAgreement.create({
    data: {
      notebookId,
      category,
      sequence: { bid },
      meaning,
      notes: notes ?? null,
      order: count + 1,
    },
  });
  return NextResponse.json({ agreement }, { status: 201 });
}
