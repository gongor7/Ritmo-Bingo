"use client";

// Anillo de cuenta regresiva sincronizado con el reloj local.

import { useEffect, useRef, useState } from "react";

interface TimerRingProps {
  endsAt: number; // timestamp ms
  totalMs: number;
  size?: number;
}

export function TimerRing({ endsAt, totalMs, size = 84 }: TimerRingProps) {
  const [now, setNow] = useState(() => Date.now());
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [endsAt]);

  const remain = Math.max(0, endsAt - now);
  const frac = totalMs > 0 ? remain / totalMs : 0;
  const secs = Math.ceil(remain / 1000);
  const urgent = remain < 6000 && remain > 0;

  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,242,236,.12)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? "#e5484d" : "#f4f2ec"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{ transition: "stroke .3s" }}
        />
      </svg>
      <span
        className={`absolute font-display font-extrabold ${urgent ? "text-rock" : "text-bone"}`}
        style={{ fontSize: size * 0.3 }}
      >
        {secs}
      </span>
    </div>
  );
}
