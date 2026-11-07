"use client";

// Vista de juego del host: ruleta, panel "al aire", revelación y marcado.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wheel, targetRotation } from "@/components/Wheel";
import { TimerRing } from "@/components/TimerRing";
import { Equalizer } from "@/components/Equalizer";
import { GENRES, GENRE_MAP, SPIN_SECONDS, DEFAULT_LISTEN_SECONDS } from "@/lib/game/config";
import { fetchPreviewUrl, postAction } from "@/lib/game/client";
import { useNow } from "@/lib/game/useNow";
import { standings } from "@/lib/game/turns";
import type { GuessRow, PlayerRow, RoomRow } from "@/lib/game/types";

interface HostGameProps {
  room: RoomRow;
  players: PlayerRow[];
  guesses: GuessRow[];
  secret: string;
}

export function HostGame({ room, players, guesses, secret }: HostGameProps) {
  const now = useNow(250);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpinRef = useRef<string | null>(null);
  const previewTries = useRef(0);

  const listenMs = (room.settings?.listenSeconds ?? DEFAULT_LISTEN_SECONDS) * 1000;
  const colorIdx = room.color ? GENRES.findIndex((g) => g.id === room.color) : -1;
  const landedIndex = colorIdx >= 0 ? colorIdx : null;
  const genre = room.color ? GENRE_MAP[room.color] : null;
  const turnPlayer = players.find((p) => p.id === room.turn_player_id) ?? null;
  const roundGuesses = guesses.filter((g) => g.round === room.round);
  const correctCount = room.phase === "revealing" || room.phase === "marking" ? roundGuesses.filter((g) => g.correct).length : 0;
  const pending = room.pending_markers ?? [];
  const connected = players.filter((p) => p.connected);

  // ---------------------------------------------------- animación de giro
  useEffect(() => {
    if (room.phase !== "listening" || !room.spin_started_at) return;
    if (lastSpinRef.current === room.spin_started_at) return;
    lastSpinRef.current = room.spin_started_at;
    const idx = GENRES.findIndex((g) => g.id === room.color);
    if (idx < 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza la animación con el evento de giro
    setRotation((r) => targetRotation(r, idx));
    setSpinning(true);
    const t = setTimeout(() => setSpinning(false), SPIN_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [room.phase, room.spin_started_at, room.color]);

  // ---------------------------------------------------- audio del host
  useEffect(() => {
    if (room.phase === "listening" && room.song_id && room.spin_started_at) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const audioStart = new Date(room.spin_started_at).getTime() + SPIN_SECONDS * 1000;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado del reproductor de audio
      setAudioState("loading");

      fetchPreviewUrl(room.song_id).then((url) => {
        if (cancelled) return;
        if (!url) {
          // sin fragmento disponible: pedir otra canción del mismo género
          if (previewTries.current < 4) {
            previewTries.current += 1;
            void postAction(room.code, { action: "skip-song", secret });
          } else {
            setAudioState("error");
          }
          return;
        }
        previewTries.current = 0;
        timer = setTimeout(() => {
          if (cancelled) return;
          const el = audioRef.current;
          if (!el) return;
          el.src = url;
          el.currentTime = 0;
          el.play()
            .then(() => setAudioState("playing"))
            .catch(() => setAudioState("error"));
        }, Math.max(0, audioStart - Date.now()));
      });

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }
    audioRef.current?.pause();
    return undefined;
  }, [room.phase, room.song_id, room.spin_started_at, room.code, secret]);

  // ---------------------------------------------------- auto-revelar al cierre
  useEffect(() => {
    if (room.phase !== "listening" || !room.guess_deadline) return;
    const t = setInterval(() => {
      if (Date.now() > new Date(room.guess_deadline as string).getTime() + 2500) {
        void postAction(room.code, { action: "reveal", secret });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [room.phase, room.guess_deadline, room.code, secret]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    await postAction(room.code, { action, secret, ...extra });
  };

  const spinEndAt = room.spin_started_at ? new Date(room.spin_started_at).getTime() + SPIN_SECONDS * 1000 : 0;
  const inSpinWindow = room.phase === "listening" && spinEndAt > now;
  const board = standings(players);

  return (
    <div className="w-full max-w-6xl flex flex-col gap-5">
      {/* marcador superior */}
      <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
        <span className="font-display font-black tracking-widest text-bone/80 px-2 shrink-0">{room.code}</span>
        <span className="tag shrink-0">ronda {room.round}</span>
        <span className="h-4 w-px bg-white/15 shrink-0" />
        <div className="flex gap-1.5">
          {board.map((s) => {
            const p = players.find((x) => x.id === s.id);
            const isTurn = p?.id === room.turn_player_id && room.status === "playing";
            return (
              <span
                key={s.id}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition ${
                  isTurn ? "border-clasicos text-clasicos bg-clasicos/10" : "border-white/12 text-bone/70"
                } ${p && !p.connected ? "opacity-40" : ""}`}
              >
                {s.name} · {s.marks}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-center flex-1">
        {/* ruleta */}
        <div className="flex flex-col items-center gap-5">
          <Wheel rotation={rotation} landedIndex={landedIndex} spinning={spinning} size={400} />
          <div className="text-center min-h-14">
            <AnimatePresence mode="wait">
              {room.phase === "intro" && turnPlayer && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="tag">turno de</p>
                  <p className="font-display font-extrabold text-2xl">{turnPlayer.name}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {room.phase === "intro" && (
            <button
              type="button"
              onClick={() => void act("spin")}
              className="rounded-2xl bg-bone text-ink font-display font-extrabold tracking-widest px-10 py-3.5 hover:brightness-95 active:scale-[0.98] transition"
            >
              GIRAR RULETA
            </button>
          )}
        </div>

        {/* panel contextual */}
        <div className="glass rounded-[2rem] p-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            {room.phase === "intro" && (
              <motion.div
                key="intro-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center gap-3"
              >
                <p className="tag">ronda {room.round}</p>
                <p className="font-display font-bold text-2xl">
                  {turnPlayer ? `Esperando que ${turnPlayer.name} gire` : "Esperando el giro"}
                </p>
                <p className="tag max-w-xs">el jugador en turno gira la ruleta desde su celular</p>
              </motion.div>
            )}

            {inSpinWindow && (
              <motion.div
                key="spinning"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <p className="tag">la ruleta gira</p>
                <p className="font-display font-black text-3xl mt-3">SUERTE, {turnPlayer?.name ?? "JUGADOR"}</p>
              </motion.div>
            )}

            {!inSpinWindow && room.phase === "listening" && genre && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col"
                style={{ boxShadow: "none" }}
              >
                <div className="flex items-center justify-between">
                  <p className="tag">al aire · género {genre.name.toLowerCase()}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMuted((m) => !m);
                      if (audioRef.current) audioRef.current.muted = !muted;
                    }}
                    className="tag hover:text-bone transition"
                  >
                    {muted ? "sonido: apagado" : "sonido: encendido"}
                  </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div
                    className="rounded-full p-5"
                    style={{ boxShadow: `0 0 70px ${genre.glow}`, border: `2px solid ${genre.color}` }}
                  >
                    <Equalizer color={genre.color} bars={9} className="h-16" />
                  </div>

                  {audioState === "error" && (
                    <p className="text-rock text-sm max-w-xs text-center">
                      No se pudo cargar el audio de esta canción. Usa &quot;siguiente turno&quot; si suena el silencio.
                    </p>
                  )}
                  {audioState === "loading" && <p className="tag animate-pulse-soft">cargando audio...</p>}

                  <div className="flex items-center gap-6">
                    <TimerRing endsAt={new Date(room.guess_deadline as string).getTime()} totalMs={listenMs} />
                    <div>
                      <p className="font-display font-extrabold text-4xl">
                        {roundGuesses.length}
                        <span className="text-bone/40 text-2xl">/{connected.length}</span>
                      </p>
                      <p className="tag">respondieron</p>
                    </div>
                  </div>
                  <p className="tag">escribe el título en el celular</p>
                </div>
              </motion.div>
            )}

            {!inSpinWindow && room.phase === "revealing" && (
              <motion.div
                key="revealing"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col"
              >
                <p className="tag">era</p>
                <h2 className="font-display font-black text-3xl sm:text-4xl mt-2 leading-tight">
                  {room.song_title}
                </h2>
                <p className="text-bone/55 text-lg mt-1">{room.song_artist}</p>

                <div className="flex-1 mt-6 overflow-y-auto max-h-56">
                  <p className="tag mb-3">
                    {correctCount > 0 ? `${correctCount} validados` : "nadie acertó"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roundGuesses.map((g) => (
                      <span
                        key={g.id}
                        className={`rounded-xl px-3.5 py-2 text-sm border ${
                          g.correct
                            ? "border-boliviano bg-boliviano/15 text-bone"
                            : "border-white/10 text-bone/50 bg-white/[0.03]"
                        }`}
                      >
                        <b className="font-semibold">{g.player_name}</b> · {g.text}
                      </span>
                    ))}
                    {roundGuesses.length === 0 && (
                      <span className="text-bone/40 text-sm">sin respuestas esta ronda</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  {correctCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void act("tomark")}
                      className="flex-1 rounded-2xl bg-boliviano text-ink font-display font-extrabold tracking-wide py-3.5 hover:brightness-110 active:scale-[0.98] transition"
                    >
                      MARCAR CARTONES
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void act("next")}
                    className={`rounded-2xl font-display font-bold tracking-wide py-3.5 px-8 border border-white/15 text-bone/80 hover:text-bone hover:border-white/30 transition ${
                      correctCount === 0 ? "flex-1 bg-white/5" : ""
                    }`}
                  >
                    SIGUIENTE TURNO
                  </button>
                </div>
              </motion.div>
            )}

            {room.phase === "marking" && (
              <motion.div
                key="marking"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col"
              >
                <p className="tag">validados eligiendo casilla</p>
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  {genre && (
                    <span
                      className="rounded-full px-6 py-2 font-display font-extrabold text-lg"
                      style={{ background: genre.color, color: genre.ink }}
                    >
                      {genre.name}
                    </span>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {pending.map((id) => {
                      const p = players.find((x) => x.id === id);
                      return (
                        <span key={id} className="rounded-full border border-boliviano/60 bg-boliviano/10 px-4 py-2 text-sm font-semibold animate-pulse-soft">
                          {p?.name ?? "¿?"}
                        </span>
                      );
                    })}
                    {pending.length === 0 && <span className="tag">avanzando...</span>}
                  </div>
                  <p className="tag">
                    quedan {pending.length} por marcar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void act("next")}
                  className="rounded-2xl border border-white/15 text-bone/80 hover:text-bone hover:border-white/30 font-display font-bold tracking-wide py-3.5 transition"
                >
                  SIGUIENTE TURNO
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
