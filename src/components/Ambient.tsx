"use client";

// Fondo ambiental: blobs de color de los géneros flotando lentamente.

import { ALL_GENRES } from "@/lib/game/config";

export function Ambient() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {ALL_GENRES.map((g, i) => (
        <div
          key={g.id}
          className="absolute rounded-full blur-[110px] opacity-[0.16]"
          style={{
            width: 380 + i * 40,
            height: 380 + i * 40,
            background: g.color,
            left: `${(i * 37 + 6) % 80}%`,
            top: `${(i * 53 + 10) % 75}%`,
            animation: `ambient-float ${18 + i * 5}s ease-in-out ${i * 1.3}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
