# F13 · /admin dashboard

**Stage 2 · Effort L · Status: built, not merged or deployed. Automated tests: E2E written (`tests/e2e/f13-admin.spec.ts`); the rest of the test pass is deferred to the end of Stage 2 (Aayush, 4 Oct 2026).**

## What it is
Server-rendered PHP at `/admin` (not in the React bundle, no JavaScript at all): `admin/index.php` + `admin/lib/*`, sharing the API's classes and config (`api/lib`). Staged into `build/admin/` by `scripts/deploy/stage-api.mjs`.

## Sign-in
1. **HTTP Basic gate** (`ADMIN_BASIC_USER` / `ADMIN_BASIC_PASS` secrets; the deploy stores only a `password_hash`). Checked in PHP rather than `.htpasswd`, because Hostinger's absolute path isn't known to the deploy. In production, a missing gate locks `/admin` (503).
2. **Admin login**: username + password (`password_hash`, min 12 chars), then an optional **TOTP** code (RFC 6238, ±1 step, each code usable once).
3. **Lockout**: 5 failures in 15 minutes locks the IP, and separately the username; gate failures count too. Every attempt goes to `login_attempts`.
4. **Session**: `__Host-admin` cookie on HTTPS (`admin_sid` on local http), Secure/HttpOnly/SameSite=Strict, strict ids, new id at login, 30 min idle / 8 h max.
5. **First admin**: with no admin yet, `/admin/setup` creates one when given the `API_ADMIN_TOKEN`.

Every POST needs the session's CSRF token and a same-site `Origin`. Rejections are logged as `csrf.rejected`.

## Pages
- **Overview**: leads in the last 7 days and this month (vs the plan's 10/month), service enquiries, unanswered "new" leads, subscribers (confirmed vs 300 / pending / unsubscribed), upcoming and paid bookings, won this month, **conversion by source** (lead → won; visit → lead needs analytics, F00b) and the **weekly metrics** for the last 8 weeks.
- **Leads**: search (name/email/company/message), filter by source (incl. "all service enquiries") and status, 50 per page; detail with every field, **pipeline** New → Contacted → Proposal → Won/Lost (`status_changed_at`), **private notes** (`lead_notes`), **CSV export** (formula cells defused), **delete on request** (lead + notes).
- **Subscribers**: search, status filter, **Resync** (asks Buttondown for the subscriber's type), CSV export, **delete on request** (deleted in Buttondown first; nothing is deleted locally if Buttondown doesn't confirm).
- **Bookings**: upcoming / all, from the Cal.com webhook (F12), price and paid flag.
- **Scans**: placeholder until F24.
- **Audit log**: the last 200 actions.
- **Settings**: change password, **notification email** (contact + enquiry emails now go here; falls back to `MAIL_TO`), turn TOTP on/off.

Every action is written to `audit_log` without the personal data it touched.

## Security headers
`Cache-Control: no-store`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, CSP `default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'`. `admin/lib` returns 403.

## Database
`api/migrations/003_admin.sql`: `admin_users`, `login_attempts`, `audit_log`, `lead_notes`, `settings`, `leads.status_changed_at`.

## Go-live steps (Aayush)
1. GitHub secrets `ADMIN_BASIC_USER` and `ADMIN_BASIC_PASS` (a long random password, kept in your password manager).
2. Deploy, then run the migration (`docs/SETUP.md`).
3. Open `https://aayushmishra.engineer/admin/`, enter the Basic credentials, then create your admin with the `API_ADMIN_TOKEN`.
4. Settings → turn on two-factor.

## Tests still owed (end of Stage 2)
PHPUnit for Totp/Csv/LoginThrottle; run the full E2E on both widths; axe on the admin pages. The lockout E2E needs updating: once an IP is locked, the gate answers every admin URL with the 429 page (by design), before the login form.
