# F21 · QA ROI / flaky-test cost calculator

**Stage 3 · Effort S · Status: done in code (not merged or deployed).**

## Goal
Show what flaky tests, manual regression and escaped bugs cost a team a year, and how fast fixing them pays back. CTA to `/services`.

## Acceptance criteria
- [x] `/free-tools/qa-roi-calculator`, client-side only. Inputs: engineers, CI runs a day, flake rate, minutes lost per flaky failure, manual regression hours per release, releases a month, production bugs a month, cost of a production bug, loaded hourly cost; "if you fixed it" percentages and a one-time cost (defaults to the middle of the Playwright Starter Sprint range in `pricing.js`).
- [x] Output: money lost per year, hours lost (and share of team time), savings per year, payback period, a breakdown, and every formula under "How it's calculated".
- [x] Currency switch (USD / EUR / GBP / INR, each with its own defaults). Inputs live in the URL (`?flake=12&c=INR`) so a result can be shared; the Flaky Test Doctor links here with its measured flake rate.
- [x] Every number has a labelled input; the slider next to it is a mouse convenience hidden from assistive tech.

## Tests owed
Unit: `calculate()` against a hand-worked example. Playwright: URL round trip, currency switch, mobile, axe.
