import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL, APP_NAME } from "@/lib/resend";

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

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { name, email, password } = parsed.data;

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email. Intentá iniciar sesión." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + playerLevel in a transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ALUMNO",
          status: "ACTIVE",
        },
        select: { id: true, name: true, email: true },
      });

      await tx.playerLevel_.create({
        data: {
          userId: newUser.id,
          level: "BEGINNER",
        },
      });

      return newUser;
    });

    // Send welcome email (non-blocking — don't fail registration if email fails)
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email!,
        subject: `¡Bienvenido/a a ${APP_NAME}, ${user.name}!`,
        html: buildWelcomeEmail({ name: user.name ?? "jugador/a" }),
      });
    } catch (emailError) {
      // Log but don't fail the registration
      console.error("[register] Failed to send welcome email:", emailError);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[register] Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor. Intentá de nuevo." },
      { status: 500 }
    );
  }
}

function buildWelcomeEmail({ name }: { name: string }): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a Bridge Academy</title>
</head>
<body style="margin:0;padding:0;background-color:#0f2340;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;width:100%;background-color:#1a2f4a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5282 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">♠</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                Bridge<span style="color:#7dd3fc;">Academy</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:600;">
                ¡Hola, ${name}! 👋
              </h2>
              <p style="margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">
                Nos alegra que te hayas unido a <strong style="color:#fff;">Bridge Academy</strong>,
                la plataforma de referencia para aprender bridge en español.
              </p>
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">
                Tu cuenta ya está activa. Podés explorar cursos, unirte a la comunidad y practicar
                con manos interactivas desde el primer momento.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:8px;background-color:#2d5282;">
                    <a href="${process.env.NEXTAUTH_URL ?? "https://bridgeacademy.com"}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Comenzar ahora →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Suits row -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0;font-size:28px;letter-spacing:12px;opacity:0.15;">♠ ♥ ♦ ♣</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:rgba(0,0,0,0.2);padding:20px 40px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} Bridge Academy. Todos los derechos reservados.<br/>
                Si no creaste esta cuenta, ignorá este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
