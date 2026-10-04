# F11 · /services page

**Stage 2 · Effort M · Status: done in code (not merged or deployed). Offer copy needs Aayush's review.**

## Goal
One page that sells the QA services, styled as a test plan, with a page per offer for search and sharing.

## Acceptance criteria
- [x] `/services`: hero, a `services.plan.ts` summary, the eight offers as test cases (`TC-01`…`TC-08`), a 5-step process and an FAQ.
- [x] Each offer shows who it's for (preconditions), deliverables (steps), timeline (duration), the expected result, the price and a CTA.
- [x] Offers come from `src/data/services.js`; **prices, currencies, budget ranges and the booking link from `src/data/pricing.js`**. Nothing is hard-coded in components (a test scans the code).
- [x] Prices as decided: USD for client services, INR for mentoring. Formatted with `Intl.NumberFormat` (`$600–$1,200`, `$499–$999 / month`, `₹999–₹2,999 / session`).
- [x] `/services/<slug>` for each offer: the full test case, price/duration/reply facts, the enquiry form (F12) and the other offers. Unknown slugs are real 404s.
- [x] JSON-LD: an `OfferCatalog` of `Service` items on `/services`, one `Service` on each offer page, each with an `Offer` (`price` for fixed, `PriceSpecification`/`UnitPriceSpecification` with min/max for ranges).
- [x] The home page shows the three `featured` offers right after the hero.
- [x] Prerendered, in the sitemap (`/services` priority 1.0) and in `llms.txt` under "Services".

## Copy to review (Aayush)
The offers, prices and names are yours. I wrote the who/deliverables/timeline/outcome lines, the process and the FAQ from the plan; please check them in `src/data/services.js`, especially:
- business terms: "fixed quote within the range after the scope call", "free 20-minute scope call", "you own the code", "cancel any time" (retainer), "part-time" (fractional lead);
- durations not in the plan: AI Eval Pack 2–3 weeks, WCAG audit 1–2 weeks, mentoring "one session, booked by the hour".

## Files
`src/data/{services,pricing}.js`, `src/pages/services/{Services,ServiceDetail,TestCase}.js`, `Services.css`, `src/pages/home/sections/Offers.*`, `src/components/seoHeader/SeoHeader.js` (offer page titles), `scripts/prerender/routes.mjs` (`serviceRoutes`), `seo-files.mjs`, `public/.htaccess`.

## Test plan
`tests/e2e/f11-services.spec.ts`: 8 cases in order with formatted prices; every case has its four blocks; FAQ by keyboard; catalogue JSON-LD in raw HTML (USD fixed price, INR range); every offer page prerendered with canonical + Service JSON-LD, unknown slug 404; offer page content; home strip; no hard-coded prices. Smoke + axe via the route list.

## Rollback
Revert F11 (and F10's Services menu item and hero button, which point here).
