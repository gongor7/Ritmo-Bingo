// Configuración central del juego: géneros, colores y constantes.

export type GenreId = "rock" | "cumbia" | "pop" | "boliviano" | "urbano" | "clasicos";

export interface GenreDef {
  id: GenreId;
  name: string;
  color: string; // color principal
  glow: string; // versión translúcida para halos
  ink: string; // texto sobre el color
}

// El orden define los segmentos de la ruleta (alternando colores contrastantes).
export const GENRES: GenreDef[] = [
  { id: "rock", name: "Rock", color: "#e5484d", glow: "rgba(229,72,77,.55)", ink: "#0b0b10" },
  { id: "cumbia", name: "Cumbia", color: "#ff8a1e", glow: "rgba(255,138,30,.55)", ink: "#0b0b10" },
  { id: "pop", name: "Pop", color: "#3e9bff", glow: "rgba(62,155,255,.55)", ink: "#0b0b10" },
  { id: "boliviano", name: "Boliviano", color: "#2ec27e", glow: "rgba(46,194,126,.55)", ink: "#0b0b10" },
  { id: "urbano", name: "Urbano", color: "#9a5bff", glow: "rgba(154,91,255,.55)", ink: "#0b0b10" },
  { id: "clasicos", name: "Clásicos", color: "#ffd22e", glow: "rgba(255,210,46,.55)", ink: "#0b0b10" },
];

export const GENRE_MAP: Record<string, GenreDef> = Object.fromEntries(GENRES.map((g) => [g.id, g]));

export const WILD = "wild" as const;
export type CellGenre = GenreId | typeof WILD;

export const CARD_SIZE = 5;
export const CELLS_PER_GENRE = 4; // 6 géneros x 4 = 24 celdas + comodín central

export const SPIN_SECONDS = 4.2; // duración de la animación de la ruleta
export const DEFAULT_LISTEN_SECONDS = 30;
export const LISTEN_CHOICES = [20, 30, 45];
export const PRESENCE_TIMEOUT_MS = 45_000; // se considera desconectado después de esto
export const GUESS_GRACE_MS = 1500; // tolerancia para respuestas al filo del tiempo

export const REVEAL_MIN_MS = 4000; // mínimo en pantalla de revelación antes de avanzar

export function genreOf(id: string): GenreDef | undefined {
  return GENRE_MAP[id];
}
