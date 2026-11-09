import { json, fail, makeCode, makeSecret } from "@/lib/game/server";
import { getAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_GENRES,
  DEFAULT_LISTEN_SECONDS,
  GUESS_MODES,
  LISTEN_CHOICES,
  validGenreSelection,
  type GenreId,
  type GuessMode,
} from "@/lib/game/config";

// POST /api/rooms — crea una sala nueva. Devuelve codigo + secreto del host.
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fail("Falta configurar Supabase (variables de entorno).", 500);
  }

  let listenSeconds = DEFAULT_LISTEN_SECONDS;
  let genres: GenreId[] = DEFAULT_GENRES;
  let guessMode: GuessMode = "titulo";
  try {
    const body = (await req.json()) as {
      listenSeconds?: number;
      genres?: string[];
      guessMode?: string;
    };
    if (body?.listenSeconds && LISTEN_CHOICES.includes(body.listenSeconds)) {
      listenSeconds = body.listenSeconds;
    }
    if (body?.genres && validGenreSelection(body.genres)) {
      genres = body.genres as GenreId[];
    }
    if (body?.guessMode && GUESS_MODES.includes(body.guessMode as GuessMode)) {
      guessMode = body.guessMode as GuessMode;
    }
  } catch {
    // sin body: valores por defecto
  }

  const db = getAdmin();
  const secret = makeSecret();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode();
    const { error } = await db.from("rooms").insert({
      code,
      host_secret: secret,
      settings: { listenSeconds, genres, guessMode },
      played_songs: [],
    });
    if (!error) return json({ code, hostSecret: secret });
    if (error.code !== "23505") return fail(error.message, 500); // 23505: codigo repetido, reintentar
  }
  return fail("No se pudo generar un código de sala, intenta de nuevo.", 500);
}
