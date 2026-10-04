import { BOOKING, BUDGET_STEPS, CURRENCIES, DEFAULT_CURRENCY, PRICES } from "./pricing";

/*
  F11: the offers on /services, written as a test plan. Each offer is a test
  case: who it's for (preconditions), what you get (steps / deliverables),
  how long it takes, and the expected result. Prices live in ./pricing.js.

  Edit the words here; the page, the per-service pages (/services/<slug>),
  the home page strip and the JSON-LD are all generated from this file.
*/

export const SERVICES = [
  {
    slug: "release-review",
    title: "Release Review call",
    tagline: "A senior QA second opinion before you ship.",
    icon: "fa-solid fa-flag-checkered",
    featured: true,
    audience: [
      "You're about to ship a release and want a go/no-go from someone who does this every week.",
      "Founders and engineering leads without a QA lead of their own.",
    ],
    deliverables: [
      "A 60-minute call on your release plan, test coverage, CI gates and known risks",
      "A written go/no-go note with the top risks and what to test before you ship",
    ],
    timeline: "One call, notes within 24 hours",
    outcome: "You ship knowing what's covered, what isn't, and what to watch after release.",
  },
  {
    slug: "qa-health-check",
    title: "QA Health Check",
    tagline: "A 5-day audit of your tests, CI and release process.",
    icon: "fa-solid fa-stethoscope",
    featured: true,
    audience: [
      "Your CI is flaky, regression is slow, or nobody can say what the tests actually cover.",
      "Teams that want a prioritised plan before investing in more automation.",
    ],
    deliverables: [
      "Review of the test suite, CI pipeline, flaky tests and coverage gaps",
      "A prioritised findings report: what to fix first, and why",
      "A 30-day roadmap and a readout call with your team",
    ],
    timeline: "5 working days",
    outcome: "A clear, ranked list of what's slowing your releases down and how to fix it.",
  },
  {
    slug: "playwright-starter-sprint",
    title: "Playwright Starter Sprint",
    tagline: "A working Playwright framework in your repo in two weeks.",
    icon: "fa-solid fa-masks-theater",
    featured: true,
    audience: [
      "Regression is still manual, or the old Selenium/Cypress suite is too brittle to trust.",
      "Teams that want end-to-end tests they own and can extend themselves.",
    ],
    deliverables: [
      "A Playwright + TypeScript framework in your repository (page objects, fixtures, test data)",
      "Your critical user journeys automated across browsers",
      "CI integration with reports, traces and screenshots on failure",
      "Handover docs and a walkthrough session for your developers",
    ],
    timeline: "2 weeks",
    outcome: "Every pull request runs the journeys that matter, and your team knows how to add more.",
  },
  {
    slug: "ai-feature-eval-pack",
    title: "AI Feature Eval Pack",
    tagline: "Tests for the LLM features traditional QA can't check.",
    icon: "fa-solid fa-brain",
    audience: [
      "You're shipping a chatbot, copilot, RAG search or agent and can't tell if a change made it better or worse.",
      "Teams that need evidence of quality and safety before an AI launch.",
    ],
    deliverables: [
      "An eval dataset built from your real prompts, edge cases and failure modes",
      "An automated eval harness in CI: quality, safety and regression scores per change",
      "A scoring rubric and a report on where the feature fails today",
    ],
    timeline: "2–3 weeks",
    outcome: "Every model, prompt or retrieval change gets a score before it reaches users.",
  },
  {
    slug: "release-retainer",
    title: "“Signed-off” Release Retainer",
    tagline: "Ongoing release sign-off, with a badge to show for it.",
    icon: "fa-solid fa-signature",
    audience: [
      "Teams that ship often and want an independent QA sign-off on every release.",
      "Products that want to show customers their releases are tested.",
    ],
    deliverables: [
      "A sign-off review of each release against an agreed checklist",
      "Regression runs and a short risk note per release",
      "A monthly quality report",
      "An embeddable “Signed off ✓” badge for your site or changelog",
    ],
    timeline: "Monthly, cancel any time",
    outcome: "Every release gets a second pair of expert eyes, and your users can see it.",
  },
  {
    slug: "wcag-quick-audit",
    title: "EAA/WCAG Quick Audit",
    tagline: "Find the accessibility blockers before your users (or regulators) do.",
    icon: "fa-solid fa-universal-access",
    audience: [
      "Products sold in the EU, where the European Accessibility Act has applied since June 2025.",
      "Teams that need a WCAG 2.2 AA baseline and a fix list, fast.",
    ],
    deliverables: [
      "Automated and manual WCAG 2.2 AA checks of your key user flows",
      "An issue list with severity, the affected element and the fix",
      "Automated accessibility checks (axe) added to your CI so issues don't come back",
    ],
    timeline: "1–2 weeks, depending on the number of flows",
    outcome: "A prioritised accessibility fix list and a CI guard against regressions.",
  },
  {
    slug: "fractional-qa-lead",
    title: "Fractional QA Lead",
    tagline: "A part-time QA lead until you hire a full-time one.",
    icon: "fa-solid fa-user-gear",
    audience: [
      "Startups and scale-ups with developers testing their own code and no QA lead yet.",
      "Teams building a QA function and hiring their first testers.",
    ],
    deliverables: [
      "A QA strategy and test process that fits how your team ships",
      "Help hiring and onboarding QA engineers",
      "Regular check-ins with your engineering lead, and quality metrics that matter",
    ],
    timeline: "Monthly, part-time",
    outcome: "QA leadership without a full-time hire, and a team that can run without me.",
  },
  {
    slug: "mentoring",
    title: "Mentoring & SDET mock interviews",
    tagline: "Practice the interview before the one that counts.",
    icon: "fa-solid fa-graduation-cap",
    audience: [
      "QA engineers moving into SDET or automation roles.",
      "Testers preparing for SDET and QA lead interviews.",
    ],
    deliverables: [
      "A mock interview: coding, framework design and testing scenarios",
      "Written feedback on what to improve",
      "A study plan for the gaps",
    ],
    timeline: "One session, booked by the hour",
    outcome: "You walk into the real interview knowing what to expect and where you stand.",
  },
];

