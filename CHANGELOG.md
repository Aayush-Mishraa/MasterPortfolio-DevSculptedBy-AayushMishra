# Changelog

All notable changes to aayushmishra.engineer. Newest first.

## 2026-10-03

### F06 · Prerender + real 404
- Every page is prerendered at build time: real title, description, canonical URL, share image and text in the HTML, for 8 pages, every repository and every Tech Universe channel.
- Unknown URLs now return a real 404 with the site's 404 page; `/home` redirects to `/`, `www.` to the bare domain.
- Generated `sitemap.xml`, `llms.txt` and a 1200×630 share image per page; Tech Universe pages get proper titles and descriptions.
- The app adopts the prerendered HTML instead of rebuilding it, fonts no longer shift text when they load, Google Fonts no longer block the first paint, and the contact photo is 24 KB instead of 262 KB.
- CI checks the raw HTML of every page before deploying, and the live site after.

### F05 · Intro without the wait
- The intro no longer plays on its own: every visit lands on the hero. "Play intro" (hero) and the header logo play it.
- Sound is off by default, with a remembered on/off toggle in the intro; the "Enter" screen is gone.
- The intro ends on `/`, which is now where the Home links point.

### F04 · Newsletter → backend
- The footer no longer fakes a successful sign-up and drops the address: it says "Newsletter coming soon" until issue #1.
- `/api/subscribe.php` sends sign-ups to Buttondown, which emails the confirmation link (double opt-in); `/api/buttondown-webhook.php` (HMAC-signed) keeps each subscriber's status in MySQL.
- `?newsletter=preview` shows the working form ahead of launch; the privacy note mentions Buttondown.

### F03 · Contact form → backend
- The contact form now sends from the page: `/api/contact.php` saves the lead and emails it through Hostinger SMTP with Reply-To set to the sender. No mail app needed.
- Spam guards: a hidden honeypot field, a signed form token that must be a few seconds old, a per-IP rate limit and server-side validation.
- Real result states: "Transmission received", field errors from the server, and a fallback panel (open in mail app, copy, try again) if delivery fails.
- The footer's "Get in touch" opens the same form; a "Book a 20-min call" button appears once a Cal.com link is set; the privacy note lists what the form stores.

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
