import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConventionSystem } from "@prisma/client";
import { BookMarked, Plus, Search, BookOpen } from "lucide-react";

interface SearchParams {
  system?: string;
  q?: string;
}

const SYSTEM_LABELS: Record<ConventionSystem, string> = {
  SAYC: "SAYC",
  STANDARD_AMERICAN: "Standard American",
  PRECISION: "Precision",
  ACOL: "Acol",
  NATURAL: "Natural",
  OTHER: "Otro",
};

const SYSTEM_COLORS: Record<ConventionSystem, string> = {
  SAYC: "bg-blue-100 text-blue-800",
  STANDARD_AMERICAN: "bg-indigo-100 text-indigo-800",
  PRECISION: "bg-purple-100 text-purple-800",
  ACOL: "bg-green-100 text-green-800",
  NATURAL: "bg-gray-100 text-gray-800",
  OTHER: "bg-orange-100 text-orange-800",
};

async function getConventions(params: SearchParams, userId?: string) {
  const where: Record<string, unknown> = { isApproved: true };

  if (params.system && params.system !== "all") {
    where.system = params.system as ConventionSystem;
  }

  if (params.q) {
    where.name = { contains: params.q, mode: "insensitive" };
  }

  const conventions = await db.convention.findMany({
    where,
    include: {
      bookmarks: userId ? { where: { userId } } : false,
      courseLinks: { select: { courseId: true } },
    },
    orderBy: { name: "asc" },
  });

  return conventions;
}

export default async function ConvencionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  const conventions = await getConventions(searchParams, userId);
  const systems = Object.keys(SYSTEM_LABELS) as ConventionSystem[];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Biblioteca de Convenciones
          </h1>
          <p className="text-gray-500 mt-1">
            Explora y aprende las convenciones de bridge más importantes
          </p>
        </div>
        {(userRole === "PROFESOR" || userRole === "MODERADOR" || userRole === "SUPERADMIN") && (
          <Link href="/convenciones/nueva">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Proponer convención
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Buscar convención..."
            className="pl-9"
          />
          {/* preserve system filter */}
          {searchParams.system && (
            <input type="hidden" name="system" value={searchParams.system} />
          )}
        </form>

        {/* System filter */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/convenciones"
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              !searchParams.system || searchParams.system === "all"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
            )}
          >
            Todos
          </Link>
          {systems.map((sys) => (
            <Link
              key={sys}
              href={`/convenciones?system=${sys}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                searchParams.system === sys
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              )}
            >
              {SYSTEM_LABELS[sys]}
            </Link>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {conventions.length} convención{conventions.length !== 1 ? "es" : ""}
      </p>

      {/* Convention list */}
      {conventions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BookMarked className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No se encontraron convenciones</p>
          <p className="text-sm mt-1">Intenta con otros filtros o términos de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conventions.map((convention) => {
            const isMyAgreement =
              userId && convention.bookmarks && convention.bookmarks.length > 0
                ? convention.bookmarks[0].isMyAgreement
                : false;
            const isBookmarked =
              userId && convention.bookmarks ? convention.bookmarks.length > 0 : false;

            const sequence = Array.isArray(convention.biddingSequence)
              ? convention.biddingSequence
              : [];

            return (
              <Link
                key={convention.id}
                href={`/convenciones/${convention.id}`}
                className="group block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {convention.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isBookmarked && (
                      <span
                        title={isMyAgreement ? "Es mi acuerdo" : "Guardada"}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          isMyAgreement
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-50 text-blue-600"
                        )}
                      >
                        {isMyAgreement ? "Mi acuerdo" : "Guardada"}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        SYSTEM_COLORS[convention.system]
                      )}
                    >
                      {SYSTEM_LABELS[convention.system]}
                    </span>
                  </div>
                </div>

                {/* Bidding sequence */}
                {sequence.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {sequence.slice(0, 6).map((bid, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded border text-xs font-bold",
                          bid === "P" || bid === "Pass"
                            ? "bg-gray-50 border-gray-200 text-gray-500"
                            : "bg-white border-blue-200 text-blue-700"
                        )}
                      >
                        {String(bid)}
                      </span>
                    ))}
                    {sequence.length > 6 && (
                      <span className="text-xs text-gray-400 self-center">
                        +{sequence.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {/* Meaning preview */}
                <p className="text-sm text-gray-600 line-clamp-2">{convention.meaning}</p>

                {/* Linked courses */}
                {convention.courseLinks.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {convention.courseLinks.length} curso
                    {convention.courseLinks.length !== 1 ? "s" : ""} vinculado
                    {convention.courseLinks.length !== 1 ? "s" : ""}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
