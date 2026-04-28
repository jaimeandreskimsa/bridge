"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen, Zap, Users, GraduationCap, Trophy, Target,
  ChevronRight, CheckCircle2
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    suit: "♠",
    color: "from-sky-500/15 to-sky-600/5",
    iconColor: "text-sky-400",
    borderColor: "border-sky-500/20",
    title: "Cursos en video HD",
    desc: "Aprende con clases grabadas en alta calidad, materiales descargables y seguimiento de progreso detallado.",
    checks: ["Acceso de por vida", "Certificados verificables", "Subtítulos en español"],
    href: "/cursos",
  },
  {
    icon: Zap,
    suit: "♥",
    color: "from-[#c9a23a]/15 to-amber-600/5",
    iconColor: "text-[#c9a23a]",
    borderColor: "border-[#c9a23a]/20",
    title: "Mano del Día",
    desc: "Una mano nueva cada día para practicar licitación y juego. Analiza, compara y aprende con la comunidad.",
    checks: ["Análisis profundo", "Ranking diario", "Historial completo"],
    href: "/mano-del-dia",
    red: true,
  },
  {
    icon: Users,
    suit: "♦",
    color: "from-violet-500/15 to-violet-600/5",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/20",
    title: "Comunidad activa",
    desc: "Feed social, chat en tiempo real, grupos temáticos y torneos con jugadores de todo el mundo.",
    checks: ["Feed y grupos", "Chat en tiempo real", "Torneos y convenciones"],
    href: "/feed",
    red: true,
  },
  {
    icon: GraduationCap,
    suit: "♣",
    color: "from-emerald-500/15 to-emerald-600/5",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    title: "Biblioteca de convenciones",
    desc: "Documentación completa de sistemas de licitación, acuerdos y estrategias con tu compañero.",
    checks: ["Sistemas estándar", "Libreta personal", "Búsqueda avanzada"],
    href: "/convenciones",
  },
];

const bridgeStats = [
  { icon: Trophy, value: "4 palos", label: "♠ ♥ ♦ ♣", sub: "Mazo estándar de 52 cartas" },
  { icon: Target, value: "13 levadas", label: "por mano", sub: "El objetivo es hacer tu contrato" },
  { icon: Users, value: "4 jugadores", label: "2 parejas", sub: "Norte-Sur vs Este-Oeste" },
];

export function FeaturesSection() {
  return (
    <>
      {/* ── Bridge fact strip ── */}
      <section className="py-10 bg-[#060e1c]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bridgeStats.map((stat, i) => (
              <motion.div
                key={stat.value}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl border border-[#c9a23a]/15 bg-[#0a1628]/80 p-6 text-center"
              >
                <div className="absolute top-2 right-3 text-5xl font-bold text-[#c9a23a]/5 leading-none select-none">
                  {["♠", "♥", "♦"][i]}
                </div>
                <p className="text-2xl font-extrabold text-[#c9a23a] mb-0.5">{stat.value}</p>
                <p className="text-sm font-semibold text-white/70">{stat.label}</p>
                <p className="text-xs text-white/30 mt-1">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-24 bg-[#07111f]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[#c9a23a] font-semibold text-xs uppercase tracking-[0.2em] mb-3"
            >
              Por qué elegirnos
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-bold text-white mb-4"
            >
              Todo lo que necesitás en un solo lugar
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white/40 max-w-xl mx-auto text-lg"
            >
              Desde tu primera licitación hasta torneos internacionales.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={f.href}>
                  <div
                    className={`group relative overflow-hidden rounded-2xl border ${f.borderColor} bg-gradient-to-br ${f.color} p-7 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30`}
                  >
                    {/* Suit watermark */}
                    <span
                      className={`absolute top-4 right-5 text-[80px] font-bold leading-none select-none transition-transform duration-500 group-hover:scale-110 ${f.red ? "text-red-500/8" : "text-white/5"}`}
                    >
                      {f.suit}
                    </span>

                    <div className={`w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center mb-5`}>
                      <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed mb-5">{f.desc}</p>

                    <ul className="space-y-1.5 mb-5">
                      {f.checks.map((c) => (
                        <li key={c} className="flex items-center gap-2 text-xs text-white/55">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>

                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${f.iconColor} group-hover:gap-2 transition-all`}>
                      Explorar <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
