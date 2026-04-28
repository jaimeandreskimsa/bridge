"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function NewNotebookButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/partnership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerEmail: fd.get("partnerEmail") || null,
          name: fd.get("name") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Libreta creada");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800"
      >
        <Plus className="w-4 h-4" /> Nueva libreta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Nueva libreta de acuerdos</h2>
            <form onSubmit={create} className="space-y-3">
              <input
                name="name"
                required
                placeholder="Nombre de la libreta"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                name="partnerEmail"
                type="email"
                placeholder="Email del compañero (opcional)"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
