"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, BarChart2, Play } from "lucide-react";

interface Props {
  dailyHandId: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  videoClipUrl?: string;
  submission: { answer: string; isCorrect: boolean } | null;
  globalStats: Record<string, number>;
  totalSubmissions: number;
  isLoggedIn: boolean;
}

export function DailyHandClient({
  dailyHandId,
  options,
  correctAnswer,
  explanation,
  videoClipUrl,
  submission,
  globalStats,
  totalSubmissions,
  isLoggedIn,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; explanation: string } | null>(
    submission ? { isCorrect: submission.isCorrect, explanation } : null
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const alreadyAnswered = !!submission;
  const showStats = alreadyAnswered || !!result;

  async function handleSubmit() {
    if (!selected || loading) return;
    if (!isLoggedIn) { toast.error("Debes iniciar sesión para responder"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-hand/${dailyHandId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setResult({ isCorrect: data.isCorrect, explanation: data.explanation });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  const optionLetters = Object.keys(options).sort();

  return (
    <div className="mt-6">
      {/* Options */}
      <div className="space-y-2 mb-4">
        {optionLetters.map((letter) => {
          const isCorrect = letter === correctAnswer;
          const isUserAnswer = (submission?.answer ?? selected) === letter;
          const showResult = showStats;

          let cls = "w-full text-left px-4 py-3 rounded-lg border transition-all text-sm font-medium ";
          if (showResult) {
            if (isCorrect) cls += "bg-green-50 border-green-500 text-green-800";
            else if (isUserAnswer && !isCorrect) cls += "bg-red-50 border-red-400 text-red-700";
            else cls += "bg-gray-50 border-gray-200 text-gray-500";
          } else {
            if (selected === letter) cls += "bg-navy-50 border-navy-500 text-navy-900";
            else cls += "bg-white border-gray-200 text-gray-700 hover:border-navy-300 hover:bg-navy-50";
          }

          const statPct = totalSubmissions > 0
            ? Math.round(((globalStats[letter] ?? 0) / totalSubmissions) * 100)
            : 0;

          return (
            <button
              key={letter}
              className={cls}
              onClick={() => !alreadyAnswered && !result && setSelected(letter)}
              disabled={alreadyAnswered || !!result}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0">
                  {letter}
                </span>
                <span className="flex-1">{options[letter]}</span>
                {showResult && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : isUserAnswer ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                    <span className="text-xs text-gray-400">{statPct}%</span>
                  </div>
                )}
              </div>
              {showResult && (
                <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isCorrect ? "bg-green-400" : "bg-gray-300"}`}
                    style={{ width: `${statPct}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Result feedback */}
      {result && (
        <div className={`rounded-lg p-4 mb-4 ${result.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <div className="flex items-center gap-2 font-semibold mb-2">
            {result.isCorrect ? (
              <><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-green-700">¡Correcto!</span></>
            ) : (
              <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-700">Incorrecto — la respuesta era {correctAnswer}</span></>
            )}
          </div>
          <p className="text-sm text-gray-700">{result.explanation}</p>
          {videoClipUrl && (
            <a href={videoClipUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-navy-700 font-medium hover:underline">
              <Play className="w-4 h-4" /> Ver análisis en video
            </a>
          )}
        </div>
      )}

      {/* Submit / stats */}
      {!alreadyAnswered && !result && (
        <button
          onClick={handleSubmit}
          disabled={!selected || loading}
          className="w-full py-3 bg-navy-900 text-white rounded-lg font-semibold hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Enviando..." : "Confirmar respuesta"}
        </button>
      )}

      {showStats && totalSubmissions > 0 && (
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-3">
          <BarChart2 className="w-3 h-3" />
          {totalSubmissions} jugadores respondieron hoy
        </p>
      )}

      {!isLoggedIn && (
        <p className="text-sm text-center text-gray-500 mt-3">
          <a href="/login" className="text-navy-700 font-medium underline">Inicia sesión</a> para responder y aparecer en el ranking
        </p>
      )}
    </div>
  );
}
