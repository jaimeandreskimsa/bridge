import { db } from "@/lib/db";
import type { PlayerLevel } from "@prisma/client";

export interface LevelFactors {
  basicQuizzesPassed: number;
  introCoursesCompleted: number;
  dailyHandAccuracyLast30: number;
  intermediateCoursesCompleted: number;
  manualExpert: boolean;
}

export interface LevelProgress {
  current: PlayerLevel;
  percentToNext: number;
  factors: LevelFactors;
}

const LEVEL_ORDER: PlayerLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

async function gatherFactors(userId: string): Promise<LevelFactors> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [quizAttempts, enrollments, dailyHands, currentLevel] = await Promise.all([
    // Quiz attempts that passed
    db.quizAttempt.findMany({
      where: { userId, passed: true },
      include: {
        quiz: {
          select: {
            id: true,
            course: { select: { level: true } },
          },
        },
      },
    }),
    // Completed courses: a course is "completed" when all lessons are done
    db.enrollment.findMany({
      where: { userId, isActive: true },
      include: {
        course: {
          select: {
            id: true,
            level: true,
            totalLessons: true,
            modules: {
              include: {
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
    // Daily hand submissions in last 30 days
    db.dailyHandSubmission.findMany({
      where: {
        userId,
        submittedAt: { gte: thirtyDaysAgo },
      },
      select: { isCorrect: true },
    }),
    // Current stored level
    db.playerLevel_.findUnique({ where: { userId } }),
  ]);

  // Count passing quiz attempts for "basic" courses (BEGINNER level)
  const basicQuizzesPassed = quizAttempts.filter(
    (a) => a.quiz.course?.level === "BEGINNER"
  ).length;

  // Determine completed courses by checking progress
  const allLessonIds = enrollments.flatMap((e) =>
    e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
  );

  const completedProgress = await db.progress.findMany({
    where: {
      userId,
      lessonId: { in: allLessonIds },
      completed: true,
    },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));

  const completedCourses = enrollments.filter((enrollment) => {
    const allLessons = enrollment.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (allLessons.length === 0) return false;
    return allLessons.every((id) => completedLessonIds.has(id));
  });

  const introCoursesCompleted = completedCourses.filter(
    (e) => e.course.level === "BEGINNER"
  ).length;

  const intermediateCoursesCompleted = completedCourses.filter(
    (e) => e.course.level === "INTERMEDIATE"
  ).length;

  // Daily hand accuracy in last 30 days
  let dailyHandAccuracyLast30 = 0;
  if (dailyHands.length > 0) {
    const correct = dailyHands.filter((d) => d.isCorrect).length;
    dailyHandAccuracyLast30 = correct / dailyHands.length;
  }

  // Manual expert: check if current level is EXPERT and was set manually
  // We check level history for reason containing "manual"
  const expertHistory = await db.playerLevelHistory.findFirst({
    where: {
      userId,
      level: "EXPERT",
      reason: { contains: "manual", mode: "insensitive" },
    },
  });

  const manualExpert = !!expertHistory || currentLevel?.level === "EXPERT";

  return {
    basicQuizzesPassed,
    introCoursesCompleted,
    dailyHandAccuracyLast30,
    intermediateCoursesCompleted,
    manualExpert,
  };
}

function determineLevel(factors: LevelFactors): { level: PlayerLevel; reason: string } {
  if (factors.manualExpert) {
    return { level: "EXPERT", reason: "Marcado manualmente como EXPERT por profesor" };
  }

  if (
    factors.intermediateCoursesCompleted >= 5 ||
    (factors.dailyHandAccuracyLast30 > 0.75 && factors.intermediateCoursesCompleted >= 2)
  ) {
    return {
      level: "ADVANCED",
      reason: `Completó ${factors.intermediateCoursesCompleted} cursos intermedios y precisión mano del día ${Math.round(factors.dailyHandAccuracyLast30 * 100)}%`,
    };
  }

  if (factors.dailyHandAccuracyLast30 > 0.75) {
    return {
      level: "ADVANCED",
      reason: `Tasa de acierto en Mano del Día >75% en los últimos 30 días (${Math.round(factors.dailyHandAccuracyLast30 * 100)}%)`,
    };
  }

  if (factors.basicQuizzesPassed >= 3 || factors.introCoursesCompleted >= 3) {
    return {
      level: "INTERMEDIATE",
      reason: `Aprobó ${factors.basicQuizzesPassed} quizzes de nivel básico y completó ${factors.introCoursesCompleted} cursos introductorios`,
    };
  }

  return {
    level: "BEGINNER",
    reason: "Nivel inicial — completar cursos y quizzes para avanzar",
  };
}

export async function calculatePlayerLevel(userId: string): Promise<PlayerLevel> {
  const factors = await gatherFactors(userId);
  const { level, reason } = determineLevel(factors);

  const existing = await db.playerLevel_.findUnique({ where: { userId } });
  const previousLevel = existing?.level ?? "BEGINNER";

  // Upsert current level
  await db.playerLevel_.upsert({
    where: { userId },
    create: {
      userId,
      level,
      calculatedAt: new Date(),
      factorsJson: factors as object,
    },
    update: {
      level,
      calculatedAt: new Date(),
      factorsJson: factors as object,
    },
  });

  // Create history entry only if level changed or no history exists
  const historyCount = await db.playerLevelHistory.count({ where: { userId } });
  if (level !== previousLevel || historyCount === 0) {
    await db.playerLevelHistory.create({
      data: {
        userId,
        level,
        reason,
        calculatedAt: new Date(),
      },
    });
  }

  return level;
}

export async function getLevelProgress(userId: string): Promise<LevelProgress> {
  const factors = await gatherFactors(userId);
  const { level } = determineLevel(factors);

  const currentIndex = LEVEL_ORDER.indexOf(level);
  let percentToNext = 100;

  if (currentIndex < LEVEL_ORDER.length - 1) {
    // Calculate progress toward next level based on factors
    switch (level) {
      case "BEGINNER": {
        // Need basicQuizzesPassed >= 3 OR introCoursesCompleted >= 3
        const quizProgress = Math.min(factors.basicQuizzesPassed / 3, 1);
        const courseProgress = Math.min(factors.introCoursesCompleted / 3, 1);
        percentToNext = Math.round(Math.max(quizProgress, courseProgress) * 100);
        break;
      }
      case "INTERMEDIATE": {
        // Need intermediateCoursesCompleted >= 5 OR dailyHandAccuracy > 75%
        const courseProgress = Math.min(factors.intermediateCoursesCompleted / 5, 1);
        const handProgress = Math.min(factors.dailyHandAccuracyLast30 / 0.75, 1);
        percentToNext = Math.round(Math.max(courseProgress, handProgress) * 100);
        break;
      }
      case "ADVANCED": {
        // Need manual expert designation
        percentToNext = factors.manualExpert ? 100 : 0;
        break;
      }
    }
  }

  return {
    current: level,
    percentToNext,
    factors,
  };
}
