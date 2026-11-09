// Validación de respuestas: normalización + tolerancia para fiesta.
//
// Acepta cuando la respuesta:
//  1. es idéntica al título normalizado,
//  2. contiene el título completo normalizado (le agregaron el artista o sobras),
//  3. contiene todas las palabras significativas del título (con tolerancia a
//     errores de tipeo por palabra y prefijos suficientemente largos),
//  4. es un subconjunto grande de palabras del título (títulos de 3+ palabras:
//     "viva mi patria" cuenta para "Viva Mi Patria Bolivia"),
//  5. dista poco del título completo (distancia de Levenshtein limitada).

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "y", "e", "o",
  "u", "en", "que", "mi", "tu", "su", "me", "te", "se", "lo", "le", "les", "no", "ni", "con",
  "sin", "por", "para", "es", "son", "oh", "ay", "the", "of", "in", "on", "to", "and", "it",
  "is", "my", "i", "im",
]);

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/\(.*?\)|\[.*?\]/g, " ") // quitar paréntesis/corchetes
    .replace(/\b(feat|ft|con)\b.*$/g, " ") // quitar colaboraciones
    .replace(/[.'`'']/g, "") // puntos y apóstrofes se unen: Y.M.C.A. -> ymca
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Contracciones y variantes con las que la gente canta/escribe ciertas palabras.
const CANON: Record<string, string> = {
  wanna: "want", gonna: "going", gotta: "got", kinda: "kind", lemme: "let",
  gimme: "give", cause: "because", yall: "you", tho: "though", dunno: "know",
};

function wordsOf(normalized: string): string[] {
  return normalized
    .split(" ")
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
    .map((w) => CANON[w] ?? w);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

function tolerance(title: string): number {
  if (title.length > 12) return 3;
  if (title.length > 3) return 2;
  return 1;
}

// Una palabra del título "cuenta" en la respuesta si coincide con tolerancia.
function wordMatches(titleWord: string, guessWord: string): boolean {
  if (titleWord === guessWord) return true;
  if (titleWord.length >= 4 && guessWord.length >= 4) {
    if (titleWord.startsWith(guessWord) || guessWord.startsWith(titleWord)) return true;
    if (levenshtein(titleWord, guessWord) <= 1) return true;
  }
  return false;
}

// title y guess crudos (con acentos, mayúsculas, etc.). Devuelve true si cuenta como acierto.
export function isGuessCorrect(rawTitle: string, rawGuess: string): boolean {
  return matchesAny(rawTitle, rawGuess);
}

// Valida según el modo elegido por el host: título, artista o ambos.
export function isGuessCorrectByMode(
  rawTitle: string,
  rawArtist: string,
  rawGuess: string,
  mode: "titulo" | "artista" | "ambos",
): boolean {
  if (mode === "titulo") return matchesAny(rawTitle, rawGuess);
  if (mode === "artista") return matchesAny(rawArtist, rawGuess);
  return matchesAny(rawTitle, rawGuess) || matchesAny(rawArtist, rawGuess);
}

function matchesAny(rawTarget: string, rawGuess: string): boolean {
  const title = normalize(rawTarget);
  const guess = normalize(rawGuess);
  if (!title || !guess) return false;
  if (title === guess) return true;
  if (title.length >= 4 && guess.includes(title)) return true;

  const titleWords = wordsOf(title);
  const guessWords = wordsOf(guess);
  if (titleWords.length === 0 || guessWords.length === 0) return false;

  // Todas las palabras del título presentes (con tolerancia) en la respuesta.
  if (titleWords.every((w) => guessWords.some((gw) => wordMatches(w, gw)))) return true;

  // Título parcial: 3+ palabras significativas y la respuesta cubre la mayoría.
  if (titleWords.length >= 3 && guessWords.length >= 2) {
    const covered = guessWords.filter((gw) => titleWords.some((w) => wordMatches(w, gw))).length;
    const allGuessWordsBelong = guessWords.every((gw) => titleWords.some((w) => wordMatches(w, gw)));
    if (allGuessWordsBelong && covered / titleWords.length >= 0.6) return true;
  }

  // Tolerancia a errores de tipeo sobre la respuesta completa.
  const max = tolerance(title);
  if (Math.abs(title.length - guess.length) <= max && levenshtein(title, guess) <= max) return true;

  return false;
}
