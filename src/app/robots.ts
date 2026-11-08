import type { MetadataRoute } from "next";

// Solo la portada es indexable: las salas y pantallas de juego son privadas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/host/", "/play", "/api/"],
    },
    sitemap: "https://ritmo-bingo.vercel.app/sitemap.xml",
  };
}
