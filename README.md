# RITMO BINGO

Bingo musical en vivo, estilo Kahoot: una pantalla principal (TV/PC) muestra la
ruleta y los eventos; los jugadores entran desde su celular con un código de
4 caracteres, reciben un cartón de bingo de colores y compiten adivinando
canciones. Cada color del cartón es un género musical.

## Cómo se juega

1. El anfitrión crea una sala desde la portada y la abre en la TV/proyector.
2. Cada jugador entra desde su celular con el código (o el QR) y recibe un
   cartón único: 5x5, con 4 casillas de cada género y un comodín central.
3. Por turnos, alguien gira la ruleta. El color que sale define el género y
   suena automáticamente un fragmento de 30 s de una canción al azar de ese
   género (en la pantalla principal).
4. Todos escriben el título en su celular antes de que acabe el tiempo. El
   servidor valida con tolerancia (acentos, typos, contracciones).
5. Quienes aciertan quedan validados y eligen QUÉ casilla de ese color llenar
   en su cartón.
6. Gana el primero que completa una fila. El host puede lanzar una revancha.

Los seis géneros de la ruleta: Rock, Cumbia, Pop, Boliviano, Urbano y
Clásicos 70s-90s. La base de canciones vive en `supabase/seed.sql`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion
- Supabase: Postgres (datos) + Realtime (websockets, sincronización en vivo)
- Audio: fragmentos de 30 s vía iTunes Search API (gratuito, sin claves),
  buscados al vuelo y cacheados en la base de datos
- Deploy: Vercel

## Puesta en marcha

### 1. Proyecto Supabase (gratis)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región cercana).
2. En **SQL Editor**, pega y ejecuta `supabase/schema.sql`.
3. Después pega y ejecuta `supabase/seed.sql` (los 6 géneros + ~100 canciones).
4. En **Settings → API** copia tres valores:
   - `Project URL`
   - `anon public` key
   - `service_role` key

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Desarrollo

```bash
npm install
npm run dev
```

Pruebas de la lógica core (cartones, matcher, ruleta, turnos):

```bash
npx tsx scripts/test-core.ts
```

### 4. Deploy a Vercel

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

(o conecta el repo en vercel.com y añade las variables en Project Settings)

## Notas técnicas

- **Tiempo real:** cada cliente se suscribe a `postgres_changes` de las tablas
  `rooms`, `players` y `guesses` filtradas por código de sala; los cambios
  disparan re-lecturas con debounce. Las cuentas regresivas se calculan con
  los timestamps de la sala (`spin_started_at`, `guess_deadline`), así todas
  las pantallas quedan sincronizadas sin canales extra.
- **Seguridad:** lectura pública (RLS select) y escrituras solo desde las API
  routes con `service_role`. El host autentica sus acciones con un secreto que
  se guarda en su navegador.
- **Audio:** `GET /api/preview?song=id` busca el fragmento en iTunes, lo cachea
  en la columna `songs.preview_url` y devuelve la URL. Si una canción no tiene
  fragmento disponible se marca como `none` y el juego elige otra del mismo
  género automáticamente.
- **Presencia:** latido cada 12 s por jugador; quien no late en 45 s se marca
  desconectado y se salta en la rotación de turnos.
