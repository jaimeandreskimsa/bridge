import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { BookOpen, Calendar, CreditCard, Download, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelSubscriptionButton } from "./cancel-subscription-button";

async function getUserPurchaseData(userId: string) {
  const [enrollments, subscriptions, payments] = await Promise.all([
    db.enrollment.findMany({
      where: { userId, isActive: true },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            totalLessons: true,
            modules: {
              select: {
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
        payment: {
          select: { gateway: true, createdAt: true },
        },
      },
      orderBy: { purchasedAt: "desc" },
    }),
    db.subscription.findMany({
      where: {
        userId,
        status: { in: ["active", "trialing", "paused"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // Calculate progress percentage per course
  const lessonIds = enrollments.flatMap((e) =>
    e.course.modules.flatMap((m: { lessons: { id: string }[] }) =>
      m.lessons.map((l: { id: string }) => l.id)
    )
  );

  const progressRecords = lessonIds.length
    ? await db.progress.findMany({
        where: { userId, lessonId: { in: lessonIds }, completed: true },
        select: { lessonId: true },
      })
    : [];

  const completedSet = new Set(progressRecords.map((p: { lessonId: string }) => p.lessonId));

  const enrichedEnrollments = enrollments.map((e) => {
    const totalLessons = e.course.modules.reduce(
      (acc: number, m: { lessons: { id: string }[] }) => acc + m.lessons.length,
      0
    );
    const completedLessons = e.course.modules.reduce(
      (acc: number, m: { lessons: { id: string }[] }) =>
        acc + m.lessons.filter((l: { id: string }) => completedSet.has(l.id)).length,
      0
    );
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { ...e, progressPct, totalLessons, completedLessons };
  });

  return { enrollments: enrichedEnrollments, subscriptions, payments };
}

function GatewayBadge({ gateway }: { gateway: string }) {
  if (gateway === "MERCADOPAGO")
    return <Badge variant="secondary" className="text-xs">MercadoPago</Badge>;
  return <Badge variant="outline" className="text-xs">Stripe</Badge>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    COMPLETED: { label: "Completado", variant: "default" },
    PENDING: { label: "Pendiente", variant: "secondary" },
    FAILED: { label: "Fallido", variant: "destructive" },
    REFUNDED: { label: "Reembolsado", variant: "outline" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
}

export default async function MisComprasPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mis-compras");
  }

  const { enrollments, subscriptions, payments } = await getUserPurchaseData(session.user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis compras</h1>
        <p className="text-sm text-gray-500 mt-1">Tus cursos, suscripciones e historial de pagos</p>
      </div>

      {/* ── Enrolled Courses ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-500" />
          Mis cursos ({enrollments.length})
        </h2>

        {enrollments.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-gray-50">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Todavía no te inscribiste en ningún curso.</p>
            <Link href="/cursos" className="mt-3 inline-block">
              <Button variant="bridge" size="sm">Explorar cursos</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex flex-col sm:flex-row gap-4 border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative w-full sm:w-36 h-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {enrollment.course.thumbnail ? (
                    <Image
                      src={enrollment.course.thumbnail}
                      alt={enrollment.course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                      {enrollment.course.title}
                    </h3>
                    <span className="text-sm font-medium text-gray-700 shrink-0">
                      {enrollment.pricePaid > 0 ? formatPrice(enrollment.pricePaid) : "Gratis"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(enrollment.purchasedAt)}
                    </span>
                    {enrollment.payment?.gateway && (
                      <GatewayBadge gateway={enrollment.payment.gateway} />
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{enrollment.completedLessons}/{enrollment.totalLessons} clases completadas</span>
                      <span className="font-medium">{enrollment.progressPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${enrollment.progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center shrink-0">
                  <Link href={`/cursos/${enrollment.courseId}/aprender`}>
                    <Button size="sm" variant="bridge" className="gap-1.5">
                      <Play className="w-3.5 h-3.5" />
                      {enrollment.progressPct > 0 ? "Continuar" : "Comenzar"}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Active Subscriptions ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-gray-500" />
          Suscripciones activas ({subscriptions.length})
        </h2>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8 border rounded-xl bg-gray-50">
            <p className="text-gray-500 text-sm">No tenés suscripciones activas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border rounded-xl p-4 bg-white shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">
                      {sub.isGlobal ? "Suscripción global" : "Suscripción a profesor"}
                    </span>
                    <Badge
                      variant={sub.status === "active" ? "default" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {sub.status === "paused" ? "En pausa" : sub.cancelAtPeriodEnd ? "Cancelando..." : "Activa"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Próxima renovación: {formatDate(sub.currentPeriodEnd)}
                    {sub.cancelAtPeriodEnd && " (no se renovará)"}
                    {sub.pausedUntil && ` · En pausa hasta ${formatDate(sub.pausedUntil)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CancelSubscriptionButton subscriptionId={sub.id} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Payment History ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" />
            Historial de pagos
          </h2>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 border rounded-xl bg-gray-50">
            <p className="text-gray-500 text-sm">No hay pagos registrados todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium">Gateway</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {payment.description ?? "Compra de curso"}
                    </td>
                    <td className="px-4 py-3">
                      <GatewayBadge gateway={payment.gateway} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatPrice(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
