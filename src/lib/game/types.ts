// Tipos compartidos entre cliente y servidor.

import type { CellGenre, GenreId } from "./config";

export type RoomStatus = "lobby" | "playing" | "finished";
export type Phase = "lobby" | "intro" | "listening" | "revealing" | "marking" | "winner";

export interface Cell {
  g: CellGenre; // género de la celda o "wild" (comodín)
  marked: boolean;
  song: string | null; // título sellado al marcar
  round: number | null; // ronda en la que se marcó
}

export interface RoomSettings {
  listenSeconds: number;
}

export interface RoomRow {
  code: string;
  status: RoomStatus;
  phase: Phase;
  round: number;
  turn_player_id: string | null;
  color: GenreId | null;
  song_id: string | null;
  song_title: string | null;
  song_artist: string | null;
  spin_started_at: string | null;
  guess_deadline: string | null;
  pending_markers: string[];
  winner_id: string | null;
  settings: RoomSettings;
  host_secret: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerRow {
  id: string;
  room_code: string;
  name: string;
  seat: number;
  card: Cell[];
  connected: boolean;
  last_seen: string;
  joined_at: string;
}

export interface GuessRow {
  id: string;
  room_code: string;
  round: number;
  player_id: string;
  player_name: string;
  text: string;
  correct: boolean;
  created_at: string;
}

export interface SongRow {
  id: string;
  genre_id: GenreId;
  title: string;
  artist: string;
  preview_url: string | null;
}
