"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SPECIALTIES = [
  "Licitación natural", "Sistema de Acol", "Sistema americano estándar",
  "Precisión", "Defensa", "Juego de declarante", "Competencia",
  "Convenciones modernas", "Bridge pedagógico", "Análisis de manos",
];

export function TeacherRequestForm() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggleSpecialty(s: string) {
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/teacher-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: fd.get("bio"),
          experience: fd.get("experience"),
          specialties: selected,
          linkedinUrl: fd.get("linkedinUrl") || null,
          demoVideoUrl: fd.get("demoVideoUrl") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Solicitud enviada. Te notificaremos pronto.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sobre ti *</label>
          <textarea
            name="bio"
            required
            rows={4}
            placeholder="Cuéntanos sobre tu experiencia en bridge, tus logros y por qué quieres enseñar."
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experiencia docente *</label>
          <textarea
            name="experience"
            required
            rows={3}
            placeholder="¿Has dado clases antes? ¿En qué nivel? ¿A cuántos alumnos?"
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selected.includes(s)
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-navy-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn (opcional)</label>
          <input
            name="linkedinUrl"
            type="url"
            placeholder="https://linkedin.com/in/tu-perfil"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Video de demostración (opcional)</label>
          <input
            name="demoVideoUrl"
            type="url"
            placeholder="URL de YouTube o Vimeo"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-navy-900 text-white text-sm font-medium rounded-lg hover:bg-navy-800 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </div>
  );
}
