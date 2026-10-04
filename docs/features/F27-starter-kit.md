# F27 · Starter Kit storefront

**Stage 4 · Effort S · Status: page done (not merged or deployed). Waiting for: the kit repo itself, a price and a Lemon Squeezy / Gumroad checkout link.**

## Acceptance criteria
- [x] `/starter-kit`: the planned contents (`src/data/starterKit.js`, for Aayush to review), FAQ, link to the Playwright Starter Sprint.
- [x] No card handling here: "Buy" links out to the provider once `CHECKOUT["starter-kit"].url` is set in `src/data/pricing.js`; the price shows once `PRODUCTS["starter-kit"].amount` is set; Product JSON-LD only with both.
- [x] Until then: a waitlist (magnet `starter-kit`, a lead `magnet:starter-kit`, one confirmation email).

## Tests owed
Playwright: waitlist vs. buy states (by editing config in a test build), JSON-LD only with a price.
