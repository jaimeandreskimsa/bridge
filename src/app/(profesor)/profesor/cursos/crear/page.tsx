"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ---------- Schemas ----------
const step1Schema = z.object({
  title: z.string().min(5, "Mínimo 5 caracteres").max(120),
  description: z.string().min(20, "Mínimo 20 caracteres"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  tags: z.string().optional(),
  thumbnail: z.string().optional(),
});

const step3Schema = z.object({
  priceModel: z.enum(["FREE", "ONE_TIME", "SUBSCRIPTION", "INDIVIDUAL_CLASS", "FREEMIUM"]),
  price: z.number().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;

interface LessonDraft {
  id: string;
  title: string;
  isPreview: boolean;
}
interface ModuleDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

const STEPS = ["Información básica", "Estructura", "Precio", "Preview y publicar"];

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Principiante" },
  { value: "INTERMEDIATE", label: "Intermedio" },
  { value: "ADVANCED", label: "Avanzado" },
  { value: "EXPERT", label: "Experto" },
];

const PRICE_MODEL_OPTIONS = [
  { value: "FREE", label: "Gratuito" },
  { value: "ONE_TIME", label: "Pago único" },
  { value: "SUBSCRIPTION", label: "Suscripción" },
  { value: "INDIVIDUAL_CLASS", label: "Clase individual" },
  { value: "FREEMIUM", label: "Freemium" },
];

export default function CrearCursoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Step 1 data
  const {
    register: reg1,
    handleSubmit: hs1,
    watch: w1,
    formState: { errors: e1 },
  } = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });

  // Step 2 data
  const [modules, setModules] = useState<ModuleDraft[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Step 3 data
  const [priceModel, setPriceModel] = useState<string>("FREE");
  const [price, setPrice] = useState<string>("");

  // Step 1 basic info stored
  const [basicInfo, setBasicInfo] = useState<Step1Data | null>(null);

  // ---------- Helpers ----------
  const uid = () => Math.random().toString(36).slice(2, 9);

  const addModule = () => {
    const newMod: ModuleDraft = { id: uid(), title: "Nuevo módulo", lessons: [] };
    setModules((prev) => [...prev, newMod]);
    setExpandedModules((prev) => new Set([...prev, newMod.id]));
  };

  const removeModule = (id: string) => setModules((prev) => prev.filter((m) => m.id !== id));

  const updateModuleTitle = (id: string, title: string) =>
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title } : m)));

  const addLesson = (moduleId: string) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: [...m.lessons, { id: uid(), title: "Nueva lección", isPreview: false }] }
          : m
      )
    );

  const removeLesson = (moduleId: string, lessonId: string) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m
      )
    );

  const updateLessonTitle = (moduleId: string, lessonId: string, title: string) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, title } : l)) }
          : m
      )
    );

  // ---------- Save draft ----------
  const saveDraft = async (data: Partial<Step1Data> & { modules?: ModuleDraft[]; priceModel?: string; price?: number }) => {
    setIsSaving(true);
    try {
      if (!draftId) {
        const res = await fetch("/api/teacher/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title ?? basicInfo?.title ?? "Borrador sin título",
            description: data.description ?? basicInfo?.description ?? "",
            level: data.level ?? basicInfo?.level ?? "BEGINNER",
            tags: (data.tags ?? basicInfo?.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
            thumbnail: data.thumbnail ?? basicInfo?.thumbnail,
            priceModel: data.priceModel ?? "FREE",
            price: data.price,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          setDraftId(json.id);
          toast.success("Borrador guardado");
        }
      } else {
        await fetch(`/api/teacher/courses/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast.success("Cambios guardados");
      }
    } catch {
      toast.error("Error al guardar el borrador");
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Steps ----------
  const onStep1Submit = async (data: Step1Data) => {
    setBasicInfo(data);
    await saveDraft(data);
    setCurrentStep(1);
  };

  const onStep2Next = async () => {
    if (modules.length === 0) {
      toast.error("Agrega al menos un módulo");
      return;
    }
    await saveDraft({ modules });
    setCurrentStep(2);
  };

  const onStep3Next = async () => {
    const priceNum = price ? parseFloat(price) : undefined;
    await saveDraft({ priceModel, price: priceNum });
    setCurrentStep(3);
  };

  const handlePublish = async () => {
    if (!draftId) {
      toast.error("Guarda el borrador primero");
      return;
    }
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/teacher/courses/${draftId}/publish`, { method: "POST" });
      if (res.ok) {
        toast.success("¡Curso publicado exitosamente!");
        router.push("/profesor/cursos");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Error al publicar");
      }
    } catch {
      toast.error("Error al publicar");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crear nuevo curso</h1>
        <p className="text-gray-500 mt-1">Completa los pasos para publicar tu curso</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => idx < currentStep && setCurrentStep(idx)}
              className="flex items-center gap-2 text-sm"
              disabled={idx > currentStep}
            >
              {idx < currentStep ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === currentStep
                      ? "border-blue-600 text-blue-600"
                      : "border-gray-300 text-gray-300"
                  }`}
                >
                  {idx + 1}
                </div>
              )}
              <span
                className={`hidden sm:block text-xs font-medium ${
                  idx === currentStep ? "text-gray-900" : idx < currentStep ? "text-emerald-700" : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </button>
            {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic info */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información básica</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={hs1(onStep1Submit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Título del curso *</label>
                <Input {...reg1("title")} placeholder="Ej: Fundamentos de apertura en bridge" />
                {e1.title && <p className="text-xs text-red-500 mt-1">{e1.title.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Descripción *</label>
                <Textarea {...reg1("description")} rows={4} placeholder="Describe el contenido y objetivos del curso..." />
                {e1.description && <p className="text-xs text-red-500 mt-1">{e1.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nivel *</label>
                  <select
                    {...reg1("level")}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {LEVEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tags (separados por coma)</label>
                  <Input {...reg1("tags")} placeholder="apertura, bidding, estrategia" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">URL de miniatura</label>
                <Input {...reg1("thumbnail")} placeholder="https://..." />
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar y continuar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Structure */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estructura del curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Sin módulos aún. Agrega el primero.
              </p>
            )}
            {modules.map((mod, modIdx) => (
              <div key={mod.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedModules((prev) => {
                        const next = new Set(prev);
                        prev.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                        return next;
                      })
                    }
                  >
                    {expandedModules.has(mod.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <input
                    value={mod.title}
                    onChange={(e) => updateModuleTitle(mod.id, e.target.value)}
                    className="flex-1 text-sm font-medium bg-transparent border-none outline-none"
                  />
                  <span className="text-xs text-gray-400">Módulo {modIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeModule(mod.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {expandedModules.has(mod.id) && (
                  <div className="px-3 py-2 space-y-2">
                    {mod.lessons.map((lesson, lIdx) => (
                      <div key={lesson.id} className="flex items-center gap-2 py-1.5 pl-6">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                        <span className="text-xs text-gray-400 w-5">{lIdx + 1}.</span>
                        <input
                          value={lesson.title}
                          onChange={(e) => updateLessonTitle(mod.id, lesson.id, e.target.value)}
                          className="flex-1 text-sm bg-transparent border-none outline-none"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-400">
                          <input
                            type="checkbox"
                            checked={lesson.isPreview}
                            onChange={(e) =>
                              setModules((prev) =>
                                prev.map((m) =>
                                  m.id === mod.id
                                    ? {
                                        ...m,
                                        lessons: m.lessons.map((l) =>
                                          l.id === lesson.id ? { ...l, isPreview: e.target.checked } : l
                                        ),
                                      }
                                    : m
                                )
                              )
                            }
                          />
                          Preview
                        </label>
                        <button
                          type="button"
                          onClick={() => removeLesson(mod.id, lesson.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addLesson(mod.id)}
                      className="flex items-center gap-1.5 pl-6 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar lección
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addModule}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar módulo
            </button>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Atrás
              </Button>
              <Button onClick={onStep2Next} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Price */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precio del curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Modelo de precio</label>
              <div className="grid grid-cols-2 gap-3">
                {PRICE_MODEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      priceModel === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceModel"
                      value={opt.value}
                      checked={priceModel === opt.value}
                      onChange={() => setPriceModel(opt.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        priceModel === opt.value ? "border-blue-500" : "border-gray-300"
                      }`}
                    >
                      {priceModel === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {priceModel !== "FREE" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Precio (USD)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="max-w-[200px]"
                />
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Atrás
              </Button>
              <Button onClick={onStep3Next} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview & publish */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview y publicar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                {basicInfo?.thumbnail && (
                  <img src={basicInfo.thumbnail} className="w-24 h-16 rounded-lg object-cover" alt="" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{basicInfo?.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{basicInfo?.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>{LEVEL_OPTIONS.find((l) => l.value === basicInfo?.level)?.label}</span>
                    <span>·</span>
                    <span>{PRICE_MODEL_OPTIONS.find((p) => p.value === priceModel)?.label}</span>
                    {price && priceModel !== "FREE" && <><span>·</span><span>${price}</span></>}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">{modules.length} módulos</p>
                {modules.map((m) => (
                  <div key={m.id} className="text-xs text-gray-500 mb-1">
                    <span className="font-medium">{m.title}</span>
                    <span className="text-gray-400"> — {m.lessons.length} lección{m.lessons.length !== 1 ? "es" : ""}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Al publicar, el curso quedará disponible para que los alumnos se inscriban. Podrás editarlo después.
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Atrás
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success("Guardado como borrador");
                    router.push("/profesor/cursos");
                  }}
                >
                  Guardar borrador
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publicar curso
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
