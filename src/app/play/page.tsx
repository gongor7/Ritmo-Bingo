"use client";

// Pantalla del jugador (celular): unirse, cartón, responder y marcar.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Ambient } from "@/components/Ambient";
import { CardGrid } from "@/components/CardGrid";
import { TimerRing } from "@/components/TimerRing";
import { GENRE_MAP, SPIN_SECONDS, DEFAULT_LISTEN_SECONDS } from "@/lib/game/config";
import { joinRoom, loadPlayer, postAction, rememberRoomCode, savePlayer } from "@/lib/game/client";
import { useRoom } from "@/lib/game/useRoom";
import { useNow } from "@/lib/game/useNow";
import { markedCount } from "@/lib/game/card";
import { supabaseConfigured } from "@/lib/supabase/client";

const CODE_PATTERN = /^[A-Z0-9]{4}$/;

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center">
          <p className="tag animate-pulse-soft">cargando...</p>
        </main>
      }
    >
      <PlayInner />
    </Suspense>
  );
}

function PlayInner() {
  const search = useSearchParams();
  const urlCode = (search.get("code") ?? "").toUpperCase();

  const [code, setCode] = useState(urlCode);
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinedAt = useRef(0);

  // Reanudar sesión si ya entró antes desde este dispositivo
  useEffect(() => {
    if (urlCode && CODE_PATTERN.test(urlCode)) {
      const saved = loadPlayer(urlCode);
      if (saved) {
        joinedAt.current = Date.now();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sesión guardada en este dispositivo
        setPlayerId(saved);
      }
    }
  }, [urlCode]);

  const { room, players, guesses, loading, error, realtimeReady, refresh } = useRoom(code, playerId);
  const myPlayer = useMemo(() => players.find((p) => p.id === playerId) ?? null, [players, playerId]);

  // Sesión huérfana (la sala se reinició o se borró): tras 10 s de gracia se limpia
  useEffect(() => {
    if (
      playerId &&
      !loading &&
      room &&
      !myPlayer &&
      Date.now() - joinedAt.current > 10_000
    ) {
      localStorage.removeItem(`rb:player:${code}`);
      setPlayerId(null);
    }
  }, [playerId, loading, room, myPlayer, code]);

  const doJoin = async () => {
    if (!CODE_PATTERN.test(code) || name.trim().length < 2) return;
    setJoining(true);
    setJoinError(null);
    try {
      const data = await joinRoom(code, name.trim());
      savePlayer(code, data.playerId);
      rememberRoomCode(code);
      joinedAt.current = Date.now();
      setPlayerId(data.playerId);
      await refresh();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Error al entrar");
    } finally {
      setJoining(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <Frame>
        <Notice title="Falta configurar Supabase" body="El anfitrión debe configurar las variables de entorno. Revisa el README." />
      </Frame>
    );
  }

  // ---------- dentro de la sala ----------
  if (playerId && myPlayer && room) {
    return (
      <GameView
        code={code}
        playerId={playerId}
        room={room}
        players={players}
        guesses={guesses}
        realtimeReady={realtimeReady}
      />
    );
  }

  // ---------- formulario de entrada ----------
  return (
    <Frame>
      <Ambient />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass rounded-[2rem] p-8"
      >
        <p className="tag text-center">unirme al juego</p>
        <h1 className="font-display font-black text-3xl text-center mt-2">HOLA</h1>

        <label className="tag block mt-7 mb-2">código de la sala</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4).replace(/[^A-Z0-9]/g, ""))}
          placeholder="----"
          autoCapitalize="characters"
          className="w-full rounded-2xl glass text-center font-display font-black text-2xl tracking-[0.45em] py-3 placeholder:text-bone/25 focus:outline-none"
        />

        <label className="tag block mt-5 mb-2">tu apodo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 18))}
          onKeyDown={(e) => e.key === "Enter" && void doJoin()}
          placeholder="¿Cómo te dicen?"
          className="w-full rounded-2xl glass text-center font-semibold text-lg py-3 placeholder:text-bone/25 focus:outline-none"
        />

        {(joinError || error) && (
          <p className="text-rock text-sm mt-4 text-center">{joinError ?? error}</p>
        )}

        <button
          type="button"
          onClick={() => void doJoin()}
          disabled={joining || !CODE_PATTERN.test(code) || name.trim().length < 2}
          className="mt-7 w-full rounded-2xl bg-clasicos text-ink font-display font-extrabold tracking-widest py-3.5 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40"
        >
          {joining ? "Entrando..." : "ENTRAR"}
        </button>

        <Link href="/" className="tag block text-center mt-5 hover:text-bone transition">
          volver a la portada
        </Link>
      </motion.div>
    </Frame>
  );
}

// ============================================================ juego
interface GameViewProps {
  code: string;
  playerId: string;
  room: NonNullable<ReturnType<typeof useRoom>["room"]>;
  players: ReturnType<typeof useRoom>["players"];
  guesses: ReturnType<typeof useRoom>["guesses"];
  realtimeReady: boolean;
}

