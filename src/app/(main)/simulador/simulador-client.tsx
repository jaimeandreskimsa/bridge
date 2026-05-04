"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  analyzeSuit,
  CARD_ORDER,
  CARD_NAMES,
  type SuitAnalysisResult,
  type FirstPlayOption,
} from "@/lib/suitplay/engine";
import { FlaskConical, Info, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Assignment = "none" | "hand" | "dummy";
type SuitSymbol = "♠" | "♥" | "♦" | "♣";

const SUITS: { symbol: SuitSymbol; label: string; textColor: string; activeClasses: string }[] = [
  { symbol: "♠", label: "Picas",     textColor: "text-slate-800",    activeClasses: "bg-[#0F1C3F] text-white border-[#0F1C3F] shadow-sm" },
  { symbol: "♥", label: "Corazones", textColor: "text-red-600",      activeClasses: "bg-red-600 text-white border-red-600 shadow-sm" },
  { symbol: "♦", label: "Diamantes", textColor: "text-red-500",      activeClasses: "bg-red-500 text-white border-red-500 shadow-sm" },
  { symbol: "♣", label: "Tréboles",  textColor: "text-slate-700",    activeClasses: "bg-slate-700 text-white border-slate-700 shadow-sm" },
];

const PRESET_EXAMPLES = [
  { label: "AKQxx / xxx",  description: "Palo sólido largo",     hand: [14, 13, 12, 5, 4], dummy: [7, 6, 3] },
  { label: "AJxx / Kxxx",  description: "Finesses doble",        hand: [14, 11, 6, 5],     dummy: [13, 7, 4, 3] },
  { label: "AQ9x / Kxx",   description: "Finesse profunda",      hand: [14, 12, 9, 4],     dummy: [13, 7, 3] },
  { label: "AKJxx / Qx",   description: "Drop vs finesse",       hand: [14, 13, 11, 5, 4], dummy: [12, 3] },
  { label: "AKxx / Jxxx",  description: "Combinación combinada", hand: [14, 13, 6, 5],     dummy: [11, 7, 4, 3] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTricks(n: number) { return n.toFixed(2); }
function percentage(p: number)   { return (p * 100).toFixed(1) + "%"; }

// ── Sub-components ────────────────────────────────────────────────────────────

function CardChip({
  card, assignment, suitTextColor, onClick,
}: {
  card: number; assignment: Assignment; suitTextColor: string; onClick: () => void;
}) {
  const styles: Record<Assignment, string> = {
    none:  "bg-slate-50 text-slate-500 border-slate-300 hover:border-slate-400 hover:text-slate-700 hover:bg-white",
    hand:  "bg-[#C9A23A]/15 text-[#7A5E1A] border-[#C9A23A] shadow-sm",
    dummy: "bg-sky-100 text-sky-800 border-sky-400 shadow-sm",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center w-10 h-12 rounded-lg border-2 font-bold text-base transition-all duration-150 select-none active:scale-95",
        styles[assignment]
      )}
      title={
        assignment === "none"
          ? "Sin asignar — click para Mano"
          : assignment === "hand"
          ? "Mano — click para Muerto"
          : "Muerto — click para quitar"
      }
    >
      <span className={cn("leading-none", assignment !== "none" && suitTextColor)}>
        {CARD_NAMES[card]}
      </span>
      {assignment !== "none" && (
        <span className={cn(
          "absolute bottom-0.5 right-1 text-[8px] font-semibold opacity-60",
          assignment === "hand" ? "text-[#9A7C28]" : "text-sky-500"
        )}>
          {assignment === "hand" ? "M" : "D"}
        </span>
      )}
    </button>
  );
}

function FirstPlayTable({ options, from }: { options: FirstPlayOption[]; from: "hand" | "dummy" }) {
  if (options.length === 0)
    return <p className="text-slate-400 text-sm italic">Sin cartas en {from === "hand" ? "mano" : "muerto"}</p>;

  const maxTricks = Math.max(...options.map((o) => o.expectedTricks || 1));

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const pct = opt.expectedTricks / maxTricks;
        return (
          <div key={opt.card} className="flex items-center gap-3">
            <span
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-bold shrink-0",
                opt.isOptimal
                  ? "bg-[#C9A23A]/10 text-[#9A7C28] border-[#C9A23A]/40"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              )}
            >
              {opt.label}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-xs font-medium", opt.isOptimal ? "text-slate-800" : "text-slate-400")}>
                  {formatTricks(opt.expectedTricks)} bazas
                </span>
                {opt.isOptimal && (
                  <span className="text-[10px] font-bold text-[#9A7C28] bg-[#C9A23A]/10 px-2 py-0.5 rounded-full border border-[#C9A23A]/20">
                    ✓ óptima
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    opt.isOptimal ? "bg-gradient-to-r from-[#C9A23A] to-[#F0D47A]" : "bg-slate-200"
                  )}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SimuladorClient() {
  const [assignments, setAssignments] = useState<Record<number, Assignment>>(() =>
    Object.fromEntries(CARD_ORDER.map((c) => [c, "none" as Assignment]))
  );
  const [suit, setSuit] = useState<SuitSymbol>("♠");
  const [result, setResult] = useState<SuitAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDistributions, setShowDistributions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suitConfig = SUITS.find((s) => s.symbol === suit)!;
  const handCards  = CARD_ORDER.filter((c) => assignments[c] === "hand");
  const dummyCards = CARD_ORDER.filter((c) => assignments[c] === "dummy");
  const ewCards    = CARD_ORDER.filter((c) => assignments[c] === "none");

  const cycleCard = useCallback((card: number) => {
    setAssignments((prev) => {
      const cur  = prev[card];
      const next: Assignment = cur === "none" ? "hand" : cur === "hand" ? "dummy" : "none";
      return { ...prev, [card]: next };
    });
    setResult(null);
    setError(null);
  }, []);

  const loadPreset = (preset: (typeof PRESET_EXAMPLES)[0]) => {
    const next: Record<number, Assignment> = {};
    for (const c of CARD_ORDER) next[c] = "none";
    for (const c of preset.hand)  next[c] = "hand";
    for (const c of preset.dummy) next[c] = "dummy";
    setAssignments(next);
    setResult(null);
    setError(null);
  };

  const resetAll = () => {
    setAssignments(Object.fromEntries(CARD_ORDER.map((c) => [c, "none" as Assignment])));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = () => {
    if (handCards.length + dummyCards.length < 2) {
      setError("Asigná al menos 2 cartas a Mano o Muerto antes de analizar.");
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      try {
        setResult(analyzeSuit(handCards, dummyCards));
      } catch (e) {
        setError("Error en el análisis. Verificá la distribución de cartas.");
        console.error(e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 20);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="mb-8 flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9A23A] to-[#9A7C28] shadow-md shadow-amber-200/60 shrink-0">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Simulador de Palo</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Análisis minimax · Todas las distribuciones E/O · Juego óptimo de ambas parejas
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left panel ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Suit selector */}
          <div className="platform-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Palo a analizar</p>
            <div className="flex gap-2">
              {SUITS.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => setSuit(s.symbol)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-150",
                    suit === s.symbol
                      ? s.activeClasses
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  )}
                >
                  <span className={cn("text-lg leading-none", suit === s.symbol ? "text-white" : s.textColor)}>
                    {s.symbol}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card picker */}
          <div className="platform-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Asignar cartas</p>
              <button onClick={resetAll} className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
                Limpiar todo
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {CARD_ORDER.map((card) => (
                <CardChip
                  key={card}
                  card={card}
                  assignment={assignments[card]}
                  suitTextColor={suitConfig.textColor}
                  onClick={() => cycleCard(card)}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-100">
              {[
                { label: "Sin asignar (E/O)", bg: "bg-white border-slate-200", text: "text-slate-400" },
                { label: "Mano  [1 click]",   bg: "bg-[#C9A23A]/10 border-[#C9A23A]/40", text: "text-[#9A7C28]" },
                { label: "Muerto  [2 clicks]", bg: "bg-sky-50 border-sky-300", text: "text-sky-600" },
              ].map((item) => (
                <span key={item.label} className={cn("flex items-center gap-1.5 text-xs", item.text)}>
                  <span className={cn("w-3 h-3 rounded border inline-block", item.bg)} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Distribution summary */}
          <div className="platform-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Distribución actual</p>
            <div className="space-y-2 font-mono text-sm">
              {[
                { label: "Mano",   cards: handCards,  labelClass: "text-[#9A7C28]",  cardClass: "text-[#C9A23A] font-bold" },
                { label: "Muerto", cards: dummyCards, labelClass: "text-sky-600",     cardClass: "text-sky-500 font-bold" },
                { label: "E / O",  cards: ewCards,    labelClass: "text-slate-400",   cardClass: "text-slate-400" },
              ].map(({ label, cards, labelClass, cardClass }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className={cn("w-14 font-sans text-xs font-semibold pt-0.5", labelClass)}>{label}</span>
                  <span>
                    {cards.length > 0
                      ? cards.map((c) => (
                          <span key={c} className={cn("mr-1", cardClass)}>{CARD_NAMES[c]}</span>
                        ))
                      : <span className="text-slate-300 font-sans font-normal italic text-xs">sin cartas</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Preset examples */}
          <div className="platform-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Ejemplos clásicos</p>
              <Info className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => loadPreset(ex)}
                  className="text-left px-3.5 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-[#C9A23A]/40 hover:bg-[#C9A23A]/5 transition-all group"
                >
                  <span className="block text-sm font-mono font-semibold text-slate-700 group-hover:text-[#9A7C28] transition-colors">
                    {ex.label}
                  </span>
                  <span className="block text-xs text-slate-400 group-hover:text-slate-500 transition-colors mt-0.5">
                    {ex.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]",
              isAnalyzing
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#C9A23A] to-[#9A7C28] text-white shadow-md shadow-amber-200/60 hover:opacity-95 hover:shadow-lg"
            )}
          >
            {isAnalyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                Analizando distribuciones…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analizar combinación
              </>
            )}
          </button>
        </div>

        {/* ── Right panel: results ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Empty state */}
          {!result && !isAnalyzing && (
            <div className="platform-card p-10 text-center">
              <div className={cn("text-5xl mb-4 opacity-10", suitConfig.textColor)}>{suit}</div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Asigná las cartas y presioná{" "}
                <span className="text-slate-600 font-semibold">Analizar</span>{" "}
                para ver el análisis óptimo.
              </p>
            </div>
          )}

          {/* Loading state */}
          {isAnalyzing && (
            <div className="platform-card p-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-10 border-2 border-[#C9A23A]/20 border-t-[#C9A23A] rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 text-sm">Calculando todas las distribuciones posibles…</p>
            </div>
          )}

          {/* Results */}
          {result && !isAnalyzing && (
            <>
              {/* Expected tricks score */}
              <div className="platform-card p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Resultado esperado
                </p>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-5xl font-extrabold text-slate-900 tabular-nums leading-none">
                    {formatTricks(result.expectedTricks)}
                  </span>
                  <span className="text-slate-400 text-sm mb-1">/ {result.maxPossibleTricks} bazas</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C9A23A] to-[#F0D47A] transition-all duration-500"
                    style={{ width: `${(result.expectedTricks / result.maxPossibleTricks) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  {percentage(result.expectedTricks / result.maxPossibleTricks)} de eficiencia · defensa óptima
                </p>
              </div>

              {/* Lead recommendation */}
              <div className="platform-card p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  ¿Desde dónde jugar?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: "Mano",   key: "hand"  as const, val: result.firstPlays.handExpected,  accent: "gold"  },
                    { label: "Muerto", key: "dummy" as const, val: result.firstPlays.dummyExpected, accent: "sky"   },
                  ] as const).map(({ label, key, val, accent }) => {
                    const isRec = result.firstPlays.recommendLeadFrom === key ||
                                  result.firstPlays.recommendLeadFrom === "equal";
                    const isEqual = result.firstPlays.recommendLeadFrom === "equal";
                    return (
                      <div
                        key={key}
                        className={cn(
                          "rounded-xl border p-3.5 text-center transition-all",
                          isRec && !isEqual
                            ? accent === "gold"
                              ? "border-[#C9A23A]/40 bg-[#C9A23A]/6"
                              : "border-sky-200 bg-sky-50"
                            : "border-slate-100 bg-slate-50"
                        )}
                      >
                        <p className={cn(
                          "text-2xl font-extrabold tabular-nums",
                          isRec && !isEqual
                            ? accent === "gold" ? "text-[#9A7C28]" : "text-sky-700"
                            : "text-slate-500"
                        )}>
                          {formatTricks(val)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                        {isRec && !isEqual && (
                          <p className={cn(
                            "text-[10px] font-bold mt-1.5",
                            accent === "gold" ? "text-[#9A7C28]" : "text-sky-600"
                          )}>
                            RECOMENDADO
                          </p>
                        )}
                        {isEqual && (
                          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">EQUIVALENTE</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* First plays from hand */}
              {result.firstPlays.fromHand.length > 0 && (
                <div className="platform-card p-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Primera jugada · Mano
                  </p>
                  <FirstPlayTable options={result.firstPlays.fromHand} from="hand" />
                </div>
              )}

              {/* First plays from dummy */}
              {result.firstPlays.fromDummy.length > 0 && (
                <div className="platform-card p-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Primera jugada · Muerto
                  </p>
                  <FirstPlayTable options={result.firstPlays.fromDummy} from="dummy" />
                </div>
              )}

              {/* Split distribution (collapsible) */}
              <div className="platform-card overflow-hidden">
                <button
                  onClick={() => setShowDistributions(!showDistributions)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Distribución E/O · {ewCards.length} cartas
                  </p>
                  {showDistributions
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showDistributions && (
                  <div className="px-5 pb-5 space-y-2 border-t border-slate-100">
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">
                      <span>Reparto</span>
                      <span className="text-right">Prob.</span>
                      <span className="text-right">Bazas</span>
                      <span />
                    </div>
                    {result.splitSummary.map((s) => (
                      <div key={`${s.eastCount}-${s.westCount}`} className="grid grid-cols-4 gap-2 text-xs items-center">
                        <span className="text-slate-600 font-mono font-semibold">{s.eastCount}-{s.westCount}</span>
                        <span className="text-right text-slate-400">{percentage(s.probability)}</span>
                        <span className="text-right text-slate-700 font-semibold">{formatTricks(s.avgTricks)}</span>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C9A23A] to-[#F0D47A]"
                            style={{ width: `${(s.avgTricks / result.maxPossibleTricks) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-300 pt-2 border-t border-slate-100">
                      {result.distributions.length} distribuciones analizadas
                    </p>
                  </div>
                )}
              </div>

              {/* Interpretation note */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-500">Cómo leer el resultado:</strong>{" "}
                  el número de bazas esperadas es el promedio ponderado contra <em>todas</em> las
                  distribuciones posibles del adversario, con juego óptimo de ambos lados.{" "}
                  <strong className="text-slate-600">{formatTricks(result.expectedTricks)} bazas</strong> significa
                  que jugando correctamente ganarás ese promedio en el largo plazo.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
