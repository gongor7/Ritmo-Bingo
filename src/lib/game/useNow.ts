"use client";

import { useEffect, useState } from "react";

// Reloj compartido para cuentas regresivas sincronizadas por timestamp.
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
