"use client";

// Helper de acceso a datos y acciones desde el navegador.

import { getSupabase } from "@/lib/supabase/client";
import type { GuessRow, PlayerRow, RoomRow } from "./types";

export interface RoomSnapshot {
  room: RoomRow;
  players: PlayerRow[];
  guesses: GuessRow[];
}

export async function fetchSnapshot(code: string): Promise<RoomSnapshot> {
  const db = getSupabase();
  const { data: room, error: e1 } = await db.from("rooms").select("*").eq("code", code).maybeSingle();
  if (!room) throw new Error(e1?.message ?? "Sala no encontrada");
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

export async function postAction(
  code: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  try {
    const res = await fetch(`/api/rooms/${code}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return { ok: false, error: data?.error ?? "Error de servidor" };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Sin conexión" };
  }
}

export async function joinRoom(code: string, name: string) {
  const res = await fetch(`/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "No se pudo entrar a la sala");
  return data as { playerId: string; name: string; card: PlayerRow["card"] };
}

export async function createRoom(listenSeconds: number) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ listenSeconds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "No se pudo crear la sala");
  return data as { code: string; hostSecret: string };
}

export async function fetchPreviewUrl(songId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/preview?song=${encodeURIComponent(songId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

// ---------- almacenamiento local ----------
export function saveHostSecret(code: string, secret: string) {
  localStorage.setItem(`rb:host:${code}`, secret);
}
export function loadHostSecret(code: string): string | null {
  return localStorage.getItem(`rb:host:${code}`);
}
export function savePlayer(code: string, playerId: string) {
  localStorage.setItem(`rb:player:${code}`, playerId);
}
export function loadPlayer(code: string): string | null {
  return localStorage.getItem(`rb:player:${code}`);
}
export function rememberRoomCode(code: string) {
  localStorage.setItem("rb:last-room", code);
}
export function lastRoomCode(): string | null {
  return localStorage.getItem("rb:last-room");
}
