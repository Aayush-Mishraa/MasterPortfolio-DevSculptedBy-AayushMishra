/*
  F20: the Release Readiness Checklist. 50 checks in 10 sections. The page
  /free-tools/release-readiness-checklist previews the first two of each
  section; the full list is the PDF (scripts/magnets/build-pdfs.mjs renders
  it from this file into api/assets/release-readiness-checklist.pdf).
*/

export const CHECKLIST_VERSION = "v1.0 · October 2026";

export const CHECKLIST = [
  {
    title: "Scope & sign-off",
    items: [
      "Release scope is frozen: every ticket in it is merged, and nothing else is.",
      "Each change has an owner who can say what it does and how to turn it off.",
      "Acceptance criteria are met and checked by someone other than the author.",
      "Known issues shipping with the release are written down, with severity and a workaround.",
      "Go / no-go owner named, and the decision recorded with the time.",
    ],
  },
  {
    title: "Test coverage",
    items: [
      "Every changed user flow has an automated end-to-end test, or a written reason it doesn't.",
      "The critical paths (sign-up, sign-in, checkout or core action) pass on the release build.",
      "New API endpoints have contract tests for success, validation errors and auth failures.",
      "Bug fixes in this release each have a regression test that failed before the fix.",
      "Exploratory testing done on the riskiest change for at least 30 focused minutes.",
    ],
  },
  {
    title: "CI quality gates",
    items: [
      "The full suite is green on the exact commit you will deploy, not a neighbour.",
      "No test was skipped, quarantined or retried into passing for this release without a ticket.",
      "Flaky tests are listed with owners; none of them covers a changed flow.",
      "Lint, type checks and static analysis pass with no new suppressions.",
      "Build artefact is versioned and the same one goes to staging and production.",
    ],
  },
  {
    title: "Environments & data",
    items: [
      "Staging matches production in config, feature flags and third-party versions.",
      "Database migrations ran on a production-sized copy and their duration is known.",
      "Migrations are backward compatible: the old app version still works after they run.",
      "Seed, test and fixture data cannot leak into production.",
      "Secrets and environment variables for new features exist in production.",
    ],
  },
  {
    title: "Cross-browser & devices",
    items: [
      "Changed screens checked on Chrome, Safari and Firefox, latest versions.",
      "Checked on a real phone (iOS Safari and Android Chrome), not only a resized desktop window.",
      "No sideways scroll at 375 px; tap targets are at least 44 px.",
      "Slow network (fast 3G) tested: loading states show, nothing double-submits.",
      "Dark mode, zoom at 200% and long translated strings don't break layouts.",
    ],
  },
  {
    title: "Performance",
    items: [
      "Core Web Vitals on the main pages: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms (mobile).",
      "Bundle size and number of requests compared with the last release; growth explained.",
      "New queries have indexes; no N+1 queries on list pages.",
      "Load or soak test run if traffic or data volume changes with this release.",
      "Caching and CDN rules updated for new routes and assets.",
    ],
  },
  {
    title: "Security & privacy",
    items: [
      "Dependencies scanned; no new high or critical vulnerabilities.",
      "New endpoints check authorisation, not just authentication (try another user's id).",
      "Input is validated server-side; output is escaped; file uploads are type-checked.",
      "Security headers present: HSTS, CSP, X-Content-Type-Options, frame protection.",
      "Personal data in new features is documented, minimised and covered by the privacy policy.",
    ],
  },
  {
    title: "Accessibility",
    items: [
      "axe (or similar) shows no new serious or critical issues on changed pages.",
      "Every new control works with the keyboard alone, with a visible focus ring.",
      "Form fields have labels; errors are announced and tied to their field.",
      "Text and icons meet WCAG AA contrast in every theme.",
      "Changed flows tried once with a screen reader (VoiceOver or NVDA).",
    ],
  },
  {
    title: "Rollout & rollback",
    items: [
      "Risky changes are behind a feature flag that can be turned off without a deploy.",
      "Rollback steps are written, and someone has run them on staging.",
      "Deploy window avoids peak traffic and has the right people online.",
      "Staged rollout planned (internal → % of users → everyone) for high-risk changes.",
      "Smoke tests run automatically right after the deploy, against production.",
    ],
  },
  {
    title: "Monitoring & communication",
    items: [
      "Dashboards and alerts cover the new feature: errors, latency and business metric.",
      "Error tracking has the release version, so new errors are traceable to this deploy.",
      "Support knows what's changing and has the known-issues list.",
      "Release notes written for users; internal changelog updated.",
      "A post-release check is booked: metrics reviewed 24 hours after going live.",
    ],
  },
];

export const CHECKLIST_COUNT = CHECKLIST.reduce((sum, section) => sum + section.items.length, 0);
