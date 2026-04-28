"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface Teacher {
  id: string;
  name: string | null;
  image: string | null;
}

interface CourseFiltersProps {
  teachers: Teacher[];
  currentParams: {
    nivel?: string;
    precio?: string;
    profesor?: string;
    q?: string;
    page?: string;
  };
}

const LEVELS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
  { value: "experto", label: "Experto" },
];

const PRICES = [
  { value: "gratis", label: "Gratis" },
  { value: "pago", label: "De pago" },
];

export function CourseFilters({ teachers, currentParams }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (value) {
        sp.set(key, value);
      } else {
        sp.delete(key);
      }
      sp.delete("page"); // reset pagination on filter change
      startTransition(() => {
        router.push(`${pathname}?${sp.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const hasFilters =
    currentParams.nivel || currentParams.precio || currentParams.profesor || currentParams.q;

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar</label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
            updateFilter("q", q || null);
          }}
          className="relative"
        >
          <input
            name="q"
            type="text"
            defaultValue={currentParams.q ?? ""}
            placeholder="Título, tema, tag…"
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700/30"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </form>
      </div>

      {/* Nivel */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nivel</label>
        <div className="space-y-1">
          {LEVELS.map((lv) => (
            <button
              key={lv.value}
              onClick={() =>
                updateFilter("nivel", currentParams.nivel === lv.value ? null : lv.value)
              }
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentParams.nivel === lv.value
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {lv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Precio */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Precio</label>
        <div className="space-y-1">
          {PRICES.map((pr) => (
            <button
              key={pr.value}
              onClick={() =>
                updateFilter("precio", currentParams.precio === pr.value ? null : pr.value)
              }
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentParams.precio === pr.value
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profesor */}
      {teachers.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Profesor</label>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {teachers.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  updateFilter("profesor", currentParams.profesor === t.id ? null : t.id)
                }
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  currentParams.profesor === t.id
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={t.image ?? undefined} />
                  <AvatarFallback className="text-xs bg-gray-300">
                    {getInitials(t.name ?? "P")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{t.name ?? "Profesor"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Limpiar filtros */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="w-full gap-1 text-gray-500"
          disabled={isPending}
        >
          <X className="w-4 h-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
