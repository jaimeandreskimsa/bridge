"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
  nextLessonId?: string | null;
}

export function LessonActions({ lessonId, courseId, isCompleted, nextLessonId }: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);

  async function toggleComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          watchedPct: completed ? 0 : 100,
          watchedSeconds: 0,
          forceComplete: !completed ? true : false,
        }),
      });

      if (!res.ok) throw new Error();

      const next = !completed;
      setCompleted(next);
      router.refresh();

      if (next) {
        toast.success("¡Clase marcada como completada! 🎉");
        if (nextLessonId) {
          setTimeout(() => router.push(`/cursos/${courseId}/${nextLessonId}`), 800);
        }
      } else {
        toast("Clase desmarcada");
      }
    } catch {
      toast.error("Error al guardar el progreso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleComplete}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
          completed
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            : "bg-navy-950 text-white hover:opacity-90"
        )}
      >
        {completed ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Completada
          </>
        ) : (
          <>
            <Circle className="w-4 h-4" />
            Marcar como completada
          </>
        )}
      </button>

      {nextLessonId && !completed && (
        <button
          onClick={() => router.push(`/cursos/${courseId}/${nextLessonId}`)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-navy-950 hover:bg-gray-50 transition-colors border border-gray-200"
        >
          Siguiente
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
