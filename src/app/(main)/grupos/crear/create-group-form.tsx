"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Users, Lock, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GROUP_TYPES = [
  { value: "LEVEL", label: "Por nivel", emoji: "📚", description: "Agrupa jugadores según su nivel de juego" },
  { value: "CONVENTION", label: "Por convención", emoji: "♠", description: "Foco en sistemas y convenciones de bridge" },
  { value: "TOURNAMENT", label: "Por torneo", emoji: "🏆", description: "Grupo asociado a un torneo específico" },
] as const;

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(80, "Máximo 80 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  type: z.enum(["LEVEL", "CONVENTION", "TOURNAMENT"]),
  isPrivate: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function CreateGroupForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", type: "LEVEL", isPrivate: false },
  });

  const selectedType = watch("type");
  const isPrivate = watch("isPrivate");
  const description = watch("description") ?? "";

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al crear el grupo");
      }

      const { group } = await res.json();
      toast.success("Grupo creado correctamente");
      router.push(`/grupos/${group.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Tipo de grupo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-navy-950 mb-4 text-sm uppercase tracking-wide">
          Tipo de grupo
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {GROUP_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue("type", t.value, { shouldValidate: true })}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                selectedType === t.value
                  ? "border-[#c9a23a] bg-[#c9a23a]/5"
                  : "border-gray-100 hover:border-gray-200 bg-gray-50"
              )}
            >
              <span className="text-2xl">{t.emoji}</span>
              <div>
                <p className={cn("font-semibold text-sm", selectedType === t.value ? "text-[#9a7c28]" : "text-navy-950")}>
                  {t.label}
                </p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </div>
              {selectedType === t.value && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[#c9a23a] flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info básica */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-navy-950 text-sm uppercase tracking-wide flex items-center gap-2">
          <Users className="w-4 h-4 text-[#c9a23a]" />
          Información del grupo
        </h2>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Nombre *
          </label>
          <Input
            placeholder="ej: Bridge nivel avanzado"
            error={errors.name?.message}
            className="bg-[#f9f8f5] border-gray-200 focus-visible:ring-[#c9a23a]/40 focus-visible:border-[#c9a23a]/60"
            {...register("name")}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Descripción
            </label>
            <span className={cn("text-xs", description.length > 450 ? "text-orange-500" : "text-gray-400")}>
              {description.length}/500
            </span>
          </div>
          <textarea
            rows={3}
            placeholder="¿De qué trata este grupo? ¿A quién va dirigido?"
            className={cn(
              "w-full rounded-lg border border-gray-200 bg-[#f9f8f5] px-3 py-2.5 text-sm placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-[#c9a23a]/40 focus:border-[#c9a23a]/60 transition-colors resize-none",
              errors.description && "border-red-400"
            )}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* Privacidad */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-navy-950 mb-4 text-sm uppercase tracking-wide">
          Privacidad
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: false, icon: Globe, label: "Público", desc: "Cualquier miembro puede unirse" },
            { value: true, icon: Lock, label: "Privado", desc: "Solo por invitación" },
          ].map(({ value, icon: Icon, label, desc }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setValue("isPrivate", value, { shouldValidate: true })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
                isPrivate === value
                  ? "border-[#c9a23a] bg-[#c9a23a]/5"
                  : "border-gray-100 hover:border-gray-200 bg-gray-50"
              )}
            >
              <Icon className={cn("w-5 h-5", isPrivate === value ? "text-[#c9a23a]" : "text-gray-400")} />
              <div>
                <p className={cn("font-semibold text-sm", isPrivate === value ? "text-[#9a7c28]" : "text-navy-950")}>
                  {label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pb-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-navy-950 transition-colors"
        >
          ← Cancelar
        </button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="bg-gradient-to-r from-navy-900 to-navy-800 hover:opacity-90 text-white font-semibold px-8 shadow-md"
        >
          Crear grupo
        </Button>
      </div>
    </form>
  );
}
