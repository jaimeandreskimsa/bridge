import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";

// PATCH /api/chat/messages/[messageId]/read — mark message as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { messageId } = await params;
  const userId = session.user.id;

  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    include: { sender: { select: { id: true, name: true } } },
  });

  if (!message) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }

  // Only the receiver can mark it as read
  if (message.receiverId !== userId && message.senderId !== userId) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  if (message.isRead) {
    return NextResponse.json({ ok: true, alreadyRead: true });
  }

  const updated = await db.chatMessage.update({
    where: { id: messageId },
    data: { isRead: true, readAt: new Date() },
  });

  // Notify the original sender via Pusher that their message was read
  if (message.senderId !== userId) {
    let conversationId: string;
    if (message.type === "DIRECT" && message.receiverId) {
      conversationId = [message.senderId, message.receiverId].sort().join("_");
    } else if (message.courseId) {
      conversationId = message.courseId;
    } else if (message.groupId) {
      conversationId = message.groupId;
    } else {
      conversationId = messageId;
    }

    await pusherServer
      .trigger(`private-chat-${conversationId}`, "message-read", {
        messageId,
        readBy: userId,
        readAt: updated.readAt,
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
