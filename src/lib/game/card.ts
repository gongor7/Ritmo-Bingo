// Generador de cartones 5x5 para la selección de géneros del host (3-5 géneros).
//
// Reglas del diseño:
//  - 24 celdas de género + 1 comodín central pre-marcado (espacio libre).
//  - Reparto lo más parejo posible entre los géneros elegidos (24/G, los
//    sobrantes van a los primeros géneros).
//  - Dentro de cada fila se evita repetir color; con 3 o 4 géneros es
//    inevitable repetir en una fila de 5, así que se reparte alternando.
//  - Victoria = completar una fila (el comodín cuenta).

import { CARD_SIZE, GENRE_MAP, WILD, type GenreId } from "./config";
import type { Cell } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRows(genres: GenreId[]): GenreId[][] | null {
  const counts = new Map<GenreId, number>();
  const base = Math.floor(24 / genres.length);
  let extra = 24 - base * genres.length;
  for (const g of genres) {
    counts.set(g, base + (extra-- > 0 ? 1 : 0));
  }

  const rowSizes = [5, 5, 4, 5, 5]; // la fila 2 lleva el comodín
  const rows: GenreId[][] = [];

  for (const size of rowSizes) {
    const row: GenreId[] = [];
    for (let pos = 0; pos < size; pos++) {
      // candidatos: géneros con cupo, que no estén ya en la fila;
      // si no hay (pocos géneros), permitir repetido pero no pegado.
      let candidates = genres.filter((g) => (counts.get(g) ?? 0) > 0 && !row.includes(g));
      if (candidates.length === 0) {
        candidates = genres.filter((g) => (counts.get(g) ?? 0) > 0 && (row.length === 0 || row[row.length - 1] !== g));
      }
      if (candidates.length === 0) return null; // atascado: reintentar todo
      // prioridad: el que más cupo le queda (reparto parejo), con azar
      const maxLeft = Math.max(...candidates.map((g) => counts.get(g) ?? 0));
      const best = candidates.filter((g) => counts.get(g) === maxLeft);
      const pick = best[Math.floor(Math.random() * best.length)];
      row.push(pick);
      counts.set(pick, (counts.get(pick) ?? 0) - 1);
    }
    rows.push(row);
  }
  return rows;
}

export function generateCard(genres: GenreId[]): Cell[] {
  const valid = genres.filter((g) => GENRE_MAP[g]);
  if (valid.length < 2) throw new Error("card-generation-failed: se necesitan al menos 2 géneros");

  for (let attempt = 0; attempt < 200; attempt++) {
    const rows = buildRows(shuffle(valid));
    if (!rows) continue;

    const cells: Cell[] = [];
    for (let r = 0; r < CARD_SIZE; r++) {
      for (let c = 0; c < CARD_SIZE; c++) {
        if (r === 2 && c === 2) {
          cells.push({ g: WILD, marked: true, song: null, round: null });
        } else {
          // la fila del comodín tiene 4 géneros: saltan la columna central
          const gi = r === 2 && c > 2 ? c - 1 : c;
          cells.push({ g: rows[r][gi], marked: false, song: null, round: null });
        }
      }
    }
    return cells;
  }
  // Camino teóricamente inalcanzable; fallback determinista válido.
  throw new Error("card-generation-failed");
}

// ¿Hay alguna fila completamente marcada? (el comodín ya viene marcado)
export function winningRow(card: Cell[]): number | null {
  for (let r = 0; r < CARD_SIZE; r++) {
    let complete = true;
    for (let c = 0; c < CARD_SIZE; c++) {
      if (!card[r * CARD_SIZE + c].marked) {
        complete = false;
        break;
      }
    }
    if (complete) return r;
  }
  return null;
}

export function markedCount(card: Cell[]): number {
  return card.filter((c) => c.marked && c.g !== WILD).length;
}
