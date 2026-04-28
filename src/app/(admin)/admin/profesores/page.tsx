import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Star, UserCheck } from "lucide-react";
import { TeacherRequestActions } from "./request-actions";

export const metadata = { title: "Gestión de Profesores" };

export default async function ProfesoresAdminPage() {
  const [pendingRequests, activeTeachers, profesorUsers] = await Promise.all([
    db.teacherRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
    }),
    db.teacherProfile.findMany({
      orderBy: { totalRevenue: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        courses: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
    }),
    db.user.findMany({
      where: { role: "PROFESOR" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, status: true, createdAt: true, image: true, teacherProfile: { select: { id: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gestión de Profesores</h1>

      {/* All users with PROFESOR role */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-5 h-5 text-[#c9a23a]" />
          <h2 className="font-semibold text-gray-900">Usuarios con rol Profesor ({profesorUsers.length})</h2>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          {profesorUsers.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-6">No hay usuarios con rol Profesor.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Nombre", "Email", "Perfil", "Estado", "Miembro desde"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profesorUsers.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.teacherProfile ? (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Con perfil</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Sin perfil</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        u.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Solicitudes pendientes ({pendingRequests.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{req.user.name}</p>
                      <span className="text-xs text-gray-500">{req.user.email}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Miembro desde {formatDate(req.user.createdAt)}</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bio</p>
                        <p className="text-sm text-gray-700">{req.bio}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Experiencia</p>
                        <p className="text-sm text-gray-700">{req.experience}</p>
                      </div>
                    </div>
                    {req.sampleUrl && (
                      <a href={req.sampleUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm text-navy-700 underline">
                        Ver muestra de contenido →
                      </a>
                    )}
                  </div>
                  <TeacherRequestActions requestId={req.id} userId={req.userId} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active teachers */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Profesores activos ({activeTeachers.length})</h2>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Nombre", "Email", "Cursos", "Alumnos", "Rating", "Ingresos", "Estado"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTeachers.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.user.email}</td>
                  <td className="px-4 py-3 text-center">{t.courses.length}</td>
                  <td className="px-4 py-3 text-center">{t.totalStudents.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {t.averageRating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-600">${t.totalRevenue.toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      t.user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{t.user.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
