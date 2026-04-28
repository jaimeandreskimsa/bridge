"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  MessageSquare,
  Bookmark,
  Flag,
  ChevronDown,
  ChevronUp,
  Send,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReactionType = "LIKE" | "EXCELLENT_PLAY" | "QUESTION" | "CONTROVERSIAL";

interface PostUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  username: string | null;
}

interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  username: string | null;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
  replies: Reply[];
  _count?: { replies: number };
}

interface HandRecord {
  id: string;
  title: string | null;
  pbnData: string;
  description: string | null;
}

interface Reaction {
  userId: string;
  type: ReactionType;
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
  handRecord: HandRecord | null;
  reactions: Reaction[];
  comments: Comment[];
  favorites: { id: string }[];
  _count: { comments: number; reactions: number };
}

// ─── Reaction config ─────────────────────────────────────────────────────────

const REACTIONS: {
  type: ReactionType;
  icon: string;
  label: string;
  color: string;
  activeColor: string;
}[] = [
  {
    type: "LIKE",
    icon: "♠",
    label: "Me gusta",
    color: "text-gray-600 hover:text-gray-900",
    activeColor: "text-gray-900 font-bold",
  },
  {
    type: "EXCELLENT_PLAY",
    icon: "♥",
    label: "Jugada excelente",
    color: "text-gray-400 hover:text-red-500",
    activeColor: "text-red-500 font-bold",
  },
  {
    type: "QUESTION",
    icon: "♦",
    label: "Tengo una pregunta",
    color: "text-gray-400 hover:text-orange-500",
    activeColor: "text-orange-500 font-bold",
  },
  {
    type: "CONTROVERSIAL",
    icon: "♣",
    label: "Polémico",
    color: "text-gray-400 hover:text-purple-600",
    activeColor: "text-purple-600 font-bold",
  },
];

// ─── Hand display (minimal PBN parser) ───────────────────────────────────────

function HandDisplay({ hand }: { hand: HandRecord }) {
  const suits: Record<string, string[]> = { S: [], H: [], D: [], C: [] };
  const suitLabels: Record<string, { icon: string; color: string }> = {
    S: { icon: "♠", color: "text-gray-900" },
    H: { icon: "♥", color: "text-red-600" },
    D: { icon: "♦", color: "text-red-600" },
    C: { icon: "♣", color: "text-gray-900" },
  };

  // Parse first hand from PBN Deal tag  e.g. [Deal "N:AKQ.JT9.876.543 ..."]
  try {
    const match = hand.pbnData.match(/\[Deal\s+"([^"]+)"\]/i);
    if (match) {
      const deal = match[1];
      const parts = deal.split(":")[1]?.split(" ")[0]?.split(".");
      if (parts && parts.length === 4) {
        const keys = ["S", "H", "D", "C"];
        keys.forEach((k, i) => {
          suits[k] = parts[i]?.split("") ?? [];
        });
      }
    }
  } catch {
    // ignore parse errors
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mt-2">
      <p className="text-xs font-semibold text-gray-500 mb-2">
        {hand.title ?? "Registro de mano"}
      </p>
      <div className="font-mono text-sm space-y-0.5">
        {Object.entries(suitLabels).map(([suit, { icon, color }]) => (
          <div key={suit} className="flex items-center gap-1.5">
            <span className={cn("font-bold", color)}>{icon}</span>
            <span className="text-gray-800">
              {suits[suit].length > 0 ? suits[suit].join(" ") : "—"}
            </span>
          </div>
        ))}
      </div>
      {hand.description && (
        <p className="text-xs text-gray-500 mt-2 border-t pt-2">{hand.description}</p>
      )}
    </div>
  );
}

// ─── Comment thread ───────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  postId: string;
  sessionUserId: string | null;
  onReplyAdded: (commentId: string, reply: Reply) => void;
}

