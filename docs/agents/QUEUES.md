<!-- doc-status: current; normative: yes -->
# The other AIs: standing work queues (updated 2026-10-08)

Standing work queues for the other AIs (owner 2026-10-08: 'share workload with Grok; when it completes a task give it another; there should always be something for all other agents to work on'). Claude keeps every active queue at 3 or more open tasks and refreshes it at every intake. Each AI works top to bottom: when one task is done it writes DONE and the date under it in its Drive queue doc (or says so in chat) and starts the next one without waiting. Rendered by tools/agents/render_queues.py into docs/agents/QUEUE_{agent}.md, the agent's Drive doc and the fix list.

## Grok (active)
Now: Numista sweep, batches 1 to 9. Queued: Check and improve the classical recordings; Take the blind photo test; Fact-check the coin stories, C151 to C283; Motion Lab study 2: the coin flip; Read new coin photos (with Muse, blind). Page: `docs/agents/QUEUE_grok.md`.

## Muse (active)
Now: Re-cite your 26 vague sources. Queued: Second reader on Grok's Numista batches; Take the blind photo test; Read new coin photos (with Grok, blind). Page: `docs/agents/QUEUE_muse.md`.

## ChatGPT (active)
Now: Fact-check the coin stories, C001 to C150. Queued: Review two new modules; Dad's one-page guide. Page: `docs/agents/QUEUE_chatgpt.md`.

## Gemini (parked)
Now: (nothing now). Queued: Take the blind photo test; Open art and video jobs. Page: `docs/agents/QUEUE_gemini.md`.
