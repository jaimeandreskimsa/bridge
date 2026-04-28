"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress/progress-bar";
import { cn, suitIcon, suitColor } from "@/lib/utils";
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy } from "lucide-react";

export type QuizType = "BIDDING" | "CARD_PLAY" | "DEFENSE" | "MULTIPLE_CHOICE";

export interface QuizQuestion {
  id: string;
  order: number;
  questionText: string;
  options: string[] | Record<string, string>;
  correctOption: string;
  explanation: string;
  pbnData?: string | null;
  biddingSequence?: unknown[] | null;
  difficulty?: string;
}

interface QuizPlayerProps {
  quizId: string;
  questions: QuizQuestion[];
  type: QuizType;
  onComplete?: (score: number, passed: boolean) => void;
  nextLessonHref?: string;
}

interface AnswerState {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  explanation?: string;
}

function parsePBN(pbnData: string): Record<string, string[]> {
  // Simplified PBN parser: "N:AKQ.xxx.xxx.xxx ..." -> hands per seat
  const dealMatch = pbnData.match(/\[Deal\s+"([^"]+)"\]/i);
  if (!dealMatch) return {};
  const [firstSeat, ...hands] = dealMatch[1].split(" ");
  const seats = ["N", "E", "S", "W"];
  const firstIndex = seats.indexOf(firstSeat.replace(":", ""));
  const result: Record<string, string[]> = {};
  hands.forEach((hand, i) => {
    const seat = seats[(firstIndex + i) % 4];
    result[seat] = hand.split(".");
  });
  return result;
}

