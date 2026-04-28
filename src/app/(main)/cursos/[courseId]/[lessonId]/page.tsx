import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/components/video/video-player";
import {
  CheckCircle, PlayCircle, FileText, ChevronLeft, ChevronRight,
  Download, Clock, BookOpen, Award, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { LessonActions } from "./lesson-actions";

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: lesson?.title ?? "Clase" };
}

export default async function LessonPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const session = await auth();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              teacherProfile: {
                include: { user: { select: { id: true, name: true, image: true } } },
              },
            },
          },
        },
      },
      attachments: true,
    },
  });

  if (!lesson || lesson.module.courseId !== courseId) notFound();

  const course = lesson.module.course;

  // ── Access check ──────────────────────────────────────────────────────────
  let hasAccess = lesson.isPreview;
  let enrollment = null;

  if (session?.user?.id && !hasAccess) {
    enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    });
    hasAccess = !!enrollment?.isActive;
  } else if (session?.user?.id) {
    enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    });
  }

  if (!hasAccess) redirect(`/cursos/${courseId}?locked=true`);

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = session?.user?.id
    ? await db.progress.findUnique({
        where: { userId_lessonId: { userId: session.user.id, lessonId } },
      })
    : null;

  // ── Sidebar data ──────────────────────────────────────────────────────────
  const allModules = await db.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, duration: true, type: true, isPreview: true, status: true },
      },
    },
  });

  const allProgress = session?.user?.id
    ? await db.progress.findMany({
        where: { userId: session.user.id, lesson: { module: { courseId } } },
      })
    : [];
  const progressMap = new Map(allProgress.map((p) => [p.lessonId, p]));

  const flatLessons = allModules.flatMap((m) => m.lessons);
  const currentIdx = flatLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  const completedCount = allProgress.filter((p) => p.completed).length;
  const totalLessons = flatLessons.length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  function formatDuration(s?: number | null) {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  }

  return (
    <div
      className="flex"
      style={{ height: "calc(100vh - 64px)", background: "var(--background, #f5f4f0)" }}
    >
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[300px] flex-col border-r border-gray-200 bg-white overflow-y-auto shrink-0">
        {/* Course header */}
        <div className="p-4 border-b border-gray-100 bg-navy-950">
          <Link
            href={`/cursos/${courseId}`}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors mb-2"
          >
            <ChevronLeft className="w-3 h-3" />
            Volver al curso
          </Link>
          <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">{course.title}</h2>
          {/* Overall progress bar */}
          {session?.user && totalLessons > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span>{completedCount}/{totalLessons} clases</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c9a23a] rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Module list */}
        <div className="flex-1 py-2">
          {allModules.map((mod) => {
            const modCompleted = mod.lessons.filter((l) => progressMap.get(l.id)?.completed).length;
            return (
              <div key={mod.id} className="mb-1">
                <div className="px-4 py-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider line-clamp-1">
                    {mod.order}. {mod.title}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {modCompleted}/{mod.lessons.length}
                  </span>
                </div>
                {mod.lessons.map((l) => {
                  const prog = progressMap.get(l.id);
                  const isActive = l.id === lessonId;
                  const done = prog?.completed;
                  return (
                    <Link
                      key={l.id}
                      href={`/cursos/${courseId}/${l.id}`}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                        isActive
                          ? "bg-[#c9a23a]/8 border-[#c9a23a] text-navy-950 font-semibold"
                          : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span className="shrink-0">
                        {done ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : l.type === "VIDEO" ? (
                          <PlayCircle className={`w-4 h-4 ${isActive ? "text-[#c9a23a]" : "text-gray-300"}`} />
                        ) : (
                          <FileText className={`w-4 h-4 ${isActive ? "text-[#c9a23a]" : "text-gray-300"}`} />
                        )}
                      </span>
                      <span className="flex-1 line-clamp-2 leading-snug text-xs">{l.title}</span>
                      {l.duration && (
                        <span className="text-[10px] text-gray-400 shrink-0">{formatDuration(l.duration)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-white">
        {/* Video / Content area */}
        {lesson.muxPlaybackId ? (
          <div className="bg-black">
            <VideoPlayer
              playbackId={lesson.muxPlaybackId}
              lessonId={lessonId}
              courseId={courseId}
              title={lesson.title}
              startTime={progress?.watchedSeconds ?? 0}
            />
          </div>
        ) : lesson.videoUrl ? (
          <div className="bg-black">
            <div className="aspect-video max-h-[520px] mx-auto">
              <video
                src={lesson.videoUrl}
                controls
                className="w-full h-full"
                title={lesson.title}
              />
            </div>
          </div>
        ) : (
          /* Text/reading lesson — no video */
          <div className="bg-gradient-to-b from-navy-950 to-navy-900 px-6 py-10 text-white text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-[#c9a23a]" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">Clase de lectura</p>
            <h1 className="text-xl font-bold text-white max-w-lg mx-auto leading-snug">{lesson.title}</h1>
            {lesson.duration && (
              <p className="text-sm text-white/40 mt-2 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {formatDuration(lesson.duration)} de lectura
              </p>
            )}
          </div>
        )}

        {/* Content body */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* Title + meta (for video lessons) */}
          {(lesson.muxPlaybackId || lesson.videoUrl) && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{lesson.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {lesson.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {formatDuration(lesson.duration)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {lesson.module.course.teacherProfile.user.name}
                </span>
              </div>
            </div>
          )}

          {/* Mark complete + navigation */}
          <div className="flex items-center justify-between gap-4 py-4 border-y border-gray-100">
            <div className="flex items-center gap-3">
              {prevLesson && (
                <Link
                  href={`/cursos/${courseId}/${prevLesson.id}`}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-950 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline line-clamp-1 max-w-[140px]">{prevLesson.title}</span>
                </Link>
              )}
            </div>

            {/* Mark complete button (client component) */}
            {session?.user && (
              <LessonActions
                lessonId={lessonId}
                courseId={courseId}
                isCompleted={progress?.completed ?? false}
                nextLessonId={nextLesson?.id}
              />
            )}

            <div className="flex items-center gap-3">
              {nextLesson && (
                <Link
                  href={`/cursos/${courseId}/${nextLesson.id}`}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-950 transition-colors"
                >
                  <span className="hidden sm:inline line-clamp-1 max-w-[140px]">{nextLesson.title}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Lesson text content */}
          {lesson.content && (
            <div className="bg-[#f9f8f5] rounded-2xl border border-gray-100 p-6 sm:p-8">
              <h2 className="font-bold text-navy-950 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide">
                <FileText className="w-4 h-4 text-[#c9a23a]" />
                Contenido de la clase
              </h2>
              <div className="prose prose-sm prose-gray max-w-none leading-relaxed text-gray-700 whitespace-pre-wrap">
                {lesson.content}
              </div>
            </div>
          )}

          {/* Attachments */}
          {lesson.attachments.length > 0 && (
            <div>
              <h3 className="font-bold text-navy-950 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Download className="w-4 h-4 text-[#c9a23a]" />
                Materiales
              </h3>
              <div className="space-y-2">
                {lesson.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-[#c9a23a]/40 hover:bg-[#c9a23a]/5 text-sm text-gray-700 transition-all"
                  >
                    <Download className="w-4 h-4 text-[#c9a23a] shrink-0" />
                    <span className="flex-1">{a.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Certificate hint */}
          {progressPct === 100 && course.hasCertificate && (
            <div className="bg-gradient-to-r from-[#c9a23a]/10 to-[#c9a23a]/5 border border-[#c9a23a]/20 rounded-2xl p-6 flex items-center gap-4">
              <Award className="w-10 h-10 text-[#c9a23a] shrink-0" />
              <div>
                <p className="font-bold text-navy-950">¡Completaste el curso!</p>
                <p className="text-sm text-gray-600 mt-0.5">Tu certificado está disponible en la sección de perfil.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
