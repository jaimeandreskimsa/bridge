import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/chat/conversations — list all conversations for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Direct conversations: find all users with whom this user exchanged messages
  const directMessages = await db.chatMessage.findMany({
    where: {
      type: "DIRECT",
      isDeleted: false,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    distinct: ["senderId", "receiverId"],
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  });

  // Group by conversation partner
  const directMap = new Map<
    string,
    {
      conversationId: string;
      type: "direct";
      otherUser: { id: string; name: string | null; image: string | null };
      lastMessage: { content: string; createdAt: Date; senderId: string };
      unreadCount: number;
    }
  >();

  for (const msg of directMessages) {
    const otherId = msg.senderId === userId ? msg.receiverId! : msg.senderId;
    const otherUser = msg.senderId === userId ? msg.receiver! : msg.sender;
    const conversationId = [userId, otherId].sort().join("_");

    if (!directMap.has(conversationId)) {
      const unreadCount = await db.chatMessage.count({
        where: {
          type: "DIRECT",
          senderId: otherId,
          receiverId: userId,
          isRead: false,
          isDeleted: false,
        },
      });

      directMap.set(conversationId, {
        conversationId,
        type: "direct",
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          image: otherUser.image,
        },
        lastMessage: {
          content: msg.content,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
        },
        unreadCount,
      });
    }
  }

  // 2. Course chat rooms where user is enrolled or is the teacher
  const enrollments = await db.enrollment.findMany({
    where: { userId, isActive: true },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          chatRoom: {
            include: {
              messages: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { sender: { select: { id: true, name: true } } },
              },
            },
          },
          teacherProfile: { select: { userId: true } },
        },
      },
    },
  });

  const courseConversations = enrollments
    .filter((e) => e.course.chatRoom !== null)
    .map((e) => {
      const lastMsg = e.course.chatRoom!.messages[0];
      return {
        conversationId: e.course.id,
        type: "course" as const,
        course: {
          id: e.course.id,
          title: e.course.title,
          thumbnail: e.course.thumbnail,
        },
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              senderId: lastMsg.senderId,
              senderName: lastMsg.sender.name,
            }
          : null,
        unreadCount: 0, // Group rooms: unread not tracked per-user in this schema
      };
    });

  // 3. Group chat rooms where user is a member
  const groupMemberships = await db.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          chatRoom: {
            include: {
              messages: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { sender: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const groupConversations = groupMemberships
    .filter((m) => m.group.chatRoom !== null)
    .map((m) => {
      const lastMsg = m.group.chatRoom!.messages[0];
      return {
        conversationId: m.group.id,
        type: "group" as const,
        group: {
          id: m.group.id,
          name: m.group.name,
          imageUrl: m.group.imageUrl,
        },
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              senderId: lastMsg.senderId,
              senderName: lastMsg.sender.name,
            }
          : null,
        unreadCount: 0,
      };
    });

  // Sort all conversations by last message date
  const allConversations = [
    ...Array.from(directMap.values()),
    ...courseConversations,
    ...groupConversations,
  ].sort((a, b) => {
    const dateA = a.lastMessage?.createdAt ?? new Date(0);
    const dateB = b.lastMessage?.createdAt ?? new Date(0);
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return NextResponse.json({ conversations: allConversations });
}
