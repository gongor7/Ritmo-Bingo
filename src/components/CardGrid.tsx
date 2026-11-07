"use client";

// Cartón 5x5. Modos: "view" (lectura) y "mark" (elegir celda del color activo).

import { motion } from "framer-motion";
import { CARD_SIZE, GENRE_MAP, type GenreId } from "@/lib/game/config";
import type { Cell } from "@/lib/game/types";

interface CardGridProps {
  card: Cell[];
  mode?: "view" | "mark";
  markingColor?: GenreId | null;
  onCellTap?: (index: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function CardGrid({ card, mode = "view", markingColor = null, onCellTap, disabled = false, compact = false }: CardGridProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full">
      {card.map((cell: Cell, i: number) => {
        if (cell.g === "wild") return <WildCell key={i} compact={compact} />;
        const g = GENRE_MAP[cell.g];
        const isTarget = mode === "mark" && markingColor === cell.g && !cell.marked && !disabled;
        const dimmed = mode === "mark" && markingColor !== null && markingColor !== cell.g && !cell.marked;

        if (cell.marked) {
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={`relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-1 ${compact ? "rounded-lg" : ""}`}
              style={{
                background: "#14141c",
                border: `1.5px solid ${g.color}`,
                boxShadow: `inset 0 0 18px ${g.glow}`,
              }}
            >
              {/* sello de marcado */}
              <div className="absolute inset-0" style={{ background: `${g.color}14` }} />
              <span
                className={`relative ${compact ? "text-[7px] leading-tight" : "text-[9px] sm:text-[11px] leading-tight"} font-semibold text-bone/90 px-0.5 line-clamp-3`}
              >
                {cell.song ?? "Marcada"}
              </span>
              <span
                className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
                style={{ background: g.color }}
              />
            </motion.div>
          );
        }

        return (
          <button
            key={i}
            type="button"
            disabled={!isTarget}
            onClick={() => isTarget && onCellTap?.(i)}
            className={`relative aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center p-1 transition-all duration-200 ${compact ? "rounded-lg" : ""} ${
              isTarget
                ? "cursor-pointer ring-2 ring-bone/90 ring-offset-2 ring-offset-ink scale-[1.03]"
                : "cursor-default"
            } ${dimmed ? "opacity-35" : "opacity-100"}`}
            style={{
              background: `linear-gradient(150deg, ${g.color}, ${g.color}bb)`,
              border: `1.5px solid ${g.color}`,
              boxShadow: isTarget ? `0 0 26px ${g.glow}` : "none",
            }}
          >
            <span
              className={`${compact ? "text-[8px]" : "text-[10px] sm:text-xs"} font-bold tracking-wide`}
              style={{ color: g.ink }}
            >
              {g.name}
            </span>
            {!cell.marked && isTarget && (
              <span className="absolute inset-x-0 bottom-1 text-[7px] uppercase tracking-widest" style={{ color: g.ink }}>
                llenar
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function WildCell({ compact }: { compact: boolean }) {
  return (
    <div
      className={`relative aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center ${compact ? "rounded-lg" : ""}`}
      style={{
        background: "radial-gradient(circle at 50% 40%, #26263a, #12121a)",
        border: "1.5px dashed rgba(244,242,236,.4)",
      }}
    >
      <svg viewBox="0 0 24 24" className={compact ? "w-4 h-4" : "w-6 h-6 sm:w-8 sm:h-8"} fill="none">
        <path
          d="M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z"
          fill="#f4f2ec"
          opacity="0.92"
        />
      </svg>
    </div>
  );
}

export function cardRowsComplete(card: Cell[]): number[] {
  const rows: number[] = [];
  for (let r = 0; r < CARD_SIZE; r++) {
    if (card.slice(r * CARD_SIZE, r * CARD_SIZE + CARD_SIZE).every((c) => c.marked)) rows.push(r);
  }
  return rows;
}
