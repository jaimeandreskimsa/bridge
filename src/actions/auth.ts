"use server";

import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.email({ error: "Email inválido" }),
  password: z.string().min(1, { error: "La contraseña es obligatoria" }),
  redirectTo: z.string().optional(),
});

const registerSchema = z.object({
  name: z
    .string()
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(60, { error: "El nombre no puede superar los 60 caracteres" }),
  email: z.email({ error: "Email inválido" }),
  password: z
    .string()
    .min(8, { error: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/[A-Z]/, { error: "Debe incluir al menos una mayúscula" })
    .regex(/[0-9]/, { error: "Debe incluir al menos un número" }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Login action ─────────────────────────────────────────────────────────────

export async function loginAction(
  rawValues: z.input<typeof loginSchema>
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(rawValues);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password, redirectTo } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: redirectTo ?? "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            error: "Credenciales incorrectas. Verificá tu email y contraseña.",
          };
        case "CallbackRouteError":
          return {
            success: false,
            error: "Error al procesar el inicio de sesión. Intentá de nuevo.",
          };
        default:
          return {
            success: false,
            error: "No se pudo iniciar sesión. Intentá de nuevo.",
          };
      }
    }
    // next-auth throws a NEXT_REDIRECT on success — let it bubble up
    throw error;
  }
}

// ─── Google OAuth action ──────────────────────────────────────────────────────

export async function loginWithGoogleAction(redirectTo?: string): Promise<void> {
  await signIn("google", { redirectTo: redirectTo ?? "/" });
}

// ─── Register + auto-login action ────────────────────────────────────────────

export async function registerAction(
  rawValues: z.input<typeof registerSchema>
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(rawValues);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { name, email, password } = parsed.data;

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        // Server-to-server call — skip certificate errors in dev
        ...(process.env.NODE_ENV === "development"
          ? {}
          : {}),
      }
    );

    const data = (await res.json()) as { error?: string; success?: boolean };

    if (!res.ok) {
      return { success: false, error: data.error ?? "No se pudo crear la cuenta." };
    }
  } catch {
    return { success: false, error: "Error de conexión. Intentá de nuevo." };
  }

  // Auto-login after registration
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created but auto-login failed — still a partial success
      return {
        success: false,
        error: "Cuenta creada. Por favor iniciá sesión manualmente.",
      };
    }
    // NEXT_REDIRECT thrown by signIn on success — let it propagate
    throw error;
  }
}

// ─── Sign out action ──────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
