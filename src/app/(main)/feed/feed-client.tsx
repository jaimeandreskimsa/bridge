"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Spade, Heart, Diamond, Club, UserPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FeedPostCard } from "@/components/feed/feed-post-card";
import { CreatePost } from "@/components/feed/create-post";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  username: string | null;
}

interface Reaction {
  userId: string;
  type: "LIKE" | "EXCELLENT_PLAY" | "QUESTION" | "CONTROVERSIAL";
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: PostUser;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: PostUser;
  replies: Reply[];
  _count?: { replies: number };
}

interface FeedPost {
  id: string;
  content: string;
  type: string;
  imageUrls: string[];
  videoUrl: string | null;
  hashtags: string[];
  createdAt: string;
  user: PostUser;
  group: { id: string; name: string } | null;
  handRecord: { id: string; title: string | null; pbnData: string; description: string | null } | null;
  reactions: Reaction[];
  comments: Comment[];
  favorites: { id: string }[];
  _count: { comments: number; reactions: number };
}

interface Group {
  id: string;
  name: string;
}

interface FeedClientProps {
  initialPosts: FeedPost[];
  sessionUserId: string | null;
  userGroups: Group[];
  isAuthenticated: boolean;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { value: "para-ti", label: "Para ti" },
  { value: "siguiendo", label: "Siguiendo" },
  { value: "profesores", label: "Profesores" },
  { value: "grupos", label: "Grupos" },
] as const;

// ─── Guest CTA Banner ─────────────────────────────────────────────────────────

function GuestCTABanner() {
  return (
    <div className="bg-gradient-to-r from-navy-900 to-navy-700 rounded-xl p-6 text-white text-center space-y-3">
      <div className="flex justify-center gap-2 text-2xl">
        <span>♠</span>
        <span className="text-red-400">♥</span>
        <span className="text-red-400">♦</span>
        <span>♣</span>
      </div>
      <h3 className="font-bold text-lg">Únete a la comunidad Bridge Academy</h3>
      <p className="text-sm text-white/80">
        Crea una cuenta gratuita para reaccionar, comentar y compartir tus manos.
      </p>
      <div className="flex justify-center gap-2 pt-1">
        <Link href="/registro">
          <Button size="sm" className="bg-white text-navy-900 hover:bg-gray-100 font-semibold">
            <UserPlus className="h-4 w-4 mr-1" />
            Crear cuenta gratis
          </Button>
        </Link>
        <Link href="/login">
          <Button size="sm" variant="outline" className="border-white text-white hover:bg-white/10">
            Iniciar sesión
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed({ tab }: { tab: string }) {
  const messages: Record<string, { title: string; desc: string }> = {
    "para-ti": {
      title: "El feed está tranquilo",
      desc: "Sé el primero en compartir algo hoy.",
    },
    siguiendo: {
      title: "Aún no sigues a nadie",
      desc: "Explora perfiles y sigue a jugadores para ver su actividad aquí.",
    },
    profesores: {
      title: "Sin publicaciones de profesores",
      desc: "Los profesores compartirán manos y análisis pronto.",
    },
    grupos: {
      title: "Sin actividad en tus grupos",
      desc: "Únete a grupos de bridge para ver publicaciones aquí.",
    },
  };
  const msg = messages[tab] ?? messages["para-ti"];

  return (
    <div className="text-center py-16 space-y-4">
      <div className="flex justify-center gap-1 text-4xl opacity-20">
        <span>♠</span>
        <span>♥</span>
        <span>♦</span>
        <span>♣</span>
      </div>
      <p className="font-semibold text-gray-600">{msg.title}</p>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">{msg.desc}</p>
    </div>
  );
}

// ─── FeedClient ───────────────────────────────────────────────────────────────

export function FeedClient({
  initialPosts,
  sessionUserId,
  userGroups,
  isAuthenticated,
}: FeedClientProps) {
  const [activeTab, setActiveTab] = useState<string>("para-ti");
  const [postsByTab, setPostsByTab] = useState<Record<string, FeedPost[]>>({
    "para-ti": initialPosts,
  });
  const [cursorByTab, setCursorByTab] = useState<Record<string, string | null>>({
    "para-ti": initialPosts.length === 20 ? initialPosts[initialPosts.length - 1]?.id ?? null : null,
  });
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  const posts = postsByTab[activeTab] ?? [];
  const cursor = cursorByTab[activeTab] ?? null;

  async function loadTab(tab: string) {
    if (postsByTab[tab]) return; // already loaded
    setLoadingTab(tab);
    try {
      const res = await fetch(`/api/feed/posts?tab=${tab}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPostsByTab((prev) => ({ ...prev, [tab]: data.posts }));
      setCursorByTab((prev) => ({ ...prev, [tab]: data.nextCursor }));
    } catch {
      toast.error("Error al cargar el feed");
    } finally {
      setLoadingTab(null);
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    if (!postsByTab[tab]) {
      loadTab(tab);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed/posts?tab=${activeTab}&cursor=${cursor}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPostsByTab((prev) => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] ?? []), ...data.posts],
      }));
      setCursorByTab((prev) => ({ ...prev, [activeTab]: data.nextCursor }));
    } catch {
      toast.error("Error al cargar más posts");
    } finally {
      setLoadingMore(false);
    }
  }

  const handlePostCreated = useCallback((newPost: unknown) => {
    startTransition(() => {
      setPostsByTab((prev) => ({
        ...prev,
        "para-ti": [newPost as FeedPost, ...(prev["para-ti"] ?? [])],
      }));
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 text-lg">
            <Spade className="h-5 w-5 text-gray-800" />
            <Heart className="h-5 w-5 text-red-500" />
            <Diamond className="h-5 w-5 text-red-500" />
            <Club className="h-5 w-5 text-gray-800" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Feed</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full grid grid-cols-4 h-auto p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs sm:text-sm py-2 data-[state=active]:font-semibold"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
              {/* Create post box (authenticated only) */}
              {tab.value === activeTab && isAuthenticated && (
                <CreatePost onPostCreated={handlePostCreated} userGroups={userGroups} />
              )}

              {/* Loading tab state */}
              {loadingTab === tab.value && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {/* Posts */}
              {loadingTab !== tab.value && (
                <>
                  {posts.length === 0 ? (
                    <EmptyFeed tab={tab.value} />
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post, i) => (
                        <div key={post.id}>
                          <FeedPostCard post={post} sessionUserId={sessionUserId} />

                          {/* Insert guest CTA after 3rd post */}
                          {!isAuthenticated && i === 2 && (
                            <div className="mt-4">
                              <GuestCTABanner />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Load more */}
                      {cursor && (
                        <div className="flex justify-center pt-2">
                          <Button
                            variant="outline"
                            onClick={loadMore}
                            disabled={loadingMore}
                            isLoading={loadingMore}
                            className="w-full max-w-xs"
                          >
                            {loadingMore ? "Cargando..." : "Ver más posts"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Guest CTA at bottom if not enough posts to show inline */}
              {!isAuthenticated && posts.length <= 2 && posts.length > 0 && (
                <GuestCTABanner />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
