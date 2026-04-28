"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GroupJoinButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function join() {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Te uniste al grupo");
      router.refresh();
    } catch {
      toast.error("Error al unirse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={join}
      disabled={loading}
      className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50"
    >
      {loading ? "Uniéndose..." : "Unirse al grupo"}
    </button>
  );
}
