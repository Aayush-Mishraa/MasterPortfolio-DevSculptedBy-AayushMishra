import { test, expect, gotoReady } from "./fixtures";

/*
  F10: audience split. The home page is services-first, recruiters have
  /hire-me, the menu is Work · Services · About · Contact (+ Hire me), and
  Projects and Open Source live under /work.
*/

test.describe("F10 audience split", () => {
  test("the menu is Home · Work · Services · About · Contact, with Hire me as the button", async ({ page }) => {
    await gotoReady(page, "/");
    const labels = await page.locator("nav[aria-label='Primary'] .menu .nav-label").allTextContents();
    expect(labels).toEqual(["Home", "Work", "Services", "About", "Contact"]);
    await expect(page.locator("nav[aria-label='Primary'] .cta-link")).toHaveAttribute("href", "/hire-me");
    await expect(page.locator("nav[aria-label='Primary'] .cta-link")).toHaveText(/Hire me/);
  });

  test("on a phone the menu opens from the keyboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "the menu toggle only exists on small screens");
    await gotoReady(page, "/");
    const toggle = page.getByRole("checkbox", { name: "Toggle navigation" });
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toBeChecked();
    await expect(page.locator("nav[aria-label='Primary'] .menu a", { hasText: "Services" })).toBeVisible();
  });

  test("the home hero leads with services and points recruiters to /hire-me", async ({ page }) => {
    await gotoReady(page, "/");
    const actions = page.locator(".hm-hero__actions");
    const primary = actions.locator(".hm-btn--primary");
    await expect(primary).toHaveText(/See services/);
    await expect(primary).toHaveAttribute("href", "/services");
    await expect(actions.getByRole("link", { name: /Hiring full-time/ })).toHaveAttribute("href", "/hire-me");
    await expect(page.locator(".hm-hero__status")).toContainText("QA engagements");
  });

  for (const [from, to] of [
    ["/projects?q=playwright", "/work?q=playwright"],
    ["/opensource", "/work/open-source"],
  ]) {
    test(`${from} moved to ${to} (301)`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      const location = new URL(response.headers()["location"], "http://localhost");
      expect(location.pathname + location.search).toBe(to);
    });
  }

  test("Work tabs switch between Projects and Open source", async ({ page }) => {
    await gotoReady(page, "/work");
    const tabs = page.getByRole("navigation", { name: "Work" });
    await expect(tabs.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Open source" }).click();
    await expect(page).toHaveURL(/\/work\/open-source$/);
    await expect(page.getByRole("navigation", { name: "Work" }).getByRole("link", { name: "Open source" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("Work stays highlighted on a repository page, About on Experience", async ({ page }) => {
    await gotoReady(page, "/projects/AutoCart-Engine-FW-");
    await expect(page.locator("nav[aria-label='Primary'] .menu a[aria-current='page'] .nav-label")).toHaveText("Work");
    await gotoReady(page, "/experience");
    await expect(page.locator("nav[aria-label='Primary'] .menu a[aria-current='page'] .nav-label")).toHaveText("About");
  });

  test("/hire-me has the résumé, the recruiter brief and the hiring snapshot", async ({ page }) => {
    await gotoReady(page, "/hire-me");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Senior SDET & QA Lead");
    await expect(page.locator(".hr-hero__actions a", { hasText: "Résumé" })).toHaveAttribute("href", /\S+/);
    const facts = page.locator(".hr-facts dt");
    await expect(facts).toHaveText(["Now", "Experience", "Open to", "Location", "Core stack", "AI testing", "Education"]);
    await expect(page.locator("#hm-snapshot-title")).toHaveText("hiring-snapshot");
    // With reduced motion the brief opens on its card (the film waits behind a button).
    await page.locator(".hr-hero__actions").getByRole("button", { name: /30-second brief/ }).click();
    await expect(page.getByRole("dialog", { name: "Aayush Mishra" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("/about links to Experience, Education, the Arsenal and Work", async ({ page }) => {
    await gotoReady(page, "/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aayush Mishra");
    const cards = page.locator(".ab-more__card");
    expect(await cards.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
      "/experience",
      "/education",
      "/automation-arsenal",
      "/work",
    ]);
    // The current employer stays unnamed outside the Experience page.
    await expect(page.locator(".ab-log")).not.toContainText("Webority");
  });

  test("/about and /hire-me are prerendered with their own titles", async ({ request }) => {
    for (const [path, title] of [
      ["/about", "About · Aayush Mishra"],
      ["/hire-me", "Hire me · Recruiter brief · Aayush Mishra"],
    ]) {
      const html = await (await request.get(path)).text();
      expect(html).toContain(`>${title}</title>`);
      expect(html).toContain(`data-prerendered="${path}"`);
    }
  });
});