function GameView({ code, playerId, room, players, guesses, realtimeReady }: GameViewProps) {
  const now = useNow(250);
  const [guess, setGuess] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const me = players.find((p) => p.id === playerId) ?? null;
  const isMyTurn = room.turn_player_id === playerId && room.phase === "intro";
  const turnName = players.find((p) => p.id === room.turn_player_id)?.name ?? null;
  const genre = room.color ? GENRE_MAP[room.color] : null;
  const listenMs = (room.settings?.listenSeconds ?? DEFAULT_LISTEN_SECONDS) * 1000;
  const spinEndAt = room.spin_started_at ? new Date(room.spin_started_at).getTime() + SPIN_SECONDS * 1000 : 0;
  const inSpinWindow = room.phase === "listening" && spinEndAt > now;
  const deadline = room.guess_deadline ? new Date(room.guess_deadline).getTime() : 0;
  const listeningOpen = room.phase === "listening" && !inSpinWindow && deadline > now;
  const myRoundGuess = guesses.filter((g) => g.round === room.round && g.player_id === playerId).at(-1) ?? null;
  const iAmValidated = (room.pending_markers ?? []).includes(playerId);
  const winner = players.find((p) => p.id === room.winner_id) ?? null;
  const roundGuesses = guesses.filter((g) => g.round === room.round);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza la respuesta enviada con la ronda
    setSent(myRoundGuess?.text ?? null);
    setGuess("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.round]);

  // auto-revelar si el host no está presente
  useEffect(() => {
    if (room.phase !== "listening" || !room.guess_deadline) return;
    const t = setInterval(() => {
      if (Date.now() > new Date(room.guess_deadline as string).getTime() + 2500) {
        void postAction(code, { action: "reveal" });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [room.phase, room.guess_deadline, code]);

  const flashMsg = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2600);
  };

  const sendGuess = async () => {
    if (!guess.trim()) return;
    setBusy(true);
    const res = await postAction(code, { action: "guess", playerId, text: guess.trim() });
    setBusy(false);
    if (res.ok) setSent(guess.trim());
    else flashMsg(res.error ?? "Error");
  };

  const markCell = useCallback(
    async (cellIndex: number) => {
      setBusy(true);
      const res = await postAction(code, { action: "mark", playerId, cellIndex });
      setBusy(false);
      if (!res.ok) flashMsg(res.error ?? "Error");
    },
    [code, playerId],
  );

  const spin = async () => {
    setBusy(true);
    const res = await postAction(code, { action: "spin", playerId });
    setBusy(false);
    if (!res.ok) flashMsg(res.error ?? "Error");
  };

  if (!me) return null;

  const marks = markedCount(me.card);

  return (
    <main className="relative flex-1 flex flex-col max-w-lg w-full mx-auto px-4 pb-44 pt-4 gap-4">
      <Ambient />

      {/* encabezado */}
      <header className="flex items-center justify-between glass rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-display font-black tracking-widest">{room.code}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${realtimeReady ? "bg-boliviano" : "bg-cumbia"}`} />
        </div>
        <span className="tag">ronda {room.round}</span>
        <span className="text-sm font-semibold">
          {me.name} · <span className="font-display">{marks}</span>
        </span>
      </header>

      {flash && (
        <div className="rounded-xl border border-rock/50 bg-rock/10 text-rock text-sm text-center py-2">
          {flash}
        </div>
      )}

      {/* cartón */}
      <section className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="tag">tu cartón</p>
          <p className="tag">llena una fila para ganar</p>
        </div>
        <CardGrid
          card={me.card}
          mode={room.phase === "marking" && iAmValidated ? "mark" : "view"}
          markingColor={room.color}
          onCellTap={markCell}
          disabled={busy}
        />
      </section>

      {/* barra inferior de contexto */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={contextKey(room, isMyTurn, inSpinWindow, listeningOpen, iAmValidated)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="max-w-lg mx-auto px-4 pb-5"
          >
            <div className="glass rounded-[1.6rem] px-5 py-4 backdrop-blur-xl bg-ink/80">
              {/* lobby */}
              {room.status === "lobby" && (
                <div className="text-center">
                  <p className="font-display font-bold">Estás dentro</p>
                  <p className="tag mt-1">esperando que el anfitrión inicie la partida</p>
                </div>
              )}

              {/* intro: mi turno */}
              {room.status === "playing" && isMyTurn && (
                <div className="text-center">
                  <p className="tag mb-2">es tu turno</p>
                  <button
                    type="button"
                    onClick={() => void spin()}
                    disabled={busy}
                    className="w-full rounded-2xl bg-clasicos text-ink font-display font-black tracking-[0.3em] py-4 text-lg active:scale-[0.98] transition disabled:opacity-50"
                  >
                    GIRAR
                  </button>
                </div>
              )}

              {/* intro: turno ajeno */}
              {room.status === "playing" && room.phase === "intro" && !isMyTurn && (
                <div className="text-center">
                  <p className="tag">turno de</p>
                  <p className="font-display font-extrabold text-xl mt-1">{turnName}</p>
                </div>
              )}

              {/* girando */}
              {room.status === "playing" && inSpinWindow && (
                <div className="text-center">
                  <p className="font-display font-bold animate-pulse-soft">La ruleta gira...</p>
                  <p className="tag mt-1">prepara tu oído</p>
                </div>
              )}

              {/* escuchando */}
              {listeningOpen && (
                <div className="flex items-center gap-4">
                  <TimerRing endsAt={deadline} totalMs={listenMs} size={64} />
                  <div className="flex-1 min-w-0">
                    {genre && (
                      <p className="tag mb-1.5">
                        género <b style={{ color: genre.color }}>{genre.name}</b>
                      </p>
                    )}
                    {sent ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm">
                          {sent}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSent(null)}
                          className="tag hover:text-bone underline underline-offset-2 decoration-white/30"
                        >
                          corregir
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={guess}
                          onChange={(e) => setGuess(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && void sendGuess()}
                          placeholder="¿Qué canción es?"
                          className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/12 px-3.5 py-2.5 text-sm placeholder:text-bone/30 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void sendGuess()}
                          disabled={busy || !guess.trim()}
                          className="rounded-xl bg-bone text-ink font-display font-bold text-sm px-4 active:scale-95 transition disabled:opacity-40"
                        >
                          ENVIAR
                        </button>
                      </div>
                    )}
                    {sent && <p className="tag mt-1.5">enviado — puedes corregir hasta el cierre</p>}
                  </div>
                </div>
              )}

              {/* ventana cerrada, esperando revelación */}
              {room.status === "playing" && room.phase === "listening" && !listeningOpen && !inSpinWindow && (
                <div className="text-center">
                  <p className="font-display font-bold">Tiempo</p>
                  <p className="tag mt-1">veamos quién acertó</p>
                </div>
              )}

              {/* revelación */}
              {room.phase === "revealing" && (
                <div className="text-center">
                  <p className="tag">era</p>
                  <p className="font-display font-extrabold text-xl leading-tight mt-1">
                    {room.song_title}
                  </p>
                  <p className="text-bone/50 text-sm">{room.song_artist}</p>
                  {myRoundGuess && (
                    <p
                      className={`mt-3 rounded-xl py-2 text-sm font-semibold ${
                        myRoundGuess.correct
                          ? "bg-boliviano/15 border border-boliviano/50 text-boliviano"
                          : "bg-white/5 border border-white/10 text-bone/50"
                      }`}
                    >
                      {myRoundGuess.correct
                        ? "Validado: elige una casilla de tu cartón"
                        : `No era: escribiste "${myRoundGuess.text}"`}
                    </p>
                  )}
                  {!myRoundGuess && <p className="tag mt-3">no respondiste esta ronda</p>}
                </div>
              )}

              {/* marcado */}
              {room.phase === "marking" && genre && (
                <div className="text-center">
                  {iAmValidated ? (
                    <>
                      <p className="font-display font-bold text-boliviano">¡Validado!</p>
                      <p className="tag mt-1">
                        toca una casilla <b style={{ color: genre.color }}>{genre.name}</b> de tu cartón
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display font-bold">Marcando cartones</p>
                      <p className="tag mt-1">
                        {roundGuesses.filter((g) => g.correct).length} validados eligiendo casilla
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* ganador */}
              {room.status === "finished" && (
                <div className="text-center">
                  <p className="tag">fin de la partida</p>
                  <p className="font-display font-black text-2xl mt-1">{winner?.name ?? "¿?"}</p>
                  <p className={`tag mt-1 ${room.winner_id === playerId ? "text-clasicos" : ""}`}>
                    {room.winner_id === playerId ? "ganaste la noche" : "espera la revancha"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

function contextKey(
  room: { phase: string; status: string },
  isMyTurn: boolean,
  spinning: boolean,
  open: boolean,
  marking: boolean,
): string {
  if (room.status === "lobby") return "lobby";
  if (room.phase === "intro") return isMyTurn ? "intro-me" : "intro-other";
  if (room.phase === "listening") return spinning ? "spin" : open ? "listen" : "closed";
  if (room.phase === "revealing") return "reveal";
  if (room.phase === "marking") return marking ? "mark-me" : "mark-wait";
  return "finished";
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center px-5 py-10">{children}</main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-3xl p-8 max-w-sm text-center">
      <h2 className="font-display font-bold text-xl">{title}</h2>
      <p className="text-bone/60 text-sm mt-3">{body}</p>
      <Link href="/" className="tag block mt-5 hover:text-bone">
        portada
      </Link>
    </div>
  );
}
