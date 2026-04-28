import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Bridge Academy — Plataforma de Aprendizaje de Bridge",
    template: "%s | Bridge Academy",
  },
  description:
    "El lugar de referencia para aprender bridge online en español. Cursos en video, comunidad de nicho, manos interactivas y profesores certificados.",
  keywords: ["bridge", "cartas", "aprendizaje", "cursos", "online", "español"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Bridge Academy",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bridge Academy",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
