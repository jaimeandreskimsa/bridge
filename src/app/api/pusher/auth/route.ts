import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { db } from "@/lib/db";

// POST /api/pusher/auth — authenticate private Pusher channels
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const userId = session.user.id;

  // Verify the user has access to this channel
  const hasAccess = await verifyChannelAccess(userId, channelName);
  if (!hasAccess) {
    return NextResponse.json({ error: "Acceso denegado al canal" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true },
  });

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
    user_id: userId,
    user_info: {
      name: user?.name ?? "Usuario",
      image: user?.image ?? null,
    },
  });

  return NextResponse.json(authResponse);
}

async function verifyChannelAccess(userId: string, channelName: string): Promise<boolean> {
  // user-{userId}-notifications: only the user themselves
  if (channelName === `private-user-${userId}-notifications`) {
    return true;
  }

  // chat-{conversationId}: check if user is a participant
  const chatMatch = channelName.match(/^private-chat-(.+)$/);
  if (chatMatch) {
    const conversationId = chatMatch[1];

    // Check direct message (conversationId = sorted user ids joined by "_")
    if (conversationId.includes("_")) {
      const parts = conversationId.split("_");
      if (parts.includes(userId)) return true;
    }

    // Check course room
    const courseRoom = await db.courseChatRoom.findUnique({
      where: { courseId: conversationId },
    });
    if (courseRoom) {
      const enrollment = await db.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: conversationId } },
      });
      if (enrollment) return true;

      // Teachers also have access
      const course = await db.course.findUnique({
        where: { id: conversationId },
        include: { teacherProfile: { select: { userId: true } } },
      });
      if (course?.teacherProfile?.userId === userId) return true;
    }

    // Check group room
    const groupRoom = await db.groupChatRoom.findUnique({
      where: { groupId: conversationId },
    });
    if (groupRoom) {
      const membership = await db.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: conversationId } },
      });
      if (membership) return true;
    }
  }

  return false;
}
