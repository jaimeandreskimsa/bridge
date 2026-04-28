import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BookOpen, PlusCircle, BarChart2, DollarSign, ArrowDownToLine, ChevronRight, Spade, Heart, Diamond, Club } from "lucide-react";

const sidebarLinks = [
  { href: "/profesor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profesor/cursos", label: "Mis Cursos", icon: BookOpen },
  { href: "/profesor/cursos/crear", label: "Crear Curso", icon: PlusCircle },
  { href: "/profesor/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/profesor/ingresos", label: "Ingresos", icon: DollarSign },
];

export default async function ProfesorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || !["PROFESOR", "SUPERADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-30">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-0.5">
            <Spade className="w-4 h-4 text-gray-800" />
            <Heart className="w-4 h-4 text-red-600" />
            <Diamond className="w-4 h-4 text-red-600" />
            <Club className="w-4 h-4 text-gray-800" />
          </div>
          <span className="text-sm font-bold text-gray-900">Panel Profesor</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-gray-200 pt-4">
          <Link
            href="/profesor/ingresos"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4 shrink-0" />
            Solicitar Retiro
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors mt-1"
          >
            ← Volver al sitio
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Breadcrumb top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-8 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/profesor/dashboard" className="hover:text-gray-900 transition-colors">
            Profesor
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">Panel</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
              {session.user.role === "SUPERADMIN" ? "Superadmin" : "Profesor"}
            </span>
            <span className="text-gray-700 font-medium">{session.user.name}</span>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
