import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, suitIcon, suitColor } from "@/lib/utils";
import type { ConventionSystem } from "@prisma/client";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronRight,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { ConventionBookmarkButton } from "./bookmark-button";

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

function parseBid(bid: string) {
  // Identify suits to color them
  const suitMatch = bid.match(/^(\d+)([SHDC]|NT|N|SA)?(.*)$/i);
  if (!suitMatch) return { text: bid, isSuit: false, isPass: bid === "P" || bid === "Pass" };
  const level = suitMatch[1];
  const suit = suitMatch[2]?.toUpperCase();
  return { level, suit, isSuit: true, isPass: false };
}

function BiddingBox({ sequence }: { sequence: unknown[] }) {
  const bids = sequence as string[];
  return (
    <div className="flex flex-wrap gap-2">
      {bids.map((bid, i) => {
        const parsed = parseBid(bid);
        const isRed = parsed.suit && ["H", "D"].includes(parsed.suit);
        const isPass = parsed.isPass;

        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-lg border-2 text-sm font-bold shadow-sm",
              isPass
                ? "bg-gray-50 border-gray-200 text-gray-400"
                : isRed
                ? "bg-white border-red-300 text-red-600"
                : "bg-white border-slate-300 text-slate-800"
            )}
          >
            {parsed.isSuit && parsed.level ? (
              <span>
                {parsed.level}
                {parsed.suit === "N" || parsed.suit === "NT"
                  ? "SA"
                  : parsed.suit === "S"
                  ? "♠"
                  : parsed.suit === "H"
                  ? "♥"
                  : parsed.suit === "D"
                  ? "♦"
                  : parsed.suit === "C"
                  ? "♣"
                  : parsed.suit}
              </span>
            ) : (
              bid
            )}
          </div>
        );
      })}
    </div>
  );
}

async function getConvention(id: string, userId?: string) {
  const convention = await db.convention.findUnique({
    where: { id, isApproved: true },
    include: {
      bookmarks: userId ? { where: { userId } } : false,
      courseLinks: {
        include: {
          course: {
            select: { id: true, title: true, thumbnail: true },
          },
        },
      },
    },
  });

  return convention;
}

interface Example {
  hand?: string;
  auction?: string[];
  explanation?: string;
  north?: string;
  south?: string;
  east?: string;
  west?: string;
}

export default async function ConventionDetailPage({
  params,
}: {
  params: { conventionId: string };
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const convention = await getConvention(params.conventionId, userId);
  if (!convention) notFound();

  const sequence = Array.isArray(convention.biddingSequence)
    ? convention.biddingSequence
    : [];

  const examples: Example[] = Array.isArray(convention.examples)
    ? (convention.examples as Example[])
    : [];

  const bookmark =
    userId && convention.bookmarks ? convention.bookmarks[0] ?? null : null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <Link
        href="/convenciones"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la biblioteca
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-semibold",
                  SYSTEM_COLORS[convention.system]
                )}
              >
                {SYSTEM_LABELS[convention.system]}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{convention.name}</h1>
          </div>

          {/* Bookmark button */}
          {userId && (
            <ConventionBookmarkButton
              conventionId={convention.id}
              initialIsBookmarked={!!bookmark}
              initialIsMyAgreement={bookmark?.isMyAgreement ?? false}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bidding sequence */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Secuencia de licitación
            </h2>
            {sequence.length > 0 ? (
              <BiddingBox sequence={sequence} />
            ) : (
              <p className="text-sm text-gray-400">Sin secuencia definida</p>
            )}
          </section>

          {/* Meaning */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Significado</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {convention.meaning}
            </p>
          </section>

          {/* Countermeasures */}
          {convention.countermeasures && (
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Contramedidas
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {convention.countermeasures}
              </p>
            </section>
          )}

          {/* Examples */}
          {examples.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Ejemplos de manos
              </h2>
              <div className="space-y-6">
                {examples.map((ex, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl p-4 bg-gray-50"
                  >
                    {ex.explanation && (
                      <p className="text-sm font-medium text-gray-800 mb-3">
                        {ex.explanation}
                      </p>
                    )}
                    {/* Compact hand display - compass layout */}
                    {(ex.north || ex.south || ex.east || ex.west) && (
                      <div className="grid grid-cols-3 gap-1 text-xs font-mono mb-3 max-w-xs">
                        <div />
                        <div className="bg-white border rounded p-1.5 text-center">
                          <p className="font-semibold text-gray-500 mb-0.5">N</p>
                          <p>{ex.north}</p>
                        </div>
                        <div />
                        <div className="bg-white border rounded p-1.5 text-center">
                          <p className="font-semibold text-gray-500 mb-0.5">O</p>
                          <p>{ex.west}</p>
                        </div>
                        <div />
                        <div className="bg-white border rounded p-1.5 text-center">
                          <p className="font-semibold text-gray-500 mb-0.5">E</p>
                          <p>{ex.east}</p>
                        </div>
                        <div />
                        <div className="bg-white border rounded p-1.5 text-center">
                          <p className="font-semibold text-gray-500 mb-0.5">S</p>
                          <p>{ex.south}</p>
                        </div>
                        <div />
                      </div>
                    )}
                    {ex.auction && ex.auction.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Subasta:</p>
                        <BiddingBox sequence={ex.auction} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Linked courses */}
          {convention.courseLinks.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Cursos que enseñan esta convención
              </h3>
              <div className="space-y-2">
                {convention.courseLinks.map(({ course }) => (
                  <Link
                    key={course.id}
                    href={`/cursos/${course.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    {course.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                    <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {course.title}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-300 ml-auto flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Sistema compatible
            </h3>
            <p className="text-sm text-blue-700">
              Esta convención es parte del sistema{" "}
              <strong>{SYSTEM_LABELS[convention.system]}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
