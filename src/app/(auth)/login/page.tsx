"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.email({ error: "Ingresá un email válido" }),
  password: z.string().min(1, { error: "La contraseña es obligatoria" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Credenciales incorrectas. Verificá tu email y contraseña.",
  OAuthAccountNotLinked:
    "Este email está asociado a otro método de acceso.",
  default: "Ocurrió un error. Intentá de nuevo.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(AUTH_ERRORS[result.error] ?? AUTH_ERRORS.default);
        return;
      }

      toast.success("¡Bienvenido de nuevo!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error(AUTH_ERRORS.default);
    }
  }

  const urlErrorMessage = urlError
    ? (AUTH_ERRORS[urlError] ?? AUTH_ERRORS.default)
    : null;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Iniciá sesión</h1>
          <p className="mt-1 text-sm text-white/50">
            ¿No tenés cuenta?{" "}
            <Link
              href="/registro"
              className="text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors"
            >
              Registrate gratis
            </Link>
          </p>
        </div>

        {urlErrorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {urlErrorMessage}
          </div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-white/70">
                Contraseña
              </label>
              <Link
                href="/recuperar-contrasena"
                className="text-xs text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
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

          <Button
            type="submit"
            className="w-full bg-[#2d5282] hover:bg-[#1e3a5f] text-white font-semibold shadow-md mt-2"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {!isSubmitting && <LogIn className="h-4 w-4" />}
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
