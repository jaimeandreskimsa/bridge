"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher-client";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: { id: string; name: string | null; image: string | null };
}

interface Props {
  conversationId: string;
  type: "direct" | "course" | "group";
  receiverId?: string;
  courseId?: string;
  groupId?: string;
  initialMessages?: Message[];
  otherUser?: { id: string; name: string | null; image: string | null };
}

export function ChatWindow({ conversationId, type, receiverId, courseId, groupId, initialMessages = [], otherUser }: Props) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = getPusherClient().subscribe(`chat-${conversationId}`);
    channel.bind("new-message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    channel.bind("typing", (data: { userId: string }) => {
      if (data.userId !== session?.user?.id) {
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
      }
    });
    return () => getPusherClient().unsubscribe(`chat-${conversationId}`);
  }, [conversationId, session?.user?.id]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type, receiverId, courseId, groupId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }, [input, sending, type, receiverId, courseId, groupId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">No hay mensajes aún. ¡Inicia la conversación!</div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === session?.user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
              {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-navy-200 flex items-center justify-center text-xs font-bold text-navy-800 shrink-0 mt-0.5">
                  {getInitials(msg.sender.name ?? "?")}
                </div>
              )}
              <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!isOwn && (
                  <span className="text-xs text-gray-500 ml-1">{msg.sender.name}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? "bg-navy-900 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-900 rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 mx-1">{formatRelativeTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex gap-1 px-3 py-2 bg-gray-100 rounded-full">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            escribiendo...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 max-h-32 overflow-y-auto"
            style={{ minHeight: "40px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="p-2 bg-navy-900 text-white rounded-xl hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-1">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}
