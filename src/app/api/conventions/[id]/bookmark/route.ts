import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const existing = await db.conventionBookmark.findUnique({
    where: { userId_conventionId: { userId: session.user.id, conventionId: id } },
  });

  if (existing) {
    await db.conventionBookmark.delete({
      where: { userId_conventionId: { userId: session.user.id, conventionId: id } },
    });
    return NextResponse.json({ bookmarked: false });
  }

  await db.conventionBookmark.create({
    data: { userId: session.user.id, conventionId: id },
  });
  return NextResponse.json({ bookmarked: true }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ bookmarked: false });
  const { id } = await params;

  const bookmark = await db.conventionBookmark.findUnique({
    where: { userId_conventionId: { userId: session.user.id, conventionId: id } },
  });
  return NextResponse.json({ bookmarked: !!bookmark });
}
