/*
  F11: every price on the site, in one place. Components never write a number
  or a currency themselves: they read it from here (through formatPrice in
  src/data/services.js). Change a price here and /services, the per-service
  pages, the home page strip and the Service/Offer JSON-LD all follow.

  A price is either { amount } (fixed) or { min, max } (a range, quoted
  exactly after the scope call). `per` adds a unit ("month", "session").
*/

export const CURRENCIES = {
  USD: { locale: "en-US", label: "US dollars" },
  INR: { locale: "en-IN", label: "Indian rupees" },
};

// Client services are priced in USD; mentoring in INR.
export const DEFAULT_CURRENCY = "USD";

export const PRICES = {
  "release-review": { currency: "USD", amount: 199 },
  "qa-health-check": { currency: "USD", min: 600, max: 1200 },
  "playwright-starter-sprint": { currency: "USD", min: 1500, max: 3000 },
  "ai-feature-eval-pack": { currency: "USD", min: 2500, max: 5000 },
  "release-retainer": { currency: "USD", min: 499, max: 999, per: "month" },
  "wcag-quick-audit": { currency: "USD", min: 800, max: 2000 },
  "fractional-qa-lead": { currency: "USD", min: 1500, max: 3000, per: "month" },
  mentoring: { currency: "INR", min: 999, max: 2999, per: "session" },
};

// F12: the budget ranges on the enquiry form, in DEFAULT_CURRENCY:
// under the first step, between steps, over the last, or "not sure yet".
// api/lib/ServiceOptions.php::BUDGETS lists the same ranges (a test checks).
export const BUDGET_STEPS = [1000, 3000, 5000];

/*
  Paid booking (F12). The Release Review is booked and paid on Cal.com; the
  button stays hidden until `url` is set. Every other offer starts with the
  enquiry form.
*/
export const BOOKING = {
  "release-review": { provider: "Cal.com", url: "" },
};

/*
  F27: the Playwright + AI Starter Kit. Checkout runs on Lemon Squeezy or
  Gumroad (never on this server). While `url` is empty the page shows the
  waitlist instead of "Buy"; while `amount` is null it says "price at launch".
*/
export const PRODUCTS = {
  "starter-kit": { currency: "USD", amount: null },
};

export const CHECKOUT = {
  "starter-kit": { provider: "Lemon Squeezy", url: "" },
};

/*
  F28: mentoring sessions, priced in INR inside the mentoring range above.
  Each session can have a Cal.com paid booking (card, any country), a Topmate
  page and a Razorpay payment link (UPI and Indian cards). A button shows only
  once its link is set; with none set, the page offers the enquiry form.
*/
export const MENTORING_PRICES = {
  "career-call": { currency: "INR", amount: 999 },
  "mock-interview": { currency: "INR", amount: 1999 },
  "framework-review": { currency: "INR", amount: 2999 },
};

export const MENTORING_BOOKING = {
  "career-call": { cal: "", topmate: "", razorpay: "" },
  "mock-interview": { cal: "", topmate: "", razorpay: "" },
  "framework-review": { cal: "", topmate: "", razorpay: "" },
};
