import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import {
  BarChart3, Users, GraduationCap, BookOpen, Settings, Shield, Home, Calendar,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/profesores", label: "Profesores", icon: GraduationCap },
  { href: "/admin/contenido", label: "Contenido", icon: BookOpen },
  { href: "/admin/mano-del-dia", label: "Mano del Día", icon: Calendar },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN", "MODERADOR"].includes(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <Navbar />
      <div className="flex">
        {/* Dark premium sidebar */}
        <aside className="w-60 min-h-[calc(100vh-64px)] bg-navy-950 shrink-0 flex flex-col">
          {/* Sidebar header */}
          <div className="px-5 py-5 border-b border-white/6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">Administración</p>
                <p className="text-[10px] text-[#c9a23a]/60 mt-0.5">Panel de control</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-3 space-y-0.5">
            {sidebarLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all duration-150"
              >
                <Icon className="w-4 h-4 shrink-0 group-hover:text-[#c9a23a] transition-colors" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Bottom hint */}
          <div className="px-5 py-4 border-t border-white/6">
            <p className="text-[10px] text-white/15 leading-relaxed">
              Bridge Academy<br />Panel Administrativo
            </p>
          </div>
        </aside>

        <main className="flex-1 p-8 min-h-[calc(100vh-64px)] overflow-auto">{children}</main>
      </div>
    </div>
  );
}
