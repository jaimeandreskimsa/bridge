import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { PlatformSettingsForm } from "./platform-settings-form";

export const metadata = { title: "Configuración — Admin" };

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") redirect("/");

  const settings = await db.platformSetting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6" /> Configuración de plataforma
      </h1>
      <PlatformSettingsForm settings={settingsMap} />
    </div>
  );
}
