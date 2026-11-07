"use client";

// Ecualizador animado para el panel "al aire".

export function Equalizer({ color, bars = 7, className = "" }: { color: string; bars?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-[5px] ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[6px] rounded-full animate-eq"
          style={{
            height: `${34 + ((i * 53) % 46)}%`,
            background: color,
            animationDelay: `${(i * 137) % 700}ms`,
            animationDuration: `${700 + ((i * 91) % 500)}ms`,
          }}
        />
      ))}
    </div>
  );
}
