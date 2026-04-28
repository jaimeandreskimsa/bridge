import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, roleLabel } from "@/lib/utils";
import { Search } from "lucide-react";
import { AdminUserActions } from "./user-actions";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Gestión de Usuarios" };

interface Props {
  searchParams: Promise<{ q?: string; rol?: string; estado?: string; page?: string }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const { q, rol, estado, page } = await searchParams;
  const pageNum = parseInt(page ?? "1");
  const perPage = 25;

  const where: Prisma.UserWhereInput = {};
  if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }];
  if (rol) where.role = rol as "ALUMNO" | "PROFESOR" | "MODERADOR" | "SUPERADMIN";
  if (estado) where.status = estado as "ACTIVE" | "SUSPENDED" | "BANNED";

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * perPage,
      take: perPage,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, country: true, image: true },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString()} usuarios</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <form className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o email..."
              className="flex-1 text-sm outline-none"
            />
          </div>
          <select name="rol" defaultValue={rol ?? ""} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los roles</option>
            <option value="ALUMNO">Alumno</option>
            <option value="PROFESOR">Profesor</option>
            <option value="MODERADOR">Moderador</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
          <select name="estado" defaultValue={estado ?? ""} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="BANNED">Baneado</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800">
            Filtrar
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Usuario", "Email", "Rol", "Estado", "País", "Registro", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    user.role === "SUPERADMIN" ? "bg-red-100 text-red-700" :
                    user.role === "MODERADOR" ? "bg-purple-100 text-purple-700" :
                    user.role === "PROFESOR" ? "bg-navy-100 text-navy-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{roleLabel(user.role)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    user.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    user.status === "SUSPENDED" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{user.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.country ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminUserActions userId={user.id} currentRole={user.role} currentStatus={user.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">Página {pageNum} de {totalPages}</span>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <a href={`?page=${pageNum - 1}&q=${q ?? ""}&rol=${rol ?? ""}&estado=${estado ?? ""}`}
                  className="px-3 py-1 border rounded text-sm hover:bg-white">Anterior</a>
              )}
              {pageNum < totalPages && (
                <a href={`?page=${pageNum + 1}&q=${q ?? ""}&rol=${rol ?? ""}&estado=${estado ?? ""}`}
                  className="px-3 py-1 border rounded text-sm hover:bg-white">Siguiente</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
