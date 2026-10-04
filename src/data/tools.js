/*
  Stage 3 + 4: the free tools under /free-tools/<slug>. The hub page, the
  footer, the prerender (scripts/prerender/routes.mjs reads the slugs here)
  and each page's title/description all come from this list.

  `kind` sorts them on the hub: "magnet" (email for the full result),
  "tool" (works fully in the browser), "beta" (a server job runs).
*/

export const TOOLS = [
  {
    slug: "flaky-test-doctor",
    title: "Flaky Test Doctor",
    kind: "tool",
    icon: "fa-solid fa-stethoscope",
    tagline: "Upload JUnit XML or paste a CI log; get your flaky tests ranked, with the likely cause and a fix for each.",
    seoTitle: "Flaky Test Doctor · find and fix flaky tests · Aayush Mishra",
    seoDescription:
      "Free flaky test finder: drop in JUnit XML reports or a CI log (Playwright, Jest, pytest, Cypress, TestNG) and get flaky tests ranked by impact, with likely causes and fixes. Runs in your browser.",
  },
  {
    slug: "qa-roi-calculator",
    title: "QA ROI & flaky-test cost calculator",
    kind: "tool",
    icon: "fa-solid fa-calculator",
    tagline: "What flaky tests, manual regression and escaped bugs cost your team a year, and how fast fixing them pays back.",
    seoTitle: "QA ROI & Flaky Test Cost Calculator · Aayush Mishra",
    seoDescription:
      "Calculate what flaky tests, manual regression and production bugs cost your team each year in money and hours, and the payback period of fixing them. Free, private, runs in your browser.",
  },
  {
    slug: "release-readiness-checklist",
    title: "Release Readiness Checklist",
    kind: "magnet",
    icon: "fa-solid fa-list-check",
    tagline: "50 checks to run before you ship, from test coverage and rollback to monitoring and comms. Free PDF.",
    seoTitle: "Release Readiness Checklist (50 checks, free PDF) · Aayush Mishra",
    seoDescription:
      "A 50-point pre-release checklist from a Senior SDET: scope, test coverage, CI gates, performance, security, accessibility, data, rollback, monitoring and communication. Free PDF.",
  },
  {
    slug: "ai-readiness-quiz",
    title: "AI-Agent Readiness quiz",
    kind: "magnet",
    icon: "fa-solid fa-robot",
    tagline: "12 questions for teams shipping LLM features. A score out of 100 and the next steps for your gaps.",
    seoTitle: "AI-Agent Readiness Quiz for LLM features · Aayush Mishra",
    seoDescription:
      "Are you ready to ship your LLM feature or AI agent? 12 questions on evals, guardrails, prompt injection, monitoring and rollback give a 0–100 readiness score with tips.",
  },
  {
    slug: "site-scanner",
    title: "Test my site (beta)",
    kind: "beta",
    icon: "fa-solid fa-satellite-dish",
    tagline: "A real Playwright + axe + Lighthouse run on your page: console errors, broken links, accessibility, Core Web Vitals, headers.",
    seoTitle: "Test my site: free Playwright, accessibility & Core Web Vitals scan · Aayush Mishra",
    seoDescription:
      "Free website QA scan (beta): Playwright, axe-core and Lighthouse check console errors, broken links, accessibility, Core Web Vitals, security headers and mobile overflow. Report and runnable tests by email.",
  },
  {
    slug: "ai-eval-playground",
    title: "AI Eval Playground",
    kind: "tool",
    icon: "fa-solid fa-flask-vial",
    tagline: "Pick a chatbot answer and watch an eval suite grade it for faithfulness, toxicity and prompt injection.",
    seoTitle: "AI Eval Playground: grade a chatbot answer · Aayush Mishra",
    seoDescription:
      "See how LLM evals work: pick or write a chatbot answer and watch an eval suite check faithfulness to the source, toxicity, PII leaks and prompt injection, assertion by assertion.",
  },
];

export const toolBySlug = (slug) => TOOLS.find((tool) => tool.slug === slug);

export const toolPath = (slug) => `/free-tools/${slug}`;

export const KIND_LABEL = { tool: "Runs in your browser", magnet: "Free, email delivery", beta: "Beta" };
