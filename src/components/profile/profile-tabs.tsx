"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Star,
  Clock,
  Users,
  Play,
  Heart,
  MessageSquare,
  FileText,
  Video,
} from "lucide-react";
import { getInitials, levelLabel, formatRelativeTime } from "@/lib/utils";
import type { PlayerLevel, PriceModel, PostType } from "@prisma/client";

const LEVEL_BADGE: Record<
  PlayerLevel,
  "principiante" | "intermedio" | "avanzado" | "experto"
> = {
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
  if (priceModel === "FREE") return <span className="text-green-600 font-semibold text-xs">Gratis</span>;
  if (priceModel === "FREEMIUM") return <span className="text-blue-600 font-semibold text-xs">Freemium</span>;
  if (priceModel === "SUBSCRIPTION") return <span className="text-purple-600 font-semibold text-xs">Suscripción</span>;
  if (price != null) return <span className="text-gray-900 font-bold text-xs">${price}</span>;
  return null;
}

interface EnrollmentItem {
  id: string;
  courseId: string;
  purchasedAt: Date;
  progressPct: number;
  completedLessons: number;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
    totalLessons: number;
    totalDuration: number;
    level: PlayerLevel;
    teacher: { name?: string | null; image?: string | null };
  };
}

interface FavoriteItem {
  id: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
    level: PlayerLevel;
    averageRating: number;
    reviewCount: number;
    totalDuration: number;
    totalStudents: number;
    priceModel: PriceModel;
    price?: number | null;
    teacher: { name?: string | null; image?: string | null };
  };
}

interface ActivityItem {
  id: string;
  content: string;
  type: PostType;
  createdAt: Date;
  reactions: number;
  comments: number;
}

interface ProfileTabsProps {
  enrollments: EnrollmentItem[];
  favorites: FavoriteItem[];
  recentActivity: ActivityItem[];
}

