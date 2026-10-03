# Changelog

All notable changes to aayushmishra.engineer. Newest first.

## 2026-10-03

### F02 · Backend foundation
- New PHP 8 API in `api/`: health check, signed form tokens, admin-only migrate and mail-test endpoints, and shared helpers for the database (PDO), validation, rate limits, JSON responses and SMTP mail (PHPMailer).
- MySQL schema in `api/migrations/001_init.sql` (leads, subscribers, rate limits, webhook events), applied by the deploy.
- The deploy installs PHP dependencies, checks syntax, ships `api/` inside the build, and writes the API config from GitHub secrets to a folder outside the web root.
- `/api` never caches, never gets indexed and keeps its internals private; a new Tests workflow runs PHPUnit on PHP 8.1 and 8.3 against MySQL and a mail catcher, plus the Playwright suite.

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
