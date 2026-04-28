import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json({ error: "No puedes seguirte a ti mismo" }, { status: 400 });
  }

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
  });

  if (existing) {
    await db.follow.delete({
      where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
    });
    return NextResponse.json({ following: false });
  }

  await db.follow.create({
    data: { followerId: session.user.id, followingId: userId },
  });

  await createNotification({ userId, type: "NEW_FOLLOWER", title: "Nuevo seguidor", body: `${session.user.name} comenzó a seguirte.` });

  return NextResponse.json({ following: true }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ following: false });
  const { userId } = await params;

  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
  });
  return NextResponse.json({ following: !!follow });
}
