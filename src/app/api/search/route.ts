import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [courses, conventions, users] = await Promise.all([
    db.course.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      select: { id: true, title: true, level: true, thumbnail: true },
      take: 5,
    }),
    db.convention.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { meaning: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, system: true },
      take: 5,
    }),
    db.user.findMany({
      where: {
        role: { in: ["PROFESOR", "MODERADOR", "SUPERADMIN"] },
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, image: true, role: true },
      take: 3,
    }),
  ]);

  const results = [
    ...courses.map((c) => ({ type: "course" as const, id: c.id, title: c.title, meta: c.level, url: `/cursos/${c.id}`, image: c.thumbnail })),
    ...conventions.map((c) => ({ type: "convention" as const, id: c.id, title: c.name, meta: c.system, url: `/convenciones/${c.id}` })),
    ...users.map((u) => ({ type: "user" as const, id: u.id, title: u.name ?? "Usuario", meta: u.role, url: `/perfil/${u.id}`, image: u.image })),
  ];

  return NextResponse.json({ results });
}
