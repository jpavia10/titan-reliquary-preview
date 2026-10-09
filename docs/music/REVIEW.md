<!-- doc-status: current; normative: no; Claude's review of the music intake (2026-10-08) -->
# Music intake review, 2026-10-08

The intake job (`.github/workflows/music-intake.yml`, `tools/music/fetch_classical.py`) found a recording for all 24 wanted pieces on
Wikimedia Commons. Claude checked every pick's file page data (license, performer, the right piece) before anything reached the app.

## Kept (16): in `audio/music/`, credited in `audio/music/CREDITS.md` and in Scene Studio
Piano (11): Satie Gymnopédie 1 and 3 (Michael Laucke, guitar, PD), Satie Gnossienne 1 (La Pianista, CC BY-SA 3.0), Debussy Clair de lune
(Laurens Goedhart, CC BY 3.0), Chopin Nocturne Op. 9/2 (Musopen, CC0), Chopin Raindrop Prelude (eldüendesüarez, CC BY-SA 4.0), Chopin
Nocturne Op. 27/2 (Frank Lévy, PD), Bach Prelude BWV 846 and Goldberg Aria (Kimiko Ishizaka, CC0), Beethoven Moonlight I (Paul Pitman for
Musopen, PD), Schumann Träumerei (Edgar Monteiro, guitar, CC BY-SA 3.0).
Orchestra (5): Grieg Morning Mood (Musopen Symphony, PD), Saint-Saëns The Swan (Alisa Weilerstein and Jason Yoder at the White House,
US government work, PD), Bach Cello Suite 1 Prelude (Chris, CC0), Mozart Eine kleine Nachtmusik Romanze (Musopen, PD), Vivaldi Winter Largo
(John Harrison, CC BY-SA 4.0).

## Rejected (8): the script now refuses these kinds of file
| Piece | Pick | Why |
|---|---|---|
| Pachelbel, Canon | "Pachelbel's Howitzer" | a parody medley (ragtime, swing, show tunes) |
| Liszt, Consolation 3 | Consolation 3.ogg | made with a virtual piano synthesizer (GigaSampler) |
| Debussy, Rêverie | Reverie.ogg | source unknown on Commons, license not provable |
| Debussy, Arabesque 1 | "2nd Arabic Suite" | it is Arabesque No. 2, odd description |
| Bach, Air | Melachrino Orchestra, 1947 (PDP-CH) | historical transfer: public domain in Europe, still protected in the US until 2068 |
| Dvořák, New World Largo | Royal Albert Hall Orchestra, 1927 (PDP-CH) | US protection until 2028 (1923–1946 recordings: 100 years) |
| Handel, Ombra mai fu | Jo Vincent, 1930 (PDP-CH) | US protection until 2031 |
| Elgar, Nimrod | Barbirolli / Hallé (archive.org) | tagged PD in the EU only |

These 8 are Grok's task (WORK QUEUE for Grok, task 2): find recordings by named performers under PD / CC0 / CC BY(-SA); the next intake
run takes Grok's exact file picks first (`files` in docs/music/wanted.json), with the same checks.

## 2026-10-09: Grok's check (`music_grok_20261008-1107.json`, Drive music-requests)
- Credits corrected: Clair de lune is CC BY 3.0 (Laurens Goedhart) and Gnossienne 1 is CC BY-SA 3.0 (La Pianista); Commons' metadata showed "Public domain" because the composition's template comes first. Chopin Op. 9/2: CC0, pianist not named (Musopen), kept like the other Musopen picks.
- New exact picks in `wanted.json` (the next music-intake run fetches them; Claude reviews the run before merging): Bach Air and Pachelbel Canon (United States Air Force Band strings, US government work, public domain), Debussy Arabesque No. 1 (Patrizia Prati, CC BY-SA 4.0), Liszt Consolation No. 3 (Benedict Kramer, CC BY-SA 4.0), Dvořák New World Largo (Musopen, public domain), and a piano Gymnopédie No. 1 (Daria Baiocchi, CC BY-SA 4.0) next to the guitar one.
- Held: Elgar Nimrod (no recording both named and free in the US), Debussy Rêverie (only a saxophone arrangement), Handel Ombra mai fu (Caruso 1920, public domain but an acoustic vocal recording: the owner's ear decides), piano Gymnopédie No. 3 (none found).
