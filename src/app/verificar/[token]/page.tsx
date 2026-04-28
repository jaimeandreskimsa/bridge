import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { CheckCircle2, Award, Calendar, BookOpen } from "lucide-react";
import { formatDate, levelLabel } from "@/lib/utils";
import Link from "next/link";

export default async function VerificarCertificadoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const certificate = await db.certificate.findUnique({
    where: { verificationCode: token },
    include: {
      user: { select: { name: true } },
      course: {
        select: {
          title: true,
          level: true,
          teacherProfile: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!certificate) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-navy-900 to-navy-700 px-8 py-10 text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-yellow-300" />
            </div>
            <p className="text-white/70 text-sm uppercase tracking-widest mb-2">Certificado verificado</p>
            <h1 className="text-2xl font-bold">Bridge Academy</h1>
          </div>

          <div className="px-8 py-8">
            <div className="flex items-center gap-2 text-green-600 mb-6">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold text-sm">Este certificado es auténtico</span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Alumno</p>
                <p className="text-xl font-bold text-gray-900">{certificate.user.name}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Curso completado</p>
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-navy-600" />
                  {certificate.course.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 ml-6">
                  Nivel: {levelLabel(certificate.course.level)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Instructor</p>
                <p className="text-gray-700">{certificate.course.teacherProfile?.user?.name ?? "—"}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha de emisión</p>
                <p className="text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(certificate.issuedAt)}
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Código de verificación</p>
                <p className="font-mono text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg tracking-widest">
                  {certificate.verificationCode}
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t text-center">
            <Link href="/" className="text-sm text-navy-700 hover:underline">
              Ir a Bridge Academy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
