# F05 · Intro without the wait

**Stage 1 · Effort S · Depends on: nothing · Status: done (code); LCP target needs F06**

**Decision (3 Oct 2026):** opt-in "Play intro" (not an auto-play capped at 1.5 s).

## Goal
Nobody waits for the intro. Every visit lands on the hero; the intro is something a visitor chooses to watch.

## Acceptance criteria
- [x] The intro never auto-plays: `/` (first visit or not, with or without `utm_*`/`ref` parameters, bots included) renders the hero directly. `introPolicy.introPlaysAt()` is true only for `/splash`.
- [x] "Play intro" in the hero actions (and the header logo, as before) opens `/splash`, where the intro plays over the home page.
- [x] Sound is off by default. A "Sound off / Sound on" toggle in the intro turns it on, is remembered (`localStorage portfolio:intro-sound`), and doesn't skip the intro (mouse or keyboard).
- [x] The "Enter" gate that waited for a click to unlock audio is gone.
- [x] Reduced motion: the finished frame, then a fade (existing `playReduced`).
- [x] The intro ends on `/` (the canonical home), at the hero. The header's Home link and the footer's sitemap point to `/`.
- [ ] Mobile LCP < 2.5 s: not reachable by F05 alone (see below); re-measured after F06.

## Measurements (Lighthouse 12, mobile, simulated throttling, local Apache)
| Page | Perf | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` after F05 | 29 | 12.2 s | 13.4 s | 1.55 s | 0.003 |
| `/contact` | 32 | 13.5 s | 14.2 s | 1.19 s | 0.032 |

The 9.5 s intro hold is gone, but a client-rendered page paints nothing until ~1 MB of JavaScript has downloaded and run ("render delay" 12.9 s for the hero paragraph). F06 serves prerendered HTML so the hero paints from HTML + CSS.

## Files touched
`src/pages/splash/introPolicy.js`, `Splash.js`, `Splash.css` (gate removed, sound toggle), `src/pages/home/sections/Hero.js` + `Hero.css` (Play intro), `src/pages/home/lib/motion.js`, `src/components/header/Header.js`, `src/components/CreativeFooter/CreativeFooter.js`, `src/portfolio.js` (`isSplash: false`).

## Test plan
`tests/e2e/f05-intro.spec.ts` (desktop + mobile, fresh context with no "seen" flag): `/`, `/?utm_*`, `/?ref=`, `/home` show no intro; Play intro → `/splash` with sound off → Escape → back on `/` with the hero in view; the sound toggle switches without skipping and is stored; reduced motion fades out to `/`; the header logo still replays it.

## Rollback
Revert the F05 commit; the intro auto-plays on the first visit of each session again.
