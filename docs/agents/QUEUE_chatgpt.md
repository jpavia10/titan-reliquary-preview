<!-- doc-status: current; normative: yes (for ChatGPT) -->
# WORK QUEUE for ChatGPT (updated 2026-10-08)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom. When a task is done, mark it DONE with the date (in your Drive queue doc, or say so in chat) and start the next one straight away; do not wait to be asked.

**Status:** active. Strong reasoning and code review; no Drive access, so everything goes through chat (Joseph pastes) and raw GitHub links. Last review read a stale copy: always open the exact links below.
**How you get this:** Joseph pastes the link https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/QUEUE_chatgpt.md into ChatGPT and says 'do the next task'; ChatGPT's answer is pasted back to Claude.

Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

## 1. Fact-check the coin stories, C001 to C150  [NOW]  (fix list #73)

Open https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/collection/specimens/ (one file per country, e.g. CH.json) and the matching collection/types/ file. For each coin from C001 to C150, check its story against its own record (type, year, mint, composition, catalogue number). List every claim that the record contradicts or that is not supported, as change-file lines (collection/templates/INSTRUCTIONS.md) with by 'model:chatgpt', phase 2, an exact source. Reply with one jsonl block.

**Done when:** One reply covering C001 to C150.

## 2. Review two new modules  [NEXT]  (fix list #32)

Review https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/js/app-motion.js and https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/wings/music-recorded.js for real bugs only (what breaks, how to reproduce, the smallest fix, file:line). No style notes.

**Done when:** One reply; Claude verifies each claim before fixing.

## 3. Dad's one-page guide  [LATER]  (fix list #60)

Write a one-page plain-English guide for Joseph's dad to the Simple view (Do I have...?, What's missing?, At a glance, Questions): big words, short sentences, what to tap. Read the live app at https://jpavia10.github.io/titan-reliquary-preview/#simple first.

**Done when:** One reply with the text.
