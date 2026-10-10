<!-- doc-status: current; normative: yes (for ChatGPT) -->
# WORK QUEUE for ChatGPT (updated 2026-10-10 21:11 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** occasional. Strong reasoning and code review; no Drive access, so everything goes through chat. Takes part less often than the others (owner, 2026-10-09): projects only, no generated homework.
**How you get this:** Joseph pastes https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/QUEUE_chatgpt.md into ChatGPT and says 'do the next task'; the answer is pasted back to Claude.

## Finish first

### Review two new modules  (fix list #32)

Review https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/js/app-motion.js and https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/wings/music-recorded.js for real bugs only (what breaks, how to reproduce, the smallest fix, file:line). No style notes.

**Done when:** One reply; Claude verifies each claim before fixing.

### Review the 20 styles and the motion splashes  (fix list #110)

Read https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/wings/fx/styles-a.js, styles-b.js, styles-c.js, styles-d.js (same folder), https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/js/motion-splash.js and https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/styles/style-layer.css (the engine contract is the header of wings/fx/engine.js). Find real defects only: a shader that will not compile on a phone GPU (precision, loops, derivatives), work that runs every frame and should not, a splash that can hang or never call done(), something that ignores reduced motion or Motion Off, text the effects make unreadable. For each: file:line, how to trigger it, the smallest fix.

**Done when:** One reply with finding IDs GPT-S-01, GPT-S-02 ...; Claude verifies each claim before fixing.

## Calibration test due: the main photo pack (30 coins)  (fix list #4)

Open https://github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-main and follow its PROMPT.md (raw: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/bakeoff/pack-20261008-main/PROMPT.md). Answer ONLY from the photos: never search this repository or its data for the coins. Save `bakeoff_chatgpt_YYYYMMDD-HHMM.json` in Drive `Titan Reliquary/bakeoff (blind photo test)/` (or reply with it in chat). This is your first time with this pack.

**Done when:** the answer file is in Drive; Claude scores it and your numbers appear in collaborators/MODEL_ACCURACY.md.

## Projects (after the homework)

### Security review of the intake bridge  [NEXT]  (fix list #106)

Read https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/INTAKE_BRIDGE.md, https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/tools/bridge/intake.py, https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/tools/drive/intake_bridge.gs and https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/.github/workflows/intake.yml. Find real holes only: a way a file in the Drive folder could run code, write outside collection/, merge as the owner or as another AI, leak the key, or make the job push something it should not. For each: how to trigger it, why it matters, the smallest fix (file:line).

**Done when:** One reply with finding IDs GPT-B-01 ...; Claude verifies each claim before fixing.

### Dad's one-page guide  [NEXT]  (fix list #60)

Write a one-page plain-English guide for Joseph's dad to the Simple view (Do I have...?, What's missing?, At a glance, Questions): big words, short sentences, what to tap. Read the live app at https://jpavia10.github.io/titan-reliquary-preview/#simple first.

**Done when:** One reply with the text.

### Find the holes in the research loop  [LATER]  (fix list #85)

Read https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/RESEARCH_LOOP.md and https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/tools/agents/homework.py. Find real holes only: a way an AI could get a wrong fact marked 'Checked', a job that can never close or is handed out twice, an AI that could end up checking its own work, a line that could overwrite data it should not. For each: how to trigger it, why it matters, the smallest fix (file:line).

**Done when:** One reply; Claude verifies each claim before fixing.

## Your numbers (measured, not self-reported)

- Assignments answered: 0; expired: 0.
- None of your facts has been checked by another contributor yet.
- Share of your new facts that get checked first: 50 %.
