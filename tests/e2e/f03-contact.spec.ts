import fs from "fs";
import path from "path";
import { test, expect, gotoReady } from "./fixtures";
import type { Page, Route } from "@playwright/test";

/*
  F03: the contact form posts to /api/contact.php and shows a real result.
  The API is mocked here so every outcome can be forced; f03-contact-live
  runs the same flow against the real PHP stack.
*/

const TOKEN = { ok: true, token: "test.token", min_age: 0 };

async function mockApi(page: Page, contact: (route: Route, call: number) => Promise<void> | void) {
  let calls = 0;
  const bodies: any[] = [];
  await page.route("**/api/token.php*", (route) => route.fulfill({ json: TOKEN }));
  await page.route("**/api/contact.php", async (route) => {
    calls += 1;
    bodies.push(route.request().postDataJSON());
    await contact(route, calls);
  });
  return { calls: () => calls, bodies };
}

async function fillForm(page: Page) {
  await gotoReady(page, "/contact");
  await page.evaluate(() => window.localStorage.removeItem("contact-draft-v1"));
  const compose = page.locator("#compose");
  await compose.scrollIntoViewIfNeeded();
  await compose.locator("label.ct-intent", { hasText: "Automation audit" }).click();
  await compose.locator("label.ct-pill", { hasText: "< 1 month" }).click();
  await compose.locator("label.ct-topic", { hasText: "CI/CD pipelines" }).click();
  await page.fill("#ct-name", "Ada Lovelace");
  await page.fill("#ct-email", "ada@example.com");
  await page.fill("#ct-company", "Analytical Engines");
  await page.fill("#ct-message", "Our Playwright suite is flaky in CI and nobody trusts it.");
}

test.describe("F03 contact form", () => {
  test("sends to the API, not the mail app, and confirms", async ({ page }) => {
    const api = await mockApi(page, (route) => route.fulfill({ json: { ok: true, delivered: true } }));
    await fillForm(page);
    await page.click("button.ct-transmit");

    const panel = page.locator(".ct-sent");
    await expect(panel).toContainText("Transmission received.");
    await expect(panel).toContainText("ada@example.com");
    await expect(panel.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(panel).toBeFocused();

    expect(api.calls()).toBe(1);
    expect(api.bodies[0]).toMatchObject({
      token: "test.token",
      website: "",
      intent: "audit",
      topics: ["cicd"],
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      timeline: "< 1 month",
      message: "Our Playwright suite is flaky in CI and nobody trusts it.",
      page: "/contact",
      source: "contact",
    });
    // The draft is cleared once it's delivered.
    expect(await page.evaluate(() => window.localStorage.getItem("contact-draft-v1"))).toBeNull();
  });

  test("shows the server's field errors next to the field", async ({ page }) => {
    await mockApi(page, (route) =>
      route.fulfill({
        status: 422,
        json: { ok: false, error: "invalid", message: "Please check the highlighted fields.", fields: { email: "That email address doesn't look right." } },
      })
    );
    await fillForm(page);
    await page.click("button.ct-transmit");
    await expect(page.locator("#ct-email-error")).toHaveText(/That email address doesn't look right\./);
    await expect(page.locator("#ct-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#ct-email")).toBeFocused();
    await expect(page.locator(".ct-sent")).toHaveCount(0);
  });

  test("falls back to email when the API can't deliver", async ({ page }) => {
    await mockApi(page, (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "unavailable", message: "x", fallback: "mailto" } })
    );
    await fillForm(page);
    await page.click("button.ct-transmit");

    const panel = page.locator(".ct-sent--failed");
    await expect(panel).toContainText("Not sent yet.");
    const mailto = panel.locator('a[href^="mailto:contact@aayushmishra.engineer"]');
    await expect(mailto).toHaveAttribute("href", /subject=%5BAutomation%20audit%5D%20Ada%20Lovelace/);
    await expect(panel.getByRole("button", { name: "Copy full message" })).toBeVisible();
    await panel.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator("#ct-message")).toHaveValue(/flaky in CI/);
  });

  test("a dropped connection also falls back to email", async ({ page }) => {
    await mockApi(page, (route) => route.abort("internetdisconnected"));
    await fillForm(page);
    await page.click("button.ct-transmit");
    await expect(page.locator(".ct-sent--failed")).toContainText("connection dropped");
  });

  test("a too-fast submit waits and retries once", async ({ page }) => {
    const api = await mockApi(page, (route, call) =>
      call === 1
        ? route.fulfill({ status: 429, json: { ok: false, error: "too_fast", message: "One moment…", retry_after: 1 } })
        : route.fulfill({ json: { ok: true, delivered: true } })
    );
    await fillForm(page);
    await page.click("button.ct-transmit");
    await expect(page.locator(".ct-sent")).toContainText("Transmission received.");
    expect(api.calls()).toBe(2);
  });

  test("the honeypot is invisible and out of reach", async ({ page }) => {
    await gotoReady(page, "/contact");
    const trap = page.locator("#ct-website");
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await expect(page.locator(".ct-hp")).toHaveAttribute("aria-hidden", "true");
    const box = await trap.boundingBox();
    expect(box === null || box.x + box.width < 0).toBeTruthy();
  });

  test("the booking button stays hidden until a link is configured", async ({ page }) => {
    await gotoReady(page, "/contact");
    await expect(page.getByRole("link", { name: /Book a 20-min call/ })).toHaveCount(0);
  });

  test("the footer's Get in touch opens the same form", async ({ page }) => {
    await gotoReady(page, "/experience");
    const cta = page.locator("footer a.footer-cta");
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toHaveAttribute("href", "/contact#compose");
    await cta.click();
    await expect(page).toHaveURL(/\/contact#compose$/);
    await expect(page.locator("#compose")).toBeInViewport({ ratio: 0.1 });
  });

  test("form options match what the API accepts", async () => {
    const root = path.join(__dirname, "..", "..");
    const php = fs.readFileSync(path.join(root, "api/lib/ContactOptions.php"), "utf8");
    const page = fs.readFileSync(path.join(root, "src/pages/contact/ContactComponent.js"), "utf8");
    const data = fs.readFileSync(path.join(root, "src/portfolio.js"), "utf8");

    const block = (name: string) => php.slice(php.indexOf(`const ${name}`), php.indexOf("];", php.indexOf(`const ${name}`)));
    const phpIds = (name: string) => [...block(name).matchAll(/'([^']+)'\s*=>/g)].map((m) => m[1]);

    const intents = [...page.slice(page.indexOf("const INTENTS"), page.indexOf("];", page.indexOf("const INTENTS"))).matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
    const topics = [...data.slice(data.indexOf("topics: ["), data.indexOf("],", data.indexOf("topics: ["))).matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
    const timelines = JSON.parse(page.match(/const TIMELINES = (\[[^\]]+\])/)![1]);
    const phpTimelines = [...block("TIMELINES").matchAll(/'([^']+)'/g)].map((m) => m[1]);

    expect(intents).toEqual(phpIds("INTENTS"));
    expect(topics).toEqual(phpIds("TOPICS"));
    expect(timelines).toEqual(phpTimelines);
  });
});
