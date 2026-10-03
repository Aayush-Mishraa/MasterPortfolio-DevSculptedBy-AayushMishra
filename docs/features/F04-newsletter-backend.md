# F04 · Newsletter → backend

**Stage 1 · Effort S · Depends on: F02 · Status: done in code; the box says "coming soon" until issue #1 (F18); Buttondown keys pending (Aayush)**

## Goal
Stop the footer form from faking success and dropping addresses. When the newsletter opens, sign-ups go to Buttondown with double opt-in, and our database mirrors each subscriber's status.

## Acceptance criteria
- [x] The fake success is gone (`REACT_APP_BUTTONDOWN_ENDPOINT` and the 700 ms "Preview captured" path are removed).
- [x] Until issue #1, the footer shows "Newsletter coming soon" and no form (`newsletter.status: "coming-soon"` in `src/portfolio.js`; set `"open"` in F18). `?newsletter=preview` shows the real form for checking.
- [x] `POST /api/subscribe.php`: origin, honeypot, form token, 5/hour and 20/day per IP, email validation, then Buttondown `POST /v1/subscribers` (no `type: regular`, so **Buttondown sends the confirmation email**). The answer is the same whether or not the address was already subscribed. A local row is kept as `pending` with the Buttondown id.
- [x] `POST /api/buttondown-webhook.php`: requires `X-Buttondown-Signature: sha256=<HMAC-SHA256 of the raw body>`; processes each event once (`webhook_events`); `subscriber.confirmed` → confirmed, `subscriber.unsubscribed` → unsubscribed, `subscriber.created` → pending (never downgrades a confirmed row); a subscriber created elsewhere is looked up via the API and added.
- [x] Privacy note mentions Buttondown, double opt-in and unsubscribe links.
- [ ] Buttondown account, API key and webhook set up (below).

## Buttondown setup (Aayush, once)
1. Create the newsletter at buttondown.com. Free plan: API and webhooks included ([changelog](https://buttondown.com/changelog/2023-12-13), [webhooks](https://docs.buttondown.com/api-webhooks-introduction)). Keep double opt-in on (the default).
2. Settings → API: copy the key → GitHub secret `BUTTONDOWN_API_KEY`.
3. Settings → Webhooks → new webhook: URL `https://aayushmishra.engineer/api/buttondown-webhook.php`, events `subscriber.created`, `subscriber.confirmed`, `subscriber.unsubscribed`, a signing key of your choice (`openssl rand -hex 32`) → GitHub secret `BUTTONDOWN_WEBHOOK_SECRET`.
4. Redeploy (push, or re-run the Deploy workflow), then test with `https://aayushmishra.engineer/?newsletter=preview` → the footer form → your inbox gets Buttondown's confirmation.
5. If the webhook fails in Buttondown's log with a 403/429/challenge, it's the CDN bot check: see F08.

## Security notes
Webhook authenticity comes from the HMAC signature (constant-time compare), not from IPs or the CDN; replays are ignored by event id. The visitor's IP is sent to Buttondown only for its spam check (public addresses only). No membership leak: "already subscribed" and "new" get the same answer.

## Test plan
- PHP (`api/tests/Integration/NewsletterTest.php`, against a fake Buttondown in `api/tests/fake-buttondown/`): request shape and auth sent to Buttondown, pending row with id, confirm/replay/late-created/unsubscribe webhooks, signature failures, a subscriber made elsewhere, existing/rejected/unavailable outcomes, honeypot, tokens and the rate limit.
- Playwright (`tests/e2e/f04-newsletter.spec.ts`): "coming soon" with no form; the preview form confirms only what the API confirms; API errors, field errors and a dropped connection show as errors; an invalid address never reaches the API.

## Rollback
Revert the F04 merge commit. Buttondown and the `subscribers` table are unaffected.
