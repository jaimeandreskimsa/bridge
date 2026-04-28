import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id, ...(entityType ? { entityType } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { entityType, entityId } = await req.json();
  if (!entityType || !entityId) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const existing = await db.favorite.findUnique({
    where: { userId_entityType_entityId: { userId: session.user.id, entityType, entityId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await db.favorite.create({
    data: { userId: session.user.id, entityType, entityId },
  });

  return NextResponse.json({ favorited: true });
}
