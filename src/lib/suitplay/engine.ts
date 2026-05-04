// ── Suit Play Engine ──────────────────────────────────────────────────────────
// Minimax analysis of a single-suit holding.
// Players: 0=N (dummy), 1=E, 2=S (hand), 3=W. Clockwise order.
// Declarer (NS) maximises tricks; defence (EW) minimises.

export const CARD_NAMES: Record<number, string> = {
  14: "A", 13: "K", 12: "Q", 11: "J", 10: "T",
  9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2",
};

export const CARD_ORDER = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

function bit(c: number) { return 1 << (c - 2); }

function bitsToCards(mask: number): number[] {
  const out: number[] = [];
  for (let c = 14; c >= 2; c--) if (mask & bit(c)) out.push(c);
  return out;
}

// ── Core minimax (memoised at trick boundaries) ───────────────────────────────

type Hands = [number, number, number, number];

function solveTrick(hands: Hands, leader: number, memo: Map<string, number>): number {
  if ((hands[0] | hands[1] | hands[2] | hands[3]) === 0) return 0;
  const key = `${hands[0]},${hands[1]},${hands[2]},${hands[3]},${leader}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  const result = playInTrick(hands, leader, leader, [], memo);
  memo.set(key, result);
  return result;
}

function playInTrick(
  hands: Hands,
  leader: number,
  next: number,
  played: Array<{ player: number; card: number }>,
  memo: Map<string, number>,
): number {
  if (played.length === 4) {
    let best = -1, winner = leader;
    for (const p of played) if (p.card > best) { best = p.card; winner = p.player; }
    const got = winner === 0 || winner === 2 ? 1 : 0;
    return got + solveTrick(hands, winner, memo);
  }

  const isNS = next === 0 || next === 2;
  const following = (next + 1) % 4;

  // No suit cards left → forced discard (card = -1, never wins)
  if (hands[next] === 0) {
    return playInTrick(hands, leader, following, [...played, { player: next, card: -1 }], memo);
  }

  const cards = bitsToCards(hands[next]);
  let bestResult = isNS ? -1 : 99;

  for (const card of cards) {
    const nh: Hands = [hands[0], hands[1], hands[2], hands[3]];
    nh[next] &= ~bit(card);
    const r = playInTrick(nh, leader, following, [...played, { player: next, card }], memo);
    if (isNS ? r > bestResult : r < bestResult) bestResult = r;
  }

  return bestResult;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface DistributionResult {
  eastCards: number[];
  westCards: number[];
  tricks: number;
}

export interface SplitSummary {
  eastCount: number;
  westCount: number;
  probability: number;
  avgTricks: number;
  count: number;
}

export interface FirstPlayOption {
  card: number;
  label: string;
  expectedTricks: number;
  isOptimal: boolean;
}

export interface SuitAnalysisResult {
  expectedTricks: number;
  maxPossibleTricks: number;
  distributions: DistributionResult[];
  splitSummary: SplitSummary[];
  firstPlays: {
    fromHand: FirstPlayOption[];
    fromDummy: FirstPlayOption[];
    recommendLeadFrom: "hand" | "dummy" | "equal";
    handExpected: number;
    dummyExpected: number;
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function analyzeSuit(handCards: number[], dummyCards: number[]): SuitAnalysisResult {
  const nsSet = new Set([...handCards, ...dummyCards]);
  const ewCards = CARD_ORDER.filter((c) => !nsSet.has(c));
  const m = ewCards.length;
  const total = 1 << m;

  const northBase = dummyCards.reduce((a, c) => a | bit(c), 0);
  const southBase = handCards.reduce((a, c) => a | bit(c), 0);

  // ── Enumerate all 2^m EW distributions ────────────────────────────────────
  const distributions: DistributionResult[] = [];
  const splitAccum = new Map<number, { sum: number; count: number }>();

  for (let mask = 0; mask < total; mask++) {
    let eastMask = 0, westMask = 0;
    const eastCards: number[] = [], westCards: number[] = [];

    for (let i = 0; i < m; i++) {
      if (mask & (1 << i)) { eastMask |= bit(ewCards[i]); eastCards.push(ewCards[i]); }
      else { westMask |= bit(ewCards[i]); westCards.push(ewCards[i]); }
    }

    const memoN = new Map<string, number>();
    const memoS = new Map<string, number>();
    const tricksN = dummyCards.length > 0
      ? solveTrick([northBase, eastMask, southBase, westMask], 0, memoN) : 0;
    const tricksS = handCards.length > 0
      ? solveTrick([northBase, eastMask, southBase, westMask], 2, memoS) : 0;
    const tricks = Math.max(tricksN, tricksS);

    distributions.push({ eastCards, westCards, tricks });

    const ek = eastCards.length;
    if (!splitAccum.has(ek)) splitAccum.set(ek, { sum: 0, count: 0 });
    const s = splitAccum.get(ek)!;
    s.sum += tricks; s.count++;
  }

  const expectedTricks = distributions.reduce((s, d) => s + d.tricks, 0) / total;
  const maxPossibleTricks = handCards.length + dummyCards.length;

  const splitSummary: SplitSummary[] = Array.from(splitAccum.entries())
    .map(([ek, { sum, count }]) => ({
      eastCount: ek, westCount: m - ek,
      probability: count / total,
      avgTricks: sum / count,
      count,
    }))
    .sort((a, b) => a.eastCount - b.eastCount);

  // ── First play analysis ────────────────────────────────────────────────────
  function firstPlayOptions(leaderIdx: number): FirstPlayOption[] {
    const leaderCards = leaderIdx === 0 ? dummyCards : handCards;
    if (leaderCards.length === 0) return [];

    const totals = new Map<number, number>();
    for (const c of leaderCards) totals.set(c, 0);

    for (let mask = 0; mask < total; mask++) {
      let eastMask = 0, westMask = 0;
      for (let i = 0; i < m; i++) {
        if (mask & (1 << i)) eastMask |= bit(ewCards[i]);
        else westMask |= bit(ewCards[i]);
      }

      // One shared memo per distribution (state after first card is played)
      const memo = new Map<string, number>();

      for (const card of leaderCards) {
        const nh: Hands = [northBase, eastMask, southBase, westMask];
        nh[leaderIdx] &= ~bit(card);
        const t = playInTrick(nh, leaderIdx, (leaderIdx + 1) % 4, [{ player: leaderIdx, card }], memo);
        totals.set(card, (totals.get(card) ?? 0) + t);
      }
    }

    const opts: FirstPlayOption[] = leaderCards.map((card) => ({
      card,
      label: CARD_NAMES[card],
      expectedTricks: (totals.get(card) ?? 0) / total,
      isOptimal: false,
    }));

    if (opts.length) {
      const max = Math.max(...opts.map((o) => o.expectedTricks));
      for (const o of opts) o.isOptimal = Math.abs(o.expectedTricks - max) < 0.005;
    }

    return opts.sort((a, b) => b.expectedTricks - a.expectedTricks);
  }

  const fromHand = firstPlayOptions(2);
  const fromDummy = firstPlayOptions(0);

  const handExpected = fromHand.length ? Math.max(...fromHand.map((o) => o.expectedTricks)) : 0;
  const dummyExpected = fromDummy.length ? Math.max(...fromDummy.map((o) => o.expectedTricks)) : 0;

  const recommendLeadFrom: "hand" | "dummy" | "equal" =
    Math.abs(handExpected - dummyExpected) < 0.005 ? "equal"
    : handExpected > dummyExpected ? "hand" : "dummy";

  return {
    expectedTricks,
    maxPossibleTricks,
    distributions,
    splitSummary,
    firstPlays: { fromHand, fromDummy, recommendLeadFrom, handExpected, dummyExpected },
  };
}
