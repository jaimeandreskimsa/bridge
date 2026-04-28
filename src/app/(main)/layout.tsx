import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import Link from "next/link";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* ── Premium Footer ── */}
      <footer className="hidden md:block bg-[#060e1c]">
        {/* Top gold line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#c9a23a]/50 to-transparent" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a23a] to-[#9a7c28]">
                  <span className="text-white text-sm font-bold leading-none">♠</span>
                </div>
                <span className="text-base font-bold tracking-tight text-white">
                  Bridge<span className="text-gold-gradient">Academy</span>
                </span>
              </div>
              <p className="text-sm text-white/40 max-w-xs leading-relaxed">
                La plataforma de referencia para aprender bridge en español. Cursos, comunidad y práctica diaria.
              </p>
              <div className="flex gap-1 mt-5">
                {["♠", "♥", "♦", "♣"].map((s, i) => (
                  <span
                    key={s}
                    className={`text-lg font-bold ${i === 1 || i === 2 ? "text-red-500/40" : "text-white/15"}`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Platform links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/70 mb-4">Plataforma</p>
              <ul className="space-y-2.5">
                {[
                  { href: "/cursos", label: "Cursos" },
                  { href: "/mano-del-dia", label: "Mano del Día" },
                  { href: "/feed", label: "Comunidad" },
                  { href: "/grupos", label: "Grupos" },
                  { href: "/ranking", label: "Ranking" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/70 mb-4">Cuenta</p>
              <ul className="space-y-2.5">
                {[
                  { href: "/perfil", label: "Mi perfil" },
                  { href: "/mi-progreso", label: "Mi progreso" },
                  { href: "/favoritos", label: "Favoritos" },
                  { href: "/mis-compras", label: "Mis compras" },
                  { href: "/configuracion", label: "Configuración" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/20">
              © {new Date().getFullYear()} Bridge Academy. Todos los derechos reservados.
            </p>
            <p className="text-xs text-white/15">
              Hecho con ♥ para la comunidad hispanohablante
            </p>
          </div>
        </div>
      </footer>
      <MobileNav />
    </div>
  );
}
