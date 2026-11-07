import { fail, json } from "@/lib/game/server";
import { getAdmin } from "@/lib/supabase/admin";
import { normalize } from "@/lib/game/matcher";

// GET /api/preview?song=<id>
// Busca el fragmento de 30 s en iTunes Search API (gratuito, sin clave),
// lo cachea en la base y devuelve la URL. Si no existe audio, marca la
// canción como "none" para que nunca vuelva a elegirse.

const memCache = new Map<string, string>(); // songId -> previewUrl (por instancia)

interface ITunesResult {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
}

async function searchItunes(term: string): Promise<ITunesResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=6`;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { "user-agent": "ritmo-bingo/1.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ITunesResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

function scoreResult(result: ITunesResult, title: string, artist: string): number {
  if (!result.previewUrl) return -1;
  const t = normalize(result.trackName ?? "");
  const a = normalize(result.artistName ?? "");
  let score = 0;
  if (t === title) score += 4;
  else if (t.includes(title) || title.includes(t)) score += 2;
  if (a.includes(artist) || artist.includes(a)) score += 2;
  return score;
}

export async function GET(req: Request) {
  const songId = new URL(req.url).searchParams.get("song");
  if (!songId) return fail("Falta el parámetro song.");

  const db = getAdmin();
  const { data: song } = await db
    .from("songs")
    .select("id, title, artist, preview_url")
    .eq("id", songId)
    .maybeSingle();
  if (!song) return fail("Canción no encontrada.", 404);
  if (song.preview_url === "none") return fail("Sin audio disponible.", 404);
  if (song.preview_url) return json({ url: song.preview_url });

  const mem = memCache.get(songId);
  if (mem) return json({ url: mem });

  const title = normalize(song.title);
  const artist = normalize(song.artist);

  // Dos pasadas: "artista titulo" y solo "titulo".
  const passes = [`${song.artist} ${song.title}`, song.title];
  for (const term of passes) {
    const results = await searchItunes(term);
    const ranked = results
      .map((r) => ({ r, s: scoreResult(r, title, artist) }))
      .filter((x) => x.s >= 2)
      .sort((a, b) => b.s - a.s);
    const best = ranked[0]?.r;
    if (best?.previewUrl) {
      memCache.set(songId, best.previewUrl);
      await db.from("songs").update({ preview_url: best.previewUrl }).eq("id", songId);
      return json({ url: best.previewUrl });
    }
  }

  await db.from("songs").update({ preview_url: "none" }).eq("id", songId);
  return fail("Sin audio disponible.", 404);
}
