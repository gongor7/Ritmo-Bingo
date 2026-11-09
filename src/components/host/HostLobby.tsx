"use client";

// Vista del host: lobby con código gigante + QR, géneros y modos de juego.

import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import {
  ALL_GENRES,
  GUESS_MODE_LABEL,
  GUESS_MODES,
  LISTEN_CHOICES,
  MAX_GENRES,
  MIN_GENRES,
  type GenreId,
  type GuessMode,
} from "@/lib/game/config";
import type { PlayerRow, RoomRow } from "@/lib/game/types";

interface HostLobbyProps {
  room: RoomRow;
  players: PlayerRow[];
  onStart: () => Promise<void>;
  onSettings: (patch: { listenSeconds?: number; genres?: GenreId[]; guessMode?: GuessMode }) => Promise<void>;
  busy: boolean;
}

export function HostLobby({ room, players, onStart, onSettings, busy }: HostLobbyProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/play?code=${room.code}`),
    [room.code],
  );

  const selected: GenreId[] = room.settings?.genres ?? [];
  const guessMode: GuessMode = room.settings?.guessMode ?? "titulo";
  const listenSeconds = room.settings?.listenSeconds ?? 30;

  const toggleGenre = (id: GenreId) => {
    if (selected.includes(id)) {
      if (selected.length <= MIN_GENRES) return; // mínimo 3
      void onSettings({ genres: selected.filter((g) => g !== id) });
    } else {
      if (selected.length >= MAX_GENRES) return; // máximo 5
      void onSettings({ genres: [...selected, id] });
    }
  };

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
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 w-full max-w-6xl items-stretch">
      {/* código + QR */}
      <section className="glass rounded-[2rem] p-7 flex flex-col items-center text-center">
        <p className="tag">entra con este código</p>
        <div className="mt-4 flex gap-2 sm:gap-3">
          {room.code.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
              className="inline-flex h-14 w-12 sm:h-20 sm:w-16 items-center justify-center rounded-2xl font-display font-black text-2xl sm:text-4xl"
              style={{
                background: "#14141c",
                border: `2px solid ${ALL_GENRES[i % ALL_GENRES.length].color}`,
                boxShadow: `0 0 30px ${ALL_GENRES[i % ALL_GENRES.length].glow}`,
              }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-bone p-3">
          <QRCode value={joinUrl} size={124} bgColor="#f4f2ec" fgColor="#0b0b10" />
        </div>

        <button
          type="button"
          onClick={copy}
          className="mt-3 text-xs tag hover:text-bone transition underline underline-offset-4 decoration-bone/30"
        >
          {copied ? "enlace copiado" : "copiar enlace de invitación"}
        </button>

        <button
          type="button"
          onClick={() => void onStart()}
          disabled={busy || players.length < 1}
          className="mt-6 w-full max-w-sm rounded-2xl bg-clasicos text-ink font-display font-extrabold tracking-widest py-3.5 text-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40"
        >
          {players.length < 1 ? "ESPERANDO JUGADORES" : "EMPEZAR PARTIDA"}
        </button>
        <p className="tag mt-2">ideal con 3 o más jugadores</p>
      </section>

      {/* configuración de la partida */}
      <section className="flex flex-col gap-5">
        <div className="glass rounded-[2rem] p-6">
          <div className="flex items-baseline justify-between">
            <p className="tag">géneros en la ruleta</p>
            <span className="font-display font-extrabold text-lg">
              {selected.length}<span className="text-bone/40 text-sm">/{MAX_GENRES}</span>
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {ALL_GENRES.map((g) => {
              const on = selected.includes(g.id);
              const blocked = !on && selected.length >= MAX_GENRES;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.id)}
                  disabled={busy || blocked}
                  className={`rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
                    on ? "scale-105" : "opacity-70 hover:opacity-100"
                  } ${blocked ? "cursor-not-allowed opacity-35" : ""}`}
                  style={
                    on
                      ? { background: g.color, color: g.ink, borderColor: g.color, boxShadow: `0 0 18px ${g.glow}` }
                      : { background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.15)", color: "rgba(244,242,236,.75)" }
                  }
                >
                  {g.name}
                </button>
              );
            })}
          </div>
          <p className="tag mt-3">elige entre {MIN_GENRES} y {MAX_GENRES} — los cartones se regeneran al cambiar</p>
        </div>

        <div className="glass rounded-[2rem] p-6">
          <p className="tag">lo que se adivina</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {GUESS_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => void onSettings({ guessMode: m })}
                disabled={busy}
                className={`rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${
                  guessMode === m ? "bg-bone text-ink" : "bg-white/5 text-bone/70 hover:text-bone border border-white/10"
                }`}
              >
                {m === "titulo" ? "la canción" : m === "artista" ? "el artista" : "ambos"}
              </button>
            ))}
          </div>
          <p className="tag mt-3">{GUESS_MODE_LABEL[guessMode]}</p>
        </div>

        <div className="glass rounded-[2rem] p-6">
          <div className="flex items-baseline justify-between">
            <p className="tag">en la sala</p>
            <span className="font-display font-extrabold text-2xl">{players.length}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 min-h-12 content-start">
            {players.map((p) => (
              <motion.span
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: p.connected ? 1 : 0.35, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-semibold text-sm"
              >
                {p.name}
                {!p.connected && <span className="ml-2 text-[10px] uppercase tracking-widest text-bone/40">off</span>}
              </motion.span>
            ))}
            {players.length === 0 && (
              <p className="text-bone/40 text-sm py-3">
                Aún nadie. Escanea el código QR desde el celular para entrar.
              </p>
            )}
          </div>
        </div>

        <div className="glass rounded-[2rem] p-6">
          <p className="tag mb-3">segundos de escucha</p>
          <div className="flex gap-2">
            {LISTEN_CHOICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void onSettings({ listenSeconds: s })}
                disabled={busy}
                className={`flex-1 rounded-xl py-2 font-display font-bold text-sm transition-all ${
                  listenSeconds === s
                    ? "bg-bone text-ink"
                    : "bg-white/5 text-bone/70 hover:text-bone border border-white/10"
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
