"use client";

import { useState } from "react";
import { HandDisplay } from "./hand-display";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface Card { suit: "S" | "H" | "D" | "C"; value: string }
interface Position {
  id: string;
  pbnData: string;
  questionText: string;
  options: Record<string, { card: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  lead?: string;
}

interface Props {
  position?: Position;
  onSolve?: (correct: boolean) => void;
}

const SUITS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLORS = { S: "text-gray-900", H: "text-red-600", D: "text-red-600", C: "text-gray-900" };

export function PositionAnalyzer({ position, onSolve }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [attempts, setAttempts] = useState(0);

  if (!position) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
        <span className="text-4xl">♠</span>
        <p className="mt-2">Selecciona una posición para analizar</p>
      </div>
    );
  }

  function submitAnswer(letter: string) {
    if (result) return;
    const correct = letter === position!.correctAnswer;
    setSelectedCard(letter);
    setResult({ correct, explanation: position!.explanation });
    setAttempts((a) => a + 1);
    onSolve?.(correct);
  }

  function reset() {
    setSelectedCard(null);
    setResult(null);
  }

  const options = position.options as Record<string, { card: string; text: string }>;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Hand display */}
      <div className="p-4 bg-green-900/10 border-b">
        <HandDisplay pbnData={position.pbnData} problemMode compact={false} />
        {position.lead && (
          <div className="mt-3 text-sm text-center text-gray-600">
            <span className="font-medium">Primer carta jugada: </span>{position.lead}
          </div>
        )}
      </div>

      {/* Question */}
      <div className="p-5">
        <p className="text-gray-900 font-medium mb-4">{position.questionText}</p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(options).map(([letter, opt]) => {
            const isCorrect = letter === position.correctAnswer;
            const isSelected = letter === selectedCard;
            let cls = "p-3 rounded-lg border text-sm font-medium transition-all ";
            if (result) {
              if (isCorrect) cls += "bg-green-50 border-green-400 text-green-800";
              else if (isSelected) cls += "bg-red-50 border-red-400 text-red-700";
              else cls += "bg-gray-50 border-gray-200 text-gray-400";
            } else {
              cls += "bg-white border-gray-200 hover:border-navy-400 hover:bg-navy-50 text-gray-800 cursor-pointer";
            }
            const [s, v] = opt.card.split("-") as ["S"|"H"|"D"|"C", string];
            return (
              <button key={letter} className={cls} onClick={() => submitAnswer(letter)} disabled={!!result}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0">
                    {letter}
                  </span>
                  <span className={`text-lg font-bold ${SUIT_COLORS[s]}`}>
                    {SUITS[s]}{v}
                  </span>
                  <span className="text-xs text-gray-500">{opt.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg p-4 ${result.correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-center gap-2 font-semibold mb-2">
              {result.correct
                ? <><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-green-700">¡Correcto!</span></>
                : <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-700">Incorrecto — la jugada correcta era {position.correctAnswer}</span></>
              }
            </div>
            <p className="text-sm text-gray-700">{result.explanation}</p>
            <button onClick={reset} className="mt-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
              <RotateCcw className="w-3 h-3" /> Reintentar
            </button>
          </div>
        )}

        {!result && (
          <p className="text-xs text-gray-400">Elige la carta que jugarías</p>
        )}
      </div>
    </div>
  );
}
