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
