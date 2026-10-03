import { test, expect, gotoReady } from "./fixtures";

/*
  F03 against the real stack: the built site + PHP API + MySQL + Mailpit
  (tests/server/docker-compose.yml). Opt-in, because it needs those running:

    FULL_STACK=1 BASE_URL=http://localhost:8080 MAILPIT_URL=http://localhost:8025 \
      npx playwright test tests/e2e/f03-contact-live.spec.ts
*/

const MAILPIT = process.env.MAILPIT_URL || "http://localhost:8025";

test.skip(!process.env.FULL_STACK, "needs FULL_STACK=1 and the Docker stack");

test("a visitor's message reaches the inbox with no mail app", async ({ page, request }, testInfo) => {
  const unique = `${testInfo.project.name}-${Date.now()}`;
  const email = `visitor-${unique}@example.com`;

  await gotoReady(page, "/contact");
  await page.evaluate(() => window.localStorage.removeItem("contact-draft-v1"));
  await page.locator("#compose").scrollIntoViewIfNeeded();
  await page.locator("label.ct-intent", { hasText: "Freelance project" }).click();
  await page.fill("#ct-name", "Grace Hopper");
  await page.fill("#ct-email", email);
  await page.fill("#ct-message", `Can you review our release checklist? (${unique})`);
  await page.click("button.ct-transmit");

  await expect(page.locator(".ct-sent")).toContainText("Transmission received.", { timeout: 20_000 });

  const search = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(email)}`);
  const found = await search.json();
  expect(found.messages_count).toBe(1);
  const message = found.messages[0];
  expect(message.Subject).toBe("[Freelance project] Grace Hopper");
  expect(message.ReplyTo[0].Address).toBe(email);
  expect(message.To[0].Address).toBe("contact@aayushmishra.engineer");
});
