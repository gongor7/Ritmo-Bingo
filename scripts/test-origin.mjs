// Test: ¿la cabecera Origin afecta la entrega de postgres_changes de rooms?
import WebSocket from "ws";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const origin = process.argv[2]; // ej: http://localhost:3000 | none
const headers = origin && origin !== "none" ? { Origin: origin } : {};
const ws = new WebSocket(
  `wss://npkckugfybtswjlaehmo.supabase.co/realtime/v1/websocket?apikey=${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}&vsn=1.0.0`,
  { headers },
);

const log = [];
ws.on("message", (data) => {
  const m = JSON.parse(data.toString());
  if (m.event === "postgres_changes") log.push("PG " + m.payload?.data?.table + " " + m.payload?.data?.type);
});
ws.on("open", () => {
  ws.send(JSON.stringify({
    topic: "realtime:origin-test",
    event: "phx_join",
    ref: "1",
    payload: {
      config: {
        broadcast: { self: false },
        presence: { key: "" },
        postgres_changes: [{ event: "*", schema: "public", table: "rooms" }, { event: "*", schema: "public", table: "players" }],
      },
      access_token: null,
    },
  }));
  setTimeout(async () => {
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rooms?code=eq.VRHK`, {
      method: "PATCH",
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    });
    setTimeout(() => {
      console.log(`Origin=${origin ?? "(ninguno)"} ->`, log.join(" || ") || "(sin eventos)");
      process.exit(0);
    }, 4000);
  }, 3000);
});
