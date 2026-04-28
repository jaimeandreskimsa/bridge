import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo")
    .optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(60).optional(),
  timezone: z.string().max(60).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  const { userId } = await params;

  if (!session?.user || session.user.id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Check username uniqueness if changing
  if (data.username) {
    const existing = await db.user.findFirst({
      where: { username: data.username, NOT: { id: userId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "El nombre de usuario ya está en uso" },
        { status: 409 }
      );
    }
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      country: true,
      timezone: true,
    },
  });

  return NextResponse.json({ user: updated });
}
