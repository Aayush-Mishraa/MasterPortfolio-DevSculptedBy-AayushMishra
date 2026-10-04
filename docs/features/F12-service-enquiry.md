# F12 · Service enquiry flow

**Stage 2 · Effort M · Status: done in code (not merged or deployed). Waiting for: the Cal.com paid event link and webhook secret; the backend secrets from Stage 1.**

## Goal
Every offer page takes an enquiry that lands in the `leads` table and in Aayush's inbox, and the Release Review can be booked and paid on Cal.com, with bookings stored for the admin (F13).

## Acceptance criteria
- [x] An enquiry form on each `/services/<slug>` page: service (pre-selected, changeable), name, work email, company, budget range, timeline, message. Budget is asked only for offers priced in the default currency (not for mentoring, priced in INR).
- [x] `POST /api/enquiry.php`: the same guards as `contact.php` (method, origin, body size, honeypot, form token for the `enquiry` form, 3 per 10 min / 10 per day per IP, server-side validation), then saves a lead with `source = service:<slug>`, `intent = service`, `budget`, and emails `MAIL_TO` with Reply-To set to the sender. 503 + mailto fallback only if both saving and mailing fail.
- [x] Front end: client-side checks with focus on the first bad field, server field errors shown inline, a focused "Enquiry received" panel, and "Email it instead" (prefilled) when the server can't take it.
- [x] Found in screenshot review and fixed: on prerendered offer pages the Service dropdown showed the first offer (React writes a select's choice as a property, the prerender's HTML didn't carry it, and React 16 doesn't correct it on hydration). The prerender now writes `selected` attributes, and the form syncs the DOM after mount; a test checks all 8 pages in raw HTML and after boot.
- [x] Migration `002_services.sql`: `leads.budget`, `bookings` table.
- [x] `POST /api/cal-webhook.php`: checks `x-cal-signature-256` (HMAC-SHA256 of the raw body, hex), processes each delivery once (`webhook_events`), upserts one row per booking uid for `BOOKING_REQUESTED`, `_PAYMENT_INITIATED`, `_CREATED`, `_PAID`, `_RESCHEDULED`, `_CANCELLED`, `_REJECTED`; ignores other triggers. A reschedule marks the old uid `rescheduled`; a late `BOOKING_PAID` never revives a cancelled booking.
- [ ] **Paid booking live**: set `BOOKING["release-review"].url` in `src/data/pricing.js` to the Cal.com paid event link (the "Book & pay" buttons appear), and add the webhook (below).

## Cal.com setup (Aayush)
1. Cal.com → Event types → new event "Release Review" (60 min). Apps → install **Stripe**, then in the event's **Advanced → Requires payment**: 199 USD.
2. Copy the event's public link into `src/data/pricing.js` → `BOOKING["release-review"].url`.
3. Settings → Developer → **Webhooks** → New: URL `https://aayushmishra.engineer/api/cal-webhook.php`, triggers: Booking created, rescheduled, cancelled, requested, rejected, payment initiated, paid. Set a **secret** (`openssl rand -hex 32`).
4. GitHub secret `CAL_WEBHOOK_SECRET` = that secret, then deploy. Cal.com's "Ping test" should get 200 (it's acknowledged and ignored).
5. If the ping gets a 403/429 from Hostinger's bot protection, allow `/api/*` (see F08).

## Security
- Enquiry: no new attack surface beyond contact.php's; tokens are per form, so a contact token is rejected here (tested).
- Webhook: signature checked with `hash_equals` before anything is parsed; 256 KB cap; no secret → 503; only the fields shown are stored (no raw payload, no Cal.com metadata).
- `price` is stored as Cal.com sends it (minor units, e.g. 19900 = $199).

## Files
`api/enquiry.php`, `api/cal-webhook.php`, `api/lib/ServiceOptions.php`, `api/token.php` (enquiry form), `api/migrations/002_services.sql`, config plumbing (`config.example.php`, `scripts/deploy/write-api-config.php`, `deploy.yml`, `tests/server/api-config.php`), `src/pages/services/EnquiryForm.js`, `ServiceDetail.js`, `src/data/{services,pricing}.js` (timelines, budgets, booking).

## Test plan
- PHPUnit (Docker stack): `EnquiryEndpointTest` (saved as `service:<slug>` + mailed with budget label; optional fields; validation incl. missing service; wrong-form token, too fast, honeypot, foreign origin, GET; rate limit) and `CalWebhookTest` (payment initiated → created → paid, stored once, duplicate delivery; reschedule + cancel + late paid; bad/empty signature, GET, ignored trigger).
- Playwright `tests/e2e/f12-enquiry.spec.ts`: payload sent, success panel focused; no budget for mentoring; client validation; server field errors; 503 → mailto; PHP options match the page's services, budgets and timelines; with `FULL_STACK=1` a real enquiry reaches Mailpit.

## Rollback
Revert F12. The migration only adds a nullable column and a new table; leaving them is harmless.
