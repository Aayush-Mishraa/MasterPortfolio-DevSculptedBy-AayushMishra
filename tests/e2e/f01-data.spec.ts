import { test, expect, gotoReady } from "./fixtures";

/*
  F01 data fixes: one job title and site title, a JSON-LD Person with no empty
  fields, no Instagram in sameAs, and certificate links that each open their
  own certificate.
*/

const JOB_TITLE = "Senior SDET & QA Lead";
const SITE_TITLE = `Aayush Mishra · ${JOB_TITLE}`;

async function personSchema(page: import("@playwright/test").Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const people = blocks.map((text) => JSON.parse(text)).filter((data) => data["@type"] === "Person");
  expect(people, "exactly one Person schema").toHaveLength(1);
  return people[0];
}

// Every string anywhere in the value, with its path.
function strings(value: unknown, path = "$"): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => strings(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  }
  return [];
}

test.describe("F01 data fixes", () => {
  test("home: one site title and job title", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page).toHaveTitle(SITE_TITLE);
    await expect(page.locator(".hm-hero__role")).toHaveText(JOB_TITLE);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", SITE_TITLE);
  });

  test("home: Webority stays off the page", async ({ page }) => {
    await gotoReady(page, "/");
    await page.waitForLoadState("networkidle").catch(() => {});
    const text = await page.locator("#root").innerText();
    expect(text).not.toMatch(/webority/i);
  });

  test("JSON-LD Person is clean", async ({ page }) => {
    await gotoReady(page, "/");
    const person = await personSchema(page);

    expect(person.jobTitle).toBe(JOB_TITLE);
    expect(person).not.toHaveProperty("telephone");
    expect(person.sameAs.join(" ")).not.toMatch(/instagram/i);
    expect(person.sameAs.length).toBeGreaterThan(0);

    const empty = strings(person).filter(([, value]) => !value.trim());
    expect(empty, "no empty strings in the schema").toEqual([]);
    expect(JSON.stringify(person)).not.toContain("Link to your certificate");

    if (person.address) {
      expect(person.address.addressCountry).toBe("India");
    }

    const urls: string[] = person.hasCredential.map((credential: any) => credential.url).filter(Boolean);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^https:\/\//);
    expect(new Set(urls).size, "no two certificates share a link").toBe(urls.length);
  });

  test("education: each certificate link opens its own certificate", async ({ page }) => {
    await gotoReady(page, "/education");
    const hrefs = await page.locator("a.edu-cred").evaluateAll((links) => links.map((link) => link.getAttribute("href") || ""));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^https:\/\//);
    expect(new Set(hrefs).size).toBe(hrefs.length);

    const selenium = page.locator("a.edu-cred", { hasText: "Selenium WebDriver with Java" });
    await expect(selenium).toHaveAttribute("href", /UC-5eefb0ee/);
    await expect(page.locator("text=Link to your certificate")).toHaveCount(0);
  });

  test("experience: section titles read as plain English", async ({ page }) => {
    await gotoReady(page, "/experience");
    const text = await page.locator("#root").innerText();
    expect(text).not.toMatch(/volunteership/i);
    expect(text).not.toMatch(/\bvarity\b|documentry|reoccurence/i);
  });

  test("manifest uses the site title", async ({ request }) => {
    const manifest = await (await request.get("/manifest.json")).json();
    expect(manifest.name).toBe(SITE_TITLE);
    expect(manifest.short_name).toBe("Aayush Mishra");
  });
});
