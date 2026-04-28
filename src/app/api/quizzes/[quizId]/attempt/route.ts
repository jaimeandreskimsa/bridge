import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculatePlayerLevel } from "@/lib/level-calculator";
import { checkAndAwardBadges } from "@/lib/badges";

const attemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string(),
    })
  ).min(1),
});

const REPUTATION_POINTS_ON_PASS = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { quizId } = await params;
  const userId = session.user.id;

  const body = await req.json();
  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { answers } = parsed.data;

  // Load quiz with questions
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          questionText: true,
          correctOption: true,
          explanation: true,
          options: true,
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }

  const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

  // Evaluate answers
  let correctCount = 0;
  const evaluatedAnswers: Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean;
    correctOption: string;
    explanation: string;
    questionText: string;
    options: unknown;
  }> = [];

  for (const { questionId, answer } of answers) {
    const question = questionMap.get(questionId);
    if (!question) continue;

    const isCorrect = answer.trim().toLowerCase() === question.correctOption.trim().toLowerCase();
    if (isCorrect) correctCount++;

    evaluatedAnswers.push({
      questionId,
      answer,
      isCorrect,
      correctOption: question.correctOption,
      explanation: question.explanation,
      questionText: question.questionText,
      options: question.options,
    });
  }

  const totalQuestions = quiz.questions.length;
  const answeredCount = evaluatedAnswers.length;
  const score = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const passed = score >= 70; // 70% passing threshold

  // Create attempt + answers in a transaction
  const attempt = await db.$transaction(async (tx) => {
    const newAttempt = await tx.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        totalPoints: totalQuestions,
        passed,
        completedAt: new Date(),
      },
    });

    await tx.quizAttemptAnswer.createMany({
      data: evaluatedAnswers.map((a) => ({
        attemptId: newAttempt.id,
        questionId: a.questionId,
        answer: a.answer,
        isCorrect: a.isCorrect,
      })),
    });

    // Award reputation points if passed
    if (passed) {
      await tx.user.update({
        where: { id: userId },
        data: {
          reputationPoints: { increment: REPUTATION_POINTS_ON_PASS },
        },
      });
    }

    return newAttempt;
  });

  // Recalculate level and check badges (non-blocking, outside transaction)
  try {
    await calculatePlayerLevel(userId);
    await checkAndAwardBadges(userId);
  } catch {
    // Best-effort; don't fail the request
  }

  return NextResponse.json({
    attemptId: attempt.id,
    score,
    totalPoints: totalQuestions,
    correctCount,
    answeredCount,
    passed,
    answers: evaluatedAnswers,
  });
}
