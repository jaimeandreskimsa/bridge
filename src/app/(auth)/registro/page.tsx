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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  async function handleGoogleSignUp() {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      toast.error("No se pudo continuar con Google.");
      setIsGoogleLoading(false);
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

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white mb-6"
          onClick={handleGoogleSignUp}
          isLoading={isGoogleLoading}
          disabled={isGoogleLoading}
        >
          {!isGoogleLoading && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continuar con Google
        </Button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-white/30">o con email</span>
          </div>
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