function HandMiniDisplay({ pbnData, showSeat = "S" }: { pbnData: string; showSeat?: string }) {
  const hands = parsePBN(pbnData);
  const hand = hands[showSeat];
  if (!hand || hand.length < 4) {
    return (
      <div className="bg-green-700 rounded-lg p-4 text-center text-white text-sm">
        <span className="opacity-60">Vista de mano no disponible</span>
      </div>
    );
  }

  const suits = ["♠", "♥", "♦", "♣"];
  const colors = ["text-white", "text-red-300", "text-red-300", "text-white"];

  return (
    <div className="bg-green-800 rounded-xl p-4 font-mono text-sm border border-green-600">
      <div className="text-center text-green-300 text-xs mb-2 uppercase tracking-widest">
        Mano {showSeat}
      </div>
      {hand.map((cards, i) => (
        <div key={i} className={`flex items-center gap-2 ${colors[i]}`}>
          <span className="w-4">{suits[i]}</span>
          <span className="tracking-widest">{cards || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function BiddingSequenceDisplay({ sequence }: { sequence: unknown[] }) {
  if (!Array.isArray(sequence) || sequence.length === 0) return null;
  const seats = ["N", "E", "S", "W"];

  return (
    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
      <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
        Secuencia de licitación
      </p>
      <div className="grid grid-cols-4 gap-1 text-center text-xs">
        {seats.map((s) => (
          <div key={s} className="font-semibold text-blue-800 pb-1 border-b border-blue-200">{s}</div>
        ))}
        {(sequence as string[]).map((bid, i) => {
          const suit = bid?.slice(-1)?.toUpperCase();
          const isMajor = ["H", "D"].includes(suit);
          return (
            <div
              key={i}
              className={`py-0.5 px-1 rounded font-medium ${isMajor ? "text-red-600" : "text-gray-800"}`}
            >
              {bid === "—" || bid === "-" ? <span className="text-gray-300">—</span> : suitIcon(bid) ? bid.replace(/[HDSCDN]/g, (m) => suitIcon(m)) : bid}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptionButton({
  label,
  value,
  selected,
  revealed,
  isCorrect,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  revealed: boolean;
  isCorrect: boolean;
  onSelect: (v: string) => void;
}) {
  let variant = "outline" as const;
  let extraClass = "hover:bg-gray-50";

  if (revealed) {
    if (isCorrect) extraClass = "border-green-500 bg-green-50 text-green-800";
    else if (selected && !isCorrect) extraClass = "border-red-400 bg-red-50 text-red-800";
    else extraClass = "border-gray-200 text-gray-400";
  } else if (selected) {
    extraClass = "border-blue-500 bg-blue-50 text-blue-800";
  }

  return (
    <button
      onClick={() => !revealed && onSelect(value)}
      disabled={revealed}
      className={cn(
        "w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium flex items-center gap-3",
        extraClass,
        "disabled:cursor-default"
      )}
    >
      <span
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
          selected && !revealed ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
        )}
      >
        {label}
      </span>
      <span className="flex-1">{value}</span>
      {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
      {revealed && selected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
    </button>
  );
}

export function QuizPlayer({ quizId, questions, type, onComplete, nextLessonHref }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    score: number;
    passed: boolean;
    correctCount: number;
  } | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimeSpent((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentQuestion = questions[currentIndex];

  const optionsList = Array.isArray(currentQuestion?.options)
    ? (currentQuestion.options as string[])
    : Object.values(currentQuestion?.options ?? {});

  const optionLabels = ["A", "B", "C", "D", "E", "F"].slice(0, optionsList.length);

  const handleSelect = (value: string) => {
    if (revealed) return;
    setSelectedOption(value);
  };

  const handleConfirm = () => {
    if (!selectedOption || revealed) return;
    const isCorrect =
      selectedOption.trim().toLowerCase() ===
      currentQuestion.correctOption.trim().toLowerCase();

    setRevealed(true);
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        answer: selectedOption,
        isCorrect,
        explanation: currentQuestion.explanation,
      },
    ]);
  };

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      // Submit to API
      setSubmitting(true);
      try {
        const allAnswers = [
          ...answers,
        ];

        const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: allAnswers.map((a) => ({ questionId: a.questionId, answer: a.answer })) }),
        });

        if (res.ok) {
          const data = await res.json();
          setFinalResult({
            score: data.score,
            passed: data.passed,
            correctCount: data.correctCount,
          });
          onComplete?.(data.score, data.passed);
        } else {
          // Fallback: calculate locally
          const correctCount = answers.filter((a) => a.isCorrect).length;
          const score = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
          setFinalResult({ score, passed: score >= 70, correctCount });
        }
      } catch {
        const correctCount = answers.filter((a) => a.isCorrect).length;
        const score = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
        setFinalResult({ score, passed: score >= 70, correctCount });
      } finally {
        setSubmitting(false);
        setFinished(true);
      }
    }
  }, [answers, currentIndex, onComplete, questions.length, quizId]);

  const handleRetry = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setRevealed(false);
    setFinished(false);
    setFinalResult(null);
    setTimeSpent(0);
  };

  // Finished screen
  if (finished && finalResult) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl",
              finalResult.passed ? "bg-green-100" : "bg-red-100"
            )}
          >
            {finalResult.passed ? <Trophy className="w-8 h-8 text-yellow-500" /> : <XCircle className="w-8 h-8 text-red-400" />}
          </div>

          <div>
            <p className="text-3xl font-bold text-gray-900">{finalResult.score}%</p>
            <p className="text-gray-500 text-sm mt-1">
              {finalResult.correctCount} de {answers.length} correctas
            </p>
            <Badge
              className={cn("mt-2", finalResult.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}
            >
              {finalResult.passed ? "¡Aprobado!" : "No aprobado — mínimo 70%"}
            </Badge>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </Button>
            {nextLessonHref && (
              <a href={nextLessonHref}>
                <Button variant="bridge" className="gap-2">
                  Siguiente lección
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>

          {/* Answer review */}
          <div className="text-left space-y-3 mt-4 pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700">Revisión de respuestas</p>
            {answers.map((a, i) => (
              <div
                key={a.questionId}
                className={cn(
                  "p-3 rounded-lg border text-sm",
                  a.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                )}
              >
                <div className="flex items-start gap-2">
                  {a.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800">P{i + 1}: {questions[i]?.questionText}</p>
                    {!a.isCorrect && (
                      <p className="text-xs text-gray-500 mt-1">
                        Tu respuesta: <span className="font-medium text-red-600">{a.answer}</span> ·{" "}
                        Correcta: <span className="font-medium text-green-600">{questions[i]?.correctOption}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 italic">{a.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  const progressPct = Math.round((currentIndex / questions.length) * 100);
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Pregunta {currentIndex + 1} de {questions.length}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {type.replace("_", " ").toLowerCase()}
          </Badge>
          <span className="text-xs text-gray-400">
            {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, "0")}
          </span>
        </div>
      </div>
      <ProgressBar value={progressPct} showLabel={false} colorVariant="navy" height="xs" animate={false} />

      {/* Question card */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Context display based on type */}
          {currentQuestion.pbnData && (type === "CARD_PLAY" || type === "BIDDING" || type === "DEFENSE") && (
            <HandMiniDisplay
              pbnData={currentQuestion.pbnData}
              showSeat={type === "DEFENSE" ? "W" : "S"}
            />
          )}

          {currentQuestion.biddingSequence && type === "BIDDING" && Array.isArray(currentQuestion.biddingSequence) && (
            <BiddingSequenceDisplay sequence={currentQuestion.biddingSequence} />
          )}

          {/* Question text */}
          <div className="space-y-1">
            {currentQuestion.difficulty && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  currentQuestion.difficulty === "BEGINNER" && "bg-green-100 text-green-700",
                  currentQuestion.difficulty === "INTERMEDIATE" && "bg-yellow-100 text-yellow-700",
                  currentQuestion.difficulty === "ADVANCED" && "bg-red-100 text-red-700"
                )}
              >
                {currentQuestion.difficulty === "BEGINNER" ? "Fácil" : currentQuestion.difficulty === "INTERMEDIATE" ? "Intermedio" : "Difícil"}
              </Badge>
            )}
            <p className="text-base font-semibold text-gray-900">{currentQuestion.questionText}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {optionsList.map((option, i) => (
              <OptionButton
                key={i}
                label={optionLabels[i]}
                value={option}
                selected={selectedOption === option}
                revealed={revealed}
                isCorrect={option.trim().toLowerCase() === currentQuestion.correctOption.trim().toLowerCase()}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Feedback */}
          {revealed && (
            <div
              className={cn(
                "rounded-lg p-3 text-sm border",
                answers[answers.length - 1]?.isCorrect
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "bg-red-50 border-red-300 text-red-800"
              )}
            >
              <div className="flex items-start gap-2">
                {answers[answers.length - 1]?.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                )}
                <div>
                  <p className="font-semibold mb-1">
                    {answers[answers.length - 1]?.isCorrect ? "¡Correcto!" : `Incorrecto — respuesta: ${currentQuestion.correctOption}`}
                  </p>
                  <p className="text-sm opacity-90">{currentQuestion.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            {!revealed ? (
              <Button
                variant="bridge"
                onClick={handleConfirm}
                disabled={!selectedOption}
              >
                Confirmar
              </Button>
            ) : (
              <Button
                variant="bridge"
                onClick={handleNext}
                isLoading={submitting}
                className="gap-2"
              >
                {isLastQuestion ? "Ver resultados" : "Siguiente"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
