"use client";

import { useState } from "react";
import { ChevronDown, Play, Lock, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { PriceModel } from "@prisma/client";

interface Lesson {
  id: string;
  title: string;
  duration: number | null;
  isPreview: boolean;
  type: string;
  order: number;
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface ModuleAccordionProps {
  modules: Module[];
  isEnrolled: boolean;
  courseId: string;
  priceModel: PriceModel;
  freemiumCount?: number | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function LessonIcon({ type }: { type: string }) {
  if (type === "TEXT") return <FileText className="w-3.5 h-3.5 text-gray-400" />;
  return <Play className="w-3.5 h-3.5 text-gray-400" />;
}

export function ModuleAccordion({
  modules,
  isEnrolled,
  courseId,
  priceModel,
  freemiumCount,
}: ModuleAccordionProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(modules.length > 0 ? [modules[0].id] : [])
  );

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Para freemium: contar cuántas lecciones totales (en orden) son accesibles sin pago
  let lessonIndex = 0;

  return (
    <div className="border rounded-xl overflow-hidden divide-y">
      {modules.map((mod) => {
        const isOpen = openModules.has(mod.id);
        const modDuration = mod.lessons.reduce((acc, l) => acc + (l.duration ?? 0), 0);

        return (
          <div key={mod.id}>
            {/* Módulo header */}
            <button
              onClick={() => toggleModule(mod.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {mod.order}. {mod.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {mod.lessons.length} clases
                  {modDuration > 0 && ` · ${formatDuration(modDuration)}`}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-gray-500 transition-transform shrink-0 ml-3",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {/* Lecciones */}
            {isOpen && (
              <ul className="divide-y">
                {mod.lessons.map((lesson) => {
                  lessonIndex++;
                  // Determinar si la lección es accesible
                  const isAccessible =
                    isEnrolled ||
                    lesson.isPreview ||
                    (priceModel === "FREEMIUM" &&
                      freemiumCount != null &&
                      lessonIndex <= freemiumCount);

                  const LessonContent = (
                    <li
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 text-sm transition-colors",
                        isAccessible
                          ? "hover:bg-gray-50 cursor-pointer"
                          : "opacity-60 cursor-default"
                      )}
                    >
                      <LessonIcon type={lesson.type} />
                      <span className="flex-1 text-gray-700">{lesson.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {lesson.isPreview && (
                          <span className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            Preview
                          </span>
                        )}
                        {!isAccessible && (
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {lesson.duration != null && lesson.duration > 0 && (
                          <span className="text-xs text-gray-400">
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                      </div>
                    </li>
                  );

                  if (isAccessible) {
                    return (
                      <Link key={lesson.id} href={`/cursos/${courseId}/${lesson.id}`}>
                        {LessonContent}
                      </Link>
                    );
                  }

                  return <div key={lesson.id}>{LessonContent}</div>;
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
