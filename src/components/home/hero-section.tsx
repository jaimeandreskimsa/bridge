"use client";

import { motion, type Transition } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  studentCount: number;
  courseCount: number;
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut", delay } as Transition,
});

export function HeroSection({ studentCount }: HeroSectionProps) {
  return (
    <div className="relative z-10">
      {/* Badge */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#c9a23a]/25 bg-[#c9a23a]/10 px-4 py-1.5 text-sm text-[#c9a23a] font-medium backdrop-blur-sm">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          La plataforma #1 de bridge en español
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        {...fadeUp(0.12)}
        className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6"
      >
        Domina el bridge
        <br />
        <span className="text-gold-gradient">a tu ritmo</span>
      </motion.h1>

      <motion.p
        {...fadeUp(0.24)}
        className="text-lg text-white/55 max-w-lg mb-10 leading-relaxed"
      >
        Cursos en video HD, manos interactivas diarias y la comunidad hispanohablante más activa.
        Del principiante al experto.
      </motion.p>

      {/* CTAs */}
      <motion.div {...fadeUp(0.36)} className="flex flex-wrap gap-3 mb-12">
        <Link href="/registro">
          <Button
            size="lg"
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#c9a23a] to-[#9a7c28] hover:opacity-90 text-white font-bold shadow-xl shadow-amber-900/30 transition-all"
          >
            Empezar gratis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        <Link href="/cursos">
          <Button
            size="lg"
            variant="ghost"
            className="h-12 px-6 rounded-xl text-white/70 hover:text-white hover:bg-white/8 border border-white/10"
          >
            Ver cursos
          </Button>
        </Link>
      </motion.div>

      {/* Social proof */}
      <motion.div {...fadeUp(0.48)} className="flex items-center gap-4">
        <div className="flex -space-x-2.5">
          {["J", "M", "C", "R", "A"].map((l, i) => (
            <div
              key={l}
              className="w-9 h-9 rounded-full border-2 border-[#0a1628] flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{
                background: `hsl(${220 + i * 25}, 60%, 40%)`,
                zIndex: 5 - i,
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <div>
          <div className="flex gap-0.5 mb-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-[#c9a23a] text-xs">★</span>
            ))}
          </div>
          <p className="text-xs text-white/45">
            <span className="text-white font-semibold">{studentCount.toLocaleString()}+</span> alumnos activos
          </p>
        </div>
      </motion.div>
    </div>
  );
}

