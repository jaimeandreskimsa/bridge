"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";

interface Props {
  reportId: string;
  postId?: string;
  messageId?: string;
}

export function ModerationActions({ reportId, postId, messageId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function action(type: "dismiss" | "remove") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type, postId, messageId }),
      });
      if (!res.ok) throw new Error();
      toast.success(type === "dismiss" ? "Reporte descartado" : "Contenido eliminado");
      router.refresh();
    } catch {
      toast.error("Error al procesar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => action("dismiss")}
        disabled={loading}
        title="Descartar reporte"
        className="p-2 text-gray-400 hover:text-green-600 border rounded-lg hover:border-green-300 hover:bg-green-50 disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => action("remove")}
        disabled={loading}
        title="Eliminar contenido"
        className="p-2 text-gray-400 hover:text-red-600 border rounded-lg hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
