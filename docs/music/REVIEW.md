<!-- doc-status: current; normative: no; Claude's review of the music intake (2026-10-08) -->
# Music intake review, 2026-10-08

The intake job (`.github/workflows/music-intake.yml`, `tools/music/fetch_classical.py`) found a recording for all 24 wanted pieces on
Wikimedia Commons. Claude checked every pick's file page data (license, performer, the right piece) before anything reached the app.

## Kept (16): in `audio/music/`, credited in `audio/music/CREDITS.md` and in Scene Studio
Piano (11): Satie Gymnopédie 1 and 3 (Michael Laucke, guitar, PD), Satie Gnossienne 1 (La Pianista, PD), Debussy Clair de lune
(Laurens Goedhart, PD mark), Chopin Nocturne Op. 9/2 (Musopen, CC0), Chopin Raindrop Prelude (eldüendesüarez, CC BY-SA 4.0), Chopin
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
