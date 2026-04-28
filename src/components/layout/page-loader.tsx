"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function PageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "radial-gradient(ellipse at center, #0d1f3c 0%, #060e1c 100%)" }}
        >
          {/* Outer ring */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#c9a23a]/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border border-[#c9a23a]/40 border-t-[#f0d47a]"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />

            {/* Card */}
            <motion.div
              className="w-16 h-20 rounded-xl border-2 border-[#c9a23a]/60 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] flex flex-col items-center justify-center shadow-2xl shadow-amber-900/40"
              animate={{ scale: [1, 0.9, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Top left corner */}
              <div className="absolute top-1.5 left-2 flex flex-col items-center leading-none">
                <span className="text-[#c9a23a] text-xs font-bold">A</span>
                <span className="text-[#c9a23a] text-[9px]">♠</span>
              </div>
              {/* Center suit */}
              <span className="text-4xl text-[#c9a23a] select-none leading-none">♠</span>
              {/* Bottom right corner (rotated) */}
              <div className="absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180">
                <span className="text-[#c9a23a] text-xs font-bold">A</span>
                <span className="text-[#c9a23a] text-[9px]">♠</span>
              </div>
            </motion.div>
          </div>

          {/* Brand */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <p className="text-white font-bold text-lg tracking-wide">
              Bridge<span className="text-gold-gradient">Academy</span>
            </p>
            <div className="flex justify-center gap-3 mt-2">
              {["♠", "♥", "♦", "♣"].map((s, i) => (
                <motion.span
                  key={s}
                  className={`text-sm font-bold ${i === 1 || i === 2 ? "text-red-400/60" : "text-white/30"}`}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
