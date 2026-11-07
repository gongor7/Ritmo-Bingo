// Pruebas de la lógica core: cartones, matcher y ángulos de ruleta.
// Ejecutar: npx tsx scripts/test-core.ts

import { generateCard, winningRow, markedCount } from "../src/lib/game/card";
import { isGuessCorrect, normalize } from "../src/lib/game/matcher";
import { CARD_SIZE, CELLS_PER_GENRE, GENRES } from "../src/lib/game/config";
import { targetRotation } from "../src/components/Wheel";
import { nextTurnPlayer, connectedPlayers } from "../src/lib/game/turns";
import type { Cell, PlayerRow } from "../src/lib/game/types";

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FALLO: ${name}`);
  } else {
    console.log(`ok: ${name}`);
  }
}

// ---------- cartones ----------
for (let i = 0; i < 300; i++) {
  const card = generateCard();
  const counts = new Map<string, number>();
  card.forEach((c) => counts.set(c.g, (counts.get(c.g) ?? 0) + 1));
  const wildOk = card[12].g === "wild" && card[12].marked === true;
  const distOk = GENRES.every((g) => counts.get(g.id) === CELLS_PER_GENRE) && counts.get("wild") === 1;
  const rowsOk = Array.from({ length: CARD_SIZE }, (_, r) => {
    const row = card.slice(r * CARD_SIZE, r * CARD_SIZE + CARD_SIZE);
    const genres = row.map((c) => c.g).filter((g) => g !== "wild");
    return new Set(genres).size === genres.length;
  }).every(Boolean);
  const totalMarked = card.filter((c) => c.marked).length;
  if (!wildOk || !distOk || !rowsOk || totalMarked !== 1) {
    check(`carton ${i} válido`, false);
    break;
  }
  if (i === 299) check("300 cartones generados con reglas exactas", true);
}

// fila ganadora
const winnerCard: Cell[] = Array.from({ length: 25 }, (_, i) => ({
  g: i === 12 ? "wild" : "pop",
  marked: true,
  song: null,
  round: 1,
}));
check("fila completa detectada", winningRow(winnerCard) === 0);
// marcar una celda menos en CADA fila para que ninguna quede completa
const unmarkRows = [4, 9, 14, 19, 24];
const noWinner = winnerCard.map((c, i) => (unmarkRows.includes(i) ? { ...c, marked: false } : c));
check("fila incompleta no gana", winningRow(noWinner) === null);
check("conteo de marcas excluye comodín", markedCount(winnerCard) === 24);

// ---------- matcher ----------
const cases: Array<[string, string, boolean]> = [
  ["Bohemian Rhapsody", "bohemian rapsody", true],
  ["Bohemian Rhapsody", "bohemian rhapsody", true],
  ["La Bamba", "bamba", true],
  ["Despacito", "DESPACITO de Luis Fonsi", true],
  ["17 Años", "17 anos", true],
  ["Take On Me", "take on me", true],
  ["Gasolina", "gasolin", true],
  ["Shape of You", "shape of you - ed sheeran", true],
  ["Blinding Lights", "the weeknd blinding lights", true],
  ["Tusa", "tuzza", true],
  ["Y.M.C.A.", "ymca", true],
  ["Viva Mi Patria Bolivia", "viva mi patria", true],
  ["Cuando Florezca el Chuño", "cuando florezca el chuno", true],
  ["Gasolina", "ganga", false],
  ["Toxic", "tacsic", false],
  ["Wonderwall", "wonder", true],
  ["Hotel California", "motels", false],
  ["El Meneaito", "el menaito", true],
  ["Se Me Perdió la Cadena", "se me perdio la cadena", true],
  ["Dancing Queen", "dancing queen abba", true],
  ["Don't Stop Believin'", "dont stop believin", true],
  ["Blue (Da Ba Dee)", "blue da ba dee", true],
  ["I Don't Want to Miss a Thing", "i dont wanna miss a thing", true],
  ["Gasolina", "gasolina daddy", true],
];
for (const [title, guess, expected] of cases) {
  check(`matcher "${guess}" vs "${title}"`, isGuessCorrect(title, guess) === expected);
}
check("normaliza acentos", normalize("Chuño Años") === "chuno anos");

// ---------- ruleta ----------
for (let i = 0; i < 6; i++) {
  const rot = targetRotation(0, i);
  const seg = 360 / 6;
  const center = i * seg + seg / 2;
  const landed = (((-rot % 360) + 360) % 360 + 360) % 360; // punto bajo el puntero
  check(
    `ruleta segmento ${i} cae bajo el puntero`,
    Math.abs(((landed - center + 540) % 360) - 180) < 0.001 || Math.abs((((landed - center + 360) % 360) + 360) % 360 - 360) < 0.001 || Math.abs((landed - center + 360) % 360) < 0.001,
  );
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

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
