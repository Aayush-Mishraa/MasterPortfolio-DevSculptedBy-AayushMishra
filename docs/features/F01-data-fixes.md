# F01 · Data fixes

**Stage 1 · Effort S · Depends on: nothing · Status: done (3 Oct 2026)**

## Goal
Every fact the site states (on the page and in its JSON-LD) is correct and consistent: one job title, one site title, no empty or wrong structured data, and certificate links that open the certificate they sit on.

## User story
As a recruiter or client checking Aayush, I see the same title everywhere, and every "verified" certificate opens that exact certificate. As a search engine, I read a Person schema with no empty phone, address or broken links.

## Acceptance criteria
- [x] Site title is `Aayush Mishra · Senior SDET & QA Lead` (home `<title>`, og:title, index.html fallback, manifest `name`).
- [x] Job title `Senior SDET & QA Lead` everywhere it describes Aayush today: hero byline, intro role line, recruiter brief, film, footer "Now", contact card (.vcf), JSON-LD `jobTitle`. The Experience page keeps each role's real title.
- [x] JSON-LD Person: no `telephone`, no empty address fields (only `addressCountry: India`), no empty strings anywhere, Instagram not in `sameAs`.
- [x] Certificate links: the 2 "Link to your certificate" placeholders, the 3 courses sharing one Udemy PDF, the 2 Coursera courses sharing one link and the 2 empty links are fixed (see table). No two certificates share a link; JSON-LD lists a `url` only for a real, unique link.
- [x] Typos: "varity" → "a variety", "documentry", "Reoccurence", "Volunteership(s)". `npm run spell` (cspell) passes on the site copy.
- [x] Webority stays off the home page (homeData.js logic unchanged).

## Certificate changes (checked against each certificate on 3 Oct 2026)

| Card | Before | After | Evidence |
|---|---|---|---|
| AWS Machine Learning | "Andrew Ng · Stanford University" | "Getting Started with AWS Machine Learning · Amazon Web Services · Coursera" (link kept) | coursera.org/verify/TAKHUGGPBYUL is that course |
| Python for Data Science (Andrew Ng) | AWS certificate's link | no link | the link opened the AWS certificate |
| Selenium | "Saurabh Mukhopadhyay · NPTEL" | "Selenium WebDriver with Java: Basics to Advanced + Frameworks · Rahul Shetty · Udemy" (link kept) | Udemy UC-5eefb0ee is that course |
| Data Science (IBM) | Selenium PDF | no link | link opened the Selenium certificate |
| Playwright Testing | Selenium PDF, issuer "Microsoft" | no link, issuer "Udemy" | link opened the Selenium certificate; résumé lists "Playwright and API Testing – Udemy" |
| Swift iOS Development | issuer "Coursera" | "Swift 5 Programming for Beginners · Udemy" (link kept) | Udemy UC-38add859 is that course |
| Postman API Testing | "Qwiklabs · GCP" | "Postman: Learn API Testing from Scratch with Live Projects · Rahul Shetty Academy · Udemy" (link kept) | Udemy UC-ce8a68f1 is that course |
| ML on GCP, DL on Tensorflow | "Link to your certificate" | no link; DL on Tensorflow issuer "CampusX" (its logo) | placeholder text |
| Advanced ML on GCP, Rest Assured | empty | still empty | no certificate URL known |

**Needs Aayush:** real certificate URLs for Python for Data Science (Andrew Ng), Data Science (IBM), Playwright Testing, Advanced ML on GCP, Rest Assured, ML on GCP and DL on Tensorflow. The "Python for Data Science, AI & Development · Andrew Ng" card may be a duplicate of the IBM course of the same name; confirm or remove it.

## Design notes
- `src/portfolio.js` gains `JOB_TITLE` / `SITE_TITLE` and `greeting.jobTitle`; everything reads from there.
- Social links can opt out of the schema with `sameAs: false` (Instagram).
- `SeoHeader.js` exports `personSchema()`; a `compact()` helper drops empty values, and certificate URLs are counted so a shared link is never published.

## Files touched
`src/portfolio.js`, `src/components/seoHeader/SeoHeader.js`, `src/pages/home/homeData.js`, `src/pages/home/sections/Hero.js`, `src/pages/splash/Splash.js`, `src/components/CreativeFooter/CreativeFooter.js`, `public/index.html`, `public/manifest.json`, `package.json`, `cspell.json`, tests.

## Security notes
None (static data only).

## Test plan
- `tests/e2e/f01-data.spec.ts` (desktop + mobile): titles, hero role, JSON-LD shape, certificate links, copy, manifest.
- `tests/e2e/smoke.spec.ts`: every page renders, no console errors, no new serious/critical axe issues (baseline from main in `tests/fixtures/axe-baseline.json`).
- `npm run spell`.

## Rollback
Revert the F01 merge commit. No data or server state is involved.
