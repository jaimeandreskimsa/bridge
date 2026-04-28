"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";

export function WithdrawButton({ available, teacherId }: { available: number; teacherId: string }) {
  const [amount, setAmount] = useState(available);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function request() {
    if (amount <= 0 || amount > available) return;
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: "BANK_TRANSFER" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Solicitud de retiro enviada");
      router.refresh();
    } catch {
      toast.error("Error al solicitar retiro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs text-gray-500 mb-1 block">Monto a retirar (máx. {formatPrice(available)})</label>
        <input
          type="number"
          min={1}
          max={available}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={request}
        disabled={loading || amount <= 0 || amount > available}
        className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50 mt-5"
      >
        {loading ? "Enviando..." : "Solicitar retiro"}
      </button>
    </div>
  );
}
