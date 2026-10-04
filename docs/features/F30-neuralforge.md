# F30 · NeuralForge launch

**Stage 4 · Effort M · Status: done in code (not merged or deployed). Waiting for: the subdomain in hPanel.**

## Acceptance criteria
- [x] `scripts/neuralforge/build.mjs` builds `build/neuralforge/` from `public/tools/neuralforge.html` (the 21-level path): its own title, canonical (`https://neuralforge.aayushmishra.engineer/`) and share tags, links to the main site made absolute, the sync script, an API wrapper and an `.htaccess`.
- [x] Free sign-up with a magic link (decided 4 Oct): no passwords. `api/nf.php` (served on the subdomain as `/api/nf.php`, same origin): request a link (form token, 6/h per IP, 3/h per address), verify (one use, 30 min), progress get/save (Bearer session, 180 days, ≤ 200 KB), sign out, delete account. Tokens stored only as SHA-256 hashes. Migration 004: `nf_users`, `nf_tokens`.
- [x] `neuralforge/nf-sync.js`: a "Save progress" panel; merges the saved copy with the browser's (union of completed levels, labs, projects; notes merged; reloads once if anything changed) and pushes each change 3 s after the app saves it. Signed out, everything stays in the browser as before.
- [x] `/admin/neuralforge`: sign-ups, active learners, learners by level.

## Setup (Aayush)
1. hPanel → Domains → Subdomains → create `neuralforge` with document root `public_html/neuralforge` (the deploy uploads `build/neuralforge/` there). Enable SSL for it.
2. Deploy. Check `https://neuralforge.aayushmishra.engineer/` and sign in once.
3. Then set the Actions **variable** `NEURALFORGE_LIVE=1` and deploy again: `/neuralforge/` on the main domain then 301s to the subdomain. (Optionally point `/tools/neuralforge.html` there too.)
4. Before the subdomain exists, the variable `NEURALFORGE_URL=https://aayushmishra.engineer/neuralforge` makes sign-in links work on the main domain.

## Checked by hand (4 Oct)
Local stack: page + script 200; request → link in Mailpit → verify → save → progress → reused link 410 → sign out → 401.

## Tests owed
PHPUnit: nf.php actions, limits, expired/used links, session expiry, delete. Playwright: sign-in via Mailpit link, merge across two browser contexts.
