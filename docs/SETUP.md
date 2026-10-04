# Setup

How to build, test and deploy aayushmishra.engineer, and every setting that lives outside the code.

## Local development

```bash
npm ci
npm start                       # dev server on http://localhost:3000
```

Node 22 works locally; react-scripts 3.2 (webpack 4) then needs the legacy OpenSSL provider:

```bash
NODE_OPTIONS=--openssl-legacy-provider npx react-scripts build   # build/ without re-fetching GitHub
npm run build                                                     # same, after the prebuild GitHub snapshot (needs network)
```

CI builds with Node 16 (no flag needed).

## Tests

```bash
npx playwright install chromium   # once
npx playwright test               # serves build/ on :4173, runs desktop (1280px) + mobile (375px)
BASE_URL=https://aayushmishra.engineer npx playwright test tests/e2e/smoke.spec.ts   # against any server
UPDATE_A11Y_BASELINE=1 npx playwright test tests/e2e/smoke.spec.ts                  # re-record the axe baseline
npm run spell                     # cspell on the site copy
```

- `tests/e2e/fixtures.ts` fails a test on any console error or uncaught exception (third-party font/CDN noise excepted).
- Accessibility: serious and critical axe findings are compared with `tests/fixtures/axe-baseline.json` (recorded from main on 3 Oct 2026). A new rule, or more nodes for a known rule, fails the test.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: build, stage the PHP API into `build/api/`, write the API config from secrets, FTP `build/` to `/domains/aayushmishra.engineer/public_html/`, FTP the config to `/domains/aayushmishra.engineer/private/`, then run database migrations. Batch commits: one push per feature.

### GitHub secrets (Settings → Secrets and variables → Actions)

| Secret | Value | Used by |
|---|---|---|
| `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (`FTP_HOST`, `FTP_PORT` optional) | existing | deploy |
| `API_APP_SECRET` | `openssl rand -hex 32` | form tokens, IP hashing |
| `API_ADMIN_TOKEN` | `openssl rand -hex 32` (keep a copy in your password manager) | `/api/migrate.php`, `/api/mail-test.php`, health details |
| `DB_HOST` | `localhost` | API |
| `DB_NAME`, `DB_USER`, `DB_PASS` | from hPanel → Databases → Management | API |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.hostinger.com` / `465` (defaults; set only to change) | mail |
| `SMTP_USER`, `SMTP_PASS` | `contact@aayushmishra.engineer` and that mailbox's password | mail |
| `MAIL_TO` | where contact-form leads go (default `contact@aayushmishra.engineer`) | F03 |

The Cal.com links aren't secrets: the 20-min call is `contactSection.booking.url` in `src/portfolio.js`; the paid Release Review is `BOOKING["release-review"].url` in `src/data/pricing.js`. Service prices and currencies are all in `src/data/pricing.js`.
| `BUTTONDOWN_API_KEY`, `BUTTONDOWN_WEBHOOK_SECRET` | Buttondown → Settings → API / Webhooks (steps in `docs/features/F04-newsletter-backend.md`) | F04 |
| `CAL_WEBHOOK_SECRET` | the secret of the Cal.com webhook (steps in `docs/features/F12-service-enquiry.md`) | F12 |
| `ADMIN_BASIC_USER`, `ADMIN_BASIC_PASS` | the HTTP Basic gate in front of `/admin` (long random password; only its hash is deployed). Without them `/admin` stays locked | F13 |
| `API_CLIENT_IP_HEADER` | e.g. `HTTP_X_FORWARDED_FOR`, after checking health (below) | rate limits |
| `SCANNER_GITHUB_TOKEN` | fine-grained token, this repo only, Contents: read and write (`docs/features/F24-site-scanner.md`) | F24 |
| `SCAN_CALLBACK_SECRET` | `openssl rand -hex 32` (the API and `site-scan.yml` both read it) | F24 |
| `ANTHROPIC_API_KEY` | Anthropic Console API key, with a spend limit set there | F31 |

Actions **variables** (not secrets): `NEURALFORGE_LIVE=1` once the subdomain answers (F30), `NEURALFORGE_URL` to override where sign-in links point, `ASK_DAILY_CAP` (default 200 AI answers a day).

