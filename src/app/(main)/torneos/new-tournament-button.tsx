"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function NewTournamentButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          date: fd.get("date"),
          format: fd.get("format"),
          result: fd.get("result"),
          mpPoints: fd.get("mpPoints") ? Number(fd.get("mpPoints")) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Torneo registrado");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800">
        <Plus className="w-4 h-4" /> Registrar torneo
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-900 mb-4">Registrar torneo</h2>
            <form onSubmit={create} className="space-y-3">
              <input name="name" required placeholder="Nombre del torneo" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="date" type="date" required className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="format" placeholder="Formato (MP, IMP, etc.)" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="result" placeholder="Resultado" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="mpPoints" type="number" step="0.01" placeholder="Puntos MP" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50">
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
