"use client";

// Vista del host: lobby con código gigante + QR.

import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import { GENRES, LISTEN_CHOICES } from "@/lib/game/config";
import type { PlayerRow, RoomRow } from "@/lib/game/types";

interface HostLobbyProps {
  room: RoomRow;
  players: PlayerRow[];
  onStart: () => Promise<void>;
  onSettings: (listenSeconds: number) => Promise<void>;
  busy: boolean;
}

export function HostLobby({ room, players, onStart, onSettings, busy }: HostLobbyProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/play?code=${room.code}`),
    [room.code],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bloqueado: el QR cubre este caso */
    }
  };

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 w-full max-w-6xl items-stretch">
      {/* código + QR */}
      <section className="glass rounded-[2rem] p-8 flex flex-col items-center text-center">
        <p className="tag">entra con este código</p>
        <div className="mt-5 flex gap-2 sm:gap-3">
          {room.code.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
              className="inline-flex h-16 w-14 sm:h-24 sm:w-20 items-center justify-center rounded-2xl font-display font-black text-3xl sm:text-5xl"
              style={{
                background: "#14141c",
                border: `2px solid ${GENRES[i % GENRES.length].color}`,
                boxShadow: `0 0 30px ${GENRES[i % GENRES.length].glow}`,
              }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        <div className="mt-7 rounded-2xl bg-bone p-3.5">
          <QRCode value={joinUrl} size={148} bgColor="#f4f2ec" fgColor="#0b0b10" />
        </div>

        <button
          type="button"
          onClick={copy}
          className="mt-4 text-xs tag hover:text-bone transition underline underline-offset-4 decoration-bone/30"
        >
          {copied ? "enlace copiado" : "copiar enlace de invitación"}
        </button>

        <div className="mt-8 w-full">
          <p className="tag mb-2">segundos de escucha</p>
          <div className="flex gap-2 max-w-xs mx-auto">
            {LISTEN_CHOICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void onSettings(s)}
                className={`flex-1 rounded-xl py-2 font-display font-bold text-sm transition-all ${
                  (room.settings?.listenSeconds ?? 30) === s
                    ? "bg-bone text-ink"
                    : "bg-white/5 text-bone/70 hover:text-bone border border-white/10"
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onStart()}
          disabled={busy || players.length < 1}
          className="mt-8 w-full max-w-sm rounded-2xl bg-clasicos text-ink font-display font-extrabold tracking-widest py-4 text-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40"
        >
          {players.length < 1 ? "ESPERANDO JUGADORES" : "EMPEZAR PARTIDA"}
        </button>
        <p className="tag mt-3">ideal con 3 o más jugadores</p>
      </section>

      {/* jugadores + reglas */}
      <section className="flex flex-col gap-6">
        <div className="glass rounded-[2rem] p-7 flex-1">
          <div className="flex items-baseline justify-between">
            <p className="tag">en la sala</p>
            <span className="font-display font-extrabold text-2xl">{players.length}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5 min-h-24 content-start">
            {players.map((p) => (
              <motion.span
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: p.connected ? 1 : 0.35, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-sm"
              >
                {p.name}
                {!p.connected && <span className="ml-2 text-[10px] uppercase tracking-widest text-bone/40">off</span>}
              </motion.span>
            ))}
            {players.length === 0 && (
              <p className="text-bone/40 text-sm py-6">
                Aún nadie. Escanea el código QR desde el celular para entrar.
              </p>
            )}
          </div>
        </div>

        <div className="glass rounded-[2rem] p-7">
          <p className="tag mb-4">cómo se juega</p>
          <ol className="space-y-3 text-sm text-bone/70 leading-relaxed">
            <li>
              <span className="font-display font-bold text-bone mr-2">1.</span>
              Cada jugador recibe un cartón con casillas de colores: cada color es un género musical.
            </li>
            <li>
              <span className="font-display font-bold text-bone mr-2">2.</span>
              Por turnos, alguien gira la ruleta. El color que cae define el género y suena una canción al azar.
            </li>
            <li>
              <span className="font-display font-bold text-bone mr-2">3.</span>
              Quien acierte el título queda validado y llena una casilla de ese color de su cartón.
            </li>
            <li>
              <span className="font-display font-bold text-bone mr-2">4.</span>
              La primera fila completa gana la partida.
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
