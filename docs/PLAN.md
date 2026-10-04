# Plan and status

Source: `qa-reports/claude-code-master-plan-v3.1.md` (local, not in git). Specs live in `docs/features/`.
Status values: todo · in progress · done · blocked (needs Aayush).

## Stage 1: stop the leaks

**Exit gate:** a phone with no mail app can send the contact form and Aayush receives it; mobile LCP < 2.5 s; the raw HTML of /contact contains the contact text; unknown URLs return a real 404.

| ID | Goal | Acceptance criteria (short) | Effort | Depends on | Status |
|---|---|---|---|---|---|
| F01 | Data fixes | One job title + site title; clean JSON-LD; certificate links fixed; typos; Webority hidden on home | S | — | done |
| F08 | Bot access review | Googlebot, Bingbot and approved AI crawlers get 200; /api reachable by servers; settings documented; CI check by user agent | S | — | done in code; blocked on hPanel AI Audit (GPTBot 429) |
| F02 | Backend foundation | /api (PHP 8), config from secrets, migrations, helpers, /api/health; deploy uploads api/; no-store + noindex; PHP tests in CI | M | F08 | done in code; needs DB + secrets in hPanel/GitHub |
| F03 | Contact form → backend | leads table + email via Hostinger SMTP; honeypot, rate limit, validation, real states, mailto fallback; Cal.com button; footer uses the same flow | M | F02 | done in code; live after secrets; Cal.com link pending |
| F04 | Newsletter → backend | no fake success; subscribe.php → Buttondown; webhook mirrors status; box "coming soon" until issue #1 | S | F02 | done in code; Buttondown keys pending |
| F05 | Intro without the wait | opt-in "Play intro", sound off, reduced motion respected, lands on the hero, mobile LCP < 2.5 s | S | — | done (LCP needs F06) |
| F06 | Prerender + real 404 | per-route HTML with real title/meta/canonical/OG/body; real 404; OG images; llms.txt; sitemap; / canonical, /home 301; CI raw-HTML check | M | F05 | done (code); CDN flush after deploy; LCP gate still open |
| F07 | Static GitHub data | Projects/Open Source read only the build snapshot (refreshed on a schedule); no API counter; no ci/chore/fix in feeds; counters never 0 | S | — | done (code) |
| F09 | Hygiene | /resume.pdf on the domain; scroll reveals visible by default; favicon/manifest; CLS 0 | S | Aayush's new PDF | done, except /resume.pdf (waiting for the PDF) |

## Stage 2: offers, proof and admin
Exit gate: `/services` live; `/admin` login shows leads + subscribers; ≥ 3 testimonials + ≥ 1 case study live; ≥ 1 paid booking.

| ID | Goal | Acceptance criteria (short) | Effort | Depends on | Status |
|---|---|---|---|---|---|
| F10 | Audience split | services-first home; `/hire-me` (résumé, brief, snapshot); `/about`; menu Work · Services · About · Contact + Hire me; Projects + Open Source under `/work` (301s) | M | — | done in code, not deployed |
| F11 | `/services` | test-plan page + `/services/<slug>`; offers in `src/data/services.js`, prices in `src/data/pricing.js`; process, FAQ; Service/Offer JSON-LD | M | F10 | done in code, not deployed; offer copy to review |
| F12 | Service enquiry | form per offer → `enquiry.php` → leads (`service:<slug>`) + email; Cal.com paid Release Review; `cal-webhook.php` → bookings | M | F02, F11 | done in code, not deployed; Cal.com link + `CAL_WEBHOOK_SECRET` pending |
| F13 | `/admin` | PHP dashboard: login (Basic Auth + session + lockout + TOTP), overview, leads pipeline, subscribers, bookings, settings, audit log | L | F12 | built, not deployed; `ADMIN_BASIC_*` secrets pending; test pass deferred |
| F14 | Testimonials | passing-spec quotes from `src/data/testimonials.js`, hidden when empty | S | real quotes | waiting for quotes |
| F15 | Case studies | `/work/<slug>` Allure-style, drafts kept out of the build | M | material | waiting for material |
| F16 | Hall of Bugs | 10 anonymized bugs | S | stories | waiting for stories |
| F17 | `/status` | nightly suite + Lighthouse JSON, footer badge | M | — | not started |
| F18 | `/blog` | posts, RSS, OG, newsletter archive; Writing joins the menu | L | — | not started |
| F19 | Tool pages | shared shell, then one page per step | L | — | not started |

## Stage 3: lead magnets
Exit gate: 10 qualified leads a month, tracked in `/admin` (Overview → "Qualified leads this month": contact, enquiries, scanner and bookings; lead magnets are counted separately).

| # | Feature | Scope | Effort | Depends on | Status (4 Oct) |
|---|---|---|---|---|---|
| F20 | Release Readiness Checklist | 50 checks, PDF behind email (`magnet.php`, signed `download.php`), newsletter opt-in `source=checklist` | S | F04 | done in code, not deployed |
| F21 | QA ROI calculator | client-side; money/hours lost, savings, payback; shareable URL | S | — | done in code, not deployed |
| F22 | Flaky Test Doctor | client-side JUnit XML / CI log parser, ranked flaky tests + causes + fixes | M | — | done in code, not deployed; launch post after deploy |
| F23 | AI-Agent Readiness quiz | 12 questions, 0–100, full report by email | S | F20's magnet API | done in code, not deployed |
| F24 | "Test my site" scanner | `scan.php` (SSRF guard) → `site-scan.yml` (Playwright + axe + Lighthouse) → signed callback → email + `.spec.ts` + badge → `/admin/scans` | L | F13 | done in code, not deployed; `SCANNER_GITHUB_TOKEN` + `SCAN_CALLBACK_SECRET` pending |
| F25 | QA Radar | — | — | — | dropped (Tech Universe unchanged) |
| F26 | Recruiter kit | "sudo hire aayush" anywhere → one-page PDF; `/hire-me/kit`; video slot on `/hire-me` | S | F10 | done in code; notice period, calendar link, video pending |

## Stage 4: passive revenue

| # | Feature | Scope | Effort | Depends on | Status (4 Oct) |
|---|---|---|---|---|---|
| F27 | Starter Kit storefront | `/starter-kit`, waitlist until a checkout link exists | S | F20's magnet API | page done; kit repo, price, checkout link pending |
| F28 | `/mentoring` | three INR sessions; Cal.com / Razorpay / Topmate links; enquiry fallback | S | F12 | done in code; booking links + price check pending |
| F29 | AI Eval Playground | in-browser eval suite on canned chatbot answers | M | — | done in code, not deployed |
| F30 | NeuralForge launch | own subdomain, magic-link sign-up, progress sync | M | F02 | done in code; hPanel subdomain pending |
| F31 | Ask Aayush's AI | `/ask`: BM25 over the site + Claude Haiku 4.5, sources and eval scores, booking CTA | M | F06 | done in code; `ANTHROPIC_API_KEY` pending (answers with passages until then) |

Everything is reachable from `/products` (added to the main menu after Services on 4 Oct, at Aayush's request: "build a product page to access these things"), the footer and the command palette. Specs: `docs/features/F20–F31`.

## Decisions (4 Oct 2026)
Services-first home; Writing hidden until `/blog`; prices in USD, mentoring in INR; the contract allows paid side work (build the paid booking).

## Open questions for Aayush
1. "Open to roles" badge: public or removed? (kept for now: header, Open Source page, `/hire-me`)
2. Which testimonials and case-study numbers may be published?
