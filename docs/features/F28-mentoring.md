# F28 · /mentoring

**Stage 4 · Effort S · Status: done in code (not merged or deployed). Waiting for: booking links and a check of the three session prices.**

## Acceptance criteria
- [x] `/mentoring`: three sessions (career call, SDET mock interview, framework & résumé review) in `src/data/mentoring.js`; prices in INR in `pricing.js` → `MENTORING_PRICES` (₹999 / ₹1,999 / ₹2,999, inside the existing ₹999–2,999 range: **Aayush to confirm**).
- [x] Per session, buttons for whichever links are set in `MENTORING_BOOKING`: Cal.com paid booking (card, any country), Razorpay payment link (UPI), Topmate.
- [x] With no link set, "Request this session" goes to the enquiry form (service `mentoring`, so it lands in leads as `service:mentoring`).
- [x] `/services/mentoring` links here.

## Tests owed
Playwright: buttons appear per configured link; enquiry fallback; mobile.
