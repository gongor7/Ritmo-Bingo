-- ============================================================
-- RITMO BINGO - esquema
-- Pegar completo en Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- generos ----------
create table if not exists genres (
  id       text primary key,
  name     text not null,
  color    text not null,
  ink      text not null default '#0b0b10',
  position int  not null
);

-- ---------- canciones ----------
create table if not exists songs (
  id          uuid primary key default gen_random_uuid(),
  genre_id    text not null references genres(id) on delete cascade,
  title       text not null,
  artist      text not null,
  preview_url text,
  created_at  timestamptz not null default now()
);
create index if not exists songs_genre_idx on songs(genre_id);

-- ---------- salas ----------
create table if not exists rooms (
  code             text primary key,
  status           text not null default 'lobby',    -- lobby | playing | finished
  phase            text not null default 'lobby',    -- lobby | intro | listening | revealing | marking | winner
  round            int  not null default 0,
  turn_player_id   uuid,
  color            text,                             -- genero actual de la ronda
  song_id          uuid,
  song_title       text,
  song_artist      text,
  spin_started_at  timestamptz,
  guess_deadline   timestamptz,
  pending_markers  jsonb not null default '[]',
  winner_id        uuid,
  settings         jsonb not null default '{}',
  host_secret      text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- jugadores ----------
create table if not exists players (
  id         uuid primary key default gen_random_uuid(),
  room_code  text not null references rooms(code) on delete cascade,
  name       text not null,
  seat       int  not null,
  card       jsonb not null,
  connected  boolean not null default true,
  last_seen  timestamptz not null default now(),
  joined_at  timestamptz not null default now()
);
create index if not exists players_room_idx on players(room_code);

-- ---------- respuestas ----------
create table if not exists guesses (
  id          uuid primary key default gen_random_uuid(),
  room_code   text not null references rooms(code) on delete cascade,
  round       int  not null,
  player_id   uuid not null references players(id) on delete cascade,
  player_name text not null,
  text        text not null,
  correct     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists guesses_room_idx on guesses(room_code);

-- ---------- seguridad ----------
alter table genres  enable row level security;
alter table songs   enable row level security;
alter table rooms   enable row level security;
alter table players enable row level security;
alter table guesses enable row level security;

drop policy if exists "public_read_genres"  on genres;
drop policy if exists "public_read_songs"   on songs;
drop policy if exists "public_read_rooms"   on rooms;
drop policy if exists "public_read_players" on players;
drop policy if exists "public_read_guesses" on guesses;

create policy "public_read_genres"  on genres  for select using (true);
create policy "public_read_songs"   on songs   for select using (true);
create policy "public_read_rooms"   on rooms   for select using (true);
create policy "public_read_players" on players for select using (true);
create policy "public_read_guesses" on guesses for select using (true);

-- Escrituras: SOLO via API con service_role (RLS bloquea a anon).

-- ---------- realtime ----------
do $$ begin
  alter publication supabase_realtime add table rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table guesses;
exception when duplicate_object then null; when undefined_object then null; end $$;
-- ============================================================
-- RITMO BINGO - semilla: 6 generos + ~100 canciones
-- Ejecutar DESPUES de schema.sql en Supabase SQL Editor
-- ============================================================

insert into genres (id, name, color, ink, position) values
  ('rock',      'Rock',      '#e5484d', '#0b0b10', 0),
  ('cumbia',    'Cumbia',    '#ff8a1e', '#0b0b10', 1),
  ('pop',       'Pop',       '#3e9bff', '#0b0b10', 2),
  ('boliviano', 'Boliviano', '#2ec27e', '#0b0b10', 3),
  ('urbano',    'Urbano',    '#9a5bff', '#0b0b10', 4),
  ('clasicos',  'Clásicos',  '#ffd22e', '#0b0b10', 5)
on conflict (id) do nothing;

-- limpiar canciones si se re-ejecuta la semilla
delete from songs where genre_id in ('rock','pop','urbano','cumbia','boliviano','clasicos');

-- ---------- ROCK ----------
insert into songs (genre_id, title, artist) values
  ('rock', 'Bohemian Rhapsody', 'Queen'),
  ('rock', 'Hotel California', 'Eagles'),
  ('rock', 'Sweet Child O'' Mine', 'Guns N'' Roses'),
  ('rock', 'Back In Black', 'AC/DC'),
  ('rock', 'Highway to Hell', 'AC/DC'),
  ('rock', 'Smells Like Teen Spirit', 'Nirvana'),
  ('rock', 'Smoke on the Water', 'Deep Purple'),
  ('rock', 'Stairway to Heaven', 'Led Zeppelin'),
  ('rock', 'Enter Sandman', 'Metallica'),
  ('rock', 'Wonderwall', 'Oasis'),
  ('rock', 'Livin'' on a Prayer', 'Bon Jovi'),
  ('rock', 'Eye of the Tiger', 'Survivor'),
  ('rock', 'The Final Countdown', 'Europe'),
  ('rock', 'Another One Bites the Dust', 'Queen'),
  ('rock', 'Don''t Stop Believin''', 'Journey'),
  ('rock', 'Californication', 'Red Hot Chili Peppers'),
  ('rock', 'I Don''t Want to Miss a Thing', 'Aerosmith'),
  ('rock', 'Satisfaction', 'The Rolling Stones');

-- ---------- POP ----------
insert into songs (genre_id, title, artist) values
  ('pop', 'Billie Jean', 'Michael Jackson'),
  ('pop', 'Shape of You', 'Ed Sheeran'),
  ('pop', 'Uptown Funk', 'Mark Ronson'),
  ('pop', 'Rolling in the Deep', 'Adele'),
  ('pop', 'Bad Romance', 'Lady Gaga'),
  ('pop', 'Shake It Off', 'Taylor Swift'),
  ('pop', 'Blinding Lights', 'The Weeknd'),
  ('pop', 'As It Was', 'Harry Styles'),
  ('pop', 'Levitating', 'Dua Lipa'),
  ('pop', 'Like a Prayer', 'Madonna'),
  ('pop', 'Toxic', 'Britney Spears'),
  ('pop', 'Firework', 'Katy Perry'),
  ('pop', 'Hips Don''t Lie', 'Shakira'),
  ('pop', 'Hey Jude', 'The Beatles'),
  ('pop', 'Counting Stars', 'OneRepublic'),
  ('pop', 'Flowers', 'Miley Cyrus'),
  ('pop', 'Viva la Vida', 'Coldplay'),
  ('pop', 'Gangnam Style', 'PSY');

-- ---------- URBANO ----------
insert into songs (genre_id, title, artist) values
  ('urbano', 'Gasolina', 'Daddy Yankee'),
  ('urbano', 'Despacito', 'Luis Fonsi'),
  ('urbano', 'Taki Taki', 'DJ Snake'),
  ('urbano', 'Dákiti', 'Bad Bunny'),
  ('urbano', 'Tusa', 'Karol G'),
  ('urbano', 'Con Calma', 'Daddy Yankee'),
  ('urbano', 'Bailando', 'Enrique Iglesias'),
  ('urbano', 'Felices los 4', 'Maluma'),
  ('urbano', 'Safaera', 'Bad Bunny'),
  ('urbano', 'Ginza', 'J Balvin'),
  ('urbano', 'Mi Gente', 'J Balvin'),
  ('urbano', 'Yo Perreo Sola', 'Bad Bunny'),
  ('urbano', 'China', 'Anuel AA'),
  ('urbano', 'Baila Baila Baila', 'Ozuna'),
  ('urbano', 'Pepas', 'Farruko'),
  ('urbano', 'Rakata', 'Wisin & Yandel'),
  ('urbano', 'Shaky Shaky', 'Daddy Yankee');

-- ---------- CUMBIA ----------
insert into songs (genre_id, title, artist) values
  ('cumbia', 'Mi Cucu', 'La Sonora Dinamita'),
  ('cumbia', 'Que Bello', 'La Sonora Dinamita'),
  ('cumbia', 'Escándalo', 'La Sonora Dinamita'),
  ('cumbia', 'Se Me Perdió la Cadena', 'La Sonora Dinamita'),
  ('cumbia', 'Mi Niña Mujer', 'Los Ángeles Azules'),
  ('cumbia', 'Cómo Te Voy a Olvidar', 'Los Ángeles Azules'),
  ('cumbia', '17 Años', 'Los Ángeles Azules'),
  ('cumbia', 'Nunca Es Suficiente', 'Los Ángeles Azules'),
  ('cumbia', 'El Listón de Tu Pelo', 'Los Ángeles Azules'),
  ('cumbia', 'El Meneaito', 'Gaby'),
  ('cumbia', 'La Gota Fría', 'Carlos Vives'),
  ('cumbia', 'La Tierra del Olvido', 'Carlos Vives'),
  ('cumbia', 'Oye Mujer', 'Raymix'),
  ('cumbia', 'Cumbia Sampuesana', 'Alejandro Durán'),
  ('cumbia', 'La Cadenita', 'Los del Barrio'),
  ('cumbia', 'Sopa de Caracol', 'Bolipium');

-- ---------- BOLIVIANO ----------
insert into songs (genre_id, title, artist) values
  ('boliviano', 'Llorando Se Fue', 'Los Kjarkas'),
  ('boliviano', 'Bolivia', 'Los Kjarkas'),
  ('boliviano', 'Saya Sensual', 'Los Kjarkas'),
  ('boliviano', 'Vivir Junto a Ti', 'Los Kjarkas'),
  ('boliviano', 'Tiempo al Tiempo', 'Los Kjarkas'),
  ('boliviano', 'T''una Papita', 'Los Kjarkas'),
  ('boliviano', 'El Minero', 'Savia Andina'),
  ('boliviano', 'Amorosa Palomita', 'Savia Andina'),
  ('boliviano', 'A los Bosques', 'Savia Andina'),
  ('boliviano', 'Boquerón', 'Savia Andina'),
  ('boliviano', 'Chirihuayrita', 'Savia Andina'),
  ('boliviano', 'Viva Mi Patria Bolivia', 'Apolinar Camacho'),
  ('boliviano', 'Cuando Florezca el Chuño', 'Kalamarka'),
  ('boliviano', 'Yo Soy de Bolivia', 'Bonanza');

-- ---------- CLASICOS 70s-90s ----------
insert into songs (genre_id, title, artist) values
  ('clasicos', 'Dancing Queen', 'ABBA'),
  ('clasicos', 'Stayin'' Alive', 'Bee Gees'),
  ('clasicos', 'Rasputin', 'Boney M.'),
  ('clasicos', 'Take On Me', 'a-ha'),
  ('clasicos', 'Africa', 'Toto'),
  ('clasicos', 'Girls Just Want to Have Fun', 'Cyndi Lauper'),
  ('clasicos', 'I Wanna Dance with Somebody', 'Whitney Houston'),
  ('clasicos', 'Y.M.C.A.', 'Village People'),
  ('clasicos', 'I Will Survive', 'Gloria Gaynor'),
  ('clasicos', 'Born to Be Alive', 'Patrick Hernandez'),
  ('clasicos', 'Macarena', 'Los del Río'),
  ('clasicos', 'La Bamba', 'Ritchie Valens'),
  ('clasicos', 'Brother Louie', 'Modern Talking'),
  ('clasicos', 'Tainted Love', 'Soft Cell'),
  ('clasicos', 'Everybody (Backstreet''s Back)', 'Backstreet Boys'),
  ('clasicos', 'Blue (Da Ba Dee)', 'Eiffel 65'),
  ('clasicos', 'Livin'' la Vida Loca', 'Ricky Martin'),
  ('clasicos', 'Barbie Girl', 'Aqua');
