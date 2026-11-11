# artreq_20261108-1500_room-layers-all: result (reviewed 2026-11-11, Claude)

Delivered to `art-incoming (AI images + video)/artreq_20261108-1500_room-layers-all/` by Gemini (22 rooms, 1376x768, 2026-11-09; six of them uploaded twice, the 18:02 UTC copies carry `.B`) and Muse (32 rooms, wide 2048x1152 with the four layers at 2096x1184, 2026-11-08/09: the 23 rooms from the bottom of the list and the first nine remade). Pulled through art-intake on 2026-11-11 (`intake/artreq_20261108-1500_room-layers-all/` on the `art-intake` branch, 300 files; list in `artreq_20261108-1500_room-layers-all.intake-files.json`). Every set was reviewed on a sheet (the wide photo large, then back, keyed front, depth, lights and the front composited over the back) and measured: shift of each layer against the wide, share of the front object's pixels that match the wide, front and light coverage.

**Result: all 50 themes now run on a full layer set** (`art/rooms/{id}/`, `fd` in `wings/plate.js`; `tools/rooms/prep_plates.py`). Seen in the real app on a 390x844 phone: every room opens on its photograph with no page error (CL-WORLD-02 ALL GOOD).

## Rooms with two sets

| Room | Chosen | Why |
|---|---|---|
| obsidian | Gemini (first) | The second has a carved face at the centre of the sun disc (the brief: no faces); the first's pillar with the jade serpent is the brief's foreground. |
| lightwell | Gemini (first) | It has the "razor-thin blade of golden sun" through dust; the second only lights the floor. |
| saltflat | Gemini (first) | Both good; the first reads more natural (the second's post throws a shadow no twilight would). |
| sahel | Gemini (`.B`) | An open street with the middle air free; the first puts a wall across the bottom third. |
| orbit | Gemini (first) | The handrail and cable loop give real near depth; both photographic. |
| glasshouse | Gemini (first) | Its front layer holds the banana plant and its pot; the second cut the leaves off their pot. |
| cursedwing | Gemini (`.B`) | Reads as a photograph of a real closed museum wing; Muse's light mask marks the glass case as a lamp. |
| kaleido | Muse | Rainbow bands across the white room, the brief's prism on a brass stand. |
| odyssey | Gemini (`.B`) | Its layers line up with its photo (front 99 %); Muse's wheel layer is a different wheel (56 %). |
| xeno | Muse | Dim, misty containment hall, the brief's mood; its own layers line up with each other. |

Intake mistake (Claude's, not the contributors'): for kaleido and xeno the front and depth files of the two sets were swapped in the download list; sorted back by size (Muse 2096 px, Gemini 1376 px) before the review.

## The first nine, remade by Muse

Replaced (sharper, as good or better): afterhours, neon, zen, supercell, colossus, dynasty, valhalla. Kept Gemini's 2026-10/11 sets: **abyss** (Muse's wreck is a bare rib cage that reads as a skeleton, not "an old wooden sailing ship") and **glacier** (the vault door is small at the bottom right and leaves the frame on an upright phone).

## Remade by Claude

**nocturne** and **silkroad** (Gemini): the wide photos are excellent but every layer was a new picture, not an edit of the photo (the back plate a different bar and a daytime courtyard, the fronts on black instead of green). The four layers were made again from each wide photo through the Gemini API (`tools/gemini/image.py`, Nano Banana Pro on the owner's paid key: the free keys have no image quota; owner 2026-11-11, the paid key is for the best models). Both now line up (front 99 % and 98 %).

## Notes

- Muse's sets are cinematic and sharp, but most put falling leaves, dust or rain in the air (drafting, sketch, rift, tourbillon, banknote, marbled, odyssey ...) where the brief kept the middle third open for the app's own particles; and its four layers are a second generation at 2096x1184, not edits of the 2048x1152 wide photo (front objects match the wide 10-90 %, e.g. banknote, drafting, sketch), so the wide photo is not part of its set. They line up with each other, which is what the engine uses.
- Gemini's sets follow the method exactly (one photo, every layer edited from it: fronts match 93-100 %) except nocturne and silkroad above; 1376 px stays soft on a large screen.
- Start positions (`pan0`) and room names were set from these photos; light themes whose stand-in picture had no light (notepad, bauhaus, marbled, banknote, sketch, papercut, y2k, pulp, diorama) now use their light masks.
- Next (step C, `docs/design/THEME_FRAMEWORK.md`): tune each theme's live layers on a real phone.

Scores: Muse row 52, Gemini row 69 (`collaborators/CONTRIBUTOR_SCORES.md`).
