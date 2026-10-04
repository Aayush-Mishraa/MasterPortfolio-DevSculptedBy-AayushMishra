# F24 · "Test my site" scanner (beta)

**Stage 3 · Effort L · Status: done in code (not merged or deployed). Design approved 4 Oct. Waiting for: `SCANNER_GITHUB_TOKEN`, `SCAN_CALLBACK_SECRET`.**

## Flow
`/free-tools/site-scanner` (URL, email, permission tick) → `POST /api/scan.php` → GitHub `repository_dispatch` (`site-scan`) → `.github/workflows/site-scan.yml` runs `scripts/scanner/run-scan.mjs` (Playwright + axe-core + Lighthouse) → `POST /api/scan-callback.php` (HMAC-signed) → the report is emailed with `failing-checks.spec.ts` attached → `/free-tools/site-scanner/report?id=<24 hex>` and `/api/badge.php?id=…` → `/admin/scans`.

## Acceptance criteria
- [x] `scan.php`: origin, honeypot, form token `scan`, consent required. `SsrfGuard`: http(s) only, ports 80/443, no `user:pass@`, no IP literals, no internal names (`localhost`, `.local`, …); every A/AAAA record must be public (private, loopback, link-local/metadata, CGNAT, reserved, multicast, NAT64 and IPv4-mapped are refused). Limits: 2 a day per IP, 3 per address, `daily_cap` (30) in total. Saves a `scans` row and a lead `source = scanner`, and emails Aayush a heads-up.
- [x] Without a GitHub token the request is saved as `waiting`; `/admin/scans/<id>` → "Start scan" dispatches it later.
- [x] The job checks the callback URL is ours, blocks private networks and the metadata service with iptables, re-resolves DNS, sends every request through a public-address check and fetches pages without following redirects (each hop is checked again).
- [x] Checks: page loads, HTTPS, console errors, broken resources, broken links (25 same-site), title, meta description, viewport, `lang`, axe serious + critical, HSTS, CSP, nosniff, framing, Referrer-Policy (warning only), sideways scroll at 375 px, Lighthouse mobile LCP / CLS / TBT (the lab stand-in for INP) and the four category scores.
- [x] `failing-checks.spec.ts`: one Playwright test per failed check (fails today, passes once fixed).
- [x] Callback: `X-Scan-Timestamp` (±5 min) and `X-Scan-Signature` = hex HMAC-SHA256(secret, "timestamp.body"), 2 MB cap; stores report and spec; emails once: "14 passed · 3 failed · NOT SIGNED OFF".
- [x] The report page polls while queued or running, shows checks, scores, the spec (download) and the badge with its HTML. `noindex`.
- [x] Badge: shields-style SVG (green "signed off ✓", red "n passed · m failed", grey while pending).

## Setup (Aayush)
1. GitHub → Settings → Developer settings → Fine-grained token: this repository only, **Contents: Read and write** (what `repository_dispatch` needs), nothing else → secret `SCANNER_GITHUB_TOKEN`.
2. `openssl rand -hex 32` → secret `SCAN_CALLBACK_SECRET` (read by both the API config and the workflow).
3. Deploy, then scan https://aayushmishra.engineer itself. If Hostinger's bot protection blocks the callback, allow `/api/*` (F08).

## Checked by hand (4 Oct)
SSRF guard on 15 addresses; scan → waiting; bad signature → 401; signed callback → stored and emailed with the attachment; report page and badge; admin list and detail. The workflow itself hasn't run yet (it needs the token and a push).

## Tests owed
PHPUnit: SsrfGuard table, scan.php limits and validation, callback signature / replay / one email, report and badge. One manual run of the workflow (`workflow_dispatch` with a URL). Playwright: form errors, report states.
