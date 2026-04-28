"use client";

import { motion } from "framer-motion";

const HAND = [
  { rank: "A",  suit: "♠", color: "text-white" },
  { rank: "K",  suit: "♠", color: "text-white" },
  { rank: "Q",  suit: "♥", color: "text-red-400" },
  { rank: "J",  suit: "♥", color: "text-red-400" },
  { rank: "10", suit: "♦", color: "text-red-400" },
  { rank: "9",  suit: "♦", color: "text-red-400" },
  { rank: "8",  suit: "♣", color: "text-white" },
];

const ROTATIONS = [-24, -16, -8, 0, 8, 16, 24];

export function HandPreview() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Dealer table surface */}
      <div
        className="absolute inset-6 rounded-3xl"
        style={{
          background: "radial-gradient(ellipse at center, #1a4a2e 0%, #0d2a1a 60%, #071510 100%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.04)",
        }}
      />
      {/* Table ring */}
      <div
        className="absolute inset-8 rounded-[22px] border border-white/5"
        style={{ boxShadow: "inset 0 0 30px rgba(0,0,0,0.3)" }}
      />

      {/* Bidding box decoration */}
      <div className="absolute top-10 left-10 grid grid-cols-4 gap-1 opacity-50">
        {["♣", "♦", "♥", "♠", "NT", "P", "X", "XX"].map((b, i) => (
          <div
            key={b}
            className="w-7 h-7 rounded border border-white/10 bg-white/5 flex items-center justify-center"
          >
            <span
              className={`text-[9px] font-bold ${
                b === "♥" || b === "♦" ? "text-red-400" : "text-white/60"
              }`}
            >
              {b}
            </span>
          </div>
        ))}
      </div>

      {/* Fan of cards */}
      <div className="relative flex items-end justify-center" style={{ width: 240, height: 160 }}>
        {HAND.map((card, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 origin-bottom"
            style={{ rotate: ROTATIONS[i] }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl border border-white/20"
              style={{
                width: 64,
                height: 90,
                background: "linear-gradient(135deg, #f8f5ee 0%, #ede8e0 100%)",
              }}
            >
              {/* Top left */}
              <div className="absolute top-1.5 left-2 leading-tight">
                <p className={`text-xs font-extrabold ${card.color.replace("text-white", "text-gray-900").replace("text-red-400", "text-red-600")}`}>
                  {card.rank}
                </p>
                <p className={`text-[10px] ${card.color.replace("text-white", "text-gray-900").replace("text-red-400", "text-red-600")}`}>
                  {card.suit}
                </p>
              </div>
              {/* Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${card.color.replace("text-white", "text-gray-800").replace("text-red-400", "text-red-500")}`}>
                  {card.suit}
                </span>
              </div>
              {/* Bottom right (rotated) */}
              <div className="absolute bottom-1.5 right-2 leading-tight rotate-180">
                <p className={`text-xs font-extrabold ${card.color.replace("text-white", "text-gray-900").replace("text-red-400", "text-red-600")}`}>
                  {card.rank}
                </p>
                <p className={`text-[10px] ${card.color.replace("text-white", "text-gray-900").replace("text-red-400", "text-red-600")}`}>
                  {card.suit}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current bid bubble */}
      <motion.div
        className="absolute bottom-10 right-10 bg-[#c9a23a]/20 border border-[#c9a23a]/30 rounded-2xl px-4 py-2.5 backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1 font-medium">Contrato</p>
        <p className="text-xl font-extrabold text-[#c9a23a]">3♠</p>
        <p className="text-[10px] text-white/30">Norte declarante</p>
      </motion.div>

      {/* Compass labels */}
      {[
        { label: "N", pos: "top-6 left-1/2 -translate-x-1/2" },
        { label: "S", pos: "bottom-6 left-1/2 -translate-x-1/2" },
        { label: "E", pos: "right-6 top-1/2 -translate-y-1/2" },
        { label: "O", pos: "left-6 top-1/2 -translate-y-1/2" },
      ].map(({ label, pos }) => (
        <span
          key={label}
          className={`absolute ${pos} text-[10px] font-bold text-white/15`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
