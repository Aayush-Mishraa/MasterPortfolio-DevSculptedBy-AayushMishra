import fs from "fs";
import path from "path";
import { test, expect, gotoReady } from "./fixtures";
import type { Page, Route } from "@playwright/test";

/*
  F12: the enquiry form on each /services/<slug> page posts to
  /api/enquiry.php. The API is mocked here so every outcome can be forced;
  the last test runs against the real PHP stack (FULL_STACK=1, see
  f03-contact-live.spec.ts for the setup).
*/

const ROOT = path.join(__dirname, "..", "..");
const TOKEN = { ok: true, token: "test.token", min_age: 0 };
const MAILPIT = process.env.MAILPIT_URL || "http://localhost:8025";

async function mockApi(page: Page, enquiry: (route: Route) => Promise<void> | void) {
  const bodies: any[] = [];
  await page.route("**/api/token.php*", (route) => route.fulfill({ json: TOKEN }));
  await page.route("**/api/enquiry.php", async (route) => {
    bodies.push(route.request().postDataJSON());
    await enquiry(route);
  });
  return bodies;
}

async function fill(page: Page, slug = "qa-health-check") {
  await gotoReady(page, `/services/${slug}`);
  const form = page.locator("#enquire form");
  await form.scrollIntoViewIfNeeded();
  await form.getByLabel("Name").fill("Ada Lovelace");
  await form.getByLabel("Work email").fill("ada@example.com");
  await form.getByLabel("Company").fill("Analytical Engines");
  await form.getByLabel("What are you shipping").fill("Our regression takes two days and CI is red half the time.");
  return form;
}

test.describe("F12 service enquiry", () => {
  test("the form starts on this page's service and sends it with the lead", async ({ page }) => {
    const bodies = await mockApi(page, (route) => route.fulfill({ json: { ok: true, delivered: true } }));
    const form = await fill(page);
    await expect(form.getByLabel("Service")).toHaveValue("qa-health-check");
    await form.getByLabel("Budget").selectOption({ label: "$1,000–$3,000" });
    await form.getByLabel("Timeline").selectOption("1–3 months");
    await form.getByRole("button", { name: /Send enquiry/ }).click();

    const done = page.locator(".sv-form__done");
    await expect(done).toContainText("Enquiry received");
    await expect(done).toContainText("ada@example.com");
    await expect(done).toBeFocused();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      token: "test.token",
      website: "",
      service: "qa-health-check",
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      budget: "1000-3000",
      timeline: "1–3 months",
      page: "/services/qa-health-check",
    });
  });

  test("every offer page's form starts on its own service, in the HTML and after boot", async ({ page, request }) => {
    const services = fs.readFileSync(path.join(ROOT, "src/data/services.js"), "utf8");
    const slugs = [...services.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
    for (const slug of slugs) {
      const html = await (await request.get(`/services/${slug}`)).text();
      expect(html, slug).toMatch(new RegExp(`<option value="${slug}" selected`));
      await gotoReady(page, `/services/${slug}`);
      await expect(page.locator("#enquire select[name='service']"), slug).toHaveValue(slug);
    }
  });

  test("mentoring is priced in rupees, so the form doesn't ask for a USD budget", async ({ page }) => {
    await gotoReady(page, "/services/mentoring");
    await expect(page.locator("#enquire form").getByLabel("Budget")).toHaveCount(0);
    await page.locator("#enquire form").getByLabel("Service").selectOption("playwright-starter-sprint");
    await expect(page.locator("#enquire form").getByLabel("Budget")).toHaveCount(1);
  });

  test("missing fields are caught before sending, and the first one gets focus", async ({ page }) => {
    const bodies = await mockApi(page, (route) => route.fulfill({ json: { ok: true, delivered: true } }));
    await gotoReady(page, "/services/release-review");
    const form = page.locator("#enquire form");
    await form.getByLabel("Work email").fill("not-an-email");
    await form.getByRole("button", { name: /Send enquiry/ }).click();
    await expect(form.getByLabel("Name")).toBeFocused();
    await expect(form.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
    await expect(form.locator("#enq-email-error")).toBeVisible();
    await expect(form.locator("#enq-message-error")).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  test("server-side field errors are shown next to the fields", async ({ page }) => {
    await mockApi(page, (route) =>
      route.fulfill({ status: 422, json: { ok: false, error: "invalid", fields: { email: "That email address doesn't look right." } } })
    );
    const form = await fill(page);
    await form.getByRole("button", { name: /Send enquiry/ }).click();
    await expect(form.locator("#enq-email-error")).toHaveText("That email address doesn't look right.");
  });

  test("when the server can't take it, the visitor can email it instead", async ({ page }) => {
    await mockApi(page, (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "unavailable", message: "The enquiry couldn't be delivered from here. Please email it instead.", fallback: "mailto" } })
    );
    const form = await fill(page, "playwright-starter-sprint");
    await form.getByRole("button", { name: /Send enquiry/ }).click();
    const alert = page.locator(".sv-form__failed");
    await expect(alert).toContainText("couldn't be delivered");
    const href = await alert.getByRole("link", { name: /Email it instead/ }).getAttribute("href");
    expect(href).toMatch(/^mailto:contact@aayushmishra\.engineer\?subject=Enquiry%3A%20Playwright%20Starter%20Sprint/);
  });

  test("the PHP endpoint accepts exactly the services, budgets and timelines the page offers", async () => {
    const php = fs.readFileSync(path.join(ROOT, "api/lib/ServiceOptions.php"), "utf8");
    const block = (name: string) => php.slice(php.indexOf(`const ${name}`), php.indexOf("];", php.indexOf(`const ${name}`)));
    const phpKeys = (name: string) => [...block(name).matchAll(/'([^']+)' =>/g)].map((m) => m[1]);

    const services = fs.readFileSync(path.join(ROOT, "src/data/services.js"), "utf8");
    const slugs = [...services.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
    expect(phpKeys("SERVICES")).toEqual(slugs);

    const steps = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/pricing.js"), "utf8").match(/BUDGET_STEPS = (\[[^\]]+\])/)![1]);
    const ids = [`under-${steps[0]}`, ...steps.slice(1).map((s: number, i: number) => `${steps[i]}-${s}`), `over-${steps[steps.length - 1]}`, "not-sure"];
    expect(phpKeys("BUDGETS")).toEqual(ids);

    const timelines = JSON.parse(services.match(/export const TIMELINES = (\[[^\]]+\])/)![1]);
    const contact = fs.readFileSync(path.join(ROOT, "api/lib/ContactOptions.php"), "utf8");
    const phpTimelines = contact.match(/TIMELINES = \[([^\]]+)\]/)![1].match(/'([^']+)'/g)!.map((t) => t.slice(1, -1));
    expect(timelines).toEqual(phpTimelines);
  });

  test("against the real stack, an enquiry reaches the inbox as a service lead", async ({ page, request }, testInfo) => {
    test.skip(!process.env.FULL_STACK, "needs FULL_STACK=1 and the Docker stack");
    const unique = `${testInfo.project.name}-${Date.now()}`;
    const email = `enquiry-${unique}@example.com`;
    const form = await fill(page, "wcag-quick-audit");
    await form.getByLabel("Work email").fill(email);
    await form.getByRole("button", { name: /Send enquiry/ }).click();
    await expect(page.locator(".sv-form__done")).toContainText("Enquiry received", { timeout: 20_000 });

    const found = await (await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(email)}`)).json();
    expect(found.messages_count).toBe(1);
    expect(found.messages[0].Subject).toBe("[Enquiry: EAA/WCAG Quick Audit] Ada Lovelace · Analytical Engines");
  });
});
