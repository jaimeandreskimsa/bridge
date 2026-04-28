import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existing = await db.teacherRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (existing) return NextResponse.json({ error: "Ya tienes una solicitud pendiente" }, { status: 409 });

  const body = await req.json();
  const { bio, experience, sampleUrl } = body;

  if (!bio || !experience) {
    return NextResponse.json({ error: "Bio y experiencia son requeridos" }, { status: 400 });
  }

  const request = await db.teacherRequest.create({
    data: {
      userId: session.user.id,
      bio,
      experience,
      sampleUrl: sampleUrl ?? null,
    },
  });
  return NextResponse.json({ request }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const request = await db.teacherRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ request });
}
