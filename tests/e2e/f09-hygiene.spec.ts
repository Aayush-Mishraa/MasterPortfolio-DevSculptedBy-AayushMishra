import { test, expect, gotoReady } from "./fixtures";

/*
  F09 hygiene: content is visible without its "in view" class, the favicon and
  manifest resolve, the résumé link works, and no page shifts on load.
*/

const REVEALS = [
  ".footer-reveal",
  ".ct-reveal",
  ".hm-js [data-reveal]",
  ".pj-panel",
  ".pj-brief",
  ".pj-reveal",
  ".os-gauge",
  ".os-reveal",
  ".pd-title-word",
];

test.describe("F09 hygiene", () => {
  for (const path of ["/", "/contact", "/work", "/work/open-source", "/projects/AutoCart-Engine-FW-"]) {
    test(`${path}: reveal blocks are visible before they scroll into view`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await gotoReady(page, path);
      const hidden = await page.evaluate((selectors) => {
        const out: string[] = [];
        document.querySelectorAll(selectors.join(",")).forEach((element) => {
          // As if it had never been scrolled to: no "in view" state at all.
          element.classList.remove("is-in", "is-visible");
          element.removeAttribute("data-in");
          (element as HTMLElement).style.animation = "none";
        });
        document.querySelectorAll(selectors.join(",")).forEach((element) => {
          const style = getComputedStyle(element);
          if (Number(style.opacity) < 1 || style.visibility === "hidden" || /blur\(/.test(style.filter)) {
            out.push(`${element.className} opacity=${style.opacity} filter=${style.filter}`);
          }
        });
        return out;
      }, REVEALS);
      expect(hidden).toEqual([]);
    });
  }

  test("favicons, touch icon and manifest all resolve", async ({ request }) => {
    for (const path of ["/favicon.ico", "/apple-touch-icon.png", "/icons/favicon-32x32.png", "/icons/apple-icon-180x180.png"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toMatch(/image\//);
    }
    const manifest = await (await request.get("/manifest.json")).json();
    expect(manifest.start_url).toBe("/");
    expect(manifest.id).toBe("/");
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).status(), icon.src).toBe(200);
      expect(icon.purpose).toBe("any");
    }
  });

  test("index.html links one manifest", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html.match(/rel="manifest"/g) || []).toHaveLength(1);
  });

  test("the résumé link opens a PDF", async ({ page, request }) => {
    // F10: the home page is services-first; the résumé lives on /hire-me.
    await gotoReady(page, "/hire-me");
    const href = await page.locator(".hr-hero__actions a", { hasText: "Résumé" }).getAttribute("href");
    expect(href).toBeTruthy();
    if (href!.startsWith("/")) {
      const response = await request.get(href!);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/pdf");
    } else {
      // Still the Google Drive copy until the new PDF lands in public/resume.pdf.
      expect(href).toMatch(/^https:\/\/drive\.google\.com\//);
    }
  });

  for (const path of ["/", "/experience", "/education", "/automation-arsenal", "/work", "/work/open-source", "/about", "/hire-me", "/services", "/services/release-review", "/contact", "/universe"]) {
    test(`${path}: no layout shift on load`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) (window as any).__shifts.push(entry.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await gotoReady(page, path);
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const cls = await page.evaluate(() => (window as any).__shifts.reduce((sum: number, value: number) => sum + value, 0));
      expect(cls, "cumulative layout shift").toBeLessThan(0.02);
    });
  }
});
