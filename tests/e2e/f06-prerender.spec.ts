import { test, expect, gotoReady } from "./fixtures";

/*
  F06: every page is real HTML before any JavaScript runs, unknown URLs are
  real 404s, there is one home URL, and the app boots on top of the
  prerendered page without shifting it.

  The status-code tests need the server rules (public/.htaccess): run against
  Apache (BASE_URL=http://localhost:8080, tests/server) or the live site.
  scripts/serve-build.mjs mimics them closely enough for the rest.
*/

const SITE = "https://aayushmishra.engineer";

const visibleText = (html: string) =>
  html
    .slice(Math.max(0, html.indexOf("<body")))
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");

test.describe("F06 prerender and real 404", () => {
  test("raw HTML of /contact has the contact text, title, canonical and share image", async ({ request }) => {
    const response = await request.get("/contact");
    expect(response.status()).toBe(200);
    const html = await response.text();
    const text = visibleText(html);
    expect(text).toContain("Let's build software");
    expect(text).toContain("contact@aayushmishra.engineer");
    expect(html).toMatch(/<title[^>]*>Contact · Aayush Mishra<\/title>/);
    expect(html).toContain(`<link rel="canonical" href="${SITE}/contact"`);
    expect(html).toContain(`content="${SITE}/og/contact.jpg"`);
  });

  test("each top-level page has its own title in raw HTML", async ({ request }) => {
    const titles = new Set<string>();
    for (const path of ["/", "/experience", "/education", "/automation-arsenal", "/projects", "/opensource", "/contact", "/universe"]) {
      const html = await (await request.get(path)).text();
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1];
      expect(title, path).toBeTruthy();
      titles.add(title);
    }
    expect(titles.size).toBe(8);
  });

  test("unknown URLs are real 404s with the site's 404 page", async ({ page, request }) => {
    for (const path of ["/does-not-exist", "/projects/no-such-repository", "/universe/no-such-channel"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text()).toContain("Page not found");
    }
    const response = await page.goto("/still-not-here", { waitUntil: "domcontentloaded" });
    expect(response && response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("/home redirects to / and keeps the query string", async ({ request }) => {
    const response = await request.get("/home?utm_source=test", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toMatch(/\/\?utm_source=test$/);
  });

  test("sitemap, llms.txt and share images are generated", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`<loc>${SITE}/contact</loc>`);
    expect(sitemap).toContain(`<loc>${SITE}/projects/AutoCart-Engine-FW-</loc>`);
    expect(sitemap).not.toMatch(/inwarranty/i);

    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    const text = await llms.text();
    expect(text).toMatch(/^# Aayush Mishra · Senior SDET & QA Lead/);
    expect(text).toContain(`(${SITE}/contact)`);

    const image = await request.get("/og/contact.jpg");
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/jpeg");
  });

  // (/projects and /opensource load the GitHub snapshot: f07-static-github covers them.)
  for (const path of ["/", "/contact", "/experience", "/education"]) {
    test(`${path}: the app boots on the prerendered page without layout shift`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) (window as any).__shifts.push(entry.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      const html = await (await page.request.get(path)).text();
      const prerenderedH1 = visibleText((html.match(/<h1[\s\S]*?<\/h1>/) || [""])[0]).trim();

      await gotoReady(page, path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1000);

      const h1 = (await page.locator("h1").first().innerText()).replace(/\s+/g, " ").trim();
      expect(prerenderedH1.replace(/\s+/g, " ")).toContain(h1.split(" ")[0]);
      const cls = await page.evaluate(() => (window as any).__shifts.reduce((sum: number, value: number) => sum + value, 0));
      expect(cls, "cumulative layout shift").toBeLessThan(0.02);
    });
  }
});
