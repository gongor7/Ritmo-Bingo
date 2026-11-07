"use client";

// Ruleta SVG de 6 segmentos. El padre controla el ángulo acumulado para que
// cada giro continúe desde donde quedó el anterior (nunca retrocede).

import { motion } from "framer-motion";
import { GENRES, SPIN_SECONDS } from "@/lib/game/config";

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`;
}

interface WheelProps {
  rotation: number;
  landedIndex: number | null;
  spinning: boolean;
  size?: number;
}

export function Wheel({ rotation, landedIndex, spinning, size = 420 }: WheelProps) {
  const seg = 360 / GENRES.length;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* halo del color donde cayó */}
      {landedIndex !== null && landedIndex >= 0 && !spinning && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-soft"
          style={{
            boxShadow: `0 0 90px 12px ${GENRES[landedIndex].glow}, inset 0 0 40px ${GENRES[landedIndex].glow}`,
          }}
        />
      )}

      <svg viewBox="0 0 200 200" width={size} height={size} className="relative block">
        <defs>
          <radialGradient id="cap" cx="50%" cy="38%" r="80%">
            <stop offset="0%" stopColor="#2a2a38" />
            <stop offset="100%" stopColor="#0b0b10" />
          </radialGradient>
        </defs>

        <motion.g
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: SPIN_SECONDS, ease: [0.14, 0.72, 0.16, 1] }
              : { duration: 0.4, ease: "easeOut" }
          }
          style={{ transformOrigin: "100px 100px" }}
        >
          {GENRES.map((g, i) => {
            const a0 = i * seg;
            const a1 = (i + 1) * seg;
            const mid = a0 + seg / 2;
            const label = polar(100, 100, 66, mid);
            return (
              <g key={g.id}>
                <path
                  d={segmentPath(100, 100, 96, a0, a1)}
                  fill={g.color}
                  stroke="#0b0b10"
                  strokeWidth="1.4"
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill={g.ink}
                  fontSize="8.2"
                  fontWeight="800"
                  letterSpacing="0.08em"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${label.x}, ${label.y})`}
                  style={{ fontFamily: "var(--font-sans)", textTransform: "uppercase" }}
                >
                  {g.name}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* aro exterior */}
        <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(244,242,236,.16)" strokeWidth="2" />
        {/* remaches */}
        {GENRES.map((_, i) => {
          const p = polar(100, 100, 96.5, i * seg);
          return <circle key={i} cx={p.x} cy={p.y} r="2" fill="#0b0b10" opacity="0.7" />;
        })}

        {/* centro */}
        <circle cx="100" cy="100" r="24" fill="url(#cap)" stroke="rgba(244,242,236,.25)" strokeWidth="1.5" />
        <path
          d="M100 86 L103.5 96.5 L114 100 L103.5 103.5 L100 114 L96.5 103.5 L86 100 L96.5 96.5 Z"
          fill="#f4f2ec"
          opacity="0.9"
        />
      </svg>

      {/* puntero */}
      <div className="absolute left-1/2 top-[-10px] -translate-x-1/2">
        <div className="h-0 w-0 border-x-[11px] border-t-[20px] border-x-transparent border-t-bone drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" />
      </div>
    </div>
  );
}

// Ángulo final (acumulado) para que el segmento i caiga bajo el puntero.
export function targetRotation(currentRotation: number, index: number): number {
  const seg = 360 / GENRES.length;
  const center = index * seg + seg / 2;
  const mod = (((currentRotation % 360) + 360) % 360);
  const need = (((-center - mod) % 360) + 360) % 360;
  return currentRotation + 360 * 5 + need;
}
