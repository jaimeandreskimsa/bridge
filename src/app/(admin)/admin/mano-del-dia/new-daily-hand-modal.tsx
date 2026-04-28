"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function NewDailyHandModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    let options: Record<string, { card: string; text: string }> = {};
    try {
      options = JSON.parse(fd.get("options") as string);
    } catch {
      return toast.error("Las opciones deben ser JSON válido");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/daily-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: fd.get("date"),
          pbnData: fd.get("pbnData"),
          questionText: fd.get("questionText"),
          options,
          correctAnswer: fd.get("correctAnswer"),
          explanation: fd.get("explanation"),
          lead: fd.get("lead") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Mano creada");
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
        <Plus className="w-4 h-4" /> Nueva mano
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-4">
            <h2 className="font-semibold text-gray-900 mb-4">Nueva Mano del Día</h2>
            <form onSubmit={create} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                  <input name="date" type="date" required className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primera carta jugada</label>
                  <input name="lead" placeholder="ej. S-A" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Datos PBN *</label>
                <textarea name="pbnData" required rows={3} placeholder='[Deal "N:AKQ.xxx.xxx.xx ..."]' className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pregunta *</label>
                <input name="questionText" required placeholder="¿Cuál es tu próxima jugada?" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Opciones (JSON) *
                </label>
                <textarea
                  name="options"
                  required
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none"
                  defaultValue={JSON.stringify({
                    A: { card: "S-A", text: "As de Picas" },
                    B: { card: "H-K", text: "Rey de Corazones" },
                    C: { card: "D-J", text: "Jota de Diamantes" },
                  }, null, 2)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Respuesta correcta *</label>
                  <input name="correctAnswer" required placeholder="A" maxLength={1} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Explicación *</label>
                <textarea name="explanation" required rows={3} placeholder="Explicación del análisis..." className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50">
                  {loading ? "Creando..." : "Crear mano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
