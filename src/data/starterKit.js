import { CHECKOUT, PRODUCTS } from "./pricing";

/*
  F27: the Playwright + AI Starter Kit product page (/starter-kit). The kit
  isn't released yet: these are its planned contents, for Aayush to review.
  Price and checkout link live in ./pricing.js (PRODUCTS, CHECKOUT).
*/

export const KIT = {
  name: "Playwright + AI Starter Kit",
  tagline: "The test framework I'd set up on day one, as a template repo you own.",
  status: "In the works: join the waitlist to hear first.",
  includes: [
    {
      title: "Playwright + TypeScript framework",
      icon: "fa-solid fa-masks-theater",
      points: ["Page objects and fixtures that scale past 500 tests", "Test data factories and per-worker isolation", "Environment config for local, staging and CI"],
    },
    {
      title: "API and contract tests",
      icon: "fa-solid fa-plug",
      points: ["An API layer on Playwright's request context", "JSON schema validation for responses", "Auth helpers that log in once per worker"],
    },
    {
      title: "CI that people trust",
      icon: "fa-solid fa-code-branch",
      points: ["GitHub Actions with sharding and caching", "Traces, videos and screenshots on failure", "JUnit + HTML reports, and a flaky-test quarantine"],
    },
    {
      title: "Accessibility and visual checks",
      icon: "fa-solid fa-universal-access",
      points: ["axe checks with a baseline, so only new issues fail", "Screenshot tests for key screens", "A Core Web Vitals smoke test"],
    },
    {
      title: "AI helpers",
      icon: "fa-solid fa-wand-magic-sparkles",
      points: ["A prompt pack for turning user stories into test cases", "An eval harness starter for LLM features (faithfulness, injection)", "Guidelines for reviewing AI-written tests"],
    },
    {
      title: "Docs and walkthrough",
      icon: "fa-solid fa-book-open",
      points: ["A README that gets a new engineer running in 10 minutes", "Conventions: naming, tagging, when to mock", "A recorded walkthrough of the structure"],
    },
  ],
  faq: [
    {
      q: "Who is it for?",
      a: "Teams starting with Playwright, or moving from Selenium or Cypress, who want a structure that holds up as the suite grows, and engineers who want to learn how a senior SDET sets one up.",
    },
    {
      q: "How is it delivered?",
      a: "As a template repository (or a zip) through the checkout provider. You own the code: use it in as many of your company's projects as you like.",
    },
    {
      q: "Is payment handled on this site?",
      a: "No. Checkout, invoices and taxes are handled by the checkout provider; this site never sees your card.",
    },
    {
      q: "I'd rather have it set up for us.",
      a: "That's the Playwright Starter Sprint: the same foundation, built in your repo around your critical journeys, in two weeks.",
    },
  ],
};

export const kitPrice = () => PRODUCTS["starter-kit"] || null;
export const kitCheckout = () => {
  const checkout = CHECKOUT["starter-kit"];
  return checkout && checkout.url ? checkout : null;
};
