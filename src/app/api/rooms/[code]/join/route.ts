import { json, fail, loadRoomContext, sweepPresence } from "@/lib/game/server";
import { getAdmin } from "@/lib/supabase/admin";
import { generateCard } from "@/lib/game/card";

// POST /api/rooms/[code]/join — el jugador entra con un apodo y recibe su cartón.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let name = "";
  try {
    const body = (await req.json()) as { name?: string };
    name = (body?.name ?? "").trim().slice(0, 18);
  } catch {
    return fail("Falta el apodo.");
  }
  if (name.length < 2) return fail("El apodo necesita al menos 2 caracteres.");

  const ctx = await loadRoomContext(code.toUpperCase());
  if (!ctx) return fail("Sala no encontrada. Revisa el código.", 404);
  if (ctx.room.status === "finished") return fail("Esta partida ya terminó.", 409);
  await sweepPresence(ctx);

  // Apodos únicos: si existe, agrega un número.
  const existing = new Set(ctx.players.map((p) => p.name.toLowerCase()));
  let finalName = name;
  let n = 2;
  while (existing.has(finalName.toLowerCase())) {
    finalName = `${name} ${n++}`;
  }

  const seat = ctx.players.reduce((max, p) => Math.max(max, p.seat + 1), 0);
  const card = generateCard();

  const db = getAdmin();
  const { data, error } = await db
    .from("players")
    .insert({ room_code: ctx.room.code, name: finalName, seat, card })
    .select("id")
    .single();
  if (error) return fail(error.message, 500);

  return json({ playerId: data.id, name: finalName, card });
}
