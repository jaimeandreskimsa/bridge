import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { TeacherRequestForm } from "./teacher-request-form";

export const metadata = { title: "Solicitar ser Profesor" };

export default async function SolicitarProfesorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (["PROFESOR", "MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    redirect("/profesor/dashboard");
  }

  const existing = await db.teacherRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-navy-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Convertirte en Profesor</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Comparte tu conocimiento de bridge con nuestra comunidad. Crea cursos, da clases y genera ingresos.
        </p>
      </div>

      {existing?.status === "PENDING" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center mb-6">
          <p className="font-medium text-yellow-800">Tu solicitud está siendo revisada</p>
          <p className="text-sm text-yellow-700 mt-1">Te notificaremos cuando tengamos una respuesta.</p>
        </div>
      )}

      {existing?.status === "REJECTED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <p className="font-medium text-red-800 mb-1">Tu solicitud anterior fue rechazada</p>
          {existing.feedback && (
            <p className="text-sm text-red-700">{existing.feedback}</p>
          )}
          <p className="text-sm text-red-600 mt-2">Puedes enviar una nueva solicitud.</p>
        </div>
      )}

      {(!existing || existing.status === "REJECTED") && (
        <TeacherRequestForm />
      )}
    </div>
  );
}
