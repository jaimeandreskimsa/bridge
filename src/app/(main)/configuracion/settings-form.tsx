"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  AtSign,
  FileText,
  Globe,
  Clock,
  Mail,
  Shield,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getInitials } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo (_)")
    .or(z.literal("")),
  bio: z.string().max(500, "Máximo 500 caracteres").optional(),
  country: z.string().max(60).optional(),
  timezone: z.string().max(60).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    image: string | null;
    bio: string | null;
    country: string | null;
    timezone: string | null;
    role: string;
    createdAt: Date;
  };
}

const ROLE_LABELS: Record<string, string> = {
  ALUMNO: "Alumno",
  PROFESOR: "Profesor",
  MODERADOR: "Moderador",
  SUPERADMIN: "Superadmin",
};

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/Caracas",
  "Europe/Madrid",
  "UTC",
];

export function SettingsForm({ user }: Props) {
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name ?? "",
      username: user.username ?? "",
      bio: user.bio ?? "",
      country: user.country ?? "",
      timezone: user.timezone ?? "America/Argentina/Buenos_Aires",
    },
  });

  const bio = watch("bio") ?? "";

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(`/api/users/${user.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Configuración guardada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <div
      className="min-h-screen py-10"
      style={{ background: "linear-gradient(180deg, #f5f4f0 0%, #f0ede8 100%)" }}
    >
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/70 mb-1">
            Cuenta
          </p>
          <h1 className="text-3xl font-bold text-navy-950 tracking-tight">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra tu perfil e información personal
          </p>
        </div>

        <div className="space-y-5">
          {/* Avatar + role card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-18 w-18 ring-2 ring-[#c9a23a]/20 ring-offset-2">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-navy-800 to-navy-950 text-white">
                    {getInitials(user.name ?? user.email ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  disabled
                  title="Próximamente"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#c9a23a] flex items-center justify-center shadow-md cursor-not-allowed opacity-70"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy-950 text-lg truncate">
                  {user.name ?? "Sin nombre"}
                </p>
                <p className="text-sm text-gray-400 truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#c9a23a]/10 text-[#9a7c28] border border-[#c9a23a]/20">
                    <Shield className="w-3 h-3" />
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                  <span className="text-xs text-gray-400">
                    Miembro desde{" "}
                    {new Date(user.createdAt).toLocaleDateString("es-AR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name + Username */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-navy-950 mb-5 flex items-center gap-2">
                <User className="w-4 h-4 text-[#c9a23a]" />
                Información personal
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Nombre completo
                  </label>
                  <Input
                    placeholder="Tu nombre"
                    error={errors.name?.message}
                    className="bg-[#f9f8f5] border-gray-200 focus-visible:ring-[#c9a23a]/40 focus-visible:border-[#c9a23a]/60"
                    {...register("name")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      placeholder="usuario_123"
                      error={errors.username?.message}
                      className="pl-9 bg-[#f9f8f5] border-gray-200 focus-visible:ring-[#c9a23a]/40 focus-visible:border-[#c9a23a]/60"
                      {...register("username")}
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Biografía
                  </label>
                  <span className={cn("text-xs", bio.length > 450 ? "text-orange-500" : "text-gray-400")}>
                    {bio.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Cuéntanos algo sobre ti y tu experiencia en bridge..."
                  className={cn(
                    "w-full rounded-lg border border-gray-200 bg-[#f9f8f5] px-3 py-2.5 text-sm placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-[#c9a23a]/40 focus:border-[#c9a23a]/60 transition-colors resize-none",
                    errors.bio && "border-red-400"
                  )}
                  {...register("bio")}
                />
                {errors.bio && (
                  <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>
                )}
              </div>
            </div>

            {/* Localización */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-navy-950 mb-5 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#c9a23a]" />
                Localización
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    País
                  </label>
                  <Input
                    placeholder="ej: Argentina"
                    error={errors.country?.message}
                    className="bg-[#f9f8f5] border-gray-200 focus-visible:ring-[#c9a23a]/40 focus-visible:border-[#c9a23a]/60"
                    {...register("country")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Zona horaria
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      className="w-full h-10 rounded-md border border-gray-200 bg-[#f9f8f5] pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c9a23a]/40 focus:border-[#c9a23a]/60 transition-colors appearance-none"
                      {...register("timezone")}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-navy-950 mb-5 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#c9a23a]" />
                Cuenta
              </h2>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <div className="flex items-center gap-2 h-10 rounded-lg border border-gray-200 bg-gray-50 px-3">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 truncate">{user.email}</span>
                  <span className="ml-auto text-[10px] font-semibold text-gray-400 shrink-0">
                    No editable
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Para cambiar tu email contacta al soporte.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pb-10">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  Guardado
                </span>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty}
                isLoading={isSubmitting}
                className="bg-gradient-to-r from-navy-900 to-navy-800 hover:opacity-90 text-white font-semibold px-8 shadow-md disabled:opacity-40"
              >
                Guardar cambios
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
