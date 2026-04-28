import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { AgreementsClient } from "./agreements-client";

export default async function NotebookDetailPage({ params }: { params: Promise<{ notebookId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { notebookId } = await params;

  const notebook = await db.partnershipNotebook.findFirst({
    where: {
      id: notebookId,
      OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }],
    },
    include: {
      player1: { select: { id: true, name: true, image: true } },
      player2: { select: { id: true, name: true, image: true } },
      agreements: { orderBy: [{ category: "asc" }, { order: "asc" }] },
    },
  });

  if (!notebook) notFound();

  const otherUser = notebook.player1Id === session.user.id ? notebook.player2 : notebook.player1;
  const isOwner = notebook.player1Id === session.user.id;

  const agreementsForClient = notebook.agreements as any[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-5">
        <Link href="/perfil/libreta" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Libretas
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-navy-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{notebook.name}</h1>
          {otherUser && otherUser.id !== session.user.id && (
            <p className="text-sm text-gray-500">Con {otherUser.name}</p>
          )}
        </div>
      </div>

      <AgreementsClient
        notebookId={notebookId}
        initialAgreements={agreementsForClient}
        isOwner={isOwner}
      />
    </div>
  );
}