Stage 3/4 build steps (in `deploy.yml`, after "Stage the API"): `node scripts/magnets/build-pdfs.mjs` (checklist + recruiter PDFs), `node scripts/ask/build-corpus.mjs` (the assistant's knowledge), `node scripts/neuralforge/build.mjs` (the subdomain). Run the same three locally after `stage-api.mjs`, then restart `web`. Migration `004_stage3_4.sql` adds `scans`, `magnet_requests`, `nf_users`, `nf_tokens`, `ask_log`.

Missing secrets don't break the deploy: the API reports what isn't configured and the contact form falls back to email.

### Staging (staging.aayushmishra.engineer)
`.github/workflows/deploy-staging.yml` builds the same site and uploads it to `public_html/staging` (hPanel subdomain → that folder). It runs on a push to any branch except `main` whose commit message contains `[staging]`, on any push to the `staging` branch, or by hand (Actions → Deploy staging). `main` keeps deploying production only.
- Password prompt on everything (`STAGING_GATE_USER` / `STAGING_GATE_PASS`; the `.htpasswd` goes to `private/staging.htpasswd`), `noindex` + a blocking robots.txt, and a 403 when opened as `aayushmishra.engineer/staging/` (`scripts/deploy/staging-site.mjs`).
- Its own database and config: `private/staging-api-config.php` (the API finds it because it runs from `public_html/staging`), its own state folder, migrations on every deploy. Newsletter, Cal.com, scanner and AI are off; mail uses the shared `SMTP_*` secrets.
- Secrets: `STAGING_DB_NAME` (`u778141320_StagingEnv`), `STAGING_DB_USER` (`u778141320_staging`), `STAGING_DB_PASS`, `STAGING_APP_SECRET` and `STAGING_ADMIN_TOKEN` (`openssl rand -hex 32` each), `STAGING_GATE_USER`, `STAGING_GATE_PASS`.
- First admin on staging: `/admin/setup` with the `STAGING_ADMIN_TOKEN`.

### First backend deploy (one time)
1. hPanel → Websites → aayushmishra.engineer → **Databases → Management**: create a database and user (all privileges on it). Host is `localhost`.
2. Add the secrets above, then push (or re-run the Deploy workflow).
3. Check it: `curl -H "Authorization: Bearer $API_ADMIN_TOKEN" https://aayushmishra.engineer/api/health.php` — `checks` should all be `true`. `admin.ip_headers` shows which header carries your IP behind the CDN; put that name in `API_CLIENT_IP_HEADER`.
4. If the migration step in the deploy log failed (e.g. the CDN challenged GitHub's IP), run it yourself: `curl -X POST -H "Authorization: Bearer $API_ADMIN_TOKEN" https://aayushmishra.engineer/api/migrate.php`.
5. Mail check: open mail-tester.com, copy its address, then `curl -X POST -H "Authorization: Bearer $API_ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"to":"<that address>"}' https://aayushmishra.engineer/api/mail-test.php`. Target score ≥ 9/10.

### Email authentication (checked 3 Oct 2026)
| Record | Status |
|---|---|
| SPF `v=spf1 include:_spf.mail.hostinger.com ~all` | present |
| DKIM `hostingermail-a/b/c._domainkey` → Hostinger | present |
| DMARC `_dmarc` `v=DMARC1; p=none` | present, monitoring only. Recommended: `v=DMARC1; p=quarantine; rua=mailto:contact@aayushmishra.engineer` once mail-tester passes (hPanel → Domains → DNS / Nameservers) |

## Hosting facts to confirm in hPanel
Fill these in once checked (plan v3.1 asks for them before the backend goes live). `/api/health.php` with the admin token also reports the PHP version and server.

| Item | Value |
|---|---|
| PHP version | 8.4 (from /api/health.php, 3 Oct 2026); the API needs ≥ 8.1 and CI tests 8.1 and 8.4 |
| MySQL limits | _to confirm_ |
| SMTP host / port | smtp.hostinger.com, 465 (SSL) |
| CDN | Hostinger CDN (`Server: hcdn`); flush in hPanel after changes to `.htaccess` or HTML |

## Run the site and the admin locally (Docker)
1. Build and stage: `NODE_OPTIONS=--openssl-legacy-provider npx react-scripts build && node scripts/prerender/prerender.mjs && node scripts/deploy/stage-api.mjs`
2. Start the stack: `docker compose -f tests/server/docker-compose.yml up -d --build` (after a later build: `docker compose -f tests/server/docker-compose.yml restart web`)
3. Migrate once: `curl -X POST -H "Authorization: Bearer test-admin-token-0123456789abcdef" http://localhost:8080/api/migrate.php`
4. Site: http://localhost:8080 · Admin: http://localhost:8080/admin/ (Basic gate: `gate` / `local-gate-password`; the first visit creates your admin with the token `test-admin-token-0123456789abcdef`) · Mail sent by the forms: http://localhost:8025
These are local test values from `tests/server/api-config.php`, never the real secrets. The F13 E2E test resets the local admin users.

## Local backend
```bash
# PHP dependencies (Docker, no local PHP needed)
docker run --rm -v "$PWD/api:/app" -w /app composer:2 install
docker run --rm -e COMPOSER_VENDOR_DIR=vendor-dist -v "$PWD/api:/app" -w /app composer:2 install --no-dev

# build + stage, then Apache/PHP 8.2 + MySQL + Mailpit on :8080 (mail UI :8025)
NODE_OPTIONS=--openssl-legacy-provider npx react-scripts build && node scripts/deploy/stage-api.mjs
docker compose -f tests/server/docker-compose.yml up -d --build

# PHPUnit against that stack
docker compose -f tests/server/docker-compose.yml run --rm --no-deps -v "$PWD/api:/app" -w /app   -e TEST_DB_HOST=db -e TEST_DB_NAME=portfolio -e TEST_DB_USER=portfolio -e TEST_DB_PASS=portfolio   -e API_BASE_URL=http://web -e API_SERVER=apache -e MAILPIT_URL=http://mail:8025 -e TEST_APP_SECRET=local-test-secret-0123456789abcdef0123456789 web vendor/bin/phpunit
```
On Windows Git Bash, prefix docker commands with `MSYS_NO_PATHCONV=1` and use `$(pwd -W)`.

## hPanel settings (Hostinger)

| Where | Setting | Why |
|---|---|---|
| Websites → aayushmishra.engineer → Dashboard → Performance → CDN → AI Audit | **Allow** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot, CCBot | F08: approved AI crawlers get 200 (GPTBot got 429 on 3 Oct 2026) |
| Same page | Security level / bot protection at default, never "under attack" | crawlers and webhooks must not get a JS challenge |
| Same page → Flush cache | after any change to `.htaccess`, robots.txt or prerendered HTML | the CDN can keep an old copy for days |

Check access any time with `node scripts/qa/check-bots.mjs` (or Actions → **Live check** → Run workflow, which runs from a GitHub datacenter IP like the webhook senders).

## Prerender (F06)
`npm run build` is followed in CI by `node scripts/prerender/prerender.mjs` (needs `npx playwright install chromium` once) and `node scripts/prerender/check-html.mjs`. Locally:

```bash
NODE_OPTIONS=--openssl-legacy-provider npx react-scripts build
node scripts/prerender/prerender.mjs        # ~2 min: build/_pages, 404.html, sitemap.xml, llms.txt, og/
node scripts/prerender/check-html.mjs       # raw-HTML gate
node scripts/prerender/check-html.mjs --live https://aayushmishra.engineer   # after a deploy
```

**After every deploy that changes `.htaccess` or page HTML:** hPanel → Websites → aayushmishra.engineer → Performance → CDN → **Flush cache**, then open a page with `?v=<random>` and compare with the plain URL.

## Leftovers to remove by hand
The three manual workflows `deploy-ftp.yml`, `deploy-hostinger.yml` and `urgent-fix.yml` in `.github/workflows/` still exist (Claude's auto-mode blocked deleting CI files). They only run on `workflow_dispatch` but upload to `FTP_SERVER_DIR`, which may be the wrong folder. Delete them in a commit of your own.
