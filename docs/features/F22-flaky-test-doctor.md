# F22 · Flaky Test Doctor

**Stage 3 · Effort M · Status: done in code (not merged or deployed). Ready for a Product Hunt / Show HN post once deployed.**

## Goal
Upload JUnit XML or paste a CI log; get flaky tests ranked, with likely causes and fixes. Nothing leaves the browser.

## Acceptance criteria
- [x] `/free-tools/flaky-test-doctor`: drop or choose up to 50 files (20 MB each), or paste; "Try it with sample data".
- [x] Parsers (`src/pages/tools/flaky/analyze.js`): JUnit XML (incl. Surefire `flakyFailure` / `rerunFailure`, several reports pasted together) and logs from Playwright (✓/✘ lines, `(retry #n)`, the "N flaky" block), Jest/Vitest, pytest (incl. `RERUN`), Cypress/Mocha, the Maven Surefire "Flakes:" block and Go. ANSI codes and CI timestamps are stripped.
- [x] Flaky = the same test failed and passed (across runs, or a retry that passed), or the runner marked it flaky. Ranked by failures, flips and retries. Tests failing in every run are listed separately (broken, not flaky).
- [x] Likely cause from the error text (overlays/animation, timing, re-rendered DOM, network, shared data/order, clock/time zone, CI resources, ordering, async assertions), each with a concrete fix.
- [x] Copy as Markdown (for a ticket or PR comment); link to the ROI calculator with the measured flake rate.

## Launch notes
Suggested title: "Flaky Test Doctor: find flaky tests from JUnit XML or CI logs, in your browser". The hooks are the privacy line and the sample data; the share image is generated per route.

## Tests owed
Unit tests per parser with real reporter output (Playwright list, Jest, pytest-rerunfailures, Surefire). Playwright: sample data → 4 flaky; file upload; mobile; axe.
