import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notebookId: string; agreementId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { notebookId, agreementId } = await params;

  const notebook = await db.partnershipNotebook.findFirst({
    where: { id: notebookId, OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }] },
  });
  if (!notebook) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const agreement = await db.partnershipAgreement.update({
    where: { id: agreementId },
    data: {
      category: body.category,
      sequence: body.bid ? { bid: body.bid } : undefined,
      meaning: body.meaning,
      notes: body.notes,
    },
  });
  return NextResponse.json({ agreement });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ notebookId: string; agreementId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { notebookId, agreementId } = await params;

  const notebook = await db.partnershipNotebook.findFirst({
    where: { id: notebookId, OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }] },
  });
  if (!notebook) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.partnershipAgreement.delete({ where: { id: agreementId } });
  return NextResponse.json({ success: true });
}
