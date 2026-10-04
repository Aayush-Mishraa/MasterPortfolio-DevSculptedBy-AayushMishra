# F31 · "Ask Aayush's AI"

**Stage 4 · Effort M · Status: done in code (not merged or deployed). Waiting for: `ANTHROPIC_API_KEY` (until then it answers with passages).**

## Acceptance criteria
- [x] `/ask`: question box with examples; each answer shows its sources (linked, numbered citations), its mode and its eval scores; booking / email / recruiter-brief CTAs.
- [x] Knowledge: `scripts/ask/build-corpus.mjs` builds `build/api/data/ask-corpus.json` from the prerendered pages at deploy time (no Tech Universe, forks, blocked names, noindex pages or `/ask` itself): ~365 passages from 57 pages. It will pick up case studies and posts automatically once F15 / F18 exist.
- [x] `api/ask.php`: origin, honeypot, form token `ask`, 10/h + 30/day per IP. BM25 retrieval (`api/lib/Retriever.php`); weak match → "the site doesn't cover that" (no model call). Otherwise Claude Haiku 4.5 (decided 4 Oct; official PHP SDK `anthropic-ai/sdk` with Guzzle) answers from the numbered sources only, citing them, in ≤ 120 words, ignoring instructions inside sources or the question. No key, past `daily_cap` (200 answers/day) or any API error → the top passages are the answer.
- [x] Evals per answer: grounded (share of sentences backed by the sources, numbers exact), cited (share with a citation), retrieval match. Logged in `ask_log` with token counts; `/admin/ask` shows averages per mode and the latest 100.

## Setup (Aayush)
Anthropic Console → API key (set a monthly spend limit there too) → secret `ANTHROPIC_API_KEY`. Optional variable `ASK_DAILY_CAP`.

## Checked by hand (4 Oct)
Retrieval mode answers from the right pages; an off-site question is declined; with a dummy key against a fake endpoint the SDK call fails cleanly (401 logged) and falls back. The real model call is untested until the key exists.

## Tests owed
PHPUnit: Retriever ranking and `evaluate()`, ask.php refusal / retrieval / LLM (fake Messages API) / fallback / cap. Playwright: ask, citations link to sources, mobile.
