import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
});

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ritmo-bingo.vercel.app"),
  title: {
    default: "RITMO BINGO — bingo musical en vivo para fiestas",
    template: "%s — RITMO BINGO",
  },
  description:
    "Gira la ruleta, suena un fragmento de canción y adivina el título. Bingo musical en tiempo real para jugar con amigos: cada color es un género, cada acierto llena tu cartón. Incluye música boliviana.",
  keywords: [
    "bingo musical",
    "juego de adivinar canciones",
    "bingo de música",
    "juegos para fiestas",
    "juego de música para jugar en grupo",
    "bingo con canciones",
    "música boliviana juego",
    "trivia musical",
    "juego tipo kahoot de música",
  ],
  authors: [{ name: "Cristhian Leandro Góngora Torrez" }],
  creator: "Cristhian Leandro Góngora Torrez",
  openGraph: {
    type: "website",
    locale: "es",
    url: "https://ritmo-bingo.vercel.app",
    siteName: "RITMO BINGO",
    title: "RITMO BINGO — bingo musical en vivo para fiestas",
    description:
      "Gira la ruleta, suena un fragmento y adivina la canción. Cartones de colores por género musical, en tiempo real, desde el celular. Gana la primera fila completa.",
    images: [{ url: "/og.png", width: 1280, height: 800, alt: "RITMO BINGO — bingo musical en vivo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RITMO BINGO — bingo musical en vivo para fiestas",
    description:
      "Gira la ruleta, suena un fragmento y adivina la canción. Bingo musical en tiempo real desde el celular.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
