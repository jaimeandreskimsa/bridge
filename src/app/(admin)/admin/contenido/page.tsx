import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { ModerationActions } from "./moderation-actions";

export const metadata = { title: "Moderación — Admin" };

export default async function ContenidoPage() {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const reports = await db.postReport.findMany({
    where: { resolved: false },
    include: {
      post: { select: { id: true, content: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Shield className="w-6 h-6 text-red-500" /> Moderación de contenido
      </h1>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Reportes pendientes</h2>
          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {reports.length}
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p>No hay reportes pendientes</p>
          </div>
        ) : (
          <div className="divide-y">
            {reports.map((r) => (
              <div key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">
                        Reportado {formatRelativeTime(r.createdAt)}
                      </span>
                    </div>
                    {r.reason && (
                      <p className="text-sm text-gray-700 mb-2">{r.reason}</p>
                    )}
                    {r.post && (
                      <div className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600 line-clamp-2">
                        {r.post.content}
                      </div>
                    )}
                  </div>
                  <ModerationActions
                    reportId={r.id}
                    postId={r.post?.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
