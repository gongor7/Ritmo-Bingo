// Partida completa automatizada contra la API local.
// Uso: node scripts/play-full-game.mjs
// Lee SUPABASE_URL y SUPABASE_SECRET de .env.local para leer el estado authoritative.

import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ---- cargar .env.local
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_SECRET = env.SUPABASE_SERVICE_ROLE_KEY;

async function roomRow(code) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rooms?code=eq.${code}&select=*`, {
    headers: { apikey: SUPA_SECRET, Authorization: `Bearer ${SUPA_SECRET}` },
  });
  return (await res.json())[0];
}

async function playerRow(code, id) {
  const res = await fetch(`${SUPA_URL}/rest/v1/players?id=eq.${id}&select=*`, {
    headers: { apikey: SUPA_SECRET, Authorization: `Bearer ${SUPA_SECRET}` },
  });
  return (await res.json())[0];
}

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${data?.error ?? "?"}`);
  return data;
}

const log = (...a) => console.log(...a);

// ---------- crear sala y jugadores
const room = await api("/api/rooms", { listenSeconds: 20 });
const code = room.code;
const secret = room.hostSecret;
log(`sala ${code} creada`);

const ana = await api(`/api/rooms/${code}/join`, { name: "Ana" });
const beto = await api(`/api/rooms/${code}/join`, { name: "Beto" });
log("Ana y Beto entraron");

await api(`/api/rooms/${code}/action`, { action: "start", secret });
let st = await roomRow(code);
if (st.status !== "playing" || st.round !== 1) throw new Error("la partida no arrancó");
log("partida iniciada, turno:", (await playerRow(code, st.turn_player_id)).name);

const players = [
  { id: ana.playerId, name: ana.name, card: ana.card, rowTarget: 0 },
  { id: beto.playerId, name: beto.name, card: beto.card, rowTarget: 1 },
];
let nobodyRounds = 0;
let winner = null;

for (let round = 1; round <= 50 && !winner; round++) {
  st = await roomRow(code);
  // latidos de presencia (como haría el celular de cada jugador)
  for (const p of players) {
    await api(`/api/rooms/${code}/action`, { action: "heartbeat", playerId: p.id });
  }
  const turnIdx = players.findIndex((p) => p.id === st.turn_player_id);
  if (turnIdx === -1) throw new Error(`turno perdido: ${JSON.stringify(st.turn_player_id)}`);
  const turn = players[turnIdx];

  // girar
  const spin = await api(`/api/rooms/${code}/action`, { action: "spin", playerId: turn.id });
  const color = spin.color;
  const title = spin.song.title;
  log(`ronda ${round}: ${turn.name} giró -> ${color} | "${title}"`);

  // una de cada tres rondas: nadie responde
  if (round % 3 === 0) {
    const reveal = await api(`/api/rooms/${code}/action`, { action: "reveal", secret });
    if (reveal.correctCount !== 0) throw new Error("había respuestas cuando no debía");
    await api(`/api/rooms/${code}/action`, { action: "next", secret });
    nobodyRounds++;
    log(`  (nadie adivinó, se pasa)`);
    continue;
  }

  // todos responden el título correcto
  for (const p of players) {
    await api(`/api/rooms/${code}/action`, { action: "guess", playerId: p.id, text: title });
  }

  // revelar y mandar a marcar
  const reveal = await api(`/api/rooms/${code}/action`, { action: "reveal", secret });
  if (reveal.correctCount !== players.length) throw new Error("el matcher no validó a todos");
  await api(`/api/rooms/${code}/action`, { action: "tomark", secret });

  // cada validado marca: Ana completa la fila 0, Beto la fila 1
  for (const p of players) {
    const fresh = await playerRow(code, p.id);
    const cells = fresh.card;
    const candidates = cells
      .map((c, i) => ({ c, i }))
      .filter(
        ({ c, i }) =>
          c.g === color &&
          !c.marked &&
          (p.rowTarget === Math.floor(i / 5) || !cells.some((cc, j) => cc.g === color && !cc.marked && p.rowTarget === Math.floor(j / 5))),
      );
    const pick =
      candidates.find(({ i }) => p.rowTarget === Math.floor(i / 5)) ?? candidates[0];
    if (!pick) throw new Error(`${p.name} no tiene celda ${color} disponible`);
    const res = await api(`/api/rooms/${code}/action`, {
      action: "mark",
      playerId: p.id,
      cellIndex: pick.i,
    });
    if (res.won) {
      winner = p;
      log(`  ${p.name} marcó la celda ${pick.i} y COMPLETÓ FILA`);
      break;
    }
    log(`  ${p.name} marcó celda ${pick.i} (${color})`);
  }
}

if (!winner) throw new Error("nadie ganó en 50 rondas");
st = await roomRow(code);
if (st.status !== "finished" || st.winner_id !== winner.id) throw new Error("estado final incorrecto");

// ---------- revancha
await api(`/api/rooms/${code}/action`, { action: "rematch", secret });
st = await roomRow(code);
const freshAna = await playerRow(code, winner.id);
const marks = freshAna.card.filter((c) => c.marked && c.g !== "wild").length;
if (st.round !== 1 || marks !== 0) throw new Error("la revancha no reinició los cartones");

log(`\nPARTIDA COMPLETA OK — ganó ${winner.name}, rondas sin acierto: ${nobodyRounds}, revancha OK`);
