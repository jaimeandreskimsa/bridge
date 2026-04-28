import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { GenerateCertButton } from "./generate-cert-button";

export const metadata = { title: "Mis Certificados" };

export default async function CertificadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certificates = await db.certificate.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        select: {
          title: true,
          level: true,
          teacherProfile: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  const completedEnrollments = await db.enrollment.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { course: { select: { id: true, title: true } } },
  });

  const certifiedCourseIds = new Set(certificates.map((c) => c.courseId));
  const pendingCerts = completedEnrollments.filter((e) => !certifiedCourseIds.has(e.courseId));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-5">
        <Link href="/mi-progreso" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Mi progreso
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Award className="w-6 h-6 text-yellow-500" /> Certificados
      </h1>

      {pendingCerts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-blue-800 mb-2">Certificados disponibles para emitir:</p>
          <div className="space-y-2">
            {pendingCerts.map((e) => (
              <GenerateCertButton key={e.courseId} courseId={e.courseId} courseTitle={e.course.title} />
            ))}
          </div>
        </div>
      )}

      {certificates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Completa cursos para obtener certificados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{cert.course.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Instructor: {cert.course.teacherProfile?.user?.name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Emitido el {formatDate(cert.issuedAt)}</p>
                </div>
                <Link
                  href={`/verificar/${cert.verificationCode}`}
                  target="_blank"
                  className="flex items-center gap-1 text-sm text-navy-700 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver
                </Link>
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-400">Código de verificación</p>
                <p className="font-mono text-sm tracking-widest text-gray-700">{cert.verificationCode}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

