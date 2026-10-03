# F02 · Backend foundation

**Stage 1 · Effort M · Depends on: F08 · Blocks: F03, F04 · Status: code done; needs the hPanel database and GitHub secrets (Aayush)**

## Goal
A small, safe PHP 8 API on the Hostinger plan the site already pays for, deployed with the site, configured from GitHub secrets, with a database schema that migrates itself and tests in CI.

## User story
As Aayush, I push to main and the API ships with the site; I add secrets in GitHub, never in git, and `/api/health.php` tells me what's working.

## Acceptance criteria
- [x] `api/` (PHP ≥ 8.1): `health.php`, `token.php` (form tokens), `migrate.php` and `mail-test.php` (admin token), JSON 404/403 (`not-found.php`).
- [x] Helpers in `api/lib/`: `Config`, `Db` (PDO, prepared statements, no emulation), `Validator`, `RateLimit` (MySQL with a file fallback), `FormToken` (HMAC-signed CSRF/time-trap token), `Http` (JSON responses, origin check, body limits, client IP, admin token), `Mailer` (PHPMailer over authenticated SMTP), `Migrator`.
- [x] `api/migrations/001_init.sql`: `leads`, `subscribers`, `rate_limits`, `webhook_events` (+ `schema_migrations`).
- [x] `config.php` generated at deploy from GitHub secrets (`scripts/deploy/write-api-config.php`), uploaded **outside the web root** to `domains/aayushmishra.engineer/private/api-config.php`; `api/config.php` is git-ignored for local use.
- [x] Deploy: `composer install --no-dev`, `php -l`, `scripts/deploy/stage-api.mjs` copies `api/` (and `admin/` when it exists) into `build/` without tests or Composer files; migrations run after the upload.
- [x] `.htaccess`: `/api` and `/admin` are handed to their own folders before the SPA fallback; `api/.htaccess` blocks `lib/`, `vendor/`, `migrations/`, `tests/`, dotfiles and config files.
- [x] Every `/api` response: `Cache-Control: no-store, private`, `X-Robots-Tag: noindex, nofollow`, `nosniff`, no CORS grant.
- [x] PHP tests in CI against MySQL 8 and Mailpit, on PHP 8.1 and 8.3 (`.github/workflows/test.yml`).
- [ ] Live: `/api/health.php` shows `config`, `database`, `schema`, `mail` all true (after the secrets below).

## Security notes
- Secrets only in GitHub Actions secrets → config file outside `public_html`. Even if PHP stopped executing, no secret sits in the web root.
- `display_errors` off before anything loads (plus `api/.user.ini` for LiteSpeed); errors go to the PHP log only; responses carry generic messages.
- PDO with real prepared statements; no string-built SQL.
- Admin endpoints need `Authorization: Bearer <API_ADMIN_TOKEN>` (≥ 24 chars, constant-time compare); Apache's habit of hiding that header is handled in `.htaccess`.
- Browser calls are accepted only from our own origins (`Origin` checked; no `Access-Control-Allow-Origin` is ever sent).
- IPs are stored only as an HMAC (`ip_hash`), keyed by `API_APP_SECRET`.
- Behind the CDN, `REMOTE_ADDR` may be the edge. `/api/health.php` with the admin token lists the forwarding headers it sees; set `API_CLIENT_IP_HEADER` from that (the last address in that header is used).

## Test plan
- `api/tests/Unit`: validator, form tokens, HTTP helpers (origin, body limits, client IP, admin token), migration splitting.
- `api/tests/Integration`: migrations once and in order, rate limits in MySQL and in files, and the endpoints over HTTP (health headers, 405, admin token, migrate twice, form tokens, mail through SMTP into Mailpit; on Apache also: internals return 403/404 without leaking source, JSON 404).
- Local: `tests/server/docker-compose.yml` (Apache + PHP 8.2, MySQL 8, Mailpit) — 28 tests, 101 assertions passing on 3 Oct 2026.

## Rollback
Revert the F02 merge commit and redeploy. The database tables can stay; nothing reads them yet.
