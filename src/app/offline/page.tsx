import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión | Bridge Academy" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] shadow-2xl shadow-amber-900/30 mb-6">
        <WifiOff className="w-8 h-8 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Sin conexión</h1>
      <p className="text-white/50 max-w-xs mb-8">
        No hay internet disponible. Reconectate para seguir usando Bridge Academy.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] text-white font-semibold text-sm shadow-lg shadow-amber-900/20 hover:opacity-90 transition-opacity"
      >
        Reintentar
      </Link>
    </div>
  );
}
