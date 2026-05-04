"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, Home, MessageSquare, Users, Trophy, LogOut,
  Settings, User, ChevronDown, Spade, Star, BarChart3,
  Shield, FlaskConical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navLinks = [
  { href: "/",             label: "Inicio",      icon: Home,          roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
  { href: "/feed",         label: "Feed",         icon: Users,         roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
  { href: "/cursos",       label: "Cursos",       icon: BookOpen,      roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
  { href: "/mano-del-dia", label: "Mano del Día", icon: Spade,         roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
  { href: "/chat",         label: "Chat",         icon: MessageSquare, roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
  { href: "/grupos",       label: "Grupos",       icon: Users,         roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
  { href: "/simulador",    label: "Simulador",    icon: FlaskConical,  roles: ["ALUMNO","PROFESOR","MODERADOR","SUPERADMIN"] },
];

const ROLE_LABEL: Record<string, string> = {
  ALUMNO: "Alumno", PROFESOR: "Profesor",
  MODERADOR: "Moderador", SUPERADMIN: "Super Admin",
};

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  const user   = status === "authenticated" ? session?.user : null;
  const role   = user?.role;

  if (pathname === "/" && !user) return null;

  return (
    <nav
      className="sticky top-0 z-50 w-full bg-white"
      style={{ borderBottom: "1px solid #E8EDF5", boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F1C3F] shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white text-sm font-bold leading-none select-none">♠</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight hidden sm:block">
              <span className="text-slate-900">Bridge</span>
              <span className="text-[#C9A23A]">Academy</span>
            </span>
          </Link>

          {/* ── Desktop nav ───────────────────────────────────── */}
          {user && (
            <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {navLinks
                .filter(l => !role || l.roles.includes(role))
                .map(link => {
                  const Icon  = link.icon;
                  const active = pathname === link.href ||
                    (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 whitespace-nowrap",
                        active
                          ? "text-[#0F1C3F] font-semibold bg-[#0F1C3F]/[0.06]"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {link.label}
                      {active && (
                        <span className="absolute bottom-[3px] left-3 right-3 h-[2px] rounded-full bg-[#C9A23A]" />
                      )}
                    </Link>
                  );
                })}
            </div>
          )}

          {/* ── Right side ────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <NotificationBell />

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(v => !v)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-2.5 py-1 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="bg-[#0F1C3F] text-white text-xs font-bold">
                        {getInitials(user.name ?? user.email ?? "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-xs font-medium text-slate-700 max-w-[80px] truncate">
                      {user.name?.split(" ")[0] ?? "Perfil"}
                    </span>
                    <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", profileOpen && "rotate-180")} />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0" onClick={() => setProfileOpen(false)} />
                      <div
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-white z-50 overflow-hidden"
                        style={{ border: "1px solid #E8EDF5", boxShadow: "0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)" }}
                      >
                        {/* User header */}
                        <div className="px-4 py-4 bg-gradient-to-br from-[#F7F8FC] to-[#EEF2F8]" style={{ borderBottom: "1px solid #E8EDF5" }}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback className="bg-[#0F1C3F] text-white text-sm font-bold">
                                {getInitials(user.name ?? user.email ?? "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{user.name ?? user.email}</p>
                              <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          {role && (
                            <span className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-navy">
                              <span>♠</span>
                              {ROLE_LABEL[role] ?? role}
                            </span>
                          )}
                        </div>

                        {/* Nav items */}
                        <div className="py-1.5">
                          {[
                            { href: "/perfil",      icon: User,     label: "Mi perfil" },
                            { href: "/mi-progreso", icon: BarChart3, label: "Mi progreso" },
                            { href: "/favoritos",   icon: Star,     label: "Favoritos" },
                          ].map(({ href, icon: Icon, label }) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                            >
                              <Icon className="w-4 h-4 text-slate-400" />
                              {label}
                            </Link>
                          ))}

                          {["PROFESOR","SUPERADMIN"].includes(role ?? "") && (
                            <Link
                              href="/profesor/dashboard"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                            >
                              <Trophy className="w-4 h-4 text-slate-400" />
                              Panel Profesor
                            </Link>
                          )}

                          {["MODERADOR","SUPERADMIN"].includes(role ?? "") && (
                            <Link
                              href="/admin"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              <Shield className="w-4 h-4 text-amber-500" />
                              Administración
                            </Link>
                          )}

                          <Link
                            href="/configuracion"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            Configuración
                          </Link>
                        </div>

                        <div style={{ borderTop: "1px solid #E8EDF5" }} className="py-1.5">
                          <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
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
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 font-medium">
                    Ingresar
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button size="sm" className="bg-[#0F1C3F] text-white hover:bg-[#1a2f4a] shadow-sm font-semibold">
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
