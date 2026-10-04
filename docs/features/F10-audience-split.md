# F10 · Audience split

**Stage 2 · Effort M · Status: done in code (not merged or deployed)**

## Goal
The home page sells services first; recruiters get their own path at `/hire-me`. The menu is Work · Services · About · Contact (+ Hire me). Projects and Open Source become one "Work" area.

Decided by Aayush (4 Oct 2026): services-first home; "Writing" stays out of the menu until `/blog` ships (F18); About is a new page; Work = Projects + Open Source.

## User stories
- As a founder or engineering lead, I see what I can hire Aayush for (and the price) without scrolling past a CV.
- As a recruiter, one click ("Hire me") gets me the résumé, the brief I can paste into an ATS and the hiring snapshot.

## Acceptance criteria
- [x] Menu: Home · Work · Services · About · Contact, with **Hire me** as the accent button (was "Let's Talk"). Work is active on `/work`, `/work/open-source`, `/projects/<repo>` and `/universe`; About is active on `/about`, `/experience`, `/education`, `/automation-arsenal`. Those pages, `/hire-me` and Open Source stay in the command palette.
- [x] Home hero is services-first: the status pill reads `availability.services` ("Available for QA engagements"), the main button is **See services → /services**, then "Let's talk" and "Hiring full-time? → /hire-me". The résumé and the 30-second brief moved to `/hire-me` (the brief still opens from the hiring snapshot further down the home page).
- [x] The phone bar shows Services + Let's talk (was Résumé + Let's talk).
- [x] A services strip (F11 data) is the first section after the logos; the other sections are renumbered 02–06.
- [x] **/work** is the Projects page and **/work/open-source** the Open Source page, with a shared "Work" tab bar. `/projects` → `/work` and `/opensource` → `/work/open-source` are **301s** on the server (query string kept) and client-side redirects in the app. Repository pages stay at `/projects/<repo>` (indexed URLs; `/work/<slug>` is kept for case studies, F15).
- [x] **/hire-me**: roles status pill, résumé, "Copy brief as text", the 30-second brief (film + card), the recruiter brief facts and highlights, the hiring snapshot, "What I'd bring" (the four skill groups) and next steps. Every line comes from `src/portfolio.js`; `briefData.js` is shared with the home page's brief so both always agree.
- [x] **/about**: who, what, core stack, AI testing, the career as `git log --oneline` (current employer unnamed, as on home), and cards to Experience, Education, Automation Arsenal and Work.
- [x] All new and moved routes are prerendered with unique titles, in the sitemap and `llms.txt`, listed in `.htaccess`.
- [x] Found on the way and fixed site-wide: the phone menu couldn't be opened from a keyboard (the checkbox was `display: none`), its `aria-label` sat on a `<label>` (axe `aria-prohibited-attr`), and the desktop Search button had no accessible name (axe `button-name`). Both axe findings were in the baseline of every page.

## Files
- `src/components/header/Header.js|.css`, `src/containers/Main.js`, `src/portfolio.js` (`seo.pages`, `availability.services`)
- `src/pages/shared/PageShell.js` (frame for Stage 2 pages), `src/pages/work/WorkTabs.*`, `src/pages/about/*`, `src/pages/hire/*`
- `src/pages/home/sections/Hero.js`, `Offers.*`, `components/MobileBar.js`, `components/briefData.js`, `RecruiterBrief.js`
- Links moved to `/work`: footer, 404 page, Arsenal, Universe, Open Source, project pages, film labels, two tool pages
- `public/.htaccess`, `scripts/serve-build.mjs`, `scripts/prerender/{routes,prerender,seo-files}.mjs`, `src/services/github/snapshotStore.js`

## Security / privacy
No new data collected. The employer stays off `/about` (tested).

## Test plan
`tests/e2e/f10-audience.spec.ts` (desktop + mobile): menu order and Hire me; hero buttons; 301s with query; Work tabs; active menu item on a repo page and on Experience; keyboard-opened phone menu; `/hire-me` content and brief dialog; `/about` links and no employer name; prerendered titles. Smoke + axe cover `/work`, `/work/open-source`, `/about`, `/hire-me`; F06/F07/F09 tests moved to the new URLs.

## Rollback
Revert the F10 changes. Old URLs keep working either way (the 301s point at pages that exist).

## After deploy
Flush the Hostinger CDN cache (`.htaccess` changed) and check `/projects?v=<random>` returns 301.
