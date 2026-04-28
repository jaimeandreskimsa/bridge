import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users, ShieldAlert } from "lucide-react";
import { CreateGroupForm } from "./create-group-form";
import Link from "next/link";

export const metadata = { title: "Crear grupo" };

const ALLOWED_ROLES = ["MODERADOR", "SUPERADMIN"];

export default async function CrearGrupoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/grupos/crear");

  const hasPermission = ALLOWED_ROLES.includes(session.user.role as string);

  return (
    <div
      className="min-h-screen py-12"
      style={{ background: "linear-gradient(180deg, #f5f4f0 0%, #f0ede8 100%)" }}
    >
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a23a]/70 mb-1">
            Comunidad
          </p>
          <h1 className="text-3xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#c9a23a]" />
            Crear grupo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea un espacio para jugadores con intereses en común.
          </p>
        </div>

        {!hasPermission ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <ShieldAlert className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="font-bold text-navy-950 text-lg mb-2">Permisos insuficientes</h2>
            <p className="text-sm text-gray-500 mb-6">
              Solo moderadores y administradores pueden crear grupos. Si crees que deberías tener acceso, contactá a un administrador.
            </p>
            <Link
              href="/grupos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-950 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              ← Volver a grupos
            </Link>
          </div>
        ) : (
          <CreateGroupForm />
        )}
      </div>
    </div>
  );
}
