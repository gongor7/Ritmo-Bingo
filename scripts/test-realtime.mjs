// Prueba de realtime: escucha cambios en rooms y avisa.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 12 } },
});

const code = process.argv[2] ?? "SSWC";
let received = false;

const channel = db
  .channel(`room:${code}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (payload) => {
    received = true;
    console.log("EVENTO rooms:", payload.eventType, "status:", payload.new?.status, "phase:", payload.new?.phase);
    process.exit(0);
  })
  .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, () => {
    received = true;
    console.log("EVENTO players (ignorado para este test)");
  })
  .on("postgres_changes", { event: "*", schema: "public", table: "guesses", filter: `room_code=eq.${code}` }, () => {
    received = true;
    console.log("EVENTO guesses (ignorado para este test)");
  })
  .subscribe((status) => console.log("subscribe status:", status));

setTimeout(async () => {
  if (received) return;
  console.log("forzando un cambio en la sala...");
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rooms?code=eq.${code}`, {
    method: "PATCH",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });
  console.log("patch:", res.status);
  setTimeout(() => {
    console.log("NO LLEGÓ NINGÚN EVENTO EN 8s");
    process.exit(1);
  }, 8000);
}, 4000);
