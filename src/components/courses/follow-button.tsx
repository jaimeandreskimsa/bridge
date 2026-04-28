"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
}

export function FollowButton({ targetUserId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${targetUserId}/follow`, {
          method: isFollowing ? "DELETE" : "POST",
        });
        if (!res.ok) throw new Error();
        setIsFollowing(!isFollowing);
        toast.success(isFollowing ? "Dejaste de seguir al profesor" : "Ahora seguís a este profesor");
        router.refresh();
      } catch {
        toast.error("Ocurrió un error. Intentá de nuevo.");
      }
    });
  };

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "bridge"}
      onClick={handleClick}
      disabled={isPending}
      className="gap-1.5"
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Seguir
        </>
      )}
    </Button>
  );
}
