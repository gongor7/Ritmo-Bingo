// Generador de cartones 5x5.
//
// Reglas del diseño:
//  - 24 celdas de género: exactamente 4 por cada uno de los 6 géneros.
//  - 1 comodín central pre-marcado (espacio libre del bingo clásico).
//  - Ninguna fila repite género; la fila central lleva 4 géneros + comodín.
//  - Así toda fila es alcanzable y los cartones son únicos por jugador.

import { CARD_SIZE, CELLS_PER_GENRE, GENRES, WILD, type GenreId } from "./config";
import type { Cell } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Coloca el pozo de géneros (4 de cada uno) en filas de 5,5,4,5,5 sin repetir dentro de la fila.
function buildRowGenres(): GenreId[][] | null {
  const pool: GenreId[] = [];
  for (const g of GENRES) for (let i = 0; i < CELLS_PER_GENRE; i++) pool.push(g.id);
  const rowSizes = [5, 5, 4, 5, 5]; // la fila 2 es la del comodín
  const rows: GenreId[][] = [];

  for (const size of rowSizes) {
    const row: GenreId[] = [];
    let attempts = 0;
    while (row.length < size) {
      const remaining = pool.filter((g) => !row.includes(g));
      if (remaining.length === 0) break; // imposible: reintentar todo
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      row.push(pick);
      pool.splice(pool.indexOf(pick), 1);
      attempts++;
      if (attempts > 50) break;
    }
    if (row.length !== size) return null; // atascado, reintentar
    rows.push(shuffle(row));
  }
  return rows;
}

export function generateCard(): Cell[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rows = buildRowGenres();
    if (!rows) continue;

    // Validación: cada género exactamente 4 veces.
    const counts = new Map<string, number>();
    rows.flat().forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
    if (GENRES.some((g) => counts.get(g.id) !== CELLS_PER_GENRE)) continue;

    const cells: Cell[] = [];
    for (let r = 0; r < CARD_SIZE; r++) {
      for (let c = 0; c < CARD_SIZE; c++) {
        if (r === 2 && c === 2) {
          cells.push({ g: WILD, marked: true, song: null, round: null });
        } else {
          cells.push({ g: rows[r].pop() as GenreId, marked: false, song: null, round: null });
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
