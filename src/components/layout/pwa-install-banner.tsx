"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No mostrar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // No mostrar si ya fue descartada en esta sesión
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Retraso leve para no interrumpir la carga
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !prompt) return null;

  const handleInstall = async () => {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
        bg-[#0d1f3c] border border-[#c9a23a]/25 rounded-2xl shadow-2xl shadow-black/50
        flex items-center gap-3 px-4 py-3 animate-in slide-in-from-bottom-4 duration-300"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] flex items-center justify-center shadow-md">
        <span className="text-white text-base font-bold leading-none">♠</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-tight">Instalar Bridge Academy</p>
        <p className="text-white/45 text-xs mt-0.5 leading-tight">Acceso rápido desde tu pantalla de inicio</p>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] text-white text-xs font-semibold
          hover:opacity-90 transition-opacity"
      >
        <Download className="w-3 h-3" />
        Instalar
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 text-white/30 hover:text-white/70 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
