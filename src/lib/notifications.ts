import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import type { NotificationType } from "@prisma/client";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: object;
}) {
  const notification = await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      data: params.data ?? undefined,
    },
  });

  // Notify via Pusher in real-time
  await pusherServer
    .trigger(`user-${params.userId}-notifications`, "new-notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      isRead: notification.isRead,
      data: notification.data,
      createdAt: notification.createdAt,
    })
    .catch(() => {
      // Non-fatal: Pusher might fail but notification is already in DB
    });

  return notification;
}
