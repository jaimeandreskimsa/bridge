"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Globe,
  Lock,
  Users,
  X,
  Spade,
  ChevronDown,
  Hash,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getInitials } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostVisibility = "PUBLIC" | "PRIVATE" | "GROUP";

interface Group {
  id: string;
  name: string;
}

interface CreatePostProps {
  onPostCreated: (post: unknown) => void;
  userGroups?: Group[];
}

// ─── Hashtag autocomplete suggestions ────────────────────────────────────────

const BRIDGE_HASHTAGS = [
  "bridge", "licitacion", "jugada", "defensa", "slam", "mano",
  "torneo", "analisis", "pregunta", "convenciones", "sayc", "acol",
  "precision", "apertura", "cierre", "remate", "contrato", "declarante",
  "muerta", "señales", "descarte", "aprieto", "squeeze", "finesse",
];

// ─── Minimal hand record embed ────────────────────────────────────────────────

interface HandRecordEmbedProps {
  value: string;
  onChange: (pbn: string) => void;
}

function HandRecordEmbed({ value, onChange }: HandRecordEmbedProps) {
  const [north, setNorth] = useState({ S: "", H: "", D: "", C: "" });
  const [title, setTitle] = useState("");

  const suits = [
    { key: "S", icon: "♠", label: "Espadas", color: "text-gray-900" },
    { key: "H", icon: "♥", label: "Corazones", color: "text-red-600" },
    { key: "D", icon: "♦", label: "Diamantes", color: "text-red-600" },
    { key: "C", icon: "♣", label: "Tréboles", color: "text-gray-900" },
  ] as const;

  function buildPbn() {
    const handStr = `${north.S}.${north.H}.${north.D}.${north.C}`;
    const pbn = `[Deal "N:${handStr} --- --- ---"]\n[Declarer "N"]\n[Contract "3N"]`;
    onChange(pbn);
    return pbn;
  }

  function updateSuit(suit: "S" | "H" | "D" | "C", val: string) {
    const next = { ...north, [suit]: val.toUpperCase().replace(/[^AKQJT2-9]/g, "") };
    setNorth(next);
    const handStr = `${next.S}.${next.H}.${next.D}.${next.C}`;
    onChange(`[Deal "N:${handStr} --- --- ---"]${title ? `\n[Title "${title}"]` : ""}`);
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Registro de mano — Mano Norte
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suits.map(({ key, icon, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className={cn("text-lg font-bold w-5 text-center", color)}>{icon}</span>
            <input
              type="text"
              placeholder={label}
              value={north[key as keyof typeof north]}
              onChange={(e) => updateSuit(key as "S" | "H" | "D" | "C", e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              maxLength={13}
            />
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Título de la mano (opcional)"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          buildPbn();
        }}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
      />
      {value && (
        <p className="text-[10px] text-green-600 font-mono bg-green-50 rounded p-1 overflow-hidden text-ellipsis whitespace-nowrap">
          PBN: {value.slice(0, 60)}…
        </p>
      )}
    </div>
  );
}

// ─── CreatePost component ─────────────────────────────────────────────────────

export function CreatePost({ onPostCreated, userGroups = [] }: CreatePostProps) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [handPbn, setHandPbn] = useState("");
  const [showHandEmbed, setShowHandEmbed] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [groupId, setGroupId] = useState<string>("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = session?.user;

  // Extract hashtags from content automatically
  const extractHashtags = useCallback((text: string) => {
    const matches = text.match(/#(\w+)/g) ?? [];
    return matches.map((m) => m.slice(1).toLowerCase());
  }, []);

  const hashtagSuggestions = BRIDGE_HASHTAGS.filter(
    (h) =>
      hashtagInput.length > 0 &&
      h.includes(hashtagInput.toLowerCase()) &&
      !hashtags.includes(h)
  ).slice(0, 6);

  function addHashtag(tag: string) {
    const clean = tag.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean && !hashtags.includes(clean) && hashtags.length < 10) {
      setHashtags((prev) => [...prev, clean]);
    }
    setHashtagInput("");
    setShowHashtagSuggestions(false);
  }

  function removeHashtag(tag: string) {
    setHashtags((prev) => prev.filter((h) => h !== tag));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (imageUrls.length + files.length > 4) {
      toast.error("Máximo 4 imágenes por post");
      return;
    }

    setUploadingImages(true);
    try {
      // In a real app, this would use uploadthing or similar
      // For now, create object URLs as placeholder
      const urls = files.map((f) => URL.createObjectURL(f));
      setImageUrls((prev) => [...prev, ...urls].slice(0, 4));
      toast.info("Imágenes listas para publicar");
    } catch {
      toast.error("Error al subir imágenes");
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function determineType(): "TEXT" | "IMAGE" | "HAND_RECORD" {
    if (showHandEmbed && handPbn) return "HAND_RECORD";
    if (imageUrls.length > 0) return "IMAGE";
    return "TEXT";
  }

  async function submit() {
    if (!content.trim() && !handPbn && imageUrls.length === 0) {
      toast.error("Escribe algo antes de publicar");
      return;
    }

    const autoHashtags = extractHashtags(content);
    const allHashtags = [...new Set([...hashtags, ...autoHashtags])].slice(0, 10);

    const payload = {
      content: content.trim(),
      type: determineType(),
      imageUrls: imageUrls.filter((u) => u.startsWith("http")), // only real URLs
      videoUrl: null,
      handRecordId: null,
      visibility,
      groupId: visibility === "GROUP" ? groupId || null : null,
      hashtags: allHashtags,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/feed/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Error al publicar");
          return;
        }

        const newPost = await res.json();
        onPostCreated(newPost);
        toast.success("Post publicado");

        // Reset
        setContent("");
        setImageUrls([]);
        setHandPbn("");
        setShowHandEmbed(false);
        setHashtags([]);
        setHashtagInput("");
        setVisibility("PUBLIC");
        setGroupId("");
        setExpanded(false);
      } catch {
        toast.error("Error al publicar el post");
      }
    });
  }

  if (!user) return null;

  const visibilityOptions = [
    { value: "PUBLIC", label: "Público", icon: Globe },
    { value: "PRIVATE", label: "Solo yo", icon: Lock },
    ...(userGroups.length > 0 ? [{ value: "GROUP", label: "Grupo", icon: Users }] : []),
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="bg-navy-700 text-white text-sm">
            {getInitials(user.name ?? user.email ?? "U")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 transition-colors"
            >
              ¿Qué quieres compartir hoy?
            </button>
          ) : (
            <div className="space-y-3">
              {/* Main textarea */}
              <Textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué quieres compartir? Usa #hashtags para categorizar tu post..."
                className="min-h-[100px] resize-none border-gray-200 focus:ring-blue-300 text-sm"
                maxLength={5000}
              />

              {/* Character count */}
              {content.length > 4000 && (
                <p className="text-xs text-right text-orange-500">
                  {content.length}/5000
                </p>
              )}

              {/* Image previews */}
              {imageUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hand record embed */}
              {showHandEmbed && (
                <div className="relative">
                  <button
                    onClick={() => { setShowHandEmbed(false); setHandPbn(""); }}
                    className="absolute top-2 right-2 z-10 bg-white rounded-full p-0.5 border border-gray-200 hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <HandRecordEmbed value={handPbn} onChange={setHandPbn} />
                </div>
              )}

              {/* Hashtag input */}
              <div className="relative">
                <div className="flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-lg px-3 py-2 min-h-[38px] bg-white focus-within:ring-1 focus-within:ring-blue-300">
                  <Hash className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5 font-medium"
                    >
                      #{tag}
                      <button onClick={() => removeHashtag(tag)}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => {
                      setHashtagInput(e.target.value.replace("#", ""));
                      setShowHashtagSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && hashtagInput.trim()) {
                        e.preventDefault();
                        addHashtag(hashtagInput.trim());
                      }
                      if (e.key === "Backspace" && !hashtagInput && hashtags.length > 0) {
                        removeHashtag(hashtags[hashtags.length - 1]);
                      }
                    }}
                    placeholder={hashtags.length === 0 ? "Agregar hashtag..." : ""}
                    className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
                    maxLength={30}
                  />
                </div>

                {/* Suggestions dropdown */}
                {showHashtagSuggestions && hashtagSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {hashtagSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addHashtag(suggestion);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                      >
                        <span className="text-gray-400">#</span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  {/* Image upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUrls.length >= 4 || uploadingImages}
                    title="Adjuntar imágenes (máx. 4)"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      imageUrls.length > 0
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {imageUrls.length > 0 ? `${imageUrls.length}/4` : "Imagen"}
                  </button>

                  {/* Hand record toggle */}
                  <button
                    onClick={() => setShowHandEmbed(!showHandEmbed)}
                    title="Adjuntar registro de mano"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      showHandEmbed
                        ? "text-indigo-600 bg-indigo-50"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    <Spade className="h-4 w-4" />
                    Mano
                  </button>

                  {/* Visibility select */}
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as PostVisibility)}
                  >
                    <SelectTrigger className="h-8 text-xs border-0 bg-gray-50 hover:bg-gray-100 gap-1 px-2.5 w-auto min-w-[90px]">
                      <SelectValue />
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibilityOptions.map(({ value, label, icon: Icon }) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-1.5">
                            <Icon className="h-3 w-3" />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Group selector (shown when GROUP visibility) */}
                  {visibility === "GROUP" && userGroups.length > 0 && (
                    <Select value={groupId} onValueChange={setGroupId}>
                      <SelectTrigger className="h-8 text-xs border border-gray-200 px-2.5 w-auto min-w-[110px]">
                        <SelectValue placeholder="Elegir grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {userGroups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpanded(false);
                      setContent("");
                      setImageUrls([]);
                      setHandPbn("");
                      setShowHandEmbed(false);
                      setHashtags([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-navy-900 text-white hover:bg-navy-800"
                    onClick={submit}
                    disabled={
                      isPending ||
                      (!content.trim() && !handPbn && imageUrls.length === 0)
                    }
                    isLoading={isPending}
                  >
                    Publicar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
