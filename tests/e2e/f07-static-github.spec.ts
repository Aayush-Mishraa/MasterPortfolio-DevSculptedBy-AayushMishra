import { test, expect, gotoReady } from "./fixtures";
import type { Page } from "@playwright/test";

/*
  F07: Projects and Open Source show the build-time GitHub snapshot only. No
  browser request for Aayush's GitHub data, no rate-limit counter, counters
  render the real number from the first paint, housekeeping commits stay out
  of the feeds, and the page doesn't shift as the app takes over.
*/

const OWN_DATA = /api\.github\.com\/(users\/Aayush-Mishraa|repos\/Aayush-Mishraa|search\/issues)|github-contributions-api/i;
const HOUSEKEEPING = /^(?:(?:ci|chore|fix)(?:\([^)]*\))?!?:|merge\b|fix(?:e[sd])?\b)/i;

async function watchRequests(page: Page) {
  const hits: string[] = [];
  page.on("request", (request) => {
    if (OWN_DATA.test(request.url())) hits.push(request.url());
  });
  return hits;
}

async function snapshot(page: Page) {
  return (await page.request.get("/data/github/index.json")).json();
}

test.describe("F07 static GitHub data", () => {
  for (const path of ["/projects", "/opensource", "/projects/AutoCart-Engine-FW-"]) {
    test(`${path} makes no live GitHub calls`, async ({ page }) => {
      const hits = await watchRequests(page);
      await gotoReady(page, path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(800);
      expect(hits).toEqual([]);
      const pill = page.locator(".pj-sync");
      if (path !== "/opensource") {
        await expect(pill).toContainText("Synced from GitHub");
        await expect(pill).not.toContainText(/API\s*\d+\s*\/\s*\d+/);
        await expect(pill.locator("button")).toHaveCount(0);
      }
    });
  }

  test("/projects counters show the snapshot's numbers in the raw HTML and after boot", async ({ page }) => {
    const data = await snapshot(page);
    const own = data.repos.filter((repo: any) => !repo.fork).length;
    const kpi = page.locator(".pj-kpi", { hasText: "Repositories" }).locator(".pj-kpi-value");

    const html = await (await page.request.get("/projects")).text();
    expect(html).toMatch(new RegExp(`pj-kpi-value">${own}<`));

    await gotoReady(page, "/projects");
    await expect(kpi).toHaveText(String(own));
    await page.waitForTimeout(1200);
    await expect(kpi).toHaveText(String(own)); // never re-renders to 0
  });

  test("the commit stream and activity log leave out ci/chore/fix and merges", async ({ page }) => {
    await gotoReady(page, "/projects");
    const messages = await page.locator(".pj-stream-msg").allInnerTexts();
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) expect(message).not.toMatch(HOUSEKEEPING);

    await gotoReady(page, "/opensource");
    const details = await page.locator(".os-term-text em").allInnerTexts();
    for (const detail of details) expect(detail.trim()).not.toMatch(HOUSEKEEPING);
  });

  for (const path of ["/projects", "/opensource"]) {
    test(`${path}: no layout shift while the app adopts the prerendered page`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) (window as any).__shifts.push(entry.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await gotoReady(page, path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1200);
      const cls = await page.evaluate(() => (window as any).__shifts.reduce((sum: number, value: number) => sum + value, 0));
      expect(cls, "cumulative layout shift").toBeLessThan(0.02);
    });
  }
});
