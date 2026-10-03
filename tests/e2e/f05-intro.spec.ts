import { test, expect } from "@playwright/test";

/*
  F05: the intro never holds the page. A plain visit (first or not, from a
  campaign link or not) lands on the hero; "Play intro" and the header logo
  play it, silently unless sound is turned on, and it ends on / at the hero.

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

  test("Play intro plays it with sound off, and it ends on / at the hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Play intro", exact: true }).click();

    await expect(page).toHaveURL(/\/splash$/);
    const intro = page.getByRole("dialog", { name: /Intro/ });
    await expect(intro).toBeVisible();
    const sound = page.locator(".intro-sound");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await expect(sound).toHaveText(/Sound off/);

    await page.keyboard.press("Escape"); // skip: fast-forwards to the handoff
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.locator(".intro")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator("#hm-hero-title")).toBeInViewport();
  });

  test("the sound toggle doesn't skip the intro and is remembered", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Play intro", exact: true }).click();
    const sound = page.locator(".intro-sound");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await expect(sound).toHaveText(/Sound on/);
    await expect(page.locator(".intro")).toBeVisible();
    await expect(page).toHaveURL(/\/splash$/);
    expect(await page.evaluate(() => window.localStorage.getItem("portfolio:intro-sound"))).toBe("on");

    // Keyboard on the toggle toggles; it doesn't skip either.
    await sound.focus();
    await page.keyboard.press("Enter");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".intro")).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("portfolio:intro-sound"))).toBe("off");
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
