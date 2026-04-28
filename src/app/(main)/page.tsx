import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/course-card";
import {
  BookOpen, Users, Star, Spade, Play, Trophy, ChevronRight, Zap,
} from "lucide-react";
import { levelLabel } from "@/lib/utils";
import { FloatingCards, SuitTicker } from "@/components/home/floating-cards";
import { HeroSection } from "@/components/home/hero-section";
import { HandPreview } from "@/components/home/hand-preview";
import { FeaturesSection } from "@/components/home/features-section";
import { PageLoader } from "@/components/layout/page-loader";

async function getLandingStats() {
  const [teacherCount, studentCount, courseCount] = await Promise.all([
    db.teacherProfile.count(),
    db.user.count({ where: { role: "ALUMNO" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { teacherCount, studentCount, courseCount };
}

async function getFeaturedCourses() {
  return db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { averageRating: "desc" },
    take: 3,
    include: {
      teacherProfile: { include: { user: true } },
      _count: { select: { enrollments: true } },
    },
  });
}

async function getLastProgress(userId: string) {
  return db.progress.findFirst({
    where: { userId, lastWatchedAt: { not: null } },
    orderBy: { lastWatchedAt: "desc" },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: { include: { teacherProfile: { include: { user: true } } } },
            },
          },
        },
      },
    },
  });
}

async function getRecommendedCourses(userId: string) {
  const playerLevel = await db.playerLevel_.findUnique({ where: { userId } });
  const level = playerLevel?.level ?? "BEGINNER";
  const enrolledIds = await db.enrollment
    .findMany({ where: { userId }, select: { courseId: true } })
    .then((e) => e.map((x) => x.courseId));
  return db.course.findMany({
    where: { status: "PUBLISHED", level, id: { notIn: enrolledIds } },
    orderBy: { averageRating: "desc" },
    take: 4,
    include: {
      teacherProfile: { include: { user: true } },
      _count: { select: { enrollments: true } },
      enrollments: { where: { userId }, select: { id: true } },
    },
  });
}

async function getPopularCourses(userId: string) {
  const enrolledIds = await db.enrollment
    .findMany({ where: { userId }, select: { courseId: true } })
    .then((e) => e.map((x) => x.courseId));
  return db.course.findMany({
    where: { status: "PUBLISHED", id: { notIn: enrolledIds } },
    orderBy: { totalStudents: "desc" },
    take: 4,
    include: {
      teacherProfile: { include: { user: true } },
      _count: { select: { enrollments: true } },
      enrollments: { where: { userId }, select: { id: true } },
    },
  });
}

async function getTodayHand() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.dailyHand.findFirst({
    where: { date: today, publishedAt: { not: null } },
    select: { id: true, title: true, difficulty: true },
  });
}

async function getPlayerLevel(userId: string) {
  return db.playerLevel_.findUnique({ where: { userId } });
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) return <LandingPage />;
  return <LoggedInHome userId={session.user.id} userName={session.user.name} />;
}

// ─── LANDING ──────────────────────────────────────────────────────────────────

