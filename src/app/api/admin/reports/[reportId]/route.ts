import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth();
  if (!session?.user || !["MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { reportId } = await params;
  const body = await req.json();
  const { action, postId, messageId } = body;

  if (action === "remove") {
    if (postId) await db.feedPost.delete({ where: { id: postId } }).catch(() => {});
    if (messageId) await db.chatMessage.delete({ where: { id: messageId } }).catch(() => {});
  }

  await db.postReport.updateMany({
    where: { id: reportId },
    data: { resolved: true },
  });

  return NextResponse.json({ success: true });
}
