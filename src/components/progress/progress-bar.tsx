"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showLabel?: boolean;
  colorVariant?: "blue" | "green" | "yellow" | "purple" | "red" | "navy";
  className?: string;
  height?: "xs" | "sm" | "md" | "lg";
  animate?: boolean;
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  red: "bg-red-500",
  navy: "bg-navy-800",
};

const heightMap: Record<string, string> = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({
  value,
  label,
  showLabel = true,
  colorVariant = "blue",
  className,
  height = "md",
  animate = true,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const [displayed, setDisplayed] = useState(animate ? 0 : clampedValue);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 700; // ms

  useEffect(() => {
    if (!animate) {
      setDisplayed(clampedValue);
      return;
    }

    const from = displayed;
    const to = clampedValue;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedValue, animate]);

  const barColor = colorMap[colorVariant] ?? colorMap.blue;
  const barHeight = heightMap[height] ?? heightMap.md;

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showLabel && (
            <span className="text-sm font-medium text-gray-700 ml-auto">
              {Math.round(displayed)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", barHeight)}>
        <div
          className={cn("h-full rounded-full transition-none", barColor)}
          style={{ width: `${displayed}%` }}
          role="progressbar"
          aria-valuenow={Math.round(clampedValue)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
