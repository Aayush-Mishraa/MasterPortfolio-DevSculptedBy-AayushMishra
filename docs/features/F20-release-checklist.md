# F20 · Release Readiness Checklist PDF

**Stage 3 · Effort S · Status: done in code (not merged or deployed).**

## Goal
A 50-point pre-release checklist, as a printable PDF, in exchange for an email (a lead in `/admin`).

## Acceptance criteria
- [x] `/free-tools/release-readiness-checklist`: 10 sections, two checks of each previewed, the rest in the PDF. Content in `src/data/checklist.js` (one source for the page and the PDF).
- [x] Email capture (`src/pages/tools/EmailCapture.js`, magnet `checklist`) → `POST /api/magnet.php`: origin, honeypot, form token `magnet`, 8/h + 25/day per IP, 4/day per address. Saves a lead `source = magnet:checklist` and a `magnet_requests` row, emails a download link, and returns the same link so the page shows "Download now" at once.
- [x] The newsletter is a separate, unticked opt-in; ticked → the Buttondown subscribe flow with source `checklist` (double opt-in as before).
- [x] The PDF is never public: `api/assets/` is closed by `api/.htaccess` (403); `api/download.php` serves it only for a link signed with the app secret, valid 7 days, and counts downloads.
- [x] `scripts/magnets/build-pdfs.mjs` renders the PDF (A4, 2 pages) into `build/api/assets/` at deploy time.

## Checked by hand (4 Oct)
curl: request → link → 200 `application/pdf` (62 KB); tampered signature → 410 page; direct `/api/assets/…` → 403; email in Mailpit. PDF reviewed.

## Tests owed (automation pass)
PHPUnit: `magnet.php` (each magnet, validation incl. the quiz code, limits, honeypot, wrong-form token); `download.php` (valid, expired, tampered, unknown magnet). Playwright: preview, capture, download link shown; mobile; axe.
