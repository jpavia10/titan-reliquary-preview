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
- Held: Elgar Nimrod (no recording both named and free in the US), Debussy Rêverie (only a saxophone arrangement), Handel Ombra mai fu (Caruso 1920, public domain but an acoustic vocal recording: the owner's ear decides; replaced in run 3, below), piano Gymnopédie No. 3 (none found).
- Run 2 (2026-10-09, `015924f`) merged: 22 recordings now. The first run fell back to the Menuhin 1948 film audio and a sample-library Canon because the Air Force Band mp3s carry cover art that ffmpeg could not put in .m4a (fixed: audio-only encode) and the piano Gymnopédie's Commons title is spelled with a grave accent (fixed); both fallbacks are now in the reject lists, and incompetech / kevin macleod in the BAD list. All 6 new picks are Grok's, with the reviewed credits.
- Run 3 (2026-10-09, `3eb4ffe`) merged: **23 recordings**. New: Handel Largo "Ombra mai fu" by Lea Desandre (mezzo-soprano) with Les Arts Florissants, CC BY 3.0 (the ensemble's own YouTube upload on Commons; replaces the held 1920 Caruso). All 23 re-encoded with the restored AAC 96 kbps stereo arguments (the earlier files had been made with ffmpeg's defaults), so most files got smaller and the levels are the same -20 LUFS. The held pieces were searched again and stay held: Elgar Nimrod (nothing found), Debussy Rêverie (would pick the saxophone arrangement again), piano Gymnopédie No. 3 (would pick a No. 1, the wrong piece).

## 2026-10-22: intake for Darkroom and Silver Screen (Claude)
Kept (4), each checked against its Commons file page data: Chopin Nocturne Op. 48 No. 1 (Luke Faulkner, Musopen "Set Chopin Free",
public domain; 4.6 s of leading and 8 s of trailing silence cut by stream copy) and Ravel Le Gibet (OE1FEU, own recording on a
Bechstein concert grand in the Wiener Kaisersaal, CC BY-SA 4.0) for Darkroom; Joplin Maple Leaf Rag (United States Air Force Band,
Strolling Strings, 1994, US government work) and Joplin Solace (Constantin Stephan, piano, CC BY-SA 4.0) for Silver Screen.
Rejected: "Satie - Gnossienne 1" picked for Gnossienne No. 3 (the wrong piece; the entry now refuses the other numbers).
Nothing usable on Commons: The Entertainer (a Casio keyboard and other electronic renderings) and Golliwogg's Cakewalk (a virtual
piano, GigaSampler); both stay wanted. Only the four files and their manifest/credit rows were taken from the `music-intake` branch:
its regenerated performer strings are worse than main's corrected ones (several name the composer as the performer).

## 2026-10-24: intake for Cloud Forest, and Darkroom's Gnossienne 3 (Claude)
Kept (3), each checked against its Commons file data (the container cannot open Commons; the run's page data plus a web search of
each file page): El Noi de la Mare (Jujutacular, guitar, own work 2009; Commons marks the recording public domain, not CC BY-SA 3.0
as Gemini's pick said) and C. P. E. Bach's Flute Sonata in D major, Wq. 131 (Luis Martínez Pueyo, traverso, of La Guirlande, and
Alfonso Sebastián Alegre, harpsichord; CC BY 3.0, YouTube upload with a license review) for Cloud Forest; Satie Gnossienne No. 3
(La Pianista, CC BY-SA 3.0 like her No. 1; Commons shows "Public domain" because the composition's template comes first) for
Darkroom, the right piece this time. The sonata video opens with a 30 s teaser and the fetcher's 7-minute cut fell 7 s before the
end of the Allegretto, so only the complete Andante is used (37.5-174.5 s, stream copy, -19.3 LUFS); `credit[file].span` in
wanted.json now gives the fetcher a reviewed span, so the next run makes the same cut. The run's re-encode of the Chopin nocturne
was not taken (main's copy has the silences trimmed), nor its regenerated performer strings.

## 2026-10-25: intake for the five new themes (Claude)
Kept (4), each checked against the run's Commons file data: Chopin Raindrop Prelude (eldüendesüarez, piano, CC BY-SA 4.0) for The Glasshouse; Holst Neptune ("The President's Own" US Marine Band, US government work, cut at 7 minutes with a fade) for Low Orbit; Debussy Reflets dans l'eau (Giorgi Latso, CC BY-SA 4.0) for Salt Mirror; Bach BWV 639 (Yeonju Sarah Kim, organ, CC0, an excerpt of the uploaded recital) for Light Well. Sahel's kora found nothing that passed; it stays wanted.
