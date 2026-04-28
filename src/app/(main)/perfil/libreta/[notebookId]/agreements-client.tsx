"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import type { PartnershipAgreement as Agreement } from "@prisma/client";

const CATEGORIES = ["Apertura", "Respuestas", "Competencia", "Slam", "Defensa", "Declaración", "Otro"];

interface Props {
  notebookId: string;
  initialAgreements: Agreement[];
  isOwner: boolean;
}

export function AgreementsClient({ notebookId, initialAgreements, isOwner }: Props) {
  const [agreements, setAgreements] = useState(initialAgreements);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = agreements.filter((a) => a.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Agreement[]>);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      category: fd.get("category") as string,
      bid: fd.get("bid") as string,
      meaning: fd.get("meaning") as string,
      notes: fd.get("notes") as string || null,
    };
    setLoading(true);
    try {
      if (editing) {
        const res = await fetch(`/api/partnership/${notebookId}/agreements/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setAgreements((prev) => prev.map((a) => a.id === editing.id ? updated.agreement : a));
        toast.success("Acuerdo actualizado");
      } else {
        const res = await fetch(`/api/partnership/${notebookId}/agreements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setAgreements((prev) => [...prev, created.agreement]);
        toast.success("Acuerdo agregado");
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este acuerdo?")) return;
    try {
      await fetch(`/api/partnership/${notebookId}/agreements/${id}`, { method: "DELETE" });
      setAgreements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Acuerdo eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function exportBBO() {
    const lines = agreements.map((a) => `${String(a.sequence ?? "")}: ${a.meaning}${a.notes ? ` (${a.notes})` : ""}`);
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "acuerdos-bbo.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{agreements.length} acuerdos registrados</p>
        <div className="flex gap-2">
          <button onClick={exportBBO} className="flex items-center gap-1 text-sm text-gray-500 border rounded-lg px-3 py-1.5 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Exportar BBO
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1 text-sm bg-navy-900 text-white rounded-lg px-3 py-1.5 hover:bg-navy-800"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
      </div>

      {(showForm || editing) && (
        <div className="bg-gray-50 rounded-xl border p-4 mb-4">
          <form onSubmit={save} className="space-y-3">
            <select name="category" defaultValue={editing?.category ?? "Apertura"} required className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input name="sequence" required defaultValue={String(editing?.sequence ?? "")} placeholder="Licitación (ej. 1♠)" className="border rounded-lg px-3 py-2 text-sm" />
              <input name="meaning" required defaultValue={editing?.meaning ?? ""} placeholder="Significado" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <input name="notes" defaultValue={editing?.notes ?? ""} placeholder="Notas adicionales" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50">
                {loading ? "..." : editing ? "Actualizar" : "Agregar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No hay acuerdos registrados. ¡Agrega el primero!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-sm text-gray-700">{cat}</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left w-32">Licitación</th>
                    <th className="px-4 py-2 text-left">Significado</th>
                    <th className="px-4 py-2 text-left text-gray-300">Notas</th>
                    <th className="px-4 py-2 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono font-semibold text-navy-700">{String(a.sequence ?? "")}</td>
                      <td className="px-4 py-2.5 text-gray-800">{a.meaning}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{a.notes}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditing(a); setShowForm(false); }} className="p-1 text-gray-400 hover:text-gray-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => remove(a.id)} className="p-1 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
