import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  // Direct conversations
  const directMessages = await db.chatMessage.findMany({
    where: {
      type: "DIRECT",
      OR: [{ senderId: userId }, { receiverId: userId }],
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
    distinct: ["senderId", "receiverId"],
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
    take: 30,
  });

  // Group by conversation partner
  const convoMap = new Map<string, typeof directMessages[0]>();
  for (const msg of directMessages) {
    const partnerId = msg.senderId === userId ? msg.receiverId! : msg.senderId;
    if (!convoMap.has(partnerId)) convoMap.set(partnerId, msg);
  }
  const conversations = Array.from(convoMap.values());

  // Course rooms the user is enrolled in
  const enrollments = await db.enrollment.findMany({
    where: { userId, isActive: true },
    include: {
      course: {
        select: {
          id: true, title: true, thumbnail: true,
          chatRoom: { include: { messages: { take: 1, orderBy: { createdAt: "desc" }, include: { sender: { select: { name: true } } } } } },
        },
      },
    },
    take: 10,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-navy-700" /> Chat
      </h1>

      <div className="flex flex-col gap-4">
        {/* Direct messages */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Mensajes directos</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              Sin conversaciones aún. Empieza una desde el perfil de un profesor o alumno.
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((msg) => {
                const partner = msg.senderId === userId ? msg.receiver! : msg.sender;
                const convId = [userId, partner.id].sort().join("-");
                return (
                  <li key={partner.id}>
                    <Link
                      href={`/chat/${convId}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-navy-200 flex items-center justify-center text-sm font-bold text-navy-800 shrink-0">
                        {getInitials(partner.name ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{partner.name}</p>
                        <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(msg.createdAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Course rooms */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Salas de cursos</h2>
          </div>
          {enrollments.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              Inscríbete en un curso para acceder a su sala de chat.
            </div>
          ) : (
            <ul className="divide-y">
              {enrollments.map(({ course }) => {
                const lastMsg = course.chatRoom?.messages[0];
                return (
                  <li key={course.id}>
                    <Link
                      href={`/chat/curso-${course.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-navy-700 shrink-0 overflow-hidden">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">♠</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                        {lastMsg ? (
                          <p className="text-xs text-gray-500 truncate">
                            {lastMsg.sender.name}: {lastMsg.content}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">Sin mensajes aún</p>
                        )}
                      </div>
                      {lastMsg && (
                        <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(lastMsg.createdAt)}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
