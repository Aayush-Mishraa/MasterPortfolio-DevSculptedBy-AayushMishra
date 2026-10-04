# Changelog

All notable changes to aayushmishra.engineer. Newest first.

## Unreleased (Stages 3 and 4, not deployed)

### Products page
- New `/products`, in the main menu after Services: the Starter Kit, mentoring, NeuralForge, every free tool, the site's AI and the recruiter kit on one page, with live status and prices from the same config as each page.

### Free tools (F20–F24, F29)
- New `/free-tools` hub. Release Readiness Checklist (50 checks, PDF by email), QA ROI & flaky-test cost calculator, Flaky Test Doctor (JUnit XML / CI logs, in the browser), AI-Agent Readiness quiz (score, full report by email), "Test my site" scanner beta (Playwright, axe and Lighthouse on a GitHub Actions runner; emailed report with a runnable `.spec.ts` and a badge) and an AI Eval Playground.
- Lead magnets, scans and AI questions show up in `/admin` (new Scans, Magnets, AI questions and NeuralForge tabs; "Qualified leads this month" on the overview).

### Recruiter kit (F26)
- Type "sudo hire aayush" anywhere for the recruiter kit: a one-page PDF and `/hire-me/kit`. `/hire-me` gets a kit link and a slot for a 60-second video.

### Revenue pages (F27, F28, F31)
- `/starter-kit` (waitlist until checkout opens), `/mentoring` (sessions in INR with Cal.com / Razorpay / Topmate booking) and `/ask`, an assistant that answers only from this site, with sources and its own eval scores.

### NeuralForge (F30)
- Built for its own subdomain, with free email sign-in (magic link) and progress sync across devices.

## Unreleased (Stage 2, not deployed)

### F13 · Admin dashboard
- `/admin`: a private, server-rendered dashboard behind a Basic-auth gate and a sign-in with lockout and optional two-factor codes.
- Overview of leads, enquiries, subscribers, bookings, conversion by source and the weekly metrics; a leads pipeline with notes, CSV export and delete-on-request; subscribers with Buttondown resync and deletion; bookings; settings (password, notification email, two-factor); an audit log of every action.

### F12 · Service enquiry
- Each offer page has an enquiry form (service pre-selected, company, budget, timeline, message). Enquiries are saved as leads tagged `service:<slug>` and emailed, with the same spam and abuse guards as the contact form, and an "email it instead" fallback.
- Cal.com paid booking for the Release Review (the button appears once the event link is set) and a signed Cal.com webhook that stores bookings for the admin.

### F11 · Services page
- New `/services`, written as a test plan: eight offers as test cases with who it's for, deliverables, timeline, expected result and price, plus the process and an FAQ. One page per offer at `/services/<slug>`.
- Prices and currencies live in one config file; offers carry Service/Offer structured data for search.
- The home page shows three featured offers right after the hero.

### F10 · Audience split
- The home page is services-first ("See services"); recruiters have `/hire-me` with the résumé, the recruiter brief, the 30-second film and the hiring snapshot.
- New `/about` page. The menu is now Home · Work · Services · About · Contact, with a "Hire me" button.
- Projects and Open Source are one Work area: `/work` and `/work/open-source`, with the old URLs redirecting (301).
- The phone menu can now be opened from the keyboard, and the Search button has an accessible name.

## 2026-10-04

### F09 · Hygiene
- Scroll-reveal content is visible by default and only slides in; nothing waits at opacity 0.
- Inter and JetBrains Mono are self-hosted and preloaded (no Google Fonts request): text doesn't jump when fonts load (layout shift ~0 on every page), and on a throttled phone the first paint comes 0.7–0.9 s sooner than with Google Fonts.
- One manifest link, a cleaned-up manifest, and `/favicon.ico` + `/apple-touch-icon.png` at the root.
- Project page titles are visible again (the slide-only animation had left them at opacity 0 and blurred); the reveal test now covers project pages.
- The Projects "Ready when you are" label now meets contrast. `/resume.pdf` is ready to switch on once the new PDF is added.

### F07 · Static GitHub data
- Projects and Open Source no longer call the GitHub API from your browser: they show the build-time snapshot, which a scheduled build refreshes every six hours.
- The "API x/60" counter and refresh button are gone; counters show the real numbers from the first paint (never 0).
- The latest-commits stream and the activity log leave out ci/chore/fix and merge commits; activity entries now show their commit message.
- If a page's HTML and its GitHub data come from different builds (CDN or browser cache), the page is rendered fresh instead of mixing old links with new text.

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
