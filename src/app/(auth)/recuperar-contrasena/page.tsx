"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.email({ error: "Ingresá un email válido" }),
});

type FormValues = z.infer<typeof schema>;

export default function RecuperarContrasenaPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    // Simulate a small delay so the UX feels real
    await new Promise((r) => setTimeout(r, 800));
    setSentEmail(values.email);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Revisá tu bandeja</h2>
          <p className="text-sm text-white/50 mb-1">
            Enviamos un link de recuperación a:
          </p>
          <p className="font-medium text-sky-300 mb-6 break-all">{sentEmail}</p>
          <p className="text-xs text-white/30 mb-8 leading-relaxed">
            Si no recibís el email en unos minutos, revisá la carpeta de spam o
            verificá que el email esté bien escrito.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setSent(false)}
            >
              Intentar con otro email
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-sky-300 hover:text-sky-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-8">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-white/50">
            Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

          <Button
            type="submit"
            className="w-full bg-[#2d5282] hover:bg-[#1e3a5f] text-white font-semibold shadow-md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {!isSubmitting && <Mail className="h-4 w-4" />}
            Enviar link de recuperación
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          ¿Ya recordaste tu contraseña?{" "}
          <Link
            href="/login"
            className="text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
