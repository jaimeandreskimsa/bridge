import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["PROFESOR", "MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 404 });

  const courses = await db.course.findMany({
    where: { teacherProfileId: teacher.id },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["PROFESOR", "MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 404 });

  const body = await req.json();
  const { title, description, level, priceModel, price, currency } = body;

  if (!title || !level) {
    return NextResponse.json({ error: "Título y nivel son requeridos" }, { status: 400 });
  }

  const course = await db.course.create({
    data: {
      teacherProfileId: teacher.id,
      title,
      description: description ?? "",
      level,
      priceModel: priceModel ?? "ONE_TIME",
      price: price ?? 0,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
