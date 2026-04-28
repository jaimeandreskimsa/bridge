import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bridge Academy",
    short_name: "Bridge",
    description: "Plataforma de aprendizaje de bridge online en español. Cursos, comunidad y práctica diaria.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a1628",
    theme_color: "#0a1628",
    categories: ["education", "games"],
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Mano del Día",
        short_name: "Mano",
        url: "/mano-del-dia",
        description: "Ver la mano del día",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Mis Cursos",
        short_name: "Cursos",
        url: "/cursos",
        description: "Ver mis cursos de bridge",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
    ],
  };
}
