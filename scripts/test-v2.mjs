// Prueba end-to-end de la v2 contra producción:
// géneros elegidos, modo de adivinanza y marcado.
const BASE = "https://ritmo-bingo.vercel.app";
const api = async (p, b) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
  const d = await r.json();
  if (!r.ok) throw new Error(`${p} -> ${JSON.stringify(d)}`);
  return d;
};

(async () => {
  const room = await api("/api/rooms", {
    listenSeconds: 20,
    genres: ["salsa", "baladas", "rock-es", "electronica", "boliviano"],
    guessMode: "ambos",
  });
  const code = room.code, secret = room.hostSecret;
  console.log(`sala ${code}: 5 géneros (4 nuevos + boliviano), modo ambos`);

  const p1 = await api(`/api/rooms/${code}/join`, { name: "Ana" });
  const p2 = await api(`/api/rooms/${code}/join`, { name: "Beto" });

  // cambiar géneros en el lobby: los cartones de los presentes se regeneran
  await api(`/api/rooms/${code}/action`, { action: "settings", secret, genres: ["salsa", "baladas", "rock-es", "electronica"] });
  const cardAfterChange = await api(`/api/rooms/${code}/join`, { name: "Cami" });
  if (cardAfterChange.card.some((c) => c.g === "boliviano")) throw new Error("cartón con género fuera de la selección");
  console.log("regeneración de cartones tras cambiar géneros: ok");

  await api(`/api/rooms/${code}/action`, { action: "start", secret });

  const players = [p1, p2, cardAfterChange];
  const allowed = ["salsa", "baladas", "rock-es", "electronica"];
  let lastTitle = null, okNoRepeat = true, okModeAmbos = true, okModeTitulo = true;

  for (let round = 1; round <= 8; round++) {
    // latidos + leer turno autoritativo de la sala
    for (const p of players) {
      await api(`/api/rooms/${code}/action`, { action: "heartbeat", playerId: p.playerId });
    }
    const roomRow = await fetch(
      `https://npkckugfybtswjlaehmo.supabase.co/rest/v1/rooms?code=eq.${code}&select=turn_player_id`,
      { headers: { apikey: "sb_publishable_KofTPNykfH1cVBdP7WWmaQ_RS_i4isb" } },
    ).then((r) => r.json());
    const turn = players.find((p) => p.playerId === roomRow[0].turn_player_id);
    if (!turn) throw new Error("turno no encontrado entre los jugadores");

    const spin = await api(`/api/rooms/${code}/action`, { action: "spin", playerId: turn.playerId });
    if (!allowed.includes(spin.color)) throw new Error(`color fuera de la selección: ${spin.color}`);
    if (lastTitle && spin.song.title === lastTitle) okNoRepeat = false;
    lastTitle = spin.song.title;
    console.log(`ronda ${round}: ${spin.color} -> "${spin.song.title}" - ${spin.song.artist}`);

    // impar: responde el ARTISTA (valida el 'ambos'); par: responde el TÍTULO
    const answer = round % 2 === 1 ? spin.song.artist : spin.song.title;
    await api(`/api/rooms/${code}/action`, { action: "guess", playerId: turn.playerId, text: answer });
    const rev = await api(`/api/rooms/${code}/action`, { action: "reveal", secret });
    if (rev.correctCount !== 1) {
      if (round % 2 === 1) okModeAmbos = false; else okModeTitulo = false;
    }
    await api(`/api/rooms/${code}/action`, { action: "tomark", secret });

    // marcar la primera celda libre del color (del cartón regenerado de quien gira)
    const res = await fetch(
      `https://npkckugfybtswjlaehmo.supabase.co/rest/v1/players?id=eq.${turn.playerId}&select=card`,
      { headers: { apikey: "sb_publishable_KofTPNykfH1cVBdP7WWmaQ_RS_i4isb" } },
    );
    const [{ card: cells }] = await res.json();
    const idx = cells.findIndex((c) => c.g === spin.color && !c.marked);
    if (idx === -1) throw new Error("sin celda libre del color (reparto desbalanceado)");
    await api(`/api/rooms/${code}/action`, { action: "mark", playerId: turn.playerId, cellIndex: idx });
  }

  console.log(okNoRepeat ? "sin repeticiones consecutivas: ok" : "FALLO: se repitió canción");
  console.log(okModeAmbos ? "modo ambos (artista cuenta): ok" : "FALLO: modo ambos no validó artista");
  console.log(okModeTitulo ? "modo ambos (título cuenta): ok" : "FALLO: modo ambos no validó título");
  if (!okNoRepeat || !okModeAmbos || !okModeTitulo) process.exit(1);
  console.log("\nV2 OK: géneros elegidos, regeneración, ambos modos, sin repeticiones");
})().catch((e) => { console.error("FALLO:", e.message); process.exit(1); });
