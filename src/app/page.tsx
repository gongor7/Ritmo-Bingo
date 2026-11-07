"use client";

// Portada: crear sala (host / TV) o unirse con código (celular).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ambient } from "@/components/Ambient";
import { GENRES, LISTEN_CHOICES } from "@/lib/game/config";
import { createRoom, lastRoomCode, rememberRoomCode, saveHostSecret } from "@/lib/game/client";

const CODE_PATTERN = /^[A-Z0-9]{4}$/;

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [listen, setListen] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- inicialización desde localStorage
    setResume(lastRoomCode());
  }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { code: newCode, hostSecret } = await createRoom(listen);
      saveHostSecret(newCode, hostSecret);
      router.push(`/host/${newCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  };

  const join = () => {
    if (!CODE_PATTERN.test(code)) return;
    rememberRoomCode(code);
    router.push(`/play?code=${code}`);
  };

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center px-5 py-10 overflow-hidden">
      <Ambient />

      {/* título */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="text-center"
      >
        <p className="tag mb-4">bingo musical en vivo</p>
        <h1 className="font-display font-black leading-[0.95] text-[clamp(2.6rem,9vw,6.5rem)]">
          RITMO
          <br />
          <span className="text-stroke">BINGO</span>
        </h1>
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {GENRES.map((g) => (
            <span key={g.id} className="h-1.5 w-8 rounded-full" style={{ background: g.color }} />
          ))}
        </div>
        <p className="mt-5 max-w-md mx-auto text-bone/60 text-sm sm:text-base leading-relaxed">
          Gira la ruleta, suena un fragmento y adivina el título. Cada acierto llena una casilla
          de tu color. La primera fila completa gana.
        </p>
      </motion.div>

      {/* acciones */}
      <div className="mt-10 grid gap-4 w-full max-w-3xl sm:grid-cols-2">
        {/* host */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="glass rounded-3xl p-6 flex flex-col"
        >
          <p className="tag">pantalla principal</p>
          <h2 className="font-display font-bold text-xl mt-1">Soy el anfitrión</h2>
          <p className="text-bone/55 text-sm mt-2 flex-1">
            Abre esta sala en la TV o proyector. Ahí gira la ruleta y suena la música.
          </p>

          <div className="mt-4">
            <p className="tag mb-2">segundos de escucha</p>
            <div className="flex gap-2">
              {LISTEN_CHOICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setListen(s)}
                  className={`flex-1 rounded-xl py-2 font-display font-bold text-sm transition-all ${
                    listen === s
                      ? "bg-bone text-ink"
                      : "glass text-bone/70 hover:text-bone"
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-clasicos text-ink font-display font-extrabold tracking-wide py-3.5 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
          >
            {busy ? "Creando sala..." : "CREAR SALA"}
          </button>
        </motion.section>

        {/* jugador */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="glass rounded-3xl p-6 flex flex-col"
        >
          <p className="tag">desde el celular</p>
          <h2 className="font-display font-bold text-xl mt-1">Unirme al juego</h2>
          <p className="text-bone/55 text-sm mt-2 flex-1">
            Escribe el código de 4 caracteres que muestra la pantalla principal.
          </p>

          {resume && CODE_PATTERN.test(resume) && (
            <button
              type="button"
              onClick={() => router.push(`/play?code=${resume}`)}
              className="mt-4 text-left rounded-xl glass px-4 py-2.5 text-sm text-bone/80 hover:text-bone transition"
            >
              Volver a la sala <span className="font-display font-bold text-bone">{resume}</span>
            </button>
          )}

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4).replace(/[^A-Z0-9]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="CÓDIGO"
            autoCapitalize="characters"
            className="mt-4 w-full rounded-2xl glass text-center font-display font-black text-2xl tracking-[0.45em] py-3.5 placeholder:text-bone/25 focus:outline-none"
          />

          <button
            type="button"
            onClick={join}
            disabled={!CODE_PATTERN.test(code)}
            className="mt-5 w-full rounded-2xl bg-bone text-ink font-display font-extrabold tracking-wide py-3.5 hover:brightness-95 active:scale-[0.98] transition disabled:opacity-40"
          >
            ENTRAR
          </button>
        </motion.section>
      </div>

      {error && <p className="mt-6 text-rock text-sm text-center max-w-md">{error}</p>}

      <p className="tag mt-12 text-center">sin cuentas — solo un código y tu teléfono</p>
    </main>
  );
}
