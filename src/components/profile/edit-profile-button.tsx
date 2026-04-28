"use client";

import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EditProfileButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push("/configuracion")}
      className="gap-1.5 border-[#c9a23a]/40 text-[#9a7c28] hover:bg-[#c9a23a]/10 hover:border-[#c9a23a]"
    >
      <Pencil className="w-3.5 h-3.5" />
      Editar perfil
    </Button>
  );
}
