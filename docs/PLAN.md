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
| F03 | Contact form → backend | leads table + email via Hostinger SMTP; honeypot, rate limit, validation, real states, mailto fallback; Cal.com button; footer uses the same flow | M | F02 | todo |
| F04 | Newsletter → backend | no fake success; subscribe.php → Buttondown; webhook mirrors status; box "coming soon" until issue #1 | S | F02 | todo |
| F05 | Intro without the wait | opt-in "Play intro", sound off, reduced motion respected, lands on the hero, mobile LCP < 2.5 s | S | — | todo |
| F06 | Prerender + real 404 | per-route HTML with real title/meta/canonical/OG/body; real 404; OG images; llms.txt; sitemap; / canonical, /home 301; CI raw-HTML check | M | F05 | todo |
| F07 | Static GitHub data | Projects/Open Source read only the build snapshot (refreshed on a schedule); no API counter; no ci/chore/fix in feeds; counters never 0 | S | — | todo |
| F09 | Hygiene | /resume.pdf on the domain; scroll reveals visible by default; favicon/manifest; CLS 0 | S | Aayush's new PDF | todo |

## Stages 2–4
Unchanged from the plan: F10–F19 (offers, proof, admin), F20–F26 (lead magnets, F25 dropped), F27–F31 (passive revenue). Not started.

## Open questions for Aayush
1. Does the employment contract allow paid side work? (blocks payment features)
2. "Open to roles" badge: public or removed?
3. Home page: services-first or recruiter-first?
4. Currency: USD only, or USD + INR?
5. Which testimonials and case-study numbers may be published?
