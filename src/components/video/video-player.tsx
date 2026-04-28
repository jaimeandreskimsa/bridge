"use client";

import { useEffect, useRef, useCallback } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { toast } from "sonner";

interface VideoPlayerProps {
  playbackId: string;
  lessonId: string;
  courseId: string;
  title?: string;
  startTime?: number;
  onComplete?: () => void;
  onProgress?: (pct: number) => void;
}

export function VideoPlayer({
  playbackId,
  lessonId,
  courseId,
  title,
  startTime = 0,
  onComplete,
  onProgress,
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLElement & { currentTime: number; duration: number }>(null);
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const saveProgress = useCallback(
    async (pct: number, seconds: number) => {
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, watchedPct: pct, watchedSeconds: Math.floor(seconds) }),
        });
        if (pct >= 85 && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
          toast.success("¡Lección completada!");
        }
        onProgress?.(pct);
      } catch {}
    },
    [lessonId, onComplete, onProgress]
  );

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || !player.duration) return;
      const pct = Math.round((player.currentTime / player.duration) * 100);
      if (pct > progressRef.current) {
        progressRef.current = pct;
        saveProgress(pct, player.currentTime);
      }
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [saveProgress]);

  return (
    <div className="w-full rounded-lg overflow-hidden bg-black">
      <MuxPlayer
        ref={playerRef as any}
        playbackId={playbackId}
        metadata={{ video_title: title }}
        startTime={startTime}
        streamType="on-demand"
        defaultHiddenCaptions
        className="w-full aspect-video"
        style={{ aspectRatio: "16/9" }}
      />
    </div>
  );
}
