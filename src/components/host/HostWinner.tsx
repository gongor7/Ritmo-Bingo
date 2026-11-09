"use client";

// Celebración: partículas de colores, ganador y podio.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ALL_GENRES } from "@/lib/game/config";
import { standings } from "@/lib/game/turns";
import type { PlayerRow, RoomRow } from "@/lib/game/types";

interface HostWinnerProps {
  room: RoomRow;
  players: PlayerRow[];
  onRematch: () => Promise<void>;
  busy: boolean;
}

interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
}

export function HostWinner({ room, players, onRematch, busy }: HostWinnerProps) {
  const winner = players.find((p) => p.id === room.winner_id) ?? null;
  const board = standings(players);

  const particles = useMemo<Particle[]>(() => {
    const colors = ALL_GENRES.map((g) => g.color);
    return Array.from({ length: 90 }, (_, i) => ({
      left: (i * 61) % 100,
      delay: (i * 137) % 2200,
      duration: 2600 + ((i * 271) % 2400),
      size: 5 + ((i * 31) % 8),
      color: colors[i % colors.length],
      round: i % 3 === 0,
    }));
  }, []);

  return (
    <div className="relative w-full max-w-4xl text-center overflow-hidden">
      {/* partículas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * (p.round ? 1 : 2.2),
              borderRadius: p.round ? "999px" : "1px",
              background: p.color,
              animation: `confetti-fall ${p.duration}ms linear ${p.delay}ms infinite`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
        className="relative"
      >
        <p className="tag">fila completa · fin de la partida</p>
        <h1 className="font-display font-black text-[clamp(2.8rem,10vw,7rem)] leading-none mt-4 break-words">
          {winner?.name ?? "¿?"}
        </h1>
        <p className="font-display font-bold text-2xl mt-2 text-clasicos">GANÓ LA NOCHE</p>

        <div className="mt-10 glass rounded-3xl p-6 max-w-xl mx-auto text-left">
          <p className="tag mb-4">standings</p>
          <ol className="space-y-2.5">
            {board.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                  i === 0 ? "bg-clasicos/15 border border-clasicos/40" : "bg-white/[0.04] border border-white/8"
                }`}
              >
                <span className="font-semibold">
                  <span className="font-display font-bold text-bone/50 mr-3">{i + 1}</span>
                  {s.name}
                </span>
                <span className="font-display font-bold">{s.marks}</span>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={() => void onRematch()}
          disabled={busy}
          className="mt-10 rounded-2xl bg-clasicos text-ink font-display font-extrabold tracking-widest px-14 py-4 text-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
        >
          REVANCHA
        </button>
      </motion.div>
    </div>
  );
}
