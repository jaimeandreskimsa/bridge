import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Users, Clock, Play } from "lucide-react";
import { cn, formatPrice, getInitials, levelLabel } from "@/lib/utils";
import type { PriceModel, PlayerLevel } from "@prisma/client";

export interface CourseCardProps {
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
    priceModel: PriceModel;
    price?: number | null;
    level: PlayerLevel;
    averageRating: number;
    reviewCount: number;
    totalDuration: number;
    totalStudents: number;
    teacher: { name?: string | null; image?: string | null };
    isEnrolled: boolean;
  };
}

const LEVEL_BADGE: Record<PlayerLevel, "principiante" | "intermedio" | "avanzado" | "experto"> = {
  BEGINNER: "principiante",
  INTERMEDIATE: "intermedio",
  ADVANCED: "avanzado",
  EXPERT: "experto",
};

const LEVEL_GRADIENT: Record<PlayerLevel, string> = {
  BEGINNER:     "from-emerald-400 to-teal-500",
  INTERMEDIATE: "from-blue-400 to-indigo-500",
  ADVANCED:     "from-violet-400 to-purple-600",
  EXPERT:       "from-[#C9A23A] to-[#9A7C28]",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PriceTag({ priceModel, price }: { priceModel: PriceModel; price?: number | null }) {
  if (priceModel === "FREE")
    return <span className="text-emerald-600 font-bold text-sm">Gratis</span>;
  if (priceModel === "FREEMIUM")
    return <span className="text-blue-600 font-bold text-sm">Freemium{price ? ` · ${formatPrice(price)}` : ""}</span>;
  if (priceModel === "SUBSCRIPTION")
    return <span className="text-violet-600 font-bold text-sm">Suscripción</span>;
  if (price != null)
    return <span className="text-slate-900 font-bold text-sm">{formatPrice(price)}</span>;
  return null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "w-3 h-3",
            s <= Math.round(rating) ? "text-[#C9A23A] fill-[#C9A23A]" : "text-slate-200 fill-slate-200"
          )}
        />
      ))}
    </div>
  );
}

export function CourseCard({ course }: CourseCardProps) {
  const teacherName = course.teacher.name ?? "Profesor";

  return (
    <Link href={`/cursos/${course.id}`} className="group block h-full">
      {/* Gradient border wrapper */}
      <div
        className={cn(
          "relative h-full rounded-[18px] p-[1.5px] transition-all duration-300 ease-out",
          "bg-gradient-to-br from-slate-200 via-[#C9A23A]/15 to-slate-300",
          "hover:from-[#0F1C3F]/25 hover:via-[#C9A23A]/45 hover:to-slate-300",
          "hover:shadow-[0_14px_44px_rgba(15,28,63,0.12),0_4px_14px_rgba(201,162,58,0.10)]",
          "hover:-translate-y-1.5"
        )}
      >
        <div className="bg-white rounded-[16.5px] overflow-hidden flex flex-col h-full">

          {/* Thumbnail */}
          <div className="relative aspect-video shrink-0 overflow-hidden">
            {course.thumbnail ? (
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className={cn("absolute inset-0 flex items-center justify-center bg-gradient-to-br", LEVEL_GRADIENT[course.level])}>
                <span className="text-7xl opacity-[0.10] select-none font-bold text-white">♠</span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300">
                <Play className="w-6 h-6 text-[#0F1C3F] fill-[#0F1C3F] ml-0.5" />
              </div>
            </div>

            {/* Level badge */}
            <div className="absolute top-2.5 left-2.5">
              <Badge variant={LEVEL_BADGE[course.level]}>{levelLabel(course.level)}</Badge>
            </div>

            {/* Enrolled */}
            {course.isEnrolled && (
              <div className="absolute top-2.5 right-2.5">
                <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  ✓ Inscrito
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col flex-1 p-4 gap-2.5">

            {/* Title */}
            <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-[#0F1C3F] transition-colors duration-200">
              {course.title}
            </h3>

            {/* Teacher */}
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5 ring-2 ring-[#C9A23A]/25">
                <AvatarImage src={course.teacher.image ?? undefined} />
                <AvatarFallback className="text-[9px] font-bold bg-[#0F1C3F] text-white">
                  {getInitials(teacherName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-slate-500 truncate font-medium">{teacherName}</span>
            </div>

            {/* Rating */}
            {course.reviewCount > 0 && (
              <div className="flex items-center gap-1.5">
                <StarRating rating={course.averageRating} />
                <span className="text-xs font-bold text-slate-800">{course.averageRating.toFixed(1)}</span>
                <span className="text-xs text-slate-400">({course.reviewCount})</span>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {course.totalStudents.toLocaleString()}
              </span>
              {course.totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(course.totalDuration)}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
              <PriceTag priceModel={course.priceModel} price={course.price} />
              <span
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-200",
                  course.isEnrolled
                    ? "bg-slate-100 text-slate-700 group-hover:bg-[#0F1C3F]/8 group-hover:text-[#0F1C3F]"
                    : "bg-[#0F1C3F] text-white group-hover:bg-[#1a2f4a] shadow-sm"
                )}
              >
                {course.isEnrolled ? "Continuar →" : "Ver curso"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
