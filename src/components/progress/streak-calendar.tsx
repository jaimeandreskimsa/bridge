"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface DayActivity {
  date: string; // ISO date string YYYY-MM-DD
  active: boolean;
  dailyHandCorrect: boolean;
  lessonCount: number;
}

interface StreakCalendarProps {
  activityData: DayActivity[];
  className?: string;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getDayColor(day: DayActivity | undefined, isToday: boolean): string {
  if (!day || !day.active) {
    return isToday ? "bg-gray-200 ring-2 ring-gray-400" : "bg-gray-100";
  }
  if (day.dailyHandCorrect) {
    return isToday ? "bg-green-700 ring-2 ring-green-400" : "bg-green-600";
  }
  return isToday ? "bg-green-400 ring-2 ring-green-300" : "bg-green-300";
}

export function StreakCalendar({ activityData, className }: StreakCalendarProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Build a map for quick lookup
  const activityMap = new Map(activityData.map((d) => [d.date, d]));

  // Build last 30 days array
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  const todayStr = today.toISOString().slice(0, 10);

  function buildTooltipText(dateStr: string): string {
    const day = activityMap.get(dateStr);
    const label = formatDay(dateStr);
    if (!day || !day.active) {
      return `${label}\nSin actividad`;
    }
    const parts: string[] = [label];
    if (day.lessonCount > 0) {
      parts.push(`${day.lessonCount} ${day.lessonCount === 1 ? "lección vista" : "lecciones vistas"}`);
    }
    if (day.dailyHandCorrect) {
      parts.push("Mano del Día: correcta ✓");
    } else if (day.active) {
      parts.push("Mano del Día: intentada");
    }
    return parts.join("\n");
  }

  const activeCount = activityData.filter((d) => d.active).length;
  const correctHandCount = activityData.filter((d) => d.dailyHandCorrect).length;

  return (
    <div className={cn("relative", className)}>
      {/* Legend */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {activeCount} de 30 días activo · {correctHandCount} manos del día resueltas
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
            Sin actividad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-300 inline-block" />
            Activo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" />
            Mano del Día
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="relative">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
          onMouseLeave={() => setTooltip(null)}
        >
          {days.map((dateStr) => {
            const day = activityMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const cellColor = getDayColor(day, isToday);

            return (
              <div
                key={dateStr}
                className={cn(
                  "aspect-square rounded-sm cursor-default transition-transform hover:scale-110",
                  cellColor
                )}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget.closest(".relative")?.getBoundingClientRect();
                  setTooltip({
                    text: buildTooltipText(dateStr),
                    x: rect.left - (parentRect?.left ?? 0) + rect.width / 2,
                    y: rect.top - (parentRect?.top ?? 0),
                  });
                }}
              />
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg whitespace-pre-line max-w-[200px] text-center"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tooltip.text}
            <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>

      {/* Day labels */}
      <div
        className="grid gap-1.5 mt-1"
        style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
      >
        {days.map((dateStr, i) => {
          const d = new Date(dateStr + "T12:00:00");
          const isFirst = i === 0;
          const isLast = i === 29;
          const isMidpoint = i === 14;
          return (
            <div key={dateStr} className="text-center">
              {(isFirst || isLast || isMidpoint) && (
                <span className="text-[9px] text-gray-400">
                  {d.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
