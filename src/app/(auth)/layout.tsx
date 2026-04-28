import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Acceso | Bridge Academy",
    template: "%s | Bridge Academy",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0f2340]">
      {/* Bridge suits pattern background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ctext x='10' y='30' font-size='22' fill='white'%3E♠%3C/text%3E%3Ctext x='50' y='30' font-size='22' fill='white'%3E♥%3C/text%3E%3Ctext x='10' y='70' font-size='22' fill='white'%3E♦%3C/text%3E%3Ctext x='50' y='70' font-size='22' fill='white'%3E♣%3C/text%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Radial glow in the centre */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(45,82,130,0.55) 0%, transparent 70%)",
        }}
      />

      {/* Content card */}
      <div className="relative z-10 flex w-full flex-col items-center px-4 py-10">
        {/* Logo */}
        <a
          href="/"
          className="mb-8 flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-lg backdrop-blur-sm">
            <span className="text-2xl leading-none select-none">♠</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Bridge<span className="text-sky-300">Academy</span>
          </span>
        </a>

        {children}

        <p className="mt-8 text-xs text-white/30">
          © {new Date().getFullYear()} Bridge Academy. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
