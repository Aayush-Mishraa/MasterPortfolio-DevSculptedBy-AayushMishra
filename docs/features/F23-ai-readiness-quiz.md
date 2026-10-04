# F23 · AI-Agent Readiness quiz

**Stage 3 · Effort S · Status: done in code (not merged or deployed).**

## Goal
12 questions for teams shipping LLM features; a 0–100 score with tips; email for the full report; CTA to the AI Feature Eval Pack.

## Acceptance criteria
- [x] `/free-tools/ai-readiness-quiz`: one question per screen (radio fieldset, Back / Next, focus moves to each question); four areas: evals & quality, security, safety & privacy, operations. Content in `src/data/aiReadiness.js`.
- [x] Result: score ring, verdict, area bars and the top three gaps with tips.
- [x] The full report (every gap) unlocks after the email capture (magnet `ai-readiness`). The answers travel as a 12-digit code, the only thing the server checks; the emailed link `?r=<code>` opens the full report directly. The newsletter opt-in uses source `quiz`.
- [x] CTA to `/services/ai-feature-eval-pack`.

## Tests owed
Unit: `scoreOf`, `areaScores`, `gaps`. Playwright: complete the quiz, unlock, the `?r=` link, a keyboard-only run, axe.
