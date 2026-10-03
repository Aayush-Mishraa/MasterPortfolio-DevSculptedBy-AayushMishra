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

Every push to `main` runs `.github/workflows/deploy.yml`: build, then FTP to Hostinger (`/domains/aayushmishra.engineer/public_html/`). Batch commits: one push per feature.

Repository secrets used today: `FTP_SERVER` (FTP IP), `FTP_USERNAME`, `FTP_PASSWORD` (optional `FTP_HOST`, `FTP_PORT`).

## Hosting facts to confirm in hPanel
Fill these in once checked (plan v3.1 asks for them before the backend goes live):

| Item | Value |
|---|---|
| PHP version | _to confirm_ |
| MySQL limits | _to confirm_ |
| SMTP host / port | smtp.hostinger.com, 465 (SSL) — _to confirm_ |
| CDN | Hostinger CDN (`Server: hcdn`); flush in hPanel after changes to `.htaccess` or HTML |

## hPanel settings (Hostinger)

| Where | Setting | Why |
|---|---|---|
| Websites → aayushmishra.engineer → Dashboard → Performance → CDN → AI Audit | **Allow** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot, CCBot | F08: approved AI crawlers get 200 (GPTBot got 429 on 3 Oct 2026) |
| Same page | Security level / bot protection at default, never "under attack" | crawlers and webhooks must not get a JS challenge |
| Same page → Flush cache | after any change to `.htaccess`, robots.txt or prerendered HTML | the CDN can keep an old copy for days |

Check access any time with `node scripts/qa/check-bots.mjs` (or Actions → **Live check** → Run workflow, which runs from a GitHub datacenter IP like the webhook senders).

## Leftovers to remove by hand
The three manual workflows `deploy-ftp.yml`, `deploy-hostinger.yml` and `urgent-fix.yml` in `.github/workflows/` still exist (Claude's auto-mode blocked deleting CI files). They only run on `workflow_dispatch` but upload to `FTP_SERVER_DIR`, which may be the wrong folder. Delete them in a commit of your own.
