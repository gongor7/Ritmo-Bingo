// Helpers de servidor para las API routes.

import { getAdmin } from "@/lib/supabase/admin";
import { isStale } from "./turns";
import type { GuessRow, PlayerRow, RoomRow } from "./types";

export interface RoomContext {
  room: RoomRow;
  players: PlayerRow[];
  guesses: GuessRow[];
}

export async function loadRoomContext(code: string): Promise<RoomContext | null> {
  const db = getAdmin();
  const { data: room } = await db.from("rooms").select("*").eq("code", code).maybeSingle();
  if (!room) return null;
  const { data: players } = await db
    .from("players")
    .select("*")
    .eq("room_code", code)
    .order("seat", { ascending: true });
  const { data: guesses } = await db
    .from("guesses")
    .select("*")
    .eq("room_code", code)
    .order("created_at", { ascending: true });
  return { room: room as RoomRow, players: (players ?? []) as PlayerRow[], guesses: (guesses ?? []) as GuessRow[] };
}

// Marca como desconectados a los que no mandan latido; devuelve jugadores frescos.
export async function sweepPresence(ctx: RoomContext): Promise<RoomContext> {
  const db = getAdmin();
  const stale = ctx.players.filter((p) => p.connected && isStale(p.last_seen));
  if (stale.length === 0) return ctx;
  const ids = stale.map((p) => p.id);
  await db.from("players").update({ connected: false }).in("id", ids);
  ctx.players = ctx.players.map((p) => (ids.includes(p.id) ? { ...p, connected: false } : p));
  return ctx;
}

export async function touchRoom(code: string, patch: Partial<RoomRow>): Promise<void> {
  const db = getAdmin();
  const { error } = await db
    .from("rooms")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("code", code);
  if (error) throw new Error(error.message);
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function isHost(ctx: RoomContext, secret: string | undefined): boolean {
  return Boolean(secret) && ctx.room.host_secret === secret;
}

export function findPlayer(ctx: RoomContext, playerId: string | undefined): PlayerRow | null {
  if (!playerId) return null;
  return ctx.players.find((p) => p.id === playerId) ?? null;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin I, L, O, 0, 1

export function makeCode(): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function makeSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
