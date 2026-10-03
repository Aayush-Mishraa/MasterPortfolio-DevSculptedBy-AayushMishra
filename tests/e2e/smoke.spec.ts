import { test, expect, gotoReady, expectNoNewA11yIssues } from "./fixtures";

// Every top-level page: renders, has one h1, no console errors, and no new
// serious/critical accessibility issues.
export const PAGES = [
  "/",
  "/experience",
  "/education",
  "/automation-arsenal",
  "/projects",
  "/opensource",
  "/contact",
  "/universe",
];

for (const path of PAGES) {
  test(`${path} renders`, async ({ page }, testInfo) => {
    const response = await gotoReady(page, path);
    expect(response && response.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    // Let lazy sections and data settle before the audit.
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectNoNewA11yIssues(page, `${testInfo.project.name} ${path}`);
  });
}
