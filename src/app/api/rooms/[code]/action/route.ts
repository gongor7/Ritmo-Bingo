import {
  fail,
  json,
  loadRoomContext,
  sweepPresence,
  touchRoom,
  isHost,
  findPlayer,
  type RoomContext,
} from "@/lib/game/server";
import { getAdmin } from "@/lib/supabase/admin";
import { connectedPlayers, nextTurnPlayer, standings } from "@/lib/game/turns";
import { isGuessCorrect } from "@/lib/game/matcher";
import { winningRow, generateCard } from "@/lib/game/card";
import {
  DEFAULT_LISTEN_SECONDS,
  GUESS_GRACE_MS,
  LISTEN_CHOICES,
  SPIN_SECONDS,
  type GenreId,
} from "@/lib/game/config";
import type { Cell, GuessRow, PlayerRow, RoomRow } from "@/lib/game/types";

interface ActionBody {
  action: string;
  secret?: string;
  playerId?: string;
  text?: string;
  cellIndex?: number;
  listenSeconds?: number;
}

function listenOf(room: RoomRow): number {
  return room.settings?.listenSeconds ?? DEFAULT_LISTEN_SECONDS;
}

function nextRoundPatch(ctx: RoomContext, turnPlayerId: string | null): Partial<RoomRow> {
  return {
    round: ctx.room.round + 1,
    phase: "intro",
    turn_player_id: turnPlayerId,
    color: null,
    song_id: null,
    song_title: null,
    song_artist: null,
    spin_started_at: null,
    guess_deadline: null,
    pending_markers: [],
  };
}

