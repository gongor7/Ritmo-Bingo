"use client";

// Suscripción en tiempo real al estado de la sala (rooms + players + guesses).
// Cada cambio dispara una re-lectura con debounce: simple y a prueba de payloads.

import { useEffect, useRef, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { fetchSnapshot, postAction, type RoomSnapshot } from "@/lib/game/client";

export interface UseRoomResult extends RoomSnapshot {
  loading: boolean;
  error: string | null;
  realtimeReady: boolean;
  refresh: () => Promise<void>;
}

export function useRoom(code: string, playerId?: string | null): UseRoomResult {
  const [snap, setSnap] = useState<RoomSnapshot>({
    room: null as unknown as RoomSnapshot["room"],
    players: [],
    guesses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = async () => {
    if (!supabaseConfigured) {
      setError("Supabase sin configurar");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchSnapshot(code);
      setSnap(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicio al cambiar de sala
    setLoading(true);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Canal realtime. Tópico único por montaje: StrictMode desmonta/remonta el
  // efecto y reutilizar el mismo tópico deja el canal muerto en silencio.
  const mountSeq = useRef(0);
  useEffect(() => {
    if (!supabaseConfigured) return;
    const db = getSupabase();
    const seq = ++mountSeq.current;
    const channel = db
      .channel(`room:${code}:${seq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        () => schedule(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        () => schedule(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guesses", filter: `room_code=eq.${code}` },
        () => schedule(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeReady(true);
      });

    function schedule() {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void refresh(), 120);
    }

    return () => {
      void db.removeChannel(channel);
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Red de seguridad: sondeo ligero mientras la pestaña está visible.
  // Cubre navegadores/webviews cuyo websocket no recibe postgres_changes;
  // con realtime activo el sondeo apenas hace lecturas redundantes.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Latido de presencia del jugador
  useEffect(() => {
    if (!playerId) return;
    const beat = () => void postAction(code, { action: "heartbeat", playerId });
    beat();
    const t = setInterval(beat, 12_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        beat();
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId]);

  return { ...snap, loading, error, realtimeReady, refresh };
}
