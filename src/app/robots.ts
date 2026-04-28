import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bridgeacademy.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cursos", "/convenciones", "/mano-del-dia", "/ranking", "/grupos", "/verificar"],
        disallow: ["/admin", "/api", "/perfil/libreta", "/chat"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
