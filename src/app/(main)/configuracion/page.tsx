import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/configuracion");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      bio: true,
      country: true,
      timezone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/");

  return <SettingsForm user={user} />;
}
