"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Suit, Rank, Direction, Hand } from "./hand-display";
import { parsePBN } from "./hand-display";
import {
  Shuffle,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const DIRECTIONS: Direction[] = ["N", "S", "E", "W"];

const SUIT_SYMBOLS: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const DIRECTION_LABEL: Record<Direction, string> = {
  N: "Norte",
  S: "Sur",
  E: "Este",
  W: "Oeste",
};

function isRed(suit: Suit) {
  return suit === "H" || suit === "D";
}

function emptyHands(): Record<Direction, Hand> {
  const empty = (): Hand => ({ S: [], H: [], D: [], C: [] });
  return { N: empty(), S: empty(), E: empty(), W: empty() };
}

function handToString(hand: Hand): string {
  return SUITS.map((s) => (hand[s].length ? hand[s].join("") : "-")).join(".");
}

function exportToPBN(hands: Record<Direction, Hand>): string {
  return `N:${handToString(hands.N)} ${handToString(hands.E)} ${handToString(hands.S)} ${handToString(hands.W)}`;
}

function totalCards(hands: Record<Direction, Hand>): number {
  return DIRECTIONS.flatMap((d) => SUITS.flatMap((s) => hands[d][s])).length;
}

function handCardCount(hand: Hand): number {
  return SUITS.reduce((acc, s) => acc + hand[s].length, 0);
}

function allAssignedCards(hands: Record<Direction, Hand>): Set<string> {
  const assigned = new Set<string>();
  for (const dir of DIRECTIONS) {
    for (const suit of SUITS) {
      for (const rank of hands[dir][suit]) {
        assigned.add(`${suit}${rank}`);
      }
    }
  }
  return assigned;
}

function shuffleDeck(hands: Record<Direction, Hand>): Record<Direction, Hand> {
  const deck: { suit: Suit; rank: Rank }[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const newHands = emptyHands();
  deck.forEach((card, idx) => {
    const dir = DIRECTIONS[idx % 4];
    newHands[dir][card.suit].push(card.rank);
  });
  // Sort each suit
  for (const dir of DIRECTIONS) {
    for (const suit of SUITS) {
      newHands[dir][suit].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b));
    }
  }
  return newHands;
}

// ─── Draggable Card ───────────────────────────────────────────────────────────

interface DraggableCardProps {
  suit: Suit;
  rank: Rank;
  assigned: boolean;
  onDragStart: (suit: Suit, rank: Rank, fromDir: Direction | null) => void;
}

function DraggableCard({ suit, rank, assigned, onDragStart }: DraggableCardProps) {
  return (
    <div
      draggable={!assigned}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(suit, rank, null);
      }}
      className={cn(
        "w-9 h-11 rounded border text-center text-sm font-bold flex flex-col items-center justify-center cursor-grab select-none transition-all",
        assigned
          ? "opacity-25 cursor-not-allowed bg-gray-100 border-gray-200"
          : "bg-white border-gray-300 hover:border-gray-500 hover:shadow-sm active:scale-95",
        isRed(suit) ? "text-red-600" : "text-gray-900"
      )}
      title={assigned ? "Carta asignada" : `Arrastrar ${rank}${SUIT_SYMBOLS[suit]}`}
    >
      <span className="text-xs leading-none">{SUIT_SYMBOLS[suit]}</span>
      <span className="leading-none">{rank}</span>
    </div>
  );
}

// ─── Hand Drop Zone ───────────────────────────────────────────────────────────

interface HandDropZoneProps {
  direction: Direction;
  hand: Hand;
  annotations: string;
  onAnnotationChange: (val: string) => void;
  onDrop: (dir: Direction) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemoveCard: (dir: Direction, suit: Suit, rank: Rank) => void;
  onDragStart: (suit: Suit, rank: Rank, fromDir: Direction) => void;
  isDragOver: boolean;
  problemMode: boolean;
}

