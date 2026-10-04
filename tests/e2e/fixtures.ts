import { test as base, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

/*
  Shared fixtures:
  - every page starts with the intro marked as seen, in the default theme;
  - console errors and uncaught exceptions fail the test (consoleErrors);
  - expectNoNewA11yIssues() fails on serious/critical axe findings that the
    baseline (tests/fixtures/axe-baseline.json) doesn't already list.
*/

// Third-party noise that says nothing about this site's own code.
const IGNORED_CONSOLE = [
  /Failed to load resource: net::ERR_(?:NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION_REFUSED|BLOCKED_BY_CLIENT)/,
  /fonts\.(googleapis|gstatic)\.com/,
  /cdnjs\.cloudflare\.com/,
  /code\.iconify\.design|api\.iconify\.design/,
  /Download the React DevTools/,
];

type Fixtures = { consoleErrors: string[] };

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("portfolio:intro-seen", "1");
      } catch (error) {
        /* storage blocked */
      }
    });
    await use(page);
  },
  consoleErrors: [
    async ({ page, baseURL }, use, testInfo) => {
      const errors: string[] = [];
      const ownHost = baseURL ? new URL(baseURL).host : "";
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const url = message.location().url || "";
        const text = `${message.text()} ${url}`;
        if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
        if (/^Failed to load resource/.test(message.text()) && url) {
          const resource = new URL(url, baseURL);
          // A third-party feed or image being down is not this site's error,
          if (resource.host !== ownHost) return;
          // and an API error status is an outcome the page shows (tests assert it),
          if (resource.pathname.startsWith("/api/")) return;
          // as is a 404 page's own document (a real 404 is the point).
          if (resource.href.split("#")[0] === page.url().split("#")[0]) return;
        }
        errors.push(text);
      });
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      await use(errors);
      if (testInfo.status === testInfo.expectedStatus) {
        expect(errors, "console errors / uncaught exceptions").toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };

/** Waits until the app has rendered into #root and fonts are in. */
export async function gotoReady(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    return Boolean(root && root.children.length && document.querySelector("main, [role='main'], .error-main, #main-content"));
  });
  await page.evaluate(() => (document as any).fonts && (document as any).fonts.ready);
  return response;
}

const BASELINE_FILE = path.join(__dirname, "..", "fixtures", "axe-baseline.json");

function readBaseline(): Record<string, Record<string, number>> {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
  } catch (error) {
    return {};
  }
}

/**
 * Serious and critical axe findings, counted per rule. Fails when a rule shows
 * up that the baseline doesn't have, or a known rule hits more nodes than it
 * did. UPDATE_A11Y_BASELINE=1 records the current counts instead.
 */
export async function expectNoNewA11yIssues(page: Page, key: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const counts: Record<string, number> = {};
  results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .forEach((violation) => {
      counts[violation.id] = violation.nodes.length;
    });

  if (process.env.UPDATE_A11Y_BASELINE) {
    const baseline = readBaseline();
    baseline[key] = counts;
    const sorted = Object.keys(baseline)
      .sort()
      .reduce((out: Record<string, Record<string, number>>, name) => ((out[name] = baseline[name]), out), {});
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(sorted, null, 2) + "\n");
    return;
  }

  const known = readBaseline()[key] || {};
  const regressions = Object.keys(counts)
    .filter((rule) => counts[rule] > (known[rule] || 0))
    .map((rule) => `${rule}: ${counts[rule]} node(s), baseline ${known[rule] || 0}`);
  expect(regressions, `new serious/critical axe issues on ${key}`).toEqual([]);
}
