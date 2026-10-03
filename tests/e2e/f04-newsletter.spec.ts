import { test, expect, gotoReady } from "./fixtures";
import type { Page } from "@playwright/test";

/*
  F04: no more fake "you're in". Until issue #1 the footer says "coming soon"
  and has no form; the real form (?newsletter=preview, or status "open")
  posts to /api/subscribe.php and only claims what the server confirms.
*/

async function footerNewsletter(page: Page, url: string) {
  await gotoReady(page, url);
  const box = page.locator("footer .newsletter");
  await box.scrollIntoViewIfNeeded();
  return box;
}

test.describe("F04 newsletter", () => {
  test("says coming soon, with no form, until issue #1", async ({ page }) => {
    const box = await footerNewsletter(page, "/experience");
    await expect(box).toContainText("Newsletter coming soon");
    await expect(box.locator("input")).toHaveCount(0);
    await expect(box.getByRole("button")).toHaveCount(0);
  });

  test("the real form confirms only what the API confirms", async ({ page }) => {
    const bodies: any[] = [];
    await page.route("**/api/token.php*", (route) => route.fulfill({ json: { ok: true, token: "t.t", min_age: 0 } }));
    await page.route("**/api/subscribe.php", (route) => {
      bodies.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true, status: "pending", message: "Almost there: check your inbox for a confirmation link." } });
    });
    const box = await footerNewsletter(page, "/experience?newsletter=preview");
    await box.locator("#footer-email").fill("reader@example.com");
    await box.getByRole("button", { name: "Subscribe" }).click();

    await expect(box.locator("#newsletter-status")).toHaveText(/check your inbox for a confirmation link/);
    await expect(box.getByRole("button", { name: "Check inbox" })).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ email: "reader@example.com", source: "footer", page: "/experience", website: "", token: "t.t" });
  });

  test("an API error is shown as an error, never as success", async ({ page }) => {
    await page.route("**/api/token.php*", (route) => route.fulfill({ json: { ok: true, token: "t.t", min_age: 0 } }));
    await page.route("**/api/subscribe.php", (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: "not_configured", message: "The newsletter isn't open yet." } })
    );
    const box = await footerNewsletter(page, "/experience?newsletter=preview");
    await box.locator("#footer-email").fill("reader@example.com");
    await box.getByRole("button", { name: "Subscribe" }).click();
    await expect(box.locator("#newsletter-status")).toHaveText("The newsletter isn't open yet.");
    await expect(box.locator("#newsletter-status")).toHaveClass(/error/);
    await expect(box.getByRole("button", { name: "Subscribe" })).toBeVisible();
  });

  test("server field errors and a dropped connection", async ({ page }) => {
    await page.route("**/api/token.php*", (route) => route.fulfill({ json: { ok: true, token: "t.t", min_age: 0 } }));
    let call = 0;
    await page.route("**/api/subscribe.php", (route) => {
      call += 1;
      return call === 1
        ? route.fulfill({ status: 422, json: { ok: false, error: "invalid", fields: { email: "That address couldn't be subscribed." } } })
        : route.abort("internetdisconnected");
    });
    const box = await footerNewsletter(page, "/experience?newsletter=preview");
    await box.locator("#footer-email").fill("reject@example.com");
    await box.getByRole("button", { name: "Subscribe" }).click();
    await expect(box.locator("#newsletter-status")).toHaveText("That address couldn't be subscribed.");
    await expect(box.locator("#footer-email")).toHaveAttribute("aria-invalid", "true");

    await box.locator("#footer-email").fill("reader@example.com");
    await box.getByRole("button", { name: "Subscribe" }).click();
    await expect(box.locator("#newsletter-status")).toContainText("connection lost");
  });

  test("an invalid address never reaches the API", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/subscribe.php", (route) => {
      calls += 1;
      return route.fulfill({ json: { ok: true } });
    });
    const box = await footerNewsletter(page, "/experience?newsletter=preview");
    await box.locator("#footer-email").fill("not-an-email");
    await box.getByRole("button", { name: "Subscribe" }).click();
    await expect(box.locator("#newsletter-status")).toContainText("valid email");
    expect(calls).toBe(0);
  });
});
