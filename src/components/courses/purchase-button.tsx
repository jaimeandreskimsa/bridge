"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Play, Tag, CreditCard, Loader2, Check, X } from "lucide-react";
import Link from "next/link";
type PriceModel = "FREE" | "ONE_TIME" | "SUBSCRIPTION" | "INDIVIDUAL_CLASS" | "FREEMIUM";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";

type Gateway = "stripe" | "mercadopago";

interface PurchaseButtonProps {
  courseId: string;
  priceModel: PriceModel;
  price?: number | null;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  firstLessonId?: string;
  courseTitle?: string;
}

export function PurchaseButton({
  courseId,
  priceModel,
  price,
  isLoggedIn,
  isEnrolled,
  firstLessonId,
  courseTitle,
}: PurchaseButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponData, setCouponData] = useState<{
    discount: number;
    finalPrice: number;
    type: string;
    value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Gateway selection
  const [gateway, setGateway] = useState<Gateway>("stripe");

  // Confirmation modal for ONE_TIME
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Subscription billing period
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // ──────────────────────────────────────────────────────
  // If already enrolled: show Continue button
  // ──────────────────────────────────────────────────────
  if (isEnrolled) {
    const href = firstLessonId
      ? `/cursos/${courseId}/aprender/${firstLessonId}`
      : `/cursos/${courseId}/aprender`;
    return (
      <Link href={href} className="block w-full">
        <Button className="w-full gap-2" size="lg" variant="bridge">
          <Play className="w-4 h-4" />
          Continuar aprendiendo
        </Button>
      </Link>
    );
  }

  // ──────────────────────────────────────────────────────
  // Coupon validation
  // ──────────────────────────────────────────────────────
  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponData(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim().toUpperCase(), courseId }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.message ?? "Cupón inválido");
        setCouponCode(null);
      } else {
        setCouponCode(data.coupon.code);
        setCouponData({
          discount: data.discount,
          finalPrice: data.finalPrice,
          type: data.coupon.type,
          value: data.coupon.value,
        });
        toast.success("Cupón aplicado");
      }
    } catch {
      setCouponError("Error validando el cupón");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setCouponData(null);
    setCouponInput("");
    setCouponError(null);
  };

  // ──────────────────────────────────────────────────────
  // Checkout
  // ──────────────────────────────────────────────────────
  const handleCheckout = (priceType: "one_time" | "subscription" = "one_time") => {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/cursos/${courseId}`);
      return;
    }
    startTransition(async () => {
      try {
        const endpoint =
          gateway === "mercadopago"
            ? "/api/payments/mercadopago/checkout"
            : "/api/payments/checkout";

        const body: Record<string, unknown> = { courseId, priceType };
        if (couponCode) body.couponCode = couponCode;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error ?? "Error al iniciar el pago");
        }

        const data = await res.json();
        const redirectUrl = data.checkoutUrl ?? data.initPoint;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error("No se recibió URL de checkout");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ocurrió un error. Intentá de nuevo.");
        setShowConfirmModal(false);
      }
    });
  };

  const handleFreeEnroll = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Error al inscribirse");
        }
        toast.success("¡Te inscribiste al curso!");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ocurrió un error");
      }
    });
  };

  const displayPrice = couponData ? couponData.finalPrice : (price ?? 0);
  const annualPrice = displayPrice * 12 * 0.8; // 20% discount on annual

  // ──────────────────────────────────────────────────────
  // Gateway selector (shown for paid courses)
  // ──────────────────────────────────────────────────────
  const GatewaySelector = () => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">Método de pago</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGateway("stripe")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
            gateway === "stripe"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Tarjeta
        </button>
        <button
          type="button"
          onClick={() => setGateway("mercadopago")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
            gateway === "mercadopago"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <span className="text-xs font-bold">MP</span>
          MercadoPago
        </button>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────
  // Coupon input section (shown for paid courses)
  // ──────────────────────────────────────────────────────
  const CouponSection = () => (
    <div className="space-y-2">
      {!couponCode ? (
        <div className="flex gap-2">
          <Input
            placeholder="Código de cupón"
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value.toUpperCase());
              setCouponError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && validateCoupon()}
            className="text-sm h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={validateCoupon}
            disabled={couponLoading || !couponInput.trim()}
            className="shrink-0 h-9"
          >
            {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-green-700 font-medium">
            <Check className="w-3.5 h-3.5" />
            {couponCode}
            {couponData && (
              <span className="text-green-600 font-normal">
                – {couponData.type === "PERCENTAGE" ? `${couponData.value}% OFF` : `$${couponData.value} OFF`}
              </span>
            )}
          </span>
          <button type="button" onClick={removeCoupon} className="text-green-600 hover:text-green-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {couponError && <p className="text-xs text-red-500">{couponError}</p>}
      {couponData && (
        <p className="text-xs text-green-600">
          Precio final: <span className="font-semibold">{formatPrice(couponData.finalPrice)}</span>
          {" "}(antes: {formatPrice(price ?? 0)})
        </p>
      )}
    </div>
  );

  // ──────────────────────────────────────────────────────
  // Render by priceModel
  // ──────────────────────────────────────────────────────

  if (priceModel === "FREE") {
    return (
      <Button
        className="w-full gap-2"
        size="lg"
        variant="bridge"
        onClick={handleFreeEnroll}
        disabled={isPending}
        isLoading={isPending}
      >
        {!isPending && <ShoppingCart className="w-4 h-4" />}
        Inscribirse gratis
      </Button>
    );
  }

  if (priceModel === "FREEMIUM") {
    return (
      <div className="space-y-3">
        <Button
          className="w-full gap-2"
          size="lg"
          variant="bridge"
          onClick={handleFreeEnroll}
          disabled={isPending}
          isLoading={isPending}
        >
          {!isPending && <Play className="w-4 h-4" />}
          Comenzar gratis
        </Button>
        {price && price > 0 && (
          <>
            <CouponSection />
            <GatewaySelector />
            <Button
              className="w-full gap-2"
              size="lg"
              variant="outline"
              onClick={() => handleCheckout("one_time")}
              disabled={isPending}
              isLoading={isPending}
            >
              <ShoppingCart className="w-4 h-4" />
              Ver todo el curso · {formatPrice(displayPrice)}
            </Button>
          </>
        )}
      </div>
    );
  }

  if (priceModel === "ONE_TIME") {
    return (
      <div className="space-y-3">
        <CouponSection />
        <GatewaySelector />
        <Button
          className="w-full gap-2"
          size="lg"
          variant="bridge"
          onClick={() => setShowConfirmModal(true)}
          disabled={isPending}
          isLoading={isPending}
        >
          {!isPending && <ShoppingCart className="w-4 h-4" />}
          Comprar · {formatPrice(displayPrice)}
        </Button>

        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar compra</DialogTitle>
              <DialogDescription>
                Estás por comprar <strong>{courseTitle ?? "este curso"}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Precio</span>
                <span className="font-medium">{formatPrice(price ?? 0)}</span>
              </div>
              {couponData && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento ({couponCode})</span>
                  <span>–{formatPrice(couponData.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatPrice(displayPrice)}</span>
              </div>
              <div className="text-xs text-gray-500 capitalize">
                Método: {gateway === "mercadopago" ? "MercadoPago" : "Tarjeta de crédito/débito"}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                variant="bridge"
                onClick={() => handleCheckout("one_time")}
                disabled={isPending}
                isLoading={isPending}
              >
                Confirmar pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (priceModel === "SUBSCRIPTION") {
    return (
      <div className="space-y-3">
        {/* Billing period toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "border-purple-600 bg-purple-50 text-purple-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            Mensual · {formatPrice(displayPrice)}
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("annual")}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              billingPeriod === "annual"
                ? "border-purple-600 bg-purple-50 text-purple-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            Anual · {formatPrice(annualPrice)}
            <span className="ml-1 text-xs text-green-600 font-semibold">–20%</span>
          </button>
        </div>
        <CouponSection />
        <GatewaySelector />
        <Button
          className="w-full gap-2"
          size="lg"
          variant="bridge"
          onClick={() => handleCheckout("subscription")}
          disabled={isPending}
          isLoading={isPending}
        >
          {!isPending && <ShoppingCart className="w-4 h-4" />}
          Suscribirse · {billingPeriod === "monthly" ? `${formatPrice(displayPrice)}/mes` : `${formatPrice(annualPrice)}/año`}
        </Button>
      </div>
    );
  }

  if (priceModel === "INDIVIDUAL_CLASS") {
    return (
      <div className="space-y-3">
        <GatewaySelector />
        <Button
          className="w-full gap-2"
          size="lg"
          variant="bridge"
          onClick={() => handleCheckout("one_time")}
          disabled={isPending}
          isLoading={isPending}
        >
          {!isPending && <ShoppingCart className="w-4 h-4" />}
          {price ? `Comprar clase · ${formatPrice(displayPrice)}` : "Ver clases individuales"}
        </Button>
      </div>
    );
  }

  return null;
}
