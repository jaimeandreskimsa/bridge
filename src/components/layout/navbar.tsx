"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Home,
  MessageSquare,
  Users,
  Trophy,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Spade,
  Star,
  BarChart3,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navLinks = [
  { href: "/", label: "Inicio", icon: Home, roles: ["ALUMNO", "PROFESOR", "MODERADOR", "SUPERADMIN"] },
  { href: "/feed", label: "Feed", icon: Users, roles: ["ALUMNO", "PROFESOR", "MODERADOR", "SUPERADMIN"] },
  { href: "/cursos", label: "Cursos", icon: BookOpen, roles: ["ALUMNO", "PROFESOR", "MODERADOR", "SUPERADMIN"] },
  { href: "/mano-del-dia", label: "Mano del Día", icon: Spade, roles: ["ALUMNO", "PROFESOR", "MODERADOR", "SUPERADMIN"] },
  { href: "/chat", label: "Chat", icon: MessageSquare, roles: ["ALUMNO", "PROFESOR", "MODERADOR", "SUPERADMIN"] },
  { href: "/grupos", label: "Grupos", icon: Users, roles: ["ALUMNO", "PROFESOR", "MODERADOR", "SUPERADMIN"] },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const user = status === "authenticated" ? session?.user : null;
  const role = user?.role;

  // La landing page (/) tiene su propio navbar
  if (pathname === "/" && !user) return null;

  return (
    <nav className="sticky top-0 z-50 w-full glass-dark">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] shadow-lg shadow-amber-900/20">
              <span className="text-white text-sm font-bold leading-none">♠</span>
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Bridge<span className="text-gold-gradient">Academy</span>
            </span>
          </Link>

          {/* Desktop nav — solo si hay sesión */}
          <div className="hidden md:flex md:items-center md:gap-0.5">
            {user && navLinks
              .filter((l) => !role || l.roles.includes(role))
              .map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "text-[#c9a23a]"
                        : "text-white/55 hover:text-white/90 hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-[#c9a23a] to-[#f0d47a]" />
                    )}
                  </Link>
                );
              })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 pr-2 hover:bg-white/10 transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] text-white text-xs font-bold">
                        {getInitials(user.name ?? user.email ?? "U")}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-3 h-3 text-white/40" />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-58 rounded-xl border border-white/10 bg-navy-950 shadow-2xl shadow-black/40 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/8 bg-white/3">
                          <p className="text-sm font-semibold text-white truncate">{user.name ?? user.email}</p>
                          <p className="text-xs text-white/40 truncate">{user.email}</p>
                          {role && (
                            <span className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#c9a23a]/15 text-[#c9a23a] border border-[#c9a23a]/20">
                              {role}
                            </span>
                          )}
                        </div>
                        <div className="py-1.5">
                          {[
                            { href: "/perfil", icon: User, label: "Mi perfil" },
                            { href: "/mi-progreso", icon: BarChart3, label: "Mi progreso" },
                            { href: "/favoritos", icon: Star, label: "Favoritos" },
                          ].map(({ href, icon: Icon, label }) => (
                            <Link
                              key={href}
                              href={href}
                              className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/65 hover:text-white hover:bg-white/5 transition-colors"
                              onClick={() => setProfileOpen(false)}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </Link>
                          ))}
                          {["PROFESOR", "SUPERADMIN"].includes(role ?? "") && (
                            <Link
                              href="/profesor/dashboard"
                              className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/65 hover:text-white hover:bg-white/5 transition-colors"
                              onClick={() => setProfileOpen(false)}
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Panel Profesor
                            </Link>
                          )}
                          {["MODERADOR", "SUPERADMIN"].includes(role ?? "") && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#c9a23a]/80 hover:text-[#c9a23a] hover:bg-[#c9a23a]/5 transition-colors"
                              onClick={() => setProfileOpen(false)}
                            >
                              <Shield className="w-3.5 h-3.5" />
                              Administración
                            </Link>
                          )}
                          <Link
                            href="/configuracion"
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/65 hover:text-white hover:bg-white/5 transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Configuración
                          </Link>
                        </div>
                        <div className="border-t border-white/8 py-1.5">
                          <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/8">
                    Ingresar
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button size="sm" className="bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] hover:opacity-90 text-white font-semibold shadow-lg shadow-amber-900/20">
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button — hidden when bottom nav is shown */}
            <button
              className="md:hidden ml-1 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && user && (
        <div className="md:hidden border-t border-white/8 bg-navy-950/98">
          <div className="px-4 py-3 space-y-0.5">
            {navLinks
              .filter((l) => l.roles.includes(role ?? ""))
              .map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-[#c9a23a]/10 text-[#c9a23a]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </nav>
  );
}
