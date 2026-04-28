"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GenerateCertButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/certificates/${courseId}/generate`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Certificado emitido");
      router.refresh();
    } catch {
      toast.error("Error al emitir certificado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-lg p-3">
      <span className="text-sm text-gray-700">{courseTitle}</span>
      <button
        onClick={generate}
        disabled={loading}
        className="text-xs text-blue-700 font-medium hover:underline disabled:opacity-50"
      >
        {loading ? "Emitiendo..." : "Emitir certificado"}
      </button>
    </div>
  );
}
