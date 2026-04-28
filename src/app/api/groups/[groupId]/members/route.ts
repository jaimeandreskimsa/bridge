import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { groupId } = await params;

  const existing = await db.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (existing) return NextResponse.json({ error: "Ya eres miembro" }, { status: 409 });

  const member = await db.groupMember.create({
    data: { userId: session.user.id, groupId },
  });
  return NextResponse.json({ member }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const members = await db.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
  });
  return NextResponse.json({ members });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { groupId } = await params;

  await db.groupMember.delete({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  return NextResponse.json({ success: true });
}
