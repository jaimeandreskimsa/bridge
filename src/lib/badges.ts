import { db } from "@/lib/db";

interface BadgeCondition {
  name: string;
  check: (userId: string) => Promise<boolean>;
}

const BADGE_CONDITIONS: BadgeCondition[] = [
  {
    name: "Primer paso",
    check: async (userId) => {
      // Completed at least one course (all lessons done)
      const enrollments = await db.enrollment.findMany({
        where: { userId, isActive: true },
        include: {
          course: {
            include: {
              modules: {
                include: { lessons: { select: { id: true } } },
              },
            },
          },
        },
      });

      for (const enrollment of enrollments) {
        const lessonIds = enrollment.course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id)
        );
        if (lessonIds.length === 0) continue;

        const completed = await db.progress.count({
          where: { userId, lessonId: { in: lessonIds }, completed: true },
        });

        if (completed === lessonIds.length) return true;
      }
      return false;
    },
  },
  {
    name: "Racha de 10",
    check: async (userId) => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { streak: true },
      });
      return (user?.streak ?? 0) >= 10;
    },
  },
  {
    name: "Centurión",
    check: async (userId) => {
      const count = await db.progress.count({
        where: { userId, completed: true },
      });
      return count >= 100;
    },
  },
  {
    name: "Maestro del Quiz",
    check: async (userId) => {
      const perfectAttempts = await db.quizAttempt.count({
        where: { userId, score: 100 },
      });
      return perfectAttempts >= 10;
    },
  },
  {
    name: "Mano Certera",
    check: async (userId) => {
      const correct = await db.dailyHandSubmission.count({
        where: { userId, isCorrect: true },
      });
      return correct >= 30;
    },
  },
  {
    name: "Experto",
    check: async (userId) => {
      const playerLevel = await db.playerLevel_.findUnique({
        where: { userId },
        select: { level: true },
      });
      return playerLevel?.level === "EXPERT";
    },
  },
];

export async function checkAndAwardBadges(userId: string): Promise<void> {
  // Get all existing badge definitions
  const allBadges = await db.badge.findMany();
  const badgeMap = new Map(allBadges.map((b) => [b.name, b]));

  // Get badges the user already has
  const existingUserBadges = await db.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const existingBadgeIds = new Set(existingUserBadges.map((ub) => ub.badgeId));

  for (const condition of BADGE_CONDITIONS) {
    const badge = badgeMap.get(condition.name);
    if (!badge) continue; // Badge not seeded in DB yet, skip

    // Skip if user already has this badge
    if (existingBadgeIds.has(badge.id)) continue;

    const earned = await condition.check(userId);
    if (!earned) continue;

    // Award the badge
    await db.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        earnedAt: new Date(),
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        type: "NEW_ENROLLMENT", // closest available type; badge notifications handled here
        title: `¡Nuevo logro desbloqueado!`,
        body: `Obtuviste el badge "${badge.name}": ${badge.description}`,
        link: "/mi-progreso",
        data: { badgeId: badge.id, badgeName: badge.name },
      },
    });
  }
}
