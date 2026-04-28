"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  settings: Record<string, string>;
}

export function PlatformSettingsForm({ settings }: Props) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({
    commissionRate: settings.commissionRate ?? "20",
    stripeEnabled: settings.stripeEnabled ?? "true",
    mercadopagoEnabled: settings.mercadopagoEnabled ?? "true",
    freeCoursesEnabled: settings.freeCoursesEnabled ?? "true",
    dailyHandEnabled: settings.dailyHandEnabled ?? "true",
    chatEnabled: settings.chatEnabled ?? "true",
    maxFreeCourses: settings.maxFreeCourses ?? "3",
    maintenanceMode: settings.maintenanceMode ?? "false",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const toggle = (key: keyof typeof values) =>
    setValues((v) => ({ ...v, [key]: v[key] === "true" ? "false" : "true" }));

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Monetización</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comisión plataforma (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={values.commissionRate}
            onChange={(e) => setValues((v) => ({ ...v, commissionRate: e.target.value }))}
            className="w-48 border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cursos gratuitos máximos por usuario (plan free)
          </label>
          <input
            type="number"
            min={0}
            value={values.maxFreeCourses}
            onChange={(e) => setValues((v) => ({ ...v, maxFreeCourses: e.target.value }))}
            className="w-48 border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Pasarelas de pago</h2>
        {[
          { key: "stripeEnabled" as const, label: "Stripe" },
          { key: "mercadopagoEnabled" as const, label: "MercadoPago" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${
                values[key] === "true" ? "bg-navy-700" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${
                values[key] === "true" ? "translate-x-5" : "translate-x-1"
              }`} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Funcionalidades</h2>
        {[
          { key: "freeCoursesEnabled" as const, label: "Cursos gratuitos" },
          { key: "dailyHandEnabled" as const, label: "Mano del Día" },
          { key: "chatEnabled" as const, label: "Chat" },
          { key: "maintenanceMode" as const, label: "Modo mantenimiento" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${
                values[key] === "true" ? "bg-navy-700" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${
                values[key] === "true" ? "translate-x-5" : "translate-x-1"
              }`} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-navy-900 text-white text-sm font-medium rounded-lg hover:bg-navy-800 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}
