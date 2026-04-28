import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { createNotification } from "@/lib/notifications";

// Build a deterministic conversationId for direct messages
function directConversationId(userA: string, userB: string) {
  return [userA, userB].sort().join("_");
}

// Verify user can access a conversation
async function verifyAccess(
  userId: string,
  type: string,
  conversationId: string
): Promise<boolean> {
  if (type === "direct") {
    const parts = conversationId.split("_");
    if (!parts.includes(userId)) return false;
    const otherId = parts.find((p) => p !== userId);
    if (!otherId) return false;

    // Verify mutual follow
    const [aFollowsB, bFollowsA] = await Promise.all([
      db.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: otherId } },
      }),
      db.follow.findUnique({
        where: { followerId_followingId: { followerId: otherId, followingId: userId } },
      }),
    ]);
    return !!(aFollowsB && bFollowsA);
  }

  if (type === "course") {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: conversationId } },
    });
    if (enrollment) return true;

    // Teacher also has access
    const course = await db.course.findUnique({
      where: { id: conversationId },
      include: { teacherProfile: { select: { userId: true } } },
    });
    return course?.teacherProfile?.userId === userId;
  }

  if (type === "group") {
    const membership = await db.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: conversationId } },
    });
    return !!membership;
  }

  return false;
}

// GET /api/chat/messages?conversationId=&type=&cursor=&limit=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const type = searchParams.get("type") ?? "direct";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });
  }

  const hasAccess = await verifyAccess(session.user.id, type, conversationId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  // Build where clause based on type
  let whereClause: Record<string, unknown> = {};

  if (type === "direct") {
    const parts = conversationId.split("_");
    const [userA, userB] = parts;
    whereClause = {
      type: "DIRECT",
      isDeleted: false,
      OR: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
      ],
    };
  } else if (type === "course") {
    whereClause = { type: "GROUP_COURSE", courseId: conversationId, isDeleted: false };
  } else if (type === "group") {
    whereClause = { type: "GROUP_COURSE", groupId: conversationId, isDeleted: false };
  }

  const messages = await db.chatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: hasMore ? messages[0]?.id : null,
  });
}

// POST /api/chat/messages
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { receiverId, courseId, groupId, content, type, handRecordId } = body as {
    receiverId?: string;
    courseId?: string;
    groupId?: string;
    content: string;
    type: "direct" | "course" | "group";
    handRecordId?: string;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  }

  const senderId = session.user.id;

  // Determine conversationId and verify access
  let conversationId: string;

  if (type === "direct") {
    if (!receiverId) {
      return NextResponse.json({ error: "receiverId requerido para mensajes directos" }, { status: 400 });
    }
    conversationId = directConversationId(senderId, receiverId);
  } else if (type === "course") {
    if (!courseId) return NextResponse.json({ error: "courseId requerido" }, { status: 400 });
    conversationId = courseId;
  } else if (type === "group") {
    if (!groupId) return NextResponse.json({ error: "groupId requerido" }, { status: 400 });
    conversationId = groupId;
  } else {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const hasAccess = await verifyAccess(senderId, type, conversationId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  // For course rooms, ensure the room exists
  if (type === "course" && courseId) {
    await db.courseChatRoom.upsert({
      where: { courseId },
      create: { courseId },
      update: {},
    });
  }

  // For group rooms, ensure the room exists
  if (type === "group" && groupId) {
    await db.groupChatRoom.upsert({
      where: { groupId },
      create: { groupId },
      update: {},
    });
  }

  const message = await db.chatMessage.create({
    data: {
      senderId,
      receiverId: type === "direct" ? receiverId : undefined,
      courseId: type === "course" ? courseId : undefined,
      groupId: type === "group" ? groupId : undefined,
      type: type === "direct" ? "DIRECT" : "GROUP_COURSE",
      content: content.trim(),
      handRecordId: handRecordId ?? undefined,
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  const pusherChannel = `private-chat-${conversationId}`;

  // Trigger Pusher event
  await pusherServer
    .trigger(pusherChannel, "new-message", {
      id: message.id,
      senderId: message.senderId,
      sender: message.sender,
      content: message.content,
      handRecordId: message.handRecordId,
      type: message.type,
      isRead: message.isRead,
      createdAt: message.createdAt,
    })
    .catch(() => {});

  // Create notification for recipient(s)
  if (type === "direct" && receiverId) {
    await createNotification({
      userId: receiverId,
      type: "NEW_MESSAGE",
      title: `Nuevo mensaje de ${message.sender.name ?? "alguien"}`,
      body: content.trim().slice(0, 100),
      link: `/chat/${conversationId}`,
      data: { conversationId, senderId, messageId: message.id },
    });
  }

  return NextResponse.json(message, { status: 201 });
}
