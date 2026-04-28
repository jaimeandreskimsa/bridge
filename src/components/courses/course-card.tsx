import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Users, Clock, Play } from "lucide-react";
import { formatPrice, getInitials, levelLabel } from "@/lib/utils";
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
    totalDuration: number; // segundos
    totalStudents: number;
    teacher: {
      name?: string | null;
      image?: string | null;
    };
    isEnrolled: boolean;
  };
}

const LEVEL_BADGE: Record<PlayerLevel, "principiante" | "intermedio" | "avanzado" | "experto"> = {
  BEGINNER: "principiante",
  INTERMEDIATE: "intermedio",
  ADVANCED: "avanzado",
  EXPERT: "experto",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PriceTag({ priceModel, price }: { priceModel: PriceModel; price?: number | null }) {
  if (priceModel === "FREE") {
    return <span className="text-green-600 font-semibold text-sm">Gratis</span>;
  }
  if (priceModel === "FREEMIUM") {
    return (
      <span className="text-blue-600 font-semibold text-sm">
        Freemium{price ? ` · ${formatPrice(price)}` : ""}
      </span>
    );
  }
  if (priceModel === "SUBSCRIPTION") {
    return <span className="text-purple-600 font-semibold text-sm">Suscripción</span>;
  }
  if (price != null) {
    return <span className="text-gray-900 font-bold text-sm">{formatPrice(price)}</span>;
  }
  return null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${
            s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export function CourseCard({ course }: CourseCardProps) {
  const teacherName = course.teacher.name ?? "Profesor";

  return (
    <div className="card-premium group flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-navy-950 shrink-0 overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950">
            <span className="text-6xl opacity-10 select-none font-bold">♠</span>
          </div>
        )}
        {/* Overlay gradient on hover for play button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="w-5 h-5 text-navy-950 fill-navy-950 ml-0.5" />
          </div>
        </div>

        <div className="absolute top-2.5 left-2.5">
          <Badge variant={LEVEL_BADGE[course.level]}>{levelLabel(course.level)}</Badge>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Título */}
        <h3 className="font-bold text-navy-950 text-sm leading-snug line-clamp-2 group-hover:text-[#9a7c28] transition-colors duration-200">
          {course.title}
        </h3>

        {/* Profesor */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 ring-1 ring-[#c9a23a]/20">
            <AvatarImage src={course.teacher.image ?? undefined} />
            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-navy-800 to-navy-900 text-white">
              {getInitials(teacherName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-500 truncate font-medium">{teacherName}</span>
        </div>

        {/* Rating */}
        {course.reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={course.averageRating} />
            <span className="text-xs font-bold text-navy-950">
              {course.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({course.reviewCount})</span>
          </div>
        )}

        {/* Meta: alumnos + duración */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {course.totalStudents.toLocaleString()} alumnos
          </span>
          {course.totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(course.totalDuration)}
            </span>
          )}
        </div>

        {/* Footer: precio + botón */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <PriceTag priceModel={course.priceModel} price={course.price} />
          <Link href={`/cursos/${course.id}`}>
            <Button
              size="sm"
              className={
                course.isEnrolled
                  ? "h-8 px-3 text-xs border border-navy-200 bg-white text-navy-900 hover:bg-navy-50 font-semibold gap-1.5"
                  : "h-8 px-3 text-xs bg-gradient-to-r from-navy-900 to-navy-800 hover:opacity-90 text-white font-semibold shadow-sm"
              }
            >
              {course.isEnrolled ? (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  Continuar
                </>
              ) : (
                "Ver curso"
              )}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
