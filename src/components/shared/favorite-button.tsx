"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  entityType: "COURSE" | "LESSON" | "HAND" | "POST";
  entityId: string;
  initialIsFavorited?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function FavoriteButton({ entityType, entityId, initialIsFavorited = false, size = "md", className }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialIsFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!session?.user) { router.push("/login"); return; }
    setFavorited((prev) => !prev);
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();
      setFavorited(data.favorited);
      if (data.favorited) toast.success("Guardado en favoritos");
    } catch {
      setFavorited((prev) => !prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      className={cn(
        "rounded-full transition-all",
        size === "sm" ? "p-1" : "p-2",
        favorited ? "text-red-500 hover:text-red-400" : "text-gray-400 hover:text-red-400",
        className
      )}
      title={favorited ? "Quitar de favoritos" : "Guardar en favoritos"}
    >
      <Heart className={cn(size === "sm" ? "w-4 h-4" : "w-5 h-5", favorited && "fill-current")} />
    </button>
  );
}
