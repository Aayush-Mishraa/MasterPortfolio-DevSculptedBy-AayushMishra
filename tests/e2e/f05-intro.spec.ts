import { test, expect } from "@playwright/test";

/*
  F05: the intro never holds the page. A plain visit (first or not, from a
  campaign link or not) lands on the hero; "Play intro" and the header logo
  play it with sound (no off switch), and it ends on / at the hero.

  These tests use a fresh context without the shared fixture, which marks the
  intro as seen: here nothing may depend on that flag.
*/

test.describe("F05 intro without the wait", () => {
  // (/home is a 301 to / on the server; f06-prerender checks that redirect.)
  for (const url of ["/", "/?utm_source=linkedin&utm_medium=post", "/?ref=producthunt"]) {
    test(`a first visit to ${url} lands on the hero`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#hm-hero-title")).toBeVisible();
      await page.waitForTimeout(800);
      await expect(page.locator(".intro")).toHaveCount(0);
      const classes = await page.evaluate(() => document.documentElement.className);
      expect(classes).not.toMatch(/intro-(active|cover|gated)/);
    });
  }

  test("Play intro plays it with sound, and it ends on / at the hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Play intro", exact: true }).click();

    await expect(page).toHaveURL(/\/splash$/);
    const intro = page.getByRole("dialog", { name: /Intro/ });
    await expect(intro).toBeVisible();
    // Sound is always on: no off switch, and the click already unlocked the
    // audio, so the Enter screen stays hidden.
    await expect(page.locator(".intro-sound")).toHaveCount(0);
    await expect(page.locator(".intro-gate")).toBeHidden();

    await page.keyboard.press("Escape"); // skip: fast-forwards to the handoff
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.locator(".intro")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator("#hm-hero-title")).toBeInViewport();
  });

  test("with reduced motion it shows the finished frame and fades out", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Play intro", exact: true }).click();
    await expect(page.locator(".intro.is-pass")).toBeVisible();
    await expect(page).toHaveURL(/\/$/, { timeout: 8_000 });
    await expect(page.locator(".intro")).toHaveCount(0);
  });

  test("the header logo still replays it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/experience", { waitUntil: "domcontentloaded" });
    await page.locator(".hud .logo").click();
    await expect(page).toHaveURL(/\/splash$/);
    await expect(page.locator(".intro")).toBeVisible();
  });
});

test("the header marks Home active on the home page only", async ({ page }) => {
  const current = page.locator('.hud a[aria-current="page"] .nav-label');
  await page.goto("/experience", { waitUntil: "domcontentloaded" });
  await expect(current).toHaveText(["Experience"]);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(current).toHaveText(["Home"]);
});
