"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props { requestId: string; userId: string; }

export function TeacherRequestActions({ requestId, userId }: Props) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(action: "approve" | "reject") {
    if (action === "reject" && !feedback.trim()) {
      toast.error("Debes ingresar feedback para rechazar la solicitud");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/teacher-requests/${requestId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "approve" ? "Profesor aprobado" : "Solicitud rechazada");
      window.location.reload();
    } catch {
      toast.error("Error al procesar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-56">
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback (requerido para rechazar)"
        className="text-sm border rounded-lg p-2 resize-none"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => handle("approve")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" /> Aprobar
        </button>
        <button
          onClick={() => handle("reject")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" /> Rechazar
        </button>
      </div>
    </div>
  );
}
