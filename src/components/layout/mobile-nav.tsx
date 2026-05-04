"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, BookOpen, Spade, MessageSquare, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/",             label: "Inicio",  icon: Home },
  { href: "/cursos",       label: "Cursos",  icon: BookOpen },
  { href: "/mano-del-dia", label: "Mano",    icon: Spade },
  { href: "/chat",         label: "Chat",    icon: MessageSquare },
  { href: "/simulador",    label: "Sim",     icon: FlaskConical },
];

export function MobileNav() {
  const pathname   = usePathname();
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        borderTop: "1px solid #E8EDF5",
        boxShadow: "0 -4px 20px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-stretch h-16 px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 rounded-xl mx-0.5 my-1.5 transition-all duration-150",
                active
                  ? "bg-[#0F1C3F]/[0.06]"
                  : "hover:bg-slate-50"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-150",
                    active ? "text-[#0F1C3F]" : "text-slate-400"
                  )}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#C9A23A]" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none mt-1 font-medium transition-colors",
                  active ? "text-[#0F1C3F] font-semibold" : "text-slate-400"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
