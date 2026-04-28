import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "Bridge Academy <noreply@bridgeacademy.app>";

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "¡Bienvenido a Bridge Academy! ♠♥♦♣",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Bridge Academy</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">♠ ♥ ♦ ♣</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: 0;">
          <h2 style="color: #0f172a; font-size: 20px;">Hola, ${name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Tu cuenta en Bridge Academy ha sido creada exitosamente. Ya puedes explorar nuestros cursos,
            participar en la comunidad y seguir tu progreso en el bridge.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ir a Bridge Academy
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            Bridge Academy — La comunidad de bridge de habla hispana
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPurchaseConfirmationEmail(to: string, name: string, courseTitle: string, amount: number) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Confirmación de compra: ${courseTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Bridge Academy</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: 0;">
          <h2 style="color: #0f172a;">¡Compra exitosa, ${name}!</h2>
          <p style="color: #475569;">Tu inscripción al siguiente curso ha sido confirmada:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: 600; color: #0f172a;">${courseTitle}</p>
            <p style="margin: 8px 0 0; color: #475569; font-size: 14px;">Monto pagado: $${amount.toFixed(2)}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/cursos" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Comenzar curso
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendTeacherApprovalEmail(to: string, name: string, approved: boolean, feedback?: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: approved ? "¡Tu solicitud de profesor fue aprobada!" : "Actualización sobre tu solicitud de profesor",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: ${approved ? "#0f172a" : "#7f1d1d"}; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Bridge Academy</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: 0;">
          <h2 style="color: #0f172a;">Hola, ${name}</h2>
          ${approved
            ? `<p style="color: #475569;">¡Felicitaciones! Tu solicitud para ser profesor en Bridge Academy ha sido <strong>aprobada</strong>. Ya puedes comenzar a crear tus cursos.</p>
               <a href="${process.env.NEXT_PUBLIC_APP_URL}/profesor/cursos/crear" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Crear mi primer curso</a>`
            : `<p style="color: #475569;">Lamentablemente tu solicitud para ser profesor no fue aprobada en esta ocasión.</p>
               ${feedback ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;"><p style="margin: 0; color: #991b1b; font-size: 14px;">${feedback}</p></div>` : ""}
               <p style="color: #475569; font-size: 14px;">Puedes volver a solicitar en el futuro con más información sobre tu experiencia.</p>`
          }
        </div>
      </div>
    `,
  });
}

export async function sendInactivityReminderEmail(to: string, name: string, daysSinceLastActivity: number) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${name}, ¡te echamos de menos en Bridge Academy! ♠`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Bridge Academy</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">♠ ♥ ♦ ♣</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: 0;">
          <h2 style="color: #0f172a;">Hola, ${name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Hace ${daysSinceLastActivity} días que no te vemos. El bridge es un juego que requiere práctica constante —
            ¡no dejes que tu nivel baje!
          </p>
          <p style="color: #475569; line-height: 1.6;">
            La Mano del Día te espera, y hay nuevas actividades en la comunidad.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/mano-del-dia" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver la Mano del Día
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendCertificateEmail(to: string, name: string, courseTitle: string, verificationCode: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verificar/${verificationCode}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `¡Certificado de ${courseTitle} obtenido!`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
          <p style="color: #fbbf24; font-size: 40px; margin: 0;">🏆</p>
          <h1 style="color: white; font-size: 22px; margin: 12px 0 0;">Certificado obtenido</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: 0;">
          <h2 style="color: #0f172a;">¡Felicitaciones, ${name}!</h2>
          <p style="color: #475569;">Has completado exitosamente el curso <strong>${courseTitle}</strong> en Bridge Academy.</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Código de verificación</p>
            <p style="margin: 8px 0 0; font-family: monospace; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: 4px;">${verificationCode}</p>
          </div>
          <a href="${verifyUrl}" style="display: inline-block; margin-top: 8px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver certificado
          </a>
        </div>
      </div>
    `,
  });
}
