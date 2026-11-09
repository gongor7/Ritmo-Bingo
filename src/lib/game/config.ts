// Configuración central del juego: géneros, colores y constantes.

export type GenreId =
  | "rock"
  | "cumbia"
  | "pop"
  | "boliviano"
  | "urbano"
  | "clasicos"
  | "salsa"
  | "baladas"
  | "rock-es"
  | "electronica";

export interface GenreDef {
  id: GenreId;
  name: string;
  color: string; // color principal
  glow: string; // versión translúcida para halos
  ink: string; // texto sobre el color
}

// Catálogo completo. El host elige 3-5 para cada partida; el orden de esta
// lista define el orden de los segmentos de la ruleta.
export const ALL_GENRES: GenreDef[] = [
  { id: "rock", name: "Rock", color: "#e5484d", glow: "rgba(229,72,77,.55)", ink: "#0b0b10" },
  { id: "cumbia", name: "Cumbia", color: "#ff8a1e", glow: "rgba(255,138,30,.55)", ink: "#0b0b10" },
  { id: "pop", name: "Pop", color: "#3e9bff", glow: "rgba(62,155,255,.55)", ink: "#0b0b10" },
  { id: "boliviano", name: "Boliviano", color: "#2ec27e", glow: "rgba(46,194,126,.55)", ink: "#0b0b10" },
  { id: "urbano", name: "Urbano", color: "#9a5bff", glow: "rgba(154,91,255,.55)", ink: "#0b0b10" },
  { id: "clasicos", name: "Clásicos", color: "#ffd22e", glow: "rgba(255,210,46,.55)", ink: "#0b0b10" },
  { id: "salsa", name: "Salsa", color: "#ec4899", glow: "rgba(236,72,153,.55)", ink: "#0b0b10" },
  { id: "baladas", name: "Baladas", color: "#14b8a6", glow: "rgba(20,184,166,.55)", ink: "#0b0b10" },
  { id: "rock-es", name: "Rock en Español", color: "#a3e635", glow: "rgba(163,230,53,.55)", ink: "#0b0b10" },
  { id: "electronica", name: "Electrónica", color: "#f4f2ec", glow: "rgba(244,242,236,.45)", ink: "#0b0b10" },
];

export const GENRE_MAP: Record<string, GenreDef> = Object.fromEntries(ALL_GENRES.map((g) => [g.id, g]));

// Géneros por defecto de una sala nueva (los clásicos del juego).
export const DEFAULT_GENRES: GenreId[] = ["rock", "cumbia", "pop", "boliviano", "urbano"];

export const MIN_GENRES = 3;
export const MAX_GENRES = 5;

/** Devuelve los géneros pedidos en el orden canónico del catálogo. */
export function genresByIds(ids: string[]): GenreDef[] {
  const set = new Set(ids);
  return ALL_GENRES.filter((g) => set.has(g.id));
}

/** Valida una selección del host: 3-5 géneros existentes, sin repetir. */
export function validGenreSelection(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length >= MIN_GENRES &&
    ids.length <= MAX_GENRES &&
    new Set(ids).size === ids.length &&
    ids.every((id) => typeof id === "string" && GENRE_MAP[id])
  );
}

export const WILD = "wild" as const;
export type CellGenre = GenreId | typeof WILD;

export const CARD_SIZE = 5;
export const SPIN_SECONDS = 4.2; // duración de la animación de la ruleta

export type GuessMode = "titulo" | "artista" | "ambos";
export const GUESS_MODES: GuessMode[] = ["titulo", "artista", "ambos"];
export const GUESS_MODE_LABEL: Record<GuessMode, string> = {
  titulo: "adivina el TÍTULO",
  artista: "adivina el ARTISTA",
  ambos: "vale el TÍTULO o el ARTISTA",
};

export const DEFAULT_LISTEN_SECONDS = 30;
export const LISTEN_CHOICES = [20, 30, 45];
export const PRESENCE_TIMEOUT_MS = 45_000; // se considera desconectado después de esto
export const GUESS_GRACE_MS = 1500; // tolerancia para respuestas al filo del tiempo

export const REVEAL_MIN_MS = 4000; // mínimo en pantalla de revelación antes de avanzar

export function genreOf(id: string): GenreDef | undefined {
  return GENRE_MAP[id];
}
