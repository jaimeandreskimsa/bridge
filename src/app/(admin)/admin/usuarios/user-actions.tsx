"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

interface Props {
  userId: string;
  currentRole: string;
  currentStatus: string;
}

export function AdminUserActions({ userId, currentRole, currentStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function action(type: string, value: string) {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Actualizado correctamente");
      window.location.reload();
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-gray-100 text-gray-500"
        disabled={loading}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 rounded-lg border bg-white shadow-lg z-20 py-1 text-sm">
            {currentStatus === "ACTIVE" ? (
              <>
                <button onClick={() => action("status", "SUSPENDED")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-yellow-600">Suspender</button>
                <button onClick={() => action("status", "BANNED")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">Banear</button>
              </>
            ) : (
              <button onClick={() => action("status", "ACTIVE")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-green-600">Reactivar</button>
            )}
            <div className="border-t my-1" />
            {currentRole !== "PROFESOR" && (
              <button onClick={() => action("role", "PROFESOR")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-navy-700">Promover a Profesor</button>
            )}
            {currentRole === "PROFESOR" && (
              <button onClick={() => action("role", "ALUMNO")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-600">Degradar a Alumno</button>
            )}
            {currentRole !== "MODERADOR" && currentRole !== "SUPERADMIN" && (
              <button onClick={() => action("role", "MODERADOR")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-purple-600">Hacer Moderador</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
