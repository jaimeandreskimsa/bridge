"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Spade, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/cursos", label: "Cursos", icon: BookOpen },
  { href: "/mano-del-dia", label: "Mano", icon: Spade },
  { href: "/feed", label: "Feed", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0a1628]/95 backdrop-blur-xl border-t border-white/8"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-colors",
                active ? "text-[#c9a23a]" : "text-white/35"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c9a23a]" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  active ? "text-[#c9a23a]" : "text-white/30"
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
