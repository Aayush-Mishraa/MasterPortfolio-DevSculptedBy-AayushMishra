# F03 · Contact form → backend

**Stage 1 · Effort M · Depends on: F02 · Status: code done; live once the SMTP/DB secrets are set (Aayush); Cal.com link pending**

## Goal
A visitor on any device, with or without a mail app, sends the contact form and Aayush receives it. Every message is also saved as a lead.

## User story
As a hiring manager on my phone, I fill in the form, tap Transmit and see "Transmission received" — no mail app opens. As Aayush, the message lands in my inbox with Reply-To set to the sender, and in the `leads` table.

## Acceptance criteria
- [x] `POST /api/contact.php` saves to `leads` and emails `MAIL_TO` through SMTP (PHPMailer), Reply-To = the visitor. Either one succeeding counts as delivered; if both fail the page offers email.
- [x] Guards: same-origin only, JSON only, 16 KB max, honeypot (`website`, quiet 200), signed form token at least 3 s old (a too-quick submit waits and retries automatically), per-IP limit of 3 per 10 min and 10 per day (IP stored only as an HMAC), server-side validation of every field.
- [x] Real states in the page: sending, delivered ("Transmission received", focused and centred on phones), field errors from the server shown on the field, and a failure panel with **Open in your mail app** (pre-filled `mailto:`), **Copy full message** and **Try again**. `mailto:` is only the fallback.
- [x] The intent picker ("What's the signal about?"), topics ("frequencies") and timeline stay; a Playwright test keeps their ids in step with `api/lib/ContactOptions.php`.
- [x] Footer **Get in touch** goes to the same form (`/contact#compose`) instead of `mailto:`.
- [x] Privacy note says what the form stores and why, and how to have it deleted.
- [x] "Book a 20-min call" button, hidden until `contactSection.booking.url` in `src/portfolio.js` is set.
- [ ] Cal.com link from Aayush (e.g. `https://cal.com/<username>/20min`).
- [ ] Live delivery from a phone with no mail app (after the secrets are set) and mail-tester ≥ 9 (see `docs/SETUP.md`).

## Email authentication
SPF (`include:_spf.mail.hostinger.com`), DKIM (Hostinger `hostingermail-a/b/c`) and DMARC (`p=none`) already exist for aayushmishra.engineer (checked 3 Oct 2026). Mail goes through authenticated SMTP as `contact@aayushmishra.engineer`, so it is DKIM-signed and SPF-aligned.

## Security notes
Prepared statements only; output is a plain-text email (no HTML injection); header fields are single-line and length-capped; the visitor's address is used as Reply-To, never as From (no spoofing, DMARC-safe); no lead number in the response (it would leak volume); generic error messages.

## Test plan
- PHP (`api/tests/Integration/ContactEndpointTest.php`): saved + mailed with the right subject, Reply-To and body; honeypot stores and sends nothing; token missing / too new / wrong form; validation of every field; rate limit per visitor (another visitor unaffected); 405/403/415/413 and no CORS grant.
- Playwright (`tests/e2e/f03-contact.spec.ts`, desktop + mobile, API mocked): request body, success state, server field errors, 503 and network fallbacks, too-fast retry, honeypot hidden, booking hidden, footer CTA, option ids match the API.
- Full stack (`tests/e2e/f03-contact-live.spec.ts`, Docker): the real form on a 375 px phone and on desktop reaches Mailpit with the right subject and Reply-To.

## Rollback
Revert the F03 merge commit: the form goes back to opening the mail app. Saved leads stay in MySQL.
