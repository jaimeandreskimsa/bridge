"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const registroSchema = z
  .object({
    name: z
      .string()
      .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
      .max(60, { error: "El nombre no puede superar los 60 caracteres" }),
    email: z.email({ error: "Ingresá un email válido" }),
    password: z
      .string()
      .min(8, { error: "La contraseña debe tener al menos 8 caracteres" })
      .regex(/[A-Z]/, { error: "Debe incluir al menos una mayúscula" })
      .regex(/[0-9]/, { error: "Debe incluir al menos un número" }),
    confirmPassword: z.string().min(1, { error: "Confirmá tu contraseña" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegistroFormValues = z.infer<typeof registroSchema>;

export default function RegistroPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
  });

  async function onSubmit(values: RegistroFormValues) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear la cuenta. Intentá de nuevo.");
        return;
      }

      toast.success("¡Cuenta creada! Iniciando sesión…");

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Account created but auto-login failed — redirect to login
        router.push("/login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      toast.error("Ocurrió un error inesperado. Intentá de nuevo.");
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Creá tu cuenta</h1>
          <p className="mt-1 text-sm text-white/50">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nombre completo */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1.5">
              Nombre completo
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="María García"
                error={errors.name?.message}
                className={cn(
                  "pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30",
                  "focus-visible:ring-sky-400/60 focus-visible:border-sky-400/60"
                )}
                {...register("name")}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                error={errors.email?.message}
                className={cn(
                  "pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30",
                  "focus-visible:ring-sky-400/60 focus-visible:border-sky-400/60"
                )}
                {...register("email")}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                error={errors.password?.message}
                className={cn(
                  "pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/30",
                  "focus-visible:ring-sky-400/60 focus-visible:border-sky-400/60"
                )}
                {...register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70 mb-1.5">
              Confirmá tu contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                error={errors.confirmPassword?.message}
                className={cn(
                  "pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/30",
                  "focus-visible:ring-sky-400/60 focus-visible:border-sky-400/60"
                )}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-white/30 leading-relaxed">
            Al registrarte aceptás los{" "}
            <Link href="/terminos" className="underline hover:text-white/50 transition-colors">
              Términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="underline hover:text-white/50 transition-colors">
              Política de privacidad
            </Link>
            .
          </p>

          <Button
            type="submit"
            className="w-full bg-[#2d5282] hover:bg-[#1e3a5f] text-white font-semibold shadow-md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {!isSubmitting && <UserPlus className="h-4 w-4" />}
            Crear cuenta
          </Button>
        </form>
      </div>
    </div>
  );
}
