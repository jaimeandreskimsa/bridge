"use client";

import { motion } from "framer-motion";

const CARDS = [
  { suit: "♠", label: "A", color: "text-white", rot: "-12deg", x: "8%",  y: "10%", delay: 0,    size: "w-14 h-20" },
  { suit: "♥", label: "K", color: "text-red-400", rot: "8deg",  x: "80%", y: "6%",  delay: 0.4,  size: "w-12 h-16" },
  { suit: "♦", label: "Q", color: "text-red-400", rot: "-6deg", x: "88%", y: "65%", delay: 0.8,  size: "w-11 h-15" },
  { suit: "♣", label: "J", color: "text-white",   rot: "14deg", x: "4%",  y: "68%", delay: 0.2,  size: "w-10 h-14" },
  { suit: "♠", label: "10",color: "text-white",   rot: "-3deg", x: "48%", y: "4%",  delay: 1.0,  size: "w-10 h-13" },
  { suit: "♥", label: "9", color: "text-red-400", rot: "18deg", x: "72%", y: "82%", delay: 0.6,  size: "w-9 h-12"  },
];

export function FloatingCards() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {CARDS.map((card, i) => (
        <motion.div
          key={i}
          className={`absolute ${card.size} rounded-xl border border-white/15 bg-gradient-to-br from-[#0d2040]/80 to-[#060e1c]/90 backdrop-blur-sm shadow-2xl flex flex-col items-center justify-center`}
          style={{ left: card.x, top: card.y, rotate: card.rot }}
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            y: [0, -16, 0],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: card.delay },
            y: { duration: 5 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: card.delay },
            scale: { duration: 0.8, delay: card.delay * 0.5 },
          }}
        >
          {/* Top corner */}
          <div className="absolute top-1.5 left-2 leading-none">
            <p className={`text-[10px] font-bold ${card.color}`}>{card.label}</p>
            <p className={`text-[9px] ${card.color}`}>{card.suit}</p>
          </div>
          {/* Center suit */}
          <span className={`text-2xl font-bold ${card.color} opacity-80`}>{card.suit}</span>
          {/* Bottom corner */}
          <div className="absolute bottom-1.5 right-2 leading-none rotate-180">
            <p className={`text-[10px] font-bold ${card.color}`}>{card.label}</p>
            <p className={`text-[9px] ${card.color}`}>{card.suit}</p>
          </div>
          {/* Shine */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent" />
          </div>
        </motion.div>
      ))}

      {/* Big ghosted suits */}
      {[
        { s: "♠", pos: "top-10 left-6",  size: "text-[180px]", op: "opacity-[0.025]" },
        { s: "♥", pos: "top-20 right-10", size: "text-[140px]", op: "opacity-[0.03]", red: true },
        { s: "♦", pos: "bottom-10 left-1/3", size: "text-[120px]", op: "opacity-[0.025]", red: true },
        { s: "♣", pos: "bottom-16 right-6",  size: "text-[160px]", op: "opacity-[0.02]" },
      ].map(({ s, pos, size, op, red }, i) => (
        <motion.span
          key={`bg-${i}`}
          className={`absolute ${pos} ${size} font-bold ${red ? "text-red-500" : "text-white"} ${op} leading-none`}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {s}
        </motion.span>
      ))}
    </div>
  );
}

// ── Suit ticker at top ──────────────────────────────────────────────────────
export function SuitTicker() {
  const suits = ["♠ Bridge Academy", "♥ Cursos en vivo", "♦ Mano del Día", "♣ Comunidad", "♠ Convenciones", "♥ Torneos", "♦ Ranking", "♣ Certificados"];
  const doubled = [...suits, ...suits];
  return (
    <div className="overflow-hidden border-b border-[#c9a23a]/10 bg-[#c9a23a]/5 py-2">
      <div className="animate-ticker flex gap-8 whitespace-nowrap w-max">
        {doubled.map((item, i) => (
          <span key={i} className="text-xs font-semibold text-[#c9a23a]/60 tracking-widest uppercase px-4">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
