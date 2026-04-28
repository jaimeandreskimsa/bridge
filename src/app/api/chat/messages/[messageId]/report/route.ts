import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/chat/messages/[messageId]/report — report a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { messageId } = await params;
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }

  // Can't report your own messages
  if (message.senderId === userId) {
    return NextResponse.json({ error: "No puedes reportar tu propio mensaje" }, { status: 400 });
  }

  // Mark the message as reported
  await db.chatMessage.update({
    where: { id: messageId },
    data: { isReported: true },
  });

  // Create an audit log for moderation
  await db.auditLog.create({
    data: {
      actorId: userId,
      action: "REPORT_CHAT_MESSAGE",
      entityType: "ChatMessage",
      entityId: messageId,
      details: {
        reason: reason ?? "Sin razón especificada",
        senderId: message.senderId,
        content: message.content.slice(0, 200),
      },
    },
  });

  return NextResponse.json({ ok: true });
}
