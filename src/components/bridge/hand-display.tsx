"use client";

import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "T"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";
export type Direction = "N" | "S" | "E" | "W";

export interface Hand {
  S: Rank[];
  H: Rank[];
  D: Rank[];
  C: Rank[];
}

export interface HandDisplayProps {
  /** Raw PBN string: "N:AKQ.876.A5.KJ92 ..." or JSON */
  pbnData?: string;
  /** Already-parsed hands object */
  hands?: Record<Direction, Hand>;
  /** Ocultar manos E y W (modo problema) */
  problemMode?: boolean;
  /** Carta a resaltar, ej: "AS" o "KH" */
  highlightCard?: string;
  /** Versión compacta para el feed */
  compact?: boolean;
  className?: string;
}

// ─── PBN Parser ───────────────────────────────────────────────────────────────

const RANK_ORDER: Rank[] = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
];

function parseSuitString(str: string): Rank[] {
  if (!str || str === "-") return [];
  return str.split("").filter((c) => RANK_ORDER.includes(c as Rank)) as Rank[];
}

function parseHandString(handStr: string): Hand {
  const [spades = "", hearts = "", diamonds = "", clubs = ""] = handStr.split(".");
  return {
    S: parseSuitString(spades),
    H: parseSuitString(hearts),
    D: parseSuitString(diamonds),
    C: parseSuitString(clubs),
  };
}

export function parsePBN(pbnData: string): Record<Direction, Hand> | null {
  if (!pbnData) return null;

  // Try JSON first
  try {
    const parsed = JSON.parse(pbnData);
    if (parsed.N || parsed.S || parsed.E || parsed.W) {
      // Already structured
      const toHand = (v: unknown): Hand => {
        if (typeof v === "string") return parseHandString(v);
        if (v && typeof v === "object") return v as Hand;
        return { S: [], H: [], D: [], C: [] };
      };
      return {
        N: toHand(parsed.N),
        S: toHand(parsed.S),
        E: toHand(parsed.E),
        W: toHand(parsed.W),
      };
    }
  } catch {
    // Not JSON — parse as PBN
  }

  // Standard PBN: "[N|S|E|W]:hand1 hand2 hand3 hand4"
  const match = pbnData.match(/^([NSEW]):(.+)/);
  if (!match) return null;

  const dealer = match[1] as Direction;
  const handStrings = match[2].trim().split(/\s+/);
  if (handStrings.length < 4) return null;

  const order: Direction[] = ["N", "E", "S", "W"];
  const dealerIdx = order.indexOf(dealer);
  const directions: Direction[] = [];
  for (let i = 0; i < 4; i++) {
    directions.push(order[(dealerIdx + i) % 4]);
  }

  const result: Partial<Record<Direction, Hand>> = {};
  directions.forEach((dir, idx) => {
    result[dir] = parseHandString(handStrings[idx] ?? "");
  });

  return result as Record<Direction, Hand>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

const SUIT_LABEL: Record<Suit, string> = {
  S: "Espadas",
  H: "Corazones",
  D: "Diamantes",
  C: "Tréboles",
};

function isRed(suit: Suit) {
  return suit === "H" || suit === "D";
}

function cardKey(suit: Suit, rank: Rank) {
  return `${rank}${suit}`;
}

interface SingleHandProps {
  hand: Hand | null;
  direction: Direction;
  hidden?: boolean;
  highlightCard?: string;
  compact?: boolean;
}

const DIRECTION_LABEL: Record<Direction, string> = {
  N: "Norte",
  S: "Sur",
  E: "Este",
  W: "Oeste",
};

function SingleHand({
  hand,
  direction,
  hidden = false,
  highlightCard,
  compact = false,
}: SingleHandProps) {
  const suits: Suit[] = ["S", "H", "D", "C"];

  if (hidden) {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center",
          compact ? "w-20 h-24" : "w-36 h-44"
        )}
      >
        <span className="text-gray-400 text-xs font-medium">{direction}</span>
      </div>
    );
  }

  if (!hand) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center",
          compact ? "w-20 h-24" : "w-36 h-44"
        )}
      >
        <span className="text-gray-400 text-xs">—</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-white shadow-sm",
        compact ? "px-2 py-1.5 min-w-[76px]" : "px-3 py-2.5 min-w-[130px]"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "font-bold text-center mb-1.5 rounded",
          compact ? "text-xs px-1 py-0.5" : "text-sm px-2 py-0.5"
        )}
        style={{ backgroundColor: "#0f2044", color: "#ffffff" }}
      >
        {compact ? direction : DIRECTION_LABEL[direction]}
      </div>

      {/* Suits */}
      <div className={cn("space-y-0.5", compact ? "text-xs" : "text-sm")}>
        {suits.map((suit) => {
          const ranks = hand[suit];
          return (
            <div key={suit} className="flex items-baseline gap-1 leading-snug">
              <span
                className={cn(
                  "font-bold shrink-0",
                  compact ? "text-sm" : "text-base",
                  isRed(suit) ? "text-red-600" : "text-gray-900"
                )}
                aria-label={SUIT_LABEL[suit]}
              >
                {SUIT_SYMBOLS[suit]}
              </span>
              <span className="font-mono tracking-tight text-gray-800">
                {ranks.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  ranks.map((rank) => {
                    const key = cardKey(suit, rank);
                    const isHighlighted = highlightCard === key;
                    return (
                      <span
                        key={rank}
                        className={cn(
                          "inline-block",
                          isHighlighted &&
                            "bg-yellow-300 text-yellow-900 rounded px-0.5 font-bold"
                        )}
                      >
                        {rank}
                      </span>
                    );
                  })
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HandDisplay({
  pbnData,
  hands: handsProp,
  problemMode = false,
  highlightCard,
  compact = false,
  className,
}: HandDisplayProps) {
  let hands: Record<Direction, Hand> | null = handsProp ?? null;

  if (!hands && pbnData) {
    hands = parsePBN(pbnData);
  }

  const empty: Hand = { S: [], H: [], D: [], C: [] };

  const N = hands?.N ?? empty;
  const S = hands?.S ?? empty;
  const E = hands?.E ?? empty;
  const W = hands?.W ?? empty;

  const gap = compact ? "gap-1" : "gap-2";

  return (
    <div
      className={cn("inline-flex flex-col items-center select-none", gap, className)}
      role="img"
      aria-label="Mesa de bridge"
    >
      {/* Norte */}
      <div className="flex justify-center">
        <SingleHand
          hand={N}
          direction="N"
          highlightCard={highlightCard}
          compact={compact}
        />
      </div>

      {/* Centro: Oeste — vacío — Este */}
      <div className={cn("flex items-center justify-center", gap)}>
        <SingleHand
          hand={W}
          direction="W"
          hidden={problemMode}
          highlightCard={highlightCard}
          compact={compact}
        />

        {/* Compass center */}
        <div
          className={cn(
            "rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 font-bold",
            compact ? "w-10 h-10 text-xs" : "w-16 h-16 text-xs"
          )}
        >
          {compact ? (
            <span>B</span>
          ) : (
            <div className="text-center leading-tight">
              <div>N</div>
              <div className="flex justify-between w-full px-1">
                <span>W</span>
                <span>E</span>
              </div>
              <div>S</div>
            </div>
          )}
        </div>

        <SingleHand
          hand={E}
          direction="E"
          hidden={problemMode}
          highlightCard={highlightCard}
          compact={compact}
        />
      </div>

      {/* Sur */}
      <div className="flex justify-center">
        <SingleHand
          hand={S}
          direction="S"
          highlightCard={highlightCard}
          compact={compact}
        />
      </div>
    </div>
  );
}