export function ProfileTabs({ enrollments, favorites, recentActivity }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="cursos">
      <TabsList className="w-full justify-start bg-white border rounded-xl p-1 h-auto gap-1">
        <TabsTrigger value="cursos" className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          Mis cursos
          <span className="ml-1 text-xs bg-gray-100 rounded-full px-1.5">{enrollments.length}</span>
        </TabsTrigger>
        <TabsTrigger value="progreso" className="flex items-center gap-1.5">
          <Star className="w-4 h-4" />
          Progreso
        </TabsTrigger>
        <TabsTrigger value="favoritos" className="flex items-center gap-1.5">
          <Heart className="w-4 h-4" />
          Favoritos
          <span className="ml-1 text-xs bg-gray-100 rounded-full px-1.5">{favorites.length}</span>
        </TabsTrigger>
        <TabsTrigger value="actividad" className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4" />
          Actividad
        </TabsTrigger>
      </TabsList>

      {/* ── Mis cursos ─────────────────────────────────────── */}
      <TabsContent value="cursos" className="mt-6">
        {enrollments.length === 0 ? (
          <EmptyState
            icon="♠"
            title="Aún no te inscribiste en ningún curso"
            description="Explorá el catálogo y empezá a aprender bridge hoy."
            action={<Link href="/cursos"><Button variant="bridge">Ver cursos</Button></Link>}
          />
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Progreso ───────────────────────────────────────── */}
      <TabsContent value="progreso" className="mt-6">
        {enrollments.length === 0 ? (
          <EmptyState
            icon="♦"
            title="No hay progreso todavía"
            description="Inscribite en un curso y empezá a ver clases para ver tu progreso aquí."
          />
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <ProgressCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Favoritos ──────────────────────────────────────── */}
      <TabsContent value="favoritos" className="mt-6">
        {favorites.length === 0 ? (
          <EmptyState
            icon="♥"
            title="No tenés cursos favoritos"
            description="Usá el corazón en cualquier curso para guardarlo aquí."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map((fav) => (
              <FavoriteCard key={fav.id} item={fav} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Actividad ──────────────────────────────────────── */}
      <TabsContent value="actividad" className="mt-6">
        {recentActivity.length === 0 ? (
          <EmptyState
            icon="♣"
            title="Sin actividad reciente"
            description="Tus posts en el feed aparecerán aquí."
            action={<Link href="/feed"><Button variant="outline">Ir al feed</Button></Link>}
          />
        ) : (
          <div className="space-y-3">
            {recentActivity.map((post) => (
              <ActivityCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ── Card de enrollment ────────────────────────────────────────

function EnrollmentCard({ enrollment }: { enrollment: EnrollmentItem }) {
  const { course, progressPct, completedLessons } = enrollment;

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
      {/* Thumbnail */}
      <div className="relative w-full sm:w-32 aspect-video sm:aspect-square shrink-0 rounded-lg overflow-hidden bg-gray-100">
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-600">
            <span className="text-3xl opacity-30 select-none">♠</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div>
            <Badge variant={LEVEL_BADGE[course.level]} className="mb-1">
              {levelLabel(course.level)}
            </Badge>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {course.title}
            </h3>
          </div>
          <Link href={`/cursos/${course.id}`}>
            <Button size="sm" variant={progressPct === 100 ? "outline" : "bridge"} className="gap-1.5 text-xs shrink-0">
              {progressPct === 100 ? (
                "Ver certificado"
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Continuar
                </>
              )}
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {course.teacher.name}
        </p>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {completedLessons} / {course.totalLessons} lecciones
            </span>
            <span className={progressPct === 100 ? "text-green-600 font-semibold" : ""}>
              {progressPct}%
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                progressPct === 100 ? "bg-green-500" : "bg-[#2d5282]"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {course.totalDuration > 0 && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(course.totalDuration)} en total
          </p>
        )}
      </div>
    </div>
  );
}

// ── Progress card (more visual) ───────────────────────────────

function ProgressCard({ enrollment }: { enrollment: EnrollmentItem }) {
  const { course, progressPct, completedLessons } = enrollment;
  const remaining = course.totalLessons - completedLessons;

  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{course.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{course.teacher.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${progressPct === 100 ? "text-green-600" : "text-[#1e3a5f]"}`}>
            {progressPct}%
          </p>
          <p className="text-xs text-gray-400">completado</p>
        </div>
      </div>

      <div className="bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            progressPct === 100 ? "bg-green-500" : "bg-[#2d5282]"
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{completedLessons} lecciones completadas</span>
        {remaining > 0 && <span>{remaining} por completar</span>}
        {progressPct === 100 && (
          <span className="text-green-600 font-semibold">Completado</span>
        )}
      </div>
    </div>
  );
}

// ── Favorite card ─────────────────────────────────────────────

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const { course } = item;

  return (
    <div className="group flex flex-col rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative aspect-video bg-gray-100 shrink-0">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-600">
            <span className="text-4xl opacity-30 select-none">♠</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant={LEVEL_BADGE[course.level]}>{levelLabel(course.level)}</Badge>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {course.title}
        </h3>

        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={course.teacher.image ?? undefined} />
            <AvatarFallback className="text-xs bg-gray-200">
              {getInitials(course.teacher.name ?? "P")}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-500 truncate">{course.teacher.name}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
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

        <div className="mt-auto flex items-center justify-between pt-2 border-t">
          <PriceTag priceModel={course.priceModel} price={course.price} />
          <Link href={`/cursos/${course.id}`}>
            <Button size="sm" variant="bridge" className="text-xs">
              Ver curso
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Activity card ─────────────────────────────────────────────

function ActivityCard({ post }: { post: ActivityItem }) {
  const postTypeIcon = {
    TEXT: <FileText className="w-3.5 h-3.5 text-gray-400" />,
    IMAGE: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
    VIDEO_CLIP: <Video className="w-3.5 h-3.5 text-purple-400" />,
    HAND_RECORD: <span className="text-xs">♠</span>,
  };

  return (
    <Link href={`/feed#${post.id}`}>
      <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{postTypeIcon[post.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{formatRelativeTime(post.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {post.reactions}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {post.comments}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4 select-none">{icon}</span>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
