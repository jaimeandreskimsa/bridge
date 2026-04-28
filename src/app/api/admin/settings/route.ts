import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      db.platformSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const settings = await db.platformSetting.findMany();
  return NextResponse.json({ settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) });
}
