// Rotación de turnos y utilidades de sala compartidas por cliente y servidor.

import { PRESENCE_TIMEOUT_MS } from "./config";
import type { PlayerRow } from "./types";

export function connectedPlayers(players: PlayerRow[]): PlayerRow[] {
  return players
    .filter((p) => p.connected)
    .sort((a, b) => a.seat - b.seat);
}

// Siguiente jugador en turno (orden de llegada, saltando desconectados).
export function nextTurnPlayer(players: PlayerRow[], currentId: string | null): string | null {
  const list = connectedPlayers(players);
  if (list.length === 0) return null;
  if (!currentId) return list[0].id;
  const idx = list.findIndex((p) => p.id === currentId);
  if (idx === -1) return list[0].id;
  return list[(idx + 1) % list.length].id;
}

export function isStale(lastSeen: string, now = Date.now()): boolean {
  return now - new Date(lastSeen).getTime() > PRESENCE_TIMEOUT_MS;
}

export function playerById(players: PlayerRow[], id: string | null): PlayerRow | undefined {
  return players.find((p) => p.id === id);
}

export function standings(players: PlayerRow[]): { id: string; name: string; marks: number }[] {
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      marks: p.card.filter((c) => c.marked && c.g !== "wild").length,
    }))
    .sort((a, b) => b.marks - a.marks);
}
