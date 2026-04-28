"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import type { TournamentRecord } from "@prisma/client";

export function EditTournamentModal({ record }: { record: TournamentRecord }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          date: fd.get("date"),
          format: fd.get("format") || null,
          result: fd.get("result") || null,
          mpPoints: fd.get("mpPoints") ? Number(fd.get("mpPoints")) : null,
          notes: fd.get("notes") || null,
          partner: fd.get("partner") || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Torneo actualizado");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este torneo?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Torneo eliminado");
      router.push("/torneos");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5">
        <Pencil className="w-3.5 h-3.5" /> Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-900 mb-4">Editar torneo</h2>
            <form onSubmit={update} className="space-y-3">
              <input name="name" required defaultValue={record.name} placeholder="Nombre" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="date" type="date" required defaultValue={record.date.toISOString().split("T")[0]} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="format" defaultValue={record.format ?? ""} placeholder="Formato" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="result" defaultValue={record.result ?? ""} placeholder="Resultado" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="mpPoints" type="number" step="0.01" defaultValue={record.mpPoints ?? ""} placeholder="Puntos MP" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="partner" defaultValue={(record as any).partner ?? ""} placeholder="Compañero" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea name="notes" defaultValue={record.notes ?? ""} placeholder="Notas" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={remove} disabled={loading} className="px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
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
