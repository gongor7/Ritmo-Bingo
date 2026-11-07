"use client";

// Pantalla principal (TV/PC): lobby, juego y celebración.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Ambient } from "@/components/Ambient";
import { HostLobby } from "@/components/host/HostLobby";
import { HostGame } from "@/components/host/HostGame";
import { HostWinner } from "@/components/host/HostWinner";
import { useRoom } from "@/lib/game/useRoom";
import { loadHostSecret, postAction } from "@/lib/game/client";
import { supabaseConfigured } from "@/lib/supabase/client";

export default function HostPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center">
          <p className="tag animate-pulse-soft">cargando sala...</p>
        </main>
      }
    >
      <HostInner />
    </Suspense>
  );
}

function HostInner() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toUpperCase();
  const [secret, setSecret] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const unlockRef = useRef(false);

  const { room, players, guesses, loading, error } = useRoom(code);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- inicialización desde localStorage
    setSecret(loadHostSecret(code));
    setChecked(true);
  }, [code]);

  // Desbloqueo de audio: el primer toque en la página habilita el autoplay.
  useEffect(() => {
    const unlock = () => {
      if (unlockRef.current) return;
      unlockRef.current = true;
      try {
        const el = new Audio(
          "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//uQxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhADt7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t//////////////////////////////////////////////////////////////////uQxAAAADwAAABIAAABhAGQAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwBkAGEAcwD/7LEQAAAKAAAAAAAIlBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAAAAKAAAAAMQAlBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
        );
        el.play().then(() => el.pause()).catch(() => undefined);
      } catch {
        /* noop */
      }
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  const run = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (!secret) return;
      setBusy(true);
      await postAction(code, { action, secret, ...extra });
      setBusy(false);
    },
    [code, secret],
  );

  if (!supabaseConfigured) {
    return (
      <Shell>
        <Notice
          title="Falta configurar Supabase"
          body="Crea el archivo .env.local con NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY. Las instrucciones están en el README."
        />
      </Shell>
    );
  }

  if (!checked || loading) {
    return (
      <Shell>
        <p className="tag animate-pulse-soft">cargando sala...</p>
      </Shell>
    );
  }

  if (error || !room) {
    return (
      <Shell>
        <Notice title="Sala no encontrada" body={error ?? "Esta sala no existe o expiró."} home />
      </Shell>
    );
  }

  if (!secret) {
    return (
      <Shell>
        <Notice
          title="Esta pantalla no es el host"
          body="El acceso de anfitrión se guarda al crear la sala desde la portada. Si eres el anfitrión, crea la sala de nuevo desde ahí."
          home
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Ambient />
      {room.status === "lobby" && (
        <HostLobby room={room} players={players} onStart={() => run("start")} onSettings={(s) => run("settings", { listenSeconds: s })} busy={busy} />
      )}
      {room.status === "playing" && (
        <HostGame room={room} players={players} guesses={guesses} secret={secret} />
      )}
      {room.status === "finished" && (
        <HostWinner room={room} players={players} onRematch={() => run("rematch")} busy={busy} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center px-5 py-8 gap-6">
      {children}
      <Link href="/" className="tag hover:text-bone transition absolute top-5 right-6">
        salir
      </Link>
    </main>
  );
}

function Notice({ title, body, home = false }: { title: string; body: string; home?: boolean }) {
  return (
    <div className="glass rounded-3xl p-10 max-w-md text-center">
      <h2 className="font-display font-bold text-2xl">{title}</h2>
      <p className="text-bone/60 text-sm mt-3 leading-relaxed">{body}</p>
      {home && (
        <Link
          href="/"
          className="inline-block mt-6 rounded-2xl bg-bone text-ink font-display font-bold tracking-wide px-8 py-3"
        >
          IR A LA PORTADA
        </Link>
      )}
    </div>
  );
}
