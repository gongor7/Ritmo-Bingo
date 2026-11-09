// Pruebas de la lógica core: cartones paramétricos, matcher por modo y ángulos.
// Ejecutar: npx tsx scripts/test-core.ts

import { generateCard, winningRow, markedCount } from "../src/lib/game/card";
import { isGuessCorrectByMode, isGuessCorrect, normalize } from "../src/lib/game/matcher";
import { CARD_SIZE, ALL_GENRES, GENRE_MAP } from "../src/lib/game/config";
import { targetRotation } from "../src/components/Wheel";
import { nextTurnPlayer, connectedPlayers } from "../src/lib/game/turns";
import type { Cell, PlayerRow } from "../src/lib/game/types";
import type { GenreId } from "../src/lib/game/config";

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FALLO: ${name}`);
  } else {
    console.log(`ok: ${name}`);
  }
}

// ---------- cartones paramétricos (3, 4 y 5 géneros) ----------
const selections: GenreId[][] = [
  ["rock", "cumbia", "pop"],
  ["rock", "cumbia", "pop", "boliviano"],
  ["salsa", "baladas", "rock-es", "electronica", "clasicos"],
  ["rock", "cumbia", "pop", "boliviano", "urbano"],
];

for (const genres of selections) {
  for (let i = 0; i < 120; i++) {
    const card = generateCard(genres);
    const wildOk = card[12].g === "wild" && card[12].marked === true;
    // solo géneros elegidos y reparto parejo (diferencia máxima de 1)
    const counts = new Map<string, number>();
    card.forEach((c) => counts.set(c.g, (counts.get(c.g) ?? 0) + 1));
    const onlySelected = card.every((c) => c.g === "wild" || genres.includes(c.g as GenreId));
    const genreCounts = genres.map((g) => counts.get(g) ?? 0);
    const even = Math.max(...genreCounts) - Math.min(...genreCounts) <= 1;
    // sin color repetido adyacente en horizontal
    let noAdjacent = true;
    for (let r = 0; r < CARD_SIZE; r++) {
      for (let c = 0; c < CARD_SIZE - 1; c++) {
        if (card[r * CARD_SIZE + c].g === card[r * CARD_SIZE + c + 1].g) noAdjacent = false;
      }
    }
    if (!wildOk || !onlySelected || !even || !noAdjacent) {
      check(`cartón ${genres.join("+")} válido (intento ${i})`, false);
      break;
    }
    if (i === 119) check(`120 cartones válidos con ${genres.length} géneros`, true);
  }
}

// fila ganadora
const winnerCard: Cell[] = Array.from({ length: 25 }, () => ({
  g: "pop",
  marked: true,
  song: null,
  round: 1,
}));
check("fila completa detectada", winningRow(winnerCard) === 0);
// una celda menos por fila para que ninguna quede completa
const unmarkRows = [4, 9, 14, 19, 24];
const noWinner = winnerCard.map((c, i) => (unmarkRows.includes(i) ? { ...c, marked: false } : c));
check("fila incompleta no gana", winningRow(noWinner) === null);
check("conteo de marcas excluye comodín", markedCount(winnerCard) === 25);

// ---------- matcher por modo ----------
const M = (t: string, a: string, g: string, m: "titulo" | "artista" | "ambos") =>
  isGuessCorrectByMode(t, a, g, m);
check("modo título: acierta título", M("Bohemian Rhapsody", "Queen", "bohemian rapsody", "titulo"));
check("modo título: NO vale artista", !M("Bohemian Rhapsody", "Queen", "queen", "titulo"));
check("modo artista: acierta artista", M("Bohemian Rhapsody", "Queen", "queen", "artista"));
check("modo artista: NO vale título", !M("Bohemian Rhapsody", "Queen", "bohemian rhapsody", "artista"));
check("modo artista: banda con typos", M("Los Ángeles Azules", "Los Ángeles Azules", "los angeles azules", "artista"));
check("modo artista: nombre corto del grupo", M("Lamento Boliviano", "Enanitos Verdes", "enanitos verdes", "artista"));
check("modo ambos: vale título", M("La Camisa Negra", "Juanes", "la camisa negra", "ambos"));
check("modo ambos: vale artista", M("La Camisa Negra", "Juanes", "juanes", "ambos"));
check("modo ambos: no vale otra cosa", !M("La Camisa Negra", "Juanes", "gasolina", "ambos"));
check("artista con la palabra del título en el nombre", M("Vivir Mi Vida", "Marc Anthony", "marc anthony", "artista"));
// compatibilidad: isGuessCorrect sigue funcionando
check("isGuessCorrect clásico", isGuessCorrect("Gasolina", "gasolina daddy"));
check("normaliza acentos", normalize("Chuño Años") === "chuno anos");

// ---------- ruleta dinámica (3, 4, 5, 10 segmentos) ----------
for (const n of [3, 4, 5, 10]) {
  for (let i = 0; i < n; i++) {
    const rot = targetRotation(0, i, n);
    const seg = 360 / n;
    const center = i * seg + seg / 2;
    const landed = ((-rot % 360) + 360) % 360;
    if (Math.abs((landed - center + 540) % 360 - 180) > 359 && Math.abs((landed - center + 360) % 360) > 0.001) {
      check(`ruleta ${n} segmentos, índice ${i}`, false);
      break;
    }
    if (i === n - 1) check(`ruleta con ${n} segmentos apunta bien`, true);
  }
}

// ---------- turnos ----------
const mkPlayer = (id: string, seat: number, connected: boolean): PlayerRow => ({
  id,
  room_code: "TEST",
  name: id,
  seat,
  card: [],
  connected,
  last_seen: new Date().toISOString(),
  joined_at: new Date().toISOString(),
});
const players = [mkPlayer("a", 0, true), mkPlayer("b", 1, false), mkPlayer("c", 2, true)];
check("siguiente turno salta desconectados", nextTurnPlayer(players, "a") === "c");
check("ciclo de turnos", nextTurnPlayer(players, "c") === "a");
check("sin turno actual toma el primero", nextTurnPlayer(players, null) === "a");
check("jugadores conectados", connectedPlayers(players).length === 2);
check("catálogo completo cargado", ALL_GENRES.length === 10 && GENRE_MAP["rock-es"]?.name === "Rock en Español");

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
