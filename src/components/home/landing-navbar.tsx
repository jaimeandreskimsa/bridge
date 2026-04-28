"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#features", label: "Funcionalidades" },
  { href: "#cursos", label: "Cursos" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#060e1c]/95 backdrop-blur-md border-b border-white/8 shadow-lg shadow-black/30"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] shadow-lg shadow-amber-900/20">
              <span className="text-white text-sm font-bold leading-none">♠</span>
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Bridge<span className="text-[#c9a23a]">Academy</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-white/60 hover:text-white transition-colors font-medium"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/8">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/registro">
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] hover:opacity-90 text-white font-semibold shadow-lg shadow-amber-900/20"
              >
                Empezar gratis
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#060e1c]/98">
          <div className="px-6 py-4 space-y-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/8 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/registro" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] text-white font-semibold">
                  Empezar gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
