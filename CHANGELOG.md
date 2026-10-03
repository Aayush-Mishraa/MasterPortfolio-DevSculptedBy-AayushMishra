# Changelog

All notable changes to aayushmishra.engineer. Newest first.

## 2026-10-03

### F08 · Bot access review
- robots.txt names every approved crawler (Googlebot, Bingbot and the major AI bots) and keeps them out of `/api/`, `/admin/` and `/splash`.
- `scripts/qa/check-bots.mjs` and a **Live check** workflow (after each deploy, daily, on demand) verify that crawlers get the real page and that server user agents reach `/api/`.
- The hPanel AI Audit setting that still returns 429 to GPTBot is documented in `docs/SETUP.md`.

### F01 · Data fixes
- One job title, "Senior SDET & QA Lead", and one site title, "Aayush Mishra · Senior SDET & QA Lead", across the hero, intro, footer, contact card, JSON-LD, index.html and the web manifest.
- JSON-LD Person no longer publishes an empty phone or address, or Instagram in `sameAs`; certificates carry a URL only when it is their own.
- Certificate cards corrected against the certificates themselves: links that opened another course's certificate are removed, and the Selenium, Postman, Swift and AWS cards name the right course and issuer.
- Copy fixes: "a variety of courses", "documentary", "Recurrence", "Volunteering".
- Test harness: Playwright (desktop 1280 px + mobile 375 px), axe checks against a baseline, a console-error guard, and cspell (`npm run spell`).

### Housekeeping
- Committed the privacy text and the index.html `onload` fix that were left uncommitted.
- Removed the GitHub Pages leftovers (`gh-pages` package, `predeploy`/`deploy` scripts).
