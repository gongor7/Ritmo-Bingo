"use client";

// Proyección del host a la tele: Chromecast vía Presentation API,
// pantalla completa y guía con alternativas (Smart TV, HDMI).

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

declare global {
  interface Window {
    PresentationRequest?: new (url: string | string[]) => {
      start(): Promise<{ onterminated: (() => void) | null; terminate(): void }>;
    };
    Presentation?: { defaultRequest?: unknown };
  }
}

export function ProjectTV() {
  const [casting, setCasting] = useState(false);
  const [modal, setModal] = useState(false);
  const [full, setFull] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detección de API del navegador al montar
    setSupported(Boolean(window.PresentationRequest));
    // habilita el icono de emisión nativo de Chrome en la barra de direcciones
    try {
      if (window.PresentationRequest && window.location.pathname.startsWith("/host/")) {
        window.Presentation = window.Presentation ?? {};
        window.Presentation.defaultRequest = new window.PresentationRequest(window.location.href);
      }
    } catch {
      /* el icono nativo es opcional */
    }
  }, []);

  const startCast = async () => {
    if (!window.PresentationRequest) {
      setModal(true);
      return;
    }
    try {
      const request = new window.PresentationRequest(window.location.href);
      const connection = await request.start();
      setCasting(true);
      connection.onterminated = () => setCasting(false);
    } catch {
      // el usuario canceló el selector o el navegador no pudo: mostrar guía
      setModal(true);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFull(false);
      } else {
        await document.documentElement.requestFullscreen();
        setFull(true);
      }
    } catch {
      /* algunos navegadores lo bloquean fuera de gesto */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void startCast()}
        className="rounded-xl border border-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase text-bone/70 hover:text-bone hover:border-white/35 transition"
      >
        {casting ? "proyectando..." : "proyectar en TV"}
      </button>
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className="rounded-xl border border-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase text-bone/70 hover:text-bone hover:border-white/35 transition"
      >
        {full ? "salir de pantalla completa" : "pantalla completa"}
      </button>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm"
            onClick={() => setModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="glass rounded-3xl p-8 max-w-lg text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-xl">Proyectar en la tele</h3>
              <p className="text-bone/55 text-sm mt-1">
                El celular de cada jugador sigue funcionando igual: la TV solo muestra esta pantalla.
              </p>

              <ol className="mt-5 space-y-4 text-sm text-bone/75 leading-relaxed">
                <li>
                  <span className="font-display font-bold text-bone mr-2">A.</span>
                  <b className="text-bone">Chromecast / Android TV / Google TV:</b>{" "}
                  {supported ? (
                    <>
                      vuelve a pulsar &quot;proyectar en TV&quot; y elige tu televisor en el selector de
                      Chrome (TV y PC en el mismo Wi-Fi). También funciona desde el menú de Chrome:
                      <b className="text-bone"> Guardar y compartir → Emitir</b>.
                    </>
                  ) : (
                    <>
                      abre esta página en <b className="text-bone">Google Chrome</b> (PC o portátil) y
                      usa su menú: <b className="text-bone">Guardar y compartir → Emitir</b> → elige tu
                      TV. Este navegador no lo soporta.
                    </>
                  )}
                </li>
                <li>
                  <span className="font-display font-bold text-bone mr-2">B.</span>
                  <b className="text-bone">Smart TV con navegador:</b>{" "}
                  abre <b className="text-bone">ritmo-bingo.vercel.app</b> en el navegador de la tele y
                  crea la sala desde ahí — la TV se convierte en el anfitrión y ni siquiera necesitas
                  la computadora.
                </li>
                <li>
                  <span className="font-display font-bold text-bone mr-2">C.</span>
                  <b className="text-bone">Cable HDMI:</b> conecta la computadora a la tele, activa
                  &quot;pantalla completa&quot; y listo.
                </li>
              </ol>

              <p className="tag mt-5">consejo: activa pantalla completa para la proyección</p>

              <button
                type="button"
                onClick={() => setModal(false)}
                className="mt-5 w-full rounded-2xl bg-bone text-ink font-display font-bold tracking-wide py-3"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