function HandDropZone({
  direction,
  hand,
  annotations,
  onAnnotationChange,
  onDrop,
  onDragOver,
  onRemoveCard,
  onDragStart,
  isDragOver,
  problemMode,
}: HandDropZoneProps) {
  const count = handCardCount(hand);
  const isHidden = problemMode && (direction === "E" || direction === "W");

  return (
    <div
      onDrop={() => onDrop(direction)}
      onDragOver={onDragOver}
      className={cn(
        "rounded-xl border-2 transition-all p-3 min-h-[160px] flex flex-col",
        isDragOver
          ? "border-blue-400 bg-blue-50"
          : count === 13
          ? "border-green-400 bg-green-50/50"
          : "border-dashed border-gray-300 bg-white"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded text-white"
          style={{ backgroundColor: "#0f2044" }}
        >
          {DIRECTION_LABEL[direction]} ({count}/13)
        </span>
        {count === 13 && (
          <span className="text-xs text-green-600 font-medium">✓ Completa</span>
        )}
        {isHidden && (
          <span className="text-xs text-gray-400 italic">Oculta (modo problema)</span>
        )}
      </div>

      {isHidden ? (
        <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
          Mano oculta
        </div>
      ) : (
        <>
          {/* Cards by suit */}
          <div className="flex-1 space-y-1">
            {SUITS.map((suit) => (
              <div key={suit} className="flex items-center gap-1 min-h-[24px]">
                <span
                  className={cn(
                    "text-base font-bold w-5 shrink-0",
                    isRed(suit) ? "text-red-600" : "text-gray-900"
                  )}
                >
                  {SUIT_SYMBOLS[suit]}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {hand[suit].map((rank) => (
                    <button
                      key={rank}
                      onClick={() => onRemoveCard(direction, suit, rank)}
                      title="Click para devolver al mazo"
                      className={cn(
                        "w-7 h-8 rounded border text-xs font-bold transition-all hover:scale-110",
                        "bg-white border-gray-300 hover:border-red-400 hover:text-red-600",
                        isRed(suit) ? "text-red-600" : "text-gray-900"
                      )}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        onDragStart(suit, rank, direction);
                      }}
                    >
                      {rank}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Annotations */}
          <div className="mt-2">
            <Textarea
              placeholder="Anotaciones..."
              value={annotations}
              onChange={(e) => onAnnotationChange(e.target.value)}
              className="text-xs h-14 resize-none"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export interface HandEditorProps {
  initialPBN?: string;
  onChange?: (pbn: string, hands: Record<Direction, Hand>) => void;
  className?: string;
}

export function HandEditor({ initialPBN, onChange, className }: HandEditorProps) {
  const [hands, setHands] = useState<Record<Direction, Hand>>(() => {
    if (initialPBN) {
      return parsePBN(initialPBN) ?? emptyHands();
    }
    return emptyHands();
  });
  const [annotations, setAnnotations] = useState<Record<Direction, string>>({
    N: "",
    S: "",
    E: "",
    W: "",
  });
  const [problemMode, setProblemMode] = useState(false);
  const [dragOver, setDragOver] = useState<Direction | null>(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Drag state tracked via ref to avoid stale closures
  const draggingRef = useRef<{
    suit: Suit;
    rank: Rank;
    fromDir: Direction | null;
  } | null>(null);

  const updateHands = useCallback(
    (next: Record<Direction, Hand>) => {
      setHands(next);
      onChange?.(exportToPBN(next), next);
    },
    [onChange]
  );

  const handleDragStart = (suit: Suit, rank: Rank, fromDir: Direction | null) => {
    draggingRef.current = { suit, rank, fromDir };
  };

  const handleDrop = (toDir: Direction) => {
    setDragOver(null);
    const drag = draggingRef.current;
    if (!drag) return;

    const { suit, rank, fromDir } = drag;
    draggingRef.current = null;

    const toCount = handCardCount(hands[toDir]);
    if (toCount >= 13) return; // full

    setHands((prev) => {
      const next = { ...prev };
      // Remove from source if coming from a hand
      if (fromDir) {
        next[fromDir] = {
          ...next[fromDir],
          [suit]: next[fromDir][suit].filter((r) => r !== rank),
        };
      }
      // Add to target (avoid duplicates)
      if (!next[toDir][suit].includes(rank)) {
        const newSuit = [...next[toDir][suit], rank].sort(
          (a, b) => RANKS.indexOf(a) - RANKS.indexOf(b)
        );
        next[toDir] = { ...next[toDir], [suit]: newSuit };
      }
      onChange?.(exportToPBN(next), next);
      return next;
    });
  };

  const handleRemoveCard = (dir: Direction, suit: Suit, rank: Rank) => {
    setHands((prev) => {
      const next = {
        ...prev,
        [dir]: {
          ...prev[dir],
          [suit]: prev[dir][suit].filter((r) => r !== rank),
        },
      };
      onChange?.(exportToPBN(next), next);
      return next;
    });
  };

  const handleShuffle = () => {
    updateHands(shuffleDeck(emptyHands()));
  };

  const handleClear = () => {
    updateHands(emptyHands());
  };

  const handleExport = () => {
    const pbn = exportToPBN(hands);
    navigator.clipboard.writeText(pbn).catch(() => {});
    setImportText(pbn);
    setShowImport(true);
  };

  const handleImport = () => {
    setImportError("");
    const parsed = parsePBN(importText.trim());
    if (!parsed) {
      setImportError("Formato PBN inválido. Ejemplo: N:AKQ.876.A5.KJ92 ...")
      return;
    }
    updateHands(parsed);
    setShowImport(false);
    setImportText("");
  };

  const assigned = allAssignedCards(hands);
  const total = totalCards(hands);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleShuffle} className="gap-1.5">
          <Shuffle className="w-3.5 h-3.5" />
          Distribuir
        </Button>
        <Button size="sm" variant="outline" onClick={handleClear} className="gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Limpiar
        </Button>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Exportar PBN
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowImport(!showImport)}
          className="gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Importar PBN
        </Button>
        <Button
          size="sm"
          variant={problemMode ? "default" : "outline"}
          onClick={() => setProblemMode(!problemMode)}
          className="gap-1.5 ml-auto"
          style={problemMode ? { backgroundColor: "#0f2044" } : undefined}
        >
          {problemMode ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          Modo problema
        </Button>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700">
            Pegar PBN (ej: <code>N:AKQ.876.A5.KJ92 ...</code>)
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="N:AKQ.876.A5.KJ92 J9.AQJ.KJ87.AT5 ..."
            className="text-xs h-16 font-mono resize-none"
          />
          {importError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {importError}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleImport}>
              Importar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowImport(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Deck panel */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="rounded-xl border bg-white p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">Mazo</span>
              <span className="text-xs text-gray-500">{52 - total} restantes</span>
            </div>
            <div className="space-y-2">
              {SUITS.map((suit) => (
                <div key={suit}>
                  <div
                    className={cn(
                      "text-sm font-bold mb-1",
                      isRed(suit) ? "text-red-600" : "text-gray-900"
                    )}
                  >
                    {SUIT_SYMBOLS[suit]}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {RANKS.map((rank) => {
                      const key = `${suit}${rank}`;
                      return (
                        <DraggableCard
                          key={key}
                          suit={suit}
                          rank={rank}
                          assigned={assigned.has(key)}
                          onDragStart={handleDragStart}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hands layout */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {DIRECTIONS.map((dir) => (
            <HandDropZone
              key={dir}
              direction={dir}
              hand={hands[dir]}
              annotations={annotations[dir]}
              onAnnotationChange={(val) =>
                setAnnotations((prev) => ({ ...prev, [dir]: val }))
              }
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(dir);
              }}
              onRemoveCard={handleRemoveCard}
              onDragStart={handleDragStart}
              isDragOver={dragOver === dir}
              problemMode={problemMode}
            />
          ))}
        </div>
      </div>

      {/* Validation summary */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 border-t pt-3">
        {DIRECTIONS.map((dir) => {
          const count = handCardCount(hands[dir]);
          return (
            <span
              key={dir}
              className={cn(
                "flex items-center gap-1",
                count === 13 ? "text-green-600" : count > 13 ? "text-red-600" : ""
              )}
            >
              {count === 13 ? "✓" : count > 13 ? "✗" : "○"} {DIRECTION_LABEL[dir]}: {count}/13
            </span>
          );
        })}
        {total === 52 && (
          <span className="text-green-600 font-semibold ml-auto">
            ✓ Distribución completa
          </span>
        )}
      </div>
    </div>
  );
}
