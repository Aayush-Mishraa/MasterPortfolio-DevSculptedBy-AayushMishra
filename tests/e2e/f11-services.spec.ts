import fs from "fs";
import path from "path";
import { test, expect, gotoReady } from "./fixtures";

/*
  F11: /services as a test plan. Offers come from src/data/services.js and
  prices from src/data/pricing.js; nothing is hard-coded in the components.
*/

const ROOT = path.join(__dirname, "..", "..");
const SLUGS = [
  "release-review",
  "qa-health-check",
  "playwright-starter-sprint",
  "ai-feature-eval-pack",
  "release-retainer",
  "wcag-quick-audit",
  "fractional-qa-lead",
  "mentoring",
];

const jsonLd = (html: string) =>
  [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));

test.describe("F11 services", () => {
  test("/services lists every offer as a test case with its price", async ({ page }) => {
    await gotoReady(page, "/services");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A test plan");
    const cases = page.locator(".sv-plan .sv-case");
    await expect(cases).toHaveCount(SLUGS.length);
    expect(await cases.evaluateAll((items) => items.map((item) => item.id))).toEqual(SLUGS);

    const price = (slug: string) => page.locator(`#${slug} .sv-case__price strong`);
    await expect(price("release-review")).toHaveText("$199");
    await expect(price("qa-health-check")).toHaveText("$600–$1,200");
    await expect(price("release-retainer")).toHaveText("$499–$999 / month");
    await expect(price("mentoring")).toHaveText("₹999–₹2,999 / session");

    // Every case says who it's for, what you get, how long and what to expect.
    for (const label of ["Preconditions", "Steps", "Duration", "Expected result"]) {
      await expect(page.locator(".sv-plan dt", { hasText: label })).toHaveCount(SLUGS.length);
    }
    await expect(page.locator(".sv-process__step")).toHaveCount(5);
    await expect(page.locator(".sv-faq__item").first()).toBeVisible();
  });

  test("the FAQ opens and closes with the keyboard", async ({ page }) => {
    await gotoReady(page, "/services");
    const first = page.locator(".sv-faq__item").first();
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("/services raw HTML carries the offer catalogue as JSON-LD", async ({ request }) => {
    const html = await (await request.get("/services")).text();
    expect(html).toContain(">QA Services · Aayush Mishra</title>");
    const catalog = jsonLd(html).find((item) => item["@type"] === "OfferCatalog");
    expect(catalog).toBeTruthy();
    expect(catalog.itemListElement).toHaveLength(SLUGS.length);
    const review = catalog.itemListElement.find((item: any) => item.name === "Release Review call");
    expect(review["@type"]).toBe("Service");
    expect(review.offers).toMatchObject({ "@type": "Offer", price: "199", priceCurrency: "USD" });
    const mentoring = catalog.itemListElement.find((item: any) => item.url.endsWith("/services/mentoring"));
    expect(mentoring.offers.priceSpecification).toMatchObject({ minPrice: 999, maxPrice: 2999, priceCurrency: "INR" });
  });

  test("each offer has its own prerendered page", async ({ request }) => {
    for (const slug of SLUGS) {
      const response = await request.get(`/services/${slug}`);
      expect(response.status(), slug).toBe(200);
      const html = await response.text();
      expect(html, slug).toContain(`<link rel="canonical" href="https://aayushmishra.engineer/services/${slug}"`);
      expect(jsonLd(html).some((item) => item["@type"] === "Service"), slug).toBe(true);
    }
    const missing = await request.get("/services/no-such-offer");
    expect(missing.status()).toBe(404);
  });

  test("an offer page shows the case, the price and the way to enquire", async ({ page }) => {
    await gotoReady(page, "/services/qa-health-check");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("QA Health Check");
    await expect(page.locator(".sv-detail__facts")).toContainText("$600–$1,200");
    await expect(page.locator("#enquire")).toBeVisible();
    await expect(page.locator(".sv-others__card")).toHaveCount(SLUGS.length - 1);
  });

  test("the home page shows the featured offers right after the hero", async ({ page }) => {
    await gotoReady(page, "/");
    const offers = page.locator("#hm-services .hm-offer");
    await expect(offers).toHaveCount(3);
    expect(await offers.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
      "/services/release-review",
      "/services/qa-health-check",
      "/services/playwright-starter-sprint",
    ]);
  });

  test("no price or currency is hard-coded outside src/data/pricing.js", () => {
    const files = [
      ...fs.readdirSync(path.join(ROOT, "src", "pages", "services")).map((file) => path.join("src", "pages", "services", file)),
      path.join("src", "pages", "home", "sections", "Offers.js"),
      path.join("src", "data", "services.js"),
    ].filter((file) => file.endsWith(".js"));
    for (const file of files) {
      // Code only: doc comments may show example prices.
      const source = fs
        .readFileSync(path.join(ROOT, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(source, file).not.toMatch(/[$₹€£]\s?\d|\b(USD|INR|EUR)\b|\d+\s?(dollars|rupees)/);
    }
  });
});