async function LandingPage() {
  const [stats, featured] = await Promise.all([getLandingStats(), getFeaturedCourses()]);

  return (
    <div style={{ background: "#060e1c" }}>
      <PageLoader />

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden min-h-[100svh] flex items-center"
        style={{ background: "radial-gradient(ellipse 120% 80% at 50% -10%, #0d2040 0%, #060e1c 65%)" }}
      >
        <FloatingCards />

        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#c9a23a 1px, transparent 1px), linear-gradient(90deg, #c9a23a 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[#c9a23a]/4 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-28 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — Hero text */}
            <HeroSection studentCount={stats.studentCount} courseCount={stats.courseCount} />

            {/* Right — Bridge table */}
            <div className="hidden lg:block relative h-[500px]">
              <div
                className="absolute inset-0 rounded-3xl border border-white/5 overflow-hidden shadow-2xl shadow-black/60"
                style={{ background: "#0a1628" }}
              >
                <HandPreview />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── SUIT TICKER ── */}
      <SuitTicker />

      {/* ── STATS BAR ── */}
      <section className="py-12" style={{ background: "#080f1c" }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: `${stats.teacherCount}+`, label: "Profesores expertos", suit: "♠" },
              { value: `${stats.studentCount.toLocaleString()}+`, label: "Alumnos registrados", suit: "♥" },
              { value: `${stats.courseCount}+`, label: "Cursos publicados", suit: "♦" },
            ].map((s, i) => (
              <div
                key={s.label}
                className="relative overflow-hidden text-center rounded-2xl border border-[#c9a23a]/10 bg-[#0a1628]/50 py-8 px-4"
              >
                <span
                  className={`absolute top-2 right-3 text-5xl font-bold leading-none select-none ${i === 1 ? "text-red-500/8" : "text-white/5"}`}
                >
                  {s.suit}
                </span>
                <p className="text-3xl lg:text-4xl font-extrabold text-gold-gradient tabular-nums">{s.value}</p>
                <p className="text-sm text-white/35 mt-1.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <FeaturesSection />

      {/* ── HOW IT WORKS ── */}
      <section className="py-24" style={{ background: "radial-gradient(ellipse at center, #0d1f3c 0%, #060e1c 70%)" }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[#c9a23a] font-semibold text-xs uppercase tracking-[0.2em] mb-3">Simple y poderoso</p>
            <h2 className="text-4xl font-bold text-white mb-4">Cómo funciona</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-gradient-to-r from-transparent via-[#c9a23a]/25 to-transparent" />
            {[
              {
                step: "01", suit: "♠", title: "Creá tu cuenta", 
                desc: "Registro gratuito en 30 segundos. Sin tarjeta de crédito.",
              },
              {
                step: "02", suit: "♥", title: "Elegí tu curso",
                desc: "Filtrá por nivel, duración o temática. Empieza cuando quieras.",
                red: true,
              },
              {
                step: "03", suit: "♠", title: "Practicá y subí de nivel",
                desc: "Mano del día, quizzes y comunidad para progresar más rápido.",
              },
            ].map((s, i) => (
              <div
                key={s.step}
                className="relative flex flex-col items-center text-center rounded-2xl border border-[#c9a23a]/10 bg-[#0a1628]/40 px-8 py-10"
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#c9a23a]/30 bg-[#0a1628] flex items-center justify-center mb-5 relative z-10">
                  <span className={`text-2xl font-bold ${s.red ? "text-red-400" : "text-[#c9a23a]"}`}>{s.suit}</span>
                </div>
                <p className="text-xs font-bold text-[#c9a23a]/40 tracking-widest uppercase mb-2">{s.step}</p>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURSOS DESTACADOS ── */}
      {featured.length > 0 && (
        <section className="py-24" style={{ background: "#07111f" }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-[#c9a23a] font-semibold text-xs uppercase tracking-[0.2em] mb-3">Cursos</p>
                <h2 className="text-3xl font-bold text-white">Los más valorados</h2>
              </div>
              <Link
                href="/cursos"
                className="flex items-center gap-1 text-sm font-semibold text-[#c9a23a]/60 hover:text-[#c9a23a] transition-colors"
              >
                Ver todos <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    thumbnail: course.thumbnail,
                    priceModel: course.priceModel,
                    price: course.price,
                    level: course.level,
                    averageRating: course.averageRating,
                    reviewCount: course.reviewCount,
                    totalDuration: course.totalDuration,
                    totalStudents: course.totalStudents,
                    teacher: {
                      name: course.teacherProfile.user.name,
                      image: course.teacherProfile.user.image,
                    },
                    isEnrolled: false,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section
        className="relative overflow-hidden py-28 text-center"
        style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, #1a3a1a 0%, #060e1c 70%)" }}
      >
        {/* Suit corners */}
        <span className="absolute top-8 left-10 text-[120px] font-bold text-white/[0.025] leading-none select-none">♠</span>
        <span className="absolute bottom-8 right-10 text-[120px] font-bold text-red-500/[0.04] leading-none select-none">♥</span>

        <div className="relative mx-auto max-w-2xl px-6">
          {/* Big spade icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] flex items-center justify-center shadow-2xl shadow-amber-900/40 mb-8">
            <span className="text-4xl text-white font-bold leading-none">♠</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-4">
            ¿Listo para elevar
            <br />
            <span className="text-gold-gradient">tu juego?</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 leading-relaxed">
            Únete gratis hoy y accede al mejor contenido de bridge en español.
            Tu primer curso en menos de 2 minutos.
          </p>
          <Link href="/registro">
            <Button
              size="lg"
              className="h-14 px-10 rounded-xl bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] hover:opacity-90 text-white font-bold text-base shadow-xl shadow-amber-900/30 transition-all"
            >
              Crear cuenta gratuita — es gratis
            </Button>
          </Link>
          <p className="text-white/20 text-sm mt-4">Sin tarjeta de crédito. Sin límite de tiempo.</p>
        </div>
      </section>
    </div>
  );
}


// ─── HOME LOGUEADO ────────────────────────────────────────────────────────────

async function LoggedInHome({ userId, userName }: { userId: string; userName?: string | null }) {
  const [lastProgress, recommended, popular, todayHand, playerLevel] = await Promise.all([
    getLastProgress(userId),
    getRecommendedCourses(userId),
    getPopularCourses(userId),
    getTodayHand(),
    getPlayerLevel(userId),
  ]);

  const firstName = userName?.split(" ")[0] ?? "Bienvenido";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0a1628 0%, #060e1c 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/60 mb-1">{greeting}</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">{firstName}</h1>
            <p className="text-sm text-white/40 mt-1.5">
              Nivel: <span className="font-semibold text-white/60">{levelLabel(playerLevel?.level ?? "BEGINNER")}</span>
              {playerLevel?.currentStreak ? (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                  🔥 {playerLevel.currentStreak} días
                </span>
              ) : null}
            </p>
          </div>
          {todayHand && (
            <Link
              href="/mano-del-dia"
              className="flex items-center gap-3 bg-navy-950 rounded-xl px-4 py-3 hover:opacity-90 transition-opacity group shadow-lg shadow-navy-950/10"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] flex items-center justify-center shrink-0">
                <Spade className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Mano del día</p>
                <p className="text-sm font-semibold text-white truncate max-w-[140px]">
                  {todayHand.title}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#c9a23a] transition-colors ml-1" />
            </Link>
          )}
        </div>

        {/* Continuar viendo */}
        {lastProgress && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3 flex items-center gap-2">
              <Play className="w-3 h-3" /> Continuar viendo
            </p>
            <Link href={`/cursos/${lastProgress.lesson.module.courseId}/${lastProgress.lessonId}`}>
              <div className="relative rounded-2xl overflow-hidden bg-navy-950 h-40 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group">
                {lastProgress.lesson.module.course.thumbnail && (
                  <Image
                    src={lastProgress.lesson.module.course.thumbnail}
                    alt=""
                    fill
                    className="object-cover opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-transparent" />
                {/* Gold strip */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c9a23a] via-[#f0d47a] to-transparent" />
                <div className="absolute inset-0 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a23a] to-[#9a7c28] flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/30">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#c9a23a]/70 uppercase tracking-widest mb-1.5">
                      {lastProgress.lesson.module.course.title}
                    </p>
                    <p className="text-white font-bold truncate text-base">
                      {lastProgress.lesson.title}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {lastProgress.lesson.module.title}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Quick links */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/cursos", icon: BookOpen, label: "Cursos", color: "from-[#0d2040] to-[#0a1628]" },
            { href: "/mano-del-dia", icon: Spade, label: "Mano del día", color: "from-[#c9a23a] to-[#9a7c28]" },
            { href: "/feed", icon: Users, label: "Feed", color: "from-sky-800 to-sky-900" },
            { href: "/mi-progreso", icon: Trophy, label: "Mi progreso", color: "from-violet-800 to-violet-900" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3.5 hover:bg-white/8 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-sm border border-white/8`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{item.label}</span>
            </Link>
          ))}
        </section>

        {/* Recomendados */}
        {recommended.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/60 mb-1">Para ti</p>
                <h2 className="text-lg font-bold text-white">Recomendados para tu nivel</h2>
              </div>
              <Link href="/cursos" className="text-xs font-semibold text-white/30 hover:text-[#c9a23a] transition-colors flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommended.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    thumbnail: course.thumbnail,
                    priceModel: course.priceModel,
                    price: course.price,
                    level: course.level,
                    averageRating: course.averageRating,
                    reviewCount: course.reviewCount,
                    totalDuration: course.totalDuration,
                    totalStudents: course.totalStudents,
                    teacher: { name: course.teacherProfile.user.name, image: course.teacherProfile.user.image },
                    isEnrolled: course.enrollments.length > 0,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Populares */}
        {popular.length > 0 && (
          <section className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/60 mb-1">Tendencia</p>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#c9a23a] fill-[#c9a23a]" /> Los más populares
                </h2>
              </div>
              <Link href="/cursos" className="text-xs font-semibold text-white/30 hover:text-[#c9a23a] transition-colors flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popular.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    thumbnail: course.thumbnail,
                    priceModel: course.priceModel,
                    price: course.price,
                    level: course.level,
                    averageRating: course.averageRating,
                    reviewCount: course.reviewCount,
                    totalDuration: course.totalDuration,
                    totalStudents: course.totalStudents,
                    teacher: { name: course.teacherProfile.user.name, image: course.teacherProfile.user.image },
                    isEnrolled: course.enrollments.length > 0,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
