"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookMarked, BookmarkCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConventionBookmarkButtonProps {
  conventionId: string;
  initialIsBookmarked: boolean;
  initialIsMyAgreement: boolean;
}

export function ConventionBookmarkButton({
  conventionId,
  initialIsBookmarked,
  initialIsMyAgreement,
}: ConventionBookmarkButtonProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isMyAgreement, setIsMyAgreement] = useState(initialIsMyAgreement);
  const [loading, setLoading] = useState(false);

  async function toggle(myAgreement: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/conventions/${conventionId}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMyAgreement: myAgreement }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsBookmarked(data.bookmarked);
        setIsMyAgreement(data.isMyAgreement ?? false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        variant={isMyAgreement ? "default" : "outline"}
        size="sm"
        isLoading={loading}
        onClick={() => toggle(true)}
        className={cn(
          "gap-2",
          isMyAgreement && "bg-green-600 hover:bg-green-700"
        )}
      >
        <Check className="w-4 h-4" />
        {isMyAgreement ? "Es mi acuerdo" : "Marcar como mi acuerdo"}
      </Button>
      <Button
        variant={isBookmarked && !isMyAgreement ? "secondary" : "outline"}
        size="sm"
        isLoading={loading}
        onClick={() => toggle(false)}
        className="gap-2"
      >
        <BookMarked className="w-4 h-4" />
        {isBookmarked ? "Guardada" : "Guardar"}
      </Button>
    </div>
  );
}
