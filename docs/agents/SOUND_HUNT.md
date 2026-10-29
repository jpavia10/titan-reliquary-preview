<!-- doc-status: current; normative: yes -->
# Sound hunt: music and field recordings for every theme (Grok, Muse, Gemini)

Owner, 2026-10-29: "In the homework make them find more music also." The same day, Claude took charge of the ambient and depth
upgrade: every theme gets its own **room** (a second space to be in the theme away from the collection) with its own soundscape. So
there are two jobs per theme:

1. **Music**: recorded music the theme still lacks (`music_needed` pieces; `music_have` lists what it already plays: never send those).
2. **Field recordings**: the five sounds its room needs (`field_needed`: two beds = long steady sounds, three details = short events).

Your list of themes is in `docs/agents/projects/sound_hunt_20261029.json` under `agents.{you}` (Gemini: the same list is in Drive,
`homework sheets (current: refreshed every hour)/Gemini/SOUND HUNT for Gemini (2026-10-29).json`). Grok also has `moodist_replace`.

## Where the answer goes (the only place that counts)

- One file per session: **`sound_{agent}_{YYYYMMDD-HHMM}.json`** (UTC time when you save it; e.g. `sound_gemini_20261029-1530.json`),
  plain JSON (not a Google Doc), saved in Drive **`Titan Reliquary/sound-incoming (AI music + field recording finds)/`**.
- The file is your answer. Nothing you write in a chat reaches Claude or Joseph, and Joseph never relays or pastes anything. If the
  chat window shows nothing, the file must still be there.
- Save as you go: after every 10 finds, save the file again under the same name, so a session that stops early still leaves its work.
- A session that finds nothing still saves the file, with every theme you searched in `not_found` and what you searched.

## What counts as a find

- A **real recording**: a microphone in a real place (field recordings) or named people playing real instruments (music). No MIDI, no
  synthesizer or keyboard rendering, no virtual instrument or sample library, no AI-generated audio, no sonification of an image.
- A **licence stated on the file's own page**: public domain, CC0, CC BY or CC BY-SA (any version). Quote the page's licence line
  word for word in `license_quote`. Not CC BY-NC, not "royalty free", not YouTube, not Pixabay, not BBC Sound Effects, not Freesound
  (its downloads need a login, so the intake runner cannot fetch them).
- **Sources, in this order**: Wikimedia Commons (`File:` pages); for space sounds NASA (public domain); for the sea NOAA (public domain);
  the US National Park Service sound gallery (public domain); the US military bands (US government works, public domain); Musopen;
  archive.org items whose page states one of the licences above. Old disc transfers only if recorded and published before 1926.
- **Field recordings**: no music in the background, and no speech you can follow (a crowd murmur is fine). At least 30 s for a bed,
  at least 3 s for a detail. Say if a bed has a loud event in it and where (`notes`).
- **Music**: the right piece (not a medley or arrangement unless the list asks), a named performer, the recording year if the page has
  it. Check `music_have` and `docs/music/wanted.json` first: a piece already live or already found is not a find.
- Open every page you cite. Never write a file name or URL you have not opened in this session; never fill a field you did not read.

## File shape

```json
{
  "agent": "gemini",
  "made": "2026-10-29T15:30:00Z",
  "project": "sound-hunt-20261029",
  "music": [
    {"theme": "kaleido", "title": "Jeux d'eau", "composer": "Maurice Ravel", "performer": "Name Surname (piano)",
     "recorded": "2012", "source": "commons", "file": "File:Ravel - Jeux d'eau (Name Surname).ogg",
     "page": "https://commons.wikimedia.org/wiki/File:...", "license": "CC BY-SA 4.0",
     "license_quote": "This file is licensed under the Creative Commons Attribution-Share Alike 4.0 International license.",
     "duration_s": 312, "human_check": "the page names the pianist and the recital where it was recorded",
     "why": "glittering water figures fit light breaking in crystal"}
  ],
  "field": [
    {"theme": "kaleido", "slot": "detail-1", "what": "a rubbed wine glass singing one note", "source": "commons",
     "file": "File:...ogg", "page": "https://commons.wikimedia.org/wiki/File:...", "license": "CC0",
     "license_quote": "...", "recordist": "Name or user name", "place_year": "Lyon, 2014", "duration_s": 14,
     "voices_or_music": false, "notes": "clean single tone from 2 s to 11 s", "why": "the room's crystal note"}
  ],
  "replace": [
    {"id": "rainLight", "source": "commons", "file": "File:...", "page": "...", "license": "CC0", "license_quote": "...",
     "recordist": "...", "duration_s": 120, "voices_or_music": false, "notes": "..."}
  ],
  "not_found": [
    {"theme": "sahel", "slot": "music", "searched": "Commons 'kora' (all 214 results), Musopen 'kora', archive.org 'kora CC'"}
  ]
}
```

- `slot` is the slot name from your list (`bed-1`, `bed-2`, `detail-1`, `detail-2`, `detail-3`). Up to 2 finds per slot (best first).
- `source` is one of `commons`, `nasa`, `noaa`, `nps`, `military-band`, `musopen`, `archive`. For a source that is not Commons, `file`
  is the direct link to the audio file and `page` the page that states the licence.
- `replace` is Grok's only (`moodist_replace`: a same-kind recording for each sound the app plays today).

## What happens next

Claude checks every find (opens the page, checks the licence and listens through the intake run), sends the good ones through the
music or field intake, and they become the theme's music and its room's sound. Each file is scored like any other submission
(`collaborators/CONTRIBUTOR_SCORES.md`): a wrong licence, a synthesizer passed off as a performance, or a URL that was never opened
costs more than a find that was not made.
