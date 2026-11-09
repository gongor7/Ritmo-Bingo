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
create unique index if not exists songs_genre_title_idx on songs (genre_id, title);

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
  played_songs     jsonb not null default '[]',
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
