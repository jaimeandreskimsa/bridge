"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { formatRelativeTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchNotifications();

    const channel = getPusherClient().subscribe(`user-${session.user.id}-notifications`);
    channel.bind("new-notification", (data: Notification) => {
      setNotifications((prev) => [data, ...prev.slice(0, 19)]);
    });
    return () => {
      getPusherClient().unsubscribe(`user-${session.user.id}-notifications`);
    };
  }, [session?.user?.id]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ all: true }), headers: { "Content-Type": "application/json" } });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  if (!session) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm">Notificaciones</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  Sin notificaciones
                </div>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={n.link ?? "#"}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-0 transition-colors ${!n.isRead ? "bg-blue-50/50" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                    <div className={!n.isRead ? "" : "ml-5"}>
                      <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
