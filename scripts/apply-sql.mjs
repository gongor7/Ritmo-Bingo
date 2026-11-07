// Aplica un archivo SQL al proyecto Supabase vía Management API.
// Uso: SUPA_TOKEN=xxx node scripts/apply-sql.mjs supabase/schema.sql
import { readFileSync } from "node:fs";

const [file] = process.argv.slice(2);
const token = process.env.SUPA_TOKEN;
const ref = process.env.SUPA_REF;
if (!token || !ref || !file) {
  console.error("uso: SUPA_TOKEN=... SUPA_REF=... node scripts/apply-sql.mjs <archivo.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, text.slice(0, 2000));
  process.exit(1);
}
console.log("OK:", text.slice(0, 500) || "(sin salida)");
