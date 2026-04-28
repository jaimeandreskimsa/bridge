import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const level = searchParams.get("level");
  const search = searchParams.get("search") ?? "";

  const conventions = await db.convention.findMany({
    where: {
      isApproved: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { meaning: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json({ conventions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { name, meaning, system, biddingSequence } = body;

  if (!name || !meaning) {
    return NextResponse.json({ error: "Nombre y significado son requeridos" }, { status: 400 });
  }

  const convention = await db.convention.create({
    data: {
      name,
      meaning: meaning ?? "",
      system: system ?? "OTHER",
      biddingSequence: biddingSequence ?? [],
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ convention }, { status: 201 });
}
