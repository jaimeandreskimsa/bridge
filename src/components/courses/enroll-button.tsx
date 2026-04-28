"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PriceModel } from "@prisma/client";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface EnrollButtonProps {
  courseId: string;
  priceModel: PriceModel;
  price?: number | null;
  isLoggedIn: boolean;
}

export function EnrollButton({ courseId, priceModel, price, isLoggedIn }: EnrollButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <Link href={`/login?callbackUrl=/cursos/${courseId}`}>
        <Button className="w-full gap-2" size="lg" variant="bridge">
          <LogIn className="w-4 h-4" />
          Iniciar sesión para inscribirse
        </Button>
      </Link>
    );
  }

  const handleEnroll = () => {
    startTransition(async () => {
      try {
        if (priceModel === "FREE" || priceModel === "FREEMIUM") {
          const res = await fetch(`/api/courses/${courseId}/enroll`, {
            method: "POST",
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Error al inscribirse");
          }
          toast.success("¡Te inscribiste al curso!");
          router.refresh();
        } else {
          // Para cursos de pago: redirigir a checkout
          const res = await fetch(`/api/courses/${courseId}/checkout`, {
            method: "POST",
          });
          if (!res.ok) throw new Error("Error al procesar el pago");
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ocurrió un error. Intentá de nuevo.");
      }
    });
  };

  const buttonLabel = () => {
    switch (priceModel) {
      case "FREE":
        return "Inscribirme gratis";
      case "FREEMIUM":
        return "Empezar gratis";
      case "SUBSCRIPTION":
        return "Suscribirme";
      case "ONE_TIME":
        return price ? `Comprar · ${formatPrice(price)}` : "Comprar";
      case "INDIVIDUAL_CLASS":
        return "Ver clases individuales";
      default:
        return "Inscribirme";
    }
  };

  return (
    <Button
      className="w-full gap-2"
      size="lg"
      variant="bridge"
      onClick={handleEnroll}
      disabled={isPending}
      isLoading={isPending}
    >
      {!isPending && <ShoppingCart className="w-4 h-4" />}
      {buttonLabel()}
    </Button>
  );
}
