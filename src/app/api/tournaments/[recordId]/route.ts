import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { recordId } = await params;

  const record = await db.tournamentRecord.findFirst({
    where: { id: recordId, userId: session.user.id },
  });
  if (!record) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { recordId } = await params;

  const existing = await db.tournamentRecord.findFirst({
    where: { id: recordId, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const record = await db.tournamentRecord.update({
    where: { id: recordId },
    data: {
      name: body.name ?? existing.name,
      date: body.date ? new Date(body.date) : existing.date,
      format: body.format ?? existing.format,
      result: body.result ?? existing.result,
      mpPoints: body.mpPoints !== undefined ? body.mpPoints : existing.mpPoints,
      notes: body.notes ?? existing.notes,
    },
  });
  return NextResponse.json({ record });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { recordId } = await params;

  const existing = await db.tournamentRecord.findFirst({
    where: { id: recordId, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.tournamentRecord.delete({ where: { id: recordId } });
  return NextResponse.json({ success: true });
}
