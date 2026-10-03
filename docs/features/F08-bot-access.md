# F08 · Bot access review

**Stage 1 · Effort S · Depends on: nothing · Blocks: F02 webhooks · Status: code done; hPanel change pending (Aayush)**

## Goal
Search engines and the AI crawlers Aayush approved get the real page (HTTP 200), and server-to-server callers (Cal.com and Buttondown webhooks, GitHub Actions) can reach `/api/`. The settings are written down and checked by CI.

**Decision (3 Oct 2026):** allow all major AI crawlers — GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot(-Extended), CCBot.

## Findings (3 Oct 2026, from an Indian residential IP)

| User agent | Status | Notes |
|---|---|---|
| Googlebot, Googlebot smartphone, Bingbot | 200 | |
| **GPTBot** | **429** | blocked at the CDN; needs the hPanel change below |
| OAI-SearchBot, ChatGPT-User | 200 | |
| ClaudeBot, Claude-User, Claude-SearchBot | 200 | |
| PerplexityBot, Perplexity-User, Applebot, CCBot | 200 | |
| curl, python-requests, undici, Go-http-client | 200 | pages only; `/api/` doesn't exist until F02 |

Hostinger's CDN can also challenge requests by IP reputation (datacenter ranges) in a layer that hPanel doesn't show ([Stonegate, 2026](https://stonegatewebsecurity.com/articles/hostinger-bot-protection-blocking-ai-crawlers/)). The live check therefore also runs from GitHub Actions, whose datacenter IPs are what webhook senders look like.

## What Aayush sets in hPanel
1. **hPanel → Websites → aayushmishra.engineer → Dashboard → Performance → CDN → AI Audit** ([Hostinger](https://www.hostinger.com/blog/cdn-ai-audit/)). Set every crawler in the decision above to **Allow**. GPTBot is the one blocked today.
2. Same CDN page: leave any security level / bot protection at its default (not "under attack"), so the JS challenge doesn't hit crawlers or webhooks.
3. After F02 is live, run the **Live check** workflow (Actions → Live check → Run workflow). If `/api/health.php` is challenged for the server user agents, ask Hostinger support to exempt `/api/*` from bot protection for aayushmishra.engineer. Fallback if they can't: serve the API from a subdomain with the CDN turned off (e.g. `api.aayushmishra.engineer`).
4. Flush the CDN cache once after the robots.txt change goes live (Performance → CDN → Flush cache).

## What the code does
- `public/robots.txt` names every approved crawler in one group with `Allow: /` and keeps them out of `/api/`, `/admin/` and the `/splash` replay route.
- `scripts/qa/check-bots.mjs` fetches `/contact` with each crawler's user agent and fails on anything but the real page (a 4xx/5xx or a challenge page). Once `/api/health.php` exists it also requires JSON 200 for the server user agents.
- `.github/workflows/live-check.yml` runs that script after every deploy, daily at 09:00 IST, and on demand; results land in the run summary.

## Acceptance criteria
- [x] robots.txt allows Googlebot, Bingbot and every approved AI crawler, and disallows `/api/`, `/admin/`, `/splash`.
- [x] A CI job checks access by user agent after each deploy (and daily).
- [x] Settings documented (this file and `docs/SETUP.md`).
- [ ] GPTBot gets 200 (needs the AI Audit change in hPanel).
- [ ] `/api/health.php` answers server user agents from GitHub Actions (checked once F02 is deployed).

## Security notes
`/api/` stays out of robots.txt indexing; the API pages also send `X-Robots-Tag: noindex` (F02). Webhooks will be authenticated by signatures, not by the bot challenge.

## Test plan
`node scripts/qa/check-bots.mjs` locally and in the Live check workflow.

## Rollback
Revert the F08 merge commit; hPanel settings can be switched back in AI Audit.