async function pickSongFor(genre: GenreId, excludeSongId: string | null) {
  const db = getAdmin();
  const { data: songs } = await db
    .from("songs")
    .select("id, title, artist")
    .eq("genre_id", genre)
    .or("preview_url.is.null,preview_url.neq.none");
  if (!songs || songs.length === 0) return null;
  let candidates = songs;
  if (songs.length > 1 && excludeSongId) {
    candidates = songs.filter((s) => s.id !== excludeSongId);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// POST /api/rooms/[code]/action — todas las mutaciones del juego.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return fail("Petición inválida.");
  }

  const ctx = await loadRoomContext(code.toUpperCase());
  if (!ctx) return fail("Sala no encontrada.", 404);
  await sweepPresence(ctx);

  const { room } = ctx;
  const host = isHost(ctx, body.secret);
  const player = findPlayer(ctx, body.playerId);

  switch (body.action) {
    // ------------------------------------------------ latido de presencia
    case "heartbeat": {
      if (!player) return fail("Jugador no encontrado.", 403);
      await getAdmin()
        .from("players")
        .update({ connected: true, last_seen: new Date().toISOString() })
        .eq("id", player.id);
      return json({ ok: true });
    }

    // ------------------------------------------------ ajustes del lobby
    case "settings": {
      if (!host) return fail("Solo el host.", 403);
      if (room.status !== "lobby") return fail("Solo en el lobby.", 409);
      const s = Number(body.listenSeconds);
      if (!LISTEN_CHOICES.includes(s)) return fail("Duración inválida.");
      await touchRoom(room.code, { settings: { listenSeconds: s } });
      return json({ ok: true });
    }

    // ------------------------------------------------ empezar partida
    case "start": {
      if (!host) return fail("Solo el host.", 403);
      if (room.status !== "lobby") return fail("La partida ya empezó.", 409);
      const first = connectedPlayers(ctx.players)[0] ?? null;
      await touchRoom(room.code, {
        status: "playing",
        phase: "intro",
        round: 1,
        turn_player_id: first?.id ?? null,
        pending_markers: [],
        winner_id: null,
      });
      return json({ ok: true });
    }

    // ------------------------------------------------ girar la ruleta
    case "spin": {
      const allowed = host || (player && player.id === room.turn_player_id);
      if (!allowed) return fail("No es tu turno.", 403);
      if (room.phase !== "intro" || room.status !== "playing") return fail("Fuera de turno.", 409);

      const genres: GenreId[] = ["rock", "cumbia", "pop", "boliviano", "urbano", "clasicos"];
      const color = genres[Math.floor(Math.random() * genres.length)];
      const song = await pickSongFor(color, room.song_id);
      if (!song) return fail("No hay canciones disponibles para ese género.", 500);

      const now = Date.now();
      await touchRoom(room.code, {
        phase: "listening",
        color,
        song_id: song.id,
        song_title: song.title,
        song_artist: song.artist,
        spin_started_at: new Date(now).toISOString(),
        guess_deadline: new Date(now + SPIN_SECONDS * 1000 + listenOf(room) * 1000).toISOString(),
        pending_markers: [],
      });
      return json({ ok: true, color, song: { id: song.id, title: song.title, artist: song.artist } });
    }

    // ------------------------------------------------ responder
    case "guess": {
      if (!player) return fail("Jugador no encontrado.", 403);
      if (room.phase !== "listening" || !room.song_title) return fail("No hay canción al aire.", 409);
      const deadline = room.guess_deadline ? new Date(room.guess_deadline).getTime() : 0;
      if (Date.now() > deadline + GUESS_GRACE_MS) return fail("Se acabó el tiempo.", 409);
      const text = (body.text ?? "").trim().slice(0, 80);
      if (!text) return fail("Escribe una respuesta.");

      const correct = isGuessCorrect(room.song_title, text);
      const db = getAdmin();
      // Una respuesta por jugador y ronda: se puede corregir hasta el cierre.
      await db
        .from("guesses")
        .delete()
        .eq("room_code", room.code)
        .eq("round", room.round)
        .eq("player_id", player.id);
      const { error } = await db.from("guesses").insert({
        room_code: room.code,
        round: room.round,
        player_id: player.id,
        player_name: player.name,
        text,
        correct,
      });
      if (error) return fail(error.message, 500);
      return json({ ok: true, correct });
    }

    // ------------------------------------------------ revelar respuesta
    case "reveal": {
      // El host puede revelar cuando quiera; cualquier cliente fuerza la
      // revelación pasados unos segundos del cierre para evitar bloqueos.
      const deadline = room.guess_deadline ? new Date(room.guess_deadline).getTime() : 0;
      const expired = Date.now() > deadline + GUESS_GRACE_MS;
      if (!host && !expired) return fail("Solo el host.", 403);
      if (room.phase !== "listening") return fail("Fuera de fase.", 409);
      const pending = ctx.guesses
        .filter((g: GuessRow) => g.round === room.round && g.correct)
        .map((g) => g.player_id);
      await touchRoom(room.code, { phase: "revealing", pending_markers: pending });
      return json({ ok: true, correctCount: pending.length });
    }

    // ------------------------------------------------ enviar a marcar cartones
    case "tomark": {
      if (!host) return fail("Solo el host.", 403);
      if (room.phase !== "revealing") return fail("Fuera de fase.", 409);
      if ((room.pending_markers ?? []).length === 0) return fail("Nadie acertó.", 409);
      await touchRoom(room.code, { phase: "marking" });
      return json({ ok: true });
    }

    // ------------------------------------------------ siguiente turno
    case "next": {
      if (!host) return fail("Solo el host.", 403);
      if (room.phase !== "revealing" && room.phase !== "marking") return fail("Fuera de fase.", 409);
      const turn = nextTurnPlayer(ctx.players, room.turn_player_id);
      await touchRoom(room.code, nextRoundPatch(ctx, turn));
      return json({ ok: true });
    }

    // ------------------------------------------------ marcar celda del cartón
    case "mark": {
      if (!player) return fail("Jugador no encontrado.", 403);
      if (room.phase !== "marking") return fail("Fuera de fase de marcado.", 409);
      if (!(room.pending_markers ?? []).includes(player.id)) return fail("No validaste esta ronda.", 403);
      const idx = Number(body.cellIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx > 24) return fail("Celda inválida.");
      const card: Cell[] = player.card.map((c) => ({ ...c }));
      const cell = card[idx];
      if (!cell || cell.marked) return fail("Celda ya marcada.", 409);
      if (cell.g !== room.color) return fail("Esa celda no es del color de la ronda.", 409);

      cell.marked = true;
      cell.song = room.song_title;
      cell.round = room.round;

      const db = getAdmin();
      const { error } = await db.from("players").update({ card }).eq("id", player.id);
      if (error) return fail(error.message, 500);

      const row = winningRow(card);
      if (row !== null) {
        await touchRoom(room.code, {
          status: "finished",
          phase: "winner",
          winner_id: player.id,
          pending_markers: [],
        });
        return json({ ok: true, won: true });
      }

      const pending = (room.pending_markers ?? []).filter((id) => id !== player.id);
      if (pending.length === 0) {
        const turn = nextTurnPlayer(ctx.players, room.turn_player_id);
        await touchRoom(room.code, nextRoundPatch(ctx, turn));
        return json({ ok: true, won: false, next: true });
      }
      await touchRoom(room.code, { pending_markers: pending });
      return json({ ok: true, won: false });
    }

    // ------------------------------------------------ revancha
    case "rematch": {
      if (!host) return fail("Solo el host.", 403);
      if (room.status !== "finished") return fail("La partida no terminó.", 409);
      const db = getAdmin();
      await db.from("guesses").delete().eq("room_code", room.code);
      const fresh = ctx.players.map((p) => ({ ...p, card: [] as Cell[] }));
      for (const p of ctx.players) {
        await db.from("players").update({ card: generateCard() }).eq("id", p.id);
      }
      const first = connectedPlayers(fresh as PlayerRow[])[0] ?? null;
      await touchRoom(room.code, {
        status: "playing",
        phase: "intro",
        round: 1,
        turn_player_id: first?.id ?? null,
        color: null,
        song_id: null,
        song_title: null,
        song_artist: null,
        spin_started_at: null,
        guess_deadline: null,
        pending_markers: [],
        winner_id: null,
      });
      return json({ ok: true });
    }

    // ------------------------------------------------ cambiar canción sin preview
    case "skip-song": {
      if (!host) return fail("Solo el host.", 403);
      if (!room.color || !room.song_id) return fail("No hay canción al aire.", 409);
      await getAdmin().from("songs").update({ preview_url: "none" }).eq("id", room.song_id);
      const song = await pickSongFor(room.color, room.song_id);
      if (!song) return fail("No quedan canciones con audio para ese género.", 500);
      await touchRoom(room.code, {
        song_id: song.id,
        song_title: song.title,
        song_artist: song.artist,
      });
      return json({ ok: true, song: { id: song.id, title: song.title, artist: song.artist } });
    }

    default:
      return fail("Acción desconocida.");
  }
}

// GET /api/rooms/[code]/action — utilidad de depuración: standings rápidos.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await loadRoomContext(code.toUpperCase());
  if (!ctx) return fail("Sala no encontrada.", 404);
  return json({
    room: { code: ctx.room.code, status: ctx.room.status, phase: ctx.room.phase, round: ctx.room.round },
    standings: standings(ctx.players),
  });
}
