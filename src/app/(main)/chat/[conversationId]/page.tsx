import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChevronLeft } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const isCourse = conversationId.startsWith("curso-");

  let title = "";
  let subtitle = "";
  let chatType: "direct" | "course" = "direct";
  let receiverId: string | undefined;
  let courseId: string | undefined;
  let initialMessages: Awaited<ReturnType<typeof db.chatMessage.findMany>> = [];

  if (isCourse) {
    courseId = conversationId.replace("curso-", "");
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, teacherProfile: { select: { user: { select: { name: true } } } } },
    });
    if (!course) notFound();

    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) redirect(`/cursos/${courseId}`);

    title = course.title;
    subtitle = `Sala del curso`;
    chatType = "course";

    initialMessages = await db.chatMessage.findMany({
      where: { courseId, type: "GROUP_COURSE", isDeleted: false },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { sender: { select: { id: true, name: true, image: true } } },
    });
  } else {
    // Direct: conversationId = userId1-userId2 sorted
    const parts = conversationId.split("-");
    const partnerId = parts.find((p) => p !== userId);
    if (!partnerId) notFound();
    receiverId = partnerId;

    const partner = await db.user.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, image: true, role: true },
    });
    if (!partner) notFound();

    title = partner.name ?? "Usuario";
    subtitle = partner.role === "PROFESOR" ? "Profesor" : "Alumno";

    initialMessages = await db.chatMessage.findMany({
      where: {
        type: "DIRECT",
        isDeleted: false,
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    // Mark received messages as read
    await db.chatMessage.updateMany({
      where: { senderId: partnerId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  const messages = initialMessages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    isRead: m.isRead,
    sender: (m as any).sender as { id: string; name: string | null; image: string | null },
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 h-[calc(100vh-80px)]">
      <div className="flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
          <Link href="/chat" className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-full bg-navy-200 flex items-center justify-center text-sm font-bold text-navy-800">
            {getInitials(title)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>

        <ChatWindow
          conversationId={conversationId}
          type={chatType}
          receiverId={receiverId}
          courseId={courseId}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