function CommentItem({ comment, postId, sessionUserId, onReplyAdded }: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitReply() {
    if (!replyText.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/feed/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyText.trim(), parentId: comment.id }),
        });
        if (!res.ok) throw new Error();
        const newReply: Reply = await res.json();
        onReplyAdded(comment.id, newReply);
        setReplyText("");
        setShowReplyInput(false);
      } catch {
        toast.error("Error al publicar la respuesta");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={comment.user.image ?? undefined} />
        <AvatarFallback className="bg-navy-100 text-navy-800 text-xs">
          {getInitials(comment.user.name ?? "U")}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-gray-100 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-gray-900">
              {comment.user.name ?? "Usuario"}
            </span>
            {comment.user.role === "PROFESOR" && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                Profesor
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[11px] text-gray-400">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {sessionUserId && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Responder
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-100">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={reply.user.image ?? undefined} />
                  <AvatarFallback className="bg-gray-100 text-gray-700 text-[10px]">
                    {getInitials(reply.user.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[11px] font-semibold text-gray-900">
                        {reply.user.name ?? "Usuario"}
                      </span>
                      {reply.user.role === "PROFESOR" && (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 h-3.5">
                          Prof.
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-800 break-words">{reply.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply input */}
        {showReplyInput && (
          <div className="mt-2 flex gap-2 pl-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe una respuesta..."
              className="min-h-[60px] text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitReply();
              }}
            />
            <div className="flex flex-col gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={submitReply}
                disabled={isPending || !replyText.trim()}
                className="h-7 w-7"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowReplyInput(false)}
                className="h-7 w-7"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report dialog ────────────────────────────────────────────────────────────

interface ReportDialogProps {
  postId: string;
  onClose: () => void;
}

function ReportDialog({ postId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (reason.trim().length < 10) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/feed/posts/${postId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        });
        if (res.status === 409) {
          toast.info("Ya has reportado este post anteriormente");
          onClose();
          return;
        }
        if (!res.ok) throw new Error();
        toast.success("Post reportado. Lo revisaremos pronto.");
        onClose();
      } catch {
        toast.error("Error al reportar el post");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Reportar post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe por qué reportas este contenido (mínimo 10 caracteres)..."
          className="min-h-[100px] resize-none"
          maxLength={500}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={submit}
            disabled={isPending || reason.trim().length < 10}
            isLoading={isPending}
          >
            Reportar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main FeedPostCard ────────────────────────────────────────────────────────

interface FeedPostCardProps {
  post: FeedPost;
  sessionUserId: string | null;
}

export function FeedPostCard({ post, sessionUserId }: FeedPostCardProps) {
  const [comments, setComments] = useState<Comment[]>(post.comments ?? []);
  const [totalComments, setTotalComments] = useState(post._count.comments);
  const [reactions, setReactions] = useState<Reaction[]>(post.reactions ?? []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [isFavorited, setIsFavorited] = useState((post.favorites ?? []).length > 0);
  const [loadingReaction, setLoadingReaction] = useState<ReactionType | null>(null);
  const [, startTransition] = useTransition();

  // Compute reaction counts
  const reactionCounts = REACTIONS.reduce(
    (acc, r) => {
      acc[r.type] = reactions.filter((rx) => rx.type === r.type).length;
      return acc;
    },
    {} as Record<ReactionType, number>
  );

  const myReactions = new Set(
    reactions.filter((r) => r.userId === sessionUserId).map((r) => r.type)
  );

  async function toggleReaction(type: ReactionType) {
    if (!sessionUserId) {
      toast.info("Inicia sesión para reaccionar");
      return;
    }
    setLoadingReaction(type);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.action === "removed") {
        setReactions((prev) =>
          prev.filter((r) => !(r.userId === sessionUserId && r.type === type))
        );
      } else {
        setReactions((prev) => [...prev, { userId: sessionUserId, type }]);
      }
    } catch {
      toast.error("Error al reaccionar");
    } finally {
      setLoadingReaction(null);
    }
  }

  function submitComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/feed/posts/${post.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText.trim() }),
        });
        if (!res.ok) throw new Error();
        const newComment: Comment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setTotalComments((n) => n + 1);
        setCommentText("");
      } catch {
        toast.error("Error al publicar el comentario");
      }
    });
  }

  function handleReplyAdded(commentId: string, reply: Reply) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    );
  }

  return (
    <>
      <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={post.user.image ?? undefined} />
            <AvatarFallback className="bg-navy-700 text-white text-sm">
              {getInitials(post.user.name ?? post.user.username ?? "U")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/perfil/${post.user.username ?? post.user.id}`}
                className="text-sm font-semibold text-gray-900 hover:underline truncate"
              >
                {post.user.name ?? post.user.username ?? "Usuario"}
              </Link>
              {post.user.role === "PROFESOR" && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0 h-4">
                  Profesor
                </Badge>
              )}
              {post.user.role === "MODERADOR" && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0 h-4">
                  Mod
                </Badge>
              )}
              {post.group && (
                <span className="text-[11px] text-gray-400">
                  en{" "}
                  <Link
                    href={`/grupos/${post.group.id}`}
                    className="hover:underline font-medium text-gray-500"
                  >
                    {post.group.name}
                  </Link>
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {formatRelativeTime(post.createdAt)}
            </p>
          </div>

          {/* Bookmark */}
          <button
            onClick={() => {
              if (!sessionUserId) {
                toast.info("Inicia sesión para guardar posts");
                return;
              }
              setIsFavorited(!isFavorited);
              // Note: favorite API would be called here
            }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              isFavorited
                ? "text-amber-500 hover:text-amber-600"
                : "text-gray-400 hover:text-gray-600"
            )}
            title="Guardar"
          >
            <Bookmark className={cn("h-4 w-4", isFavorited && "fill-current")} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.hashtags.map((tag) => (
                <Link
                  key={tag}
                  href={`/feed?hashtag=${tag}`}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Images */}
          {post.imageUrls.length > 0 && (
            <div
              className={cn(
                "mt-3 gap-1.5 rounded-lg overflow-hidden",
                post.imageUrls.length === 1
                  ? "grid grid-cols-1"
                  : post.imageUrls.length === 2
                  ? "grid grid-cols-2"
                  : "grid grid-cols-2"
              )}
            >
              {post.imageUrls.slice(0, 4).map((url, i) => (
                <div
                  key={i}
                  className={cn(
                    "relative bg-gray-100",
                    post.imageUrls.length === 1 ? "aspect-[16/9]" : "aspect-square"
                  )}
                >
                  <Image
                    src={url}
                    alt={`Imagen ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                  {i === 3 && post.imageUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        +{post.imageUrls.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Video */}
          {post.videoUrl && (
            <div className="mt-3 rounded-lg overflow-hidden aspect-video bg-black">
              <video
                src={post.videoUrl}
                controls
                className="w-full h-full"
                preload="metadata"
              />
            </div>
          )}

          {/* Hand record */}
          {post.handRecord && <HandDisplay hand={post.handRecord} />}
        </div>

        {/* Reaction bar */}
        <div className="px-4 pb-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => toggleReaction(r.type)}
                  disabled={loadingReaction !== null}
                  title={r.label}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm transition-all",
                    myReactions.has(r.type)
                      ? r.activeColor + " bg-gray-100"
                      : r.color + " hover:bg-gray-50"
                  )}
                >
                  <span className="text-base leading-none">{r.icon}</span>
                  {reactionCounts[r.type] > 0 && (
                    <span className="text-xs font-medium">{reactionCounts[r.type]}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (!sessionUserId) {
                    toast.info("Inicia sesión para comentar");
                    return;
                  }
                  setShowComments(!showComments);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                {totalComments > 0 && (
                  <span className="text-xs font-medium">{totalComments}</span>
                )}
              </button>

              {sessionUserId && sessionUserId !== post.user.id && (
                <button
                  onClick={() => setShowReport(true)}
                  title="Reportar post"
                  className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
            {/* New comment input */}
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                className="min-h-[70px] text-sm resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Comment list */}
            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    sessionUserId={sessionUserId}
                    onReplyAdded={handleReplyAdded}
                  />
                ))}

                {totalComments > comments.length && (
                  <button
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    onClick={async () => {
                      try {
                        const lastId = comments[comments.length - 1]?.id;
                        const url = lastId
                          ? `/api/feed/posts/${post.id}/comments?cursor=${lastId}`
                          : `/api/feed/posts/${post.id}/comments`;
                        const res = await fetch(url);
                        const data = await res.json();
                        setComments((prev) => [...prev, ...data.comments]);
                      } catch {
                        toast.error("Error al cargar comentarios");
                      }
                    }}
                  >
                    <ChevronDown className="h-3 w-3" />
                    Ver más comentarios ({totalComments - comments.length})
                  </button>
                )}
              </div>
            )}

            {comments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                Sé el primero en comentar
              </p>
            )}
          </div>
        )}

        {/* Collapsed comment toggle if has comments but not shown */}
        {!showComments && totalComments > 0 && (
          <div className="px-4 pb-3">
            <button
              onClick={() => {
                if (!sessionUserId) {
                  toast.info("Inicia sesión para ver y escribir comentarios");
                  return;
                }
                setShowComments(true);
              }}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
            >
              <ChevronDown className="h-3 w-3" />
              Ver {totalComments} comentario{totalComments !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </article>

      {showReport && (
        <ReportDialog postId={post.id} onClose={() => setShowReport(false)} />
      )}
    </>
  );
}

// Export collapse toggle helper for feed page
export function CollapseIcon({ open }: { open: boolean }) {
  return open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
}
