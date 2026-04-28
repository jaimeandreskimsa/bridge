import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search") ?? "";

  const groups = await db.group.findMany({
    where: {
      ...(type ? { type: type as any } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, type, isPrivate } = body;

  if (!name || !type) return NextResponse.json({ error: "Nombre y tipo son requeridos" }, { status: 400 });

  const group = await db.group.create({
    data: {
      name,
      description: description ?? null,
      type,
      isPrivate: isPrivate ?? false,
      createdById: session.user.id,
      members: { create: { userId: session.user.id, isAdmin: true } },
    },
  });
  return NextResponse.json({ group }, { status: 201 });
}