/* How an engagement runs: the process section on /services. */
export const PROCESS = [
  { step: "Enquire", text: "Pick a service and tell me about your product, stack and timeline." },
  { step: "Scope call", text: "A free 20-minute call to agree what's in scope and what success looks like." },
  { step: "Fixed quote", text: "A fixed price and timeline in writing, within the range shown here." },
  { step: "Run", text: "I do the work in your repo and tools, with updates as I go." },
  { step: "Sign-off", text: "A readout, the deliverables, and a handover your team can run with." },
];

export const FAQ = [
  {
    q: "Why are most prices a range?",
    a: "The work depends on the size of your app and how many flows matter. After the scope call you get one fixed price within the range, before any work starts.",
  },
  {
    q: "Which time zone do you work in?",
    a: "India (IST, UTC+5:30). That overlaps the European morning and the US East Coast evening; calls are booked in your time zone.",
  },
  {
    q: "What do you need from us?",
    a: "Access to the repository or a staging environment, a point of contact, and the flows that matter most to your users.",
  },
  {
    q: "Who owns the tests and code?",
    a: "You do. Everything is written in your repository and documented so your team can keep it running.",
  },
  {
    q: "Are you also open to full-time roles?",
    a: "Yes. Hiring teams can find the recruiter brief and résumé on the Hire me page.",
  },
];

// The enquiry form's timelines: the same as the contact form's
// (api/lib/ContactOptions.php::TIMELINES accepts these).
export const TIMELINES = ["ASAP", "< 1 month", "1–3 months", "Flexible"];

export const serviceBySlug = (slug) => SERVICES.find((service) => service.slug === slug);

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */

export const priceOf = (slug) => PRICES[slug] || null;

const money = (value, currency) => {
  const { locale } = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
};

/** "$199", "$600–$1,200", "$499–$999 / month", "₹999–₹2,999 / session"; null without a price. */
export function formatPrice(slug) {
  const price = priceOf(slug);
  if (!price) return null;
  const value =
    price.amount != null ? money(price.amount, price.currency) : `${money(price.min, price.currency)}–${money(price.max, price.currency)}`;
  return price.per ? `${value} / ${price.per}` : value;
}

/** The currencies the page actually uses, for the "prices in ..." note. */
export const currenciesInUse = () =>
  Array.from(new Set(SERVICES.map((service) => (priceOf(service.slug) || {}).currency).filter(Boolean)));

export const currencyLabel = (code) => (CURRENCIES[code] || { label: code }).label;

/**
 * The enquiry form's budget ranges ({ id, label }), built from BUDGET_STEPS:
 * "under-1000" (Under $1,000), "1000-3000" ($1,000–$3,000), ..., "not-sure".
 */
export function budgetOptions() {
  const steps = BUDGET_STEPS;
  const at = (value) => money(value, DEFAULT_CURRENCY);
  return [{ id: `under-${steps[0]}`, label: `Under ${at(steps[0])}` }]
    .concat(steps.slice(1).map((step, i) => ({ id: `${steps[i]}-${step}`, label: `${at(steps[i])}–${at(step)}` })))
    .concat([
      { id: `over-${steps[steps.length - 1]}`, label: `Over ${at(steps[steps.length - 1])}` },
      { id: "not-sure", label: "Not sure yet" },
    ]);
}

/** A budget range only makes sense for offers priced in the default currency. */
export const asksBudget = (slug) => ((priceOf(slug) || {}).currency || DEFAULT_CURRENCY) === DEFAULT_CURRENCY;

/** The paid booking link for a service, or null while it isn't set up. */
export const bookingFor = (slug) => {
  const booking = BOOKING[slug];
  return booking && booking.url ? booking : null;
};

/* ------------------------------------------------------------------ */
/* Structured data (Service + Offer)                                   */
/* ------------------------------------------------------------------ */

const SITE = "https://aayushmishra.engineer";

function offerSchema(slug) {
  const price = priceOf(slug);
  if (!price) return undefined;
  const spec =
    price.amount != null
      ? { price: String(price.amount), priceCurrency: price.currency }
      : {
          priceSpecification: {
            "@type": price.per ? "UnitPriceSpecification" : "PriceSpecification",
            minPrice: price.min,
            maxPrice: price.max,
            priceCurrency: price.currency,
            ...(price.per ? { unitText: price.per.toUpperCase() } : {}),
          },
        };
  return { "@type": "Offer", url: `${SITE}/services/${slug}`, availability: "https://schema.org/InStock", ...spec };
}

export function serviceSchema(service, provider) {
  return {
    "@type": "Service",
    "@id": `${SITE}/services/${service.slug}#service`,
    name: service.title,
    description: `${service.tagline} ${service.outcome}`,
    serviceType: "Software quality assurance",
    url: `${SITE}/services/${service.slug}`,
    areaServed: "Worldwide",
    provider,
    offers: offerSchema(service.slug),
  };
}

/** The whole catalogue, for /services. */
export function catalogSchema(provider) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "QA services by Aayush Mishra",
    url: `${SITE}/services`,
    itemListElement: SERVICES.map((service) => serviceSchema(service, provider)),
  };
}
