import crypto from "crypto";
import { execFileSync } from "child_process";
import path from "path";
import { test, expect } from "./fixtures";
import type { Browser, BrowserContext, Page } from "@playwright/test";

/*
  F13: /admin end to end on the Docker stack (Apache + PHP + MySQL + the fake
  Buttondown). Opt-in like the other full-stack tests:

    FULL_STACK=1 BASE_URL=http://localhost:8080 npx playwright test tests/e2e/f13-admin.spec.ts

  It resets the admin tables first (so it replaces any admin you created on
  the local stack), runs once (desktop project), and each context acts as its
  own IP through X-Forwarded-For (the stack trusts it), so the lockout test
  doesn't lock out the others.
*/

const COMPOSE = path.join(__dirname, "..", "server", "docker-compose.yml");
const GATE = { username: "gate", password: "local-gate-password" };
const ADMIN = { username: "e2e-admin", password: "correct horse battery staple" };
const API_ADMIN_TOKEN = "test-admin-token-0123456789abcdef";

test.skip(!process.env.FULL_STACK, "needs FULL_STACK=1 and the Docker stack");
test.describe.configure({ mode: "serial" });

function sql(statement: string): string {
  return execFileSync(
    "docker",
    ["compose", "-f", COMPOSE, "exec", "-T", "db", "mysql", "-uportfolio", "-pportfolio", "portfolio", "-N", "-e", statement],
    { encoding: "utf8", env: { ...process.env, MSYS_NO_PATHCONV: "1" } }
  ).trim();
}

const ip = () => `203.0.113.${crypto.randomInt(1, 254)}`;

async function adminContext(browser: Browser, options: { gate?: boolean; forwardedFor?: string } = {}): Promise<BrowserContext> {
  return browser.newContext({
    httpCredentials: options.gate === false ? undefined : GATE,
    extraHTTPHeaders: { "X-Forwarded-For": options.forwardedFor || ip() },
  });
}

async function signIn(page: Page, user = ADMIN) {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// RFC 6238, as the server checks it
function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = secret.replace(/\s+/g, "").toUpperCase().split("").map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hash = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hash[19] & 0xf;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

test.describe("F13 admin", () => {
  test.beforeAll(() => {
    sql("DELETE FROM admin_users; DELETE FROM login_attempts;");
  });
  test.afterAll(() => {
    sql("DELETE FROM login_attempts;");
  });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one admin, so it runs once");
  });

  test("the Basic gate comes first, and admin pages are never cached or indexed", async ({ browser }) => {
    const anon = await adminContext(browser, { gate: false });
    const denied = await anon.request.get("/admin/login");
    expect(denied.status()).toBe(401);
    expect(denied.headers()["www-authenticate"]).toContain("Basic");
    expect((await anon.request.get("/admin/lib/Auth.php")).status()).toBe(403);
    await anon.close();

    const context = await adminContext(browser);
    const page = await context.newPage();
    const response = await page.goto("/admin/");
    expect(page.url()).toMatch(/\/admin\/setup$/);
    const headers = response!.headers();
    expect(headers["cache-control"]).toBe("no-store, private, max-age=0");
    expect(headers["x-robots-tag"]).toContain("noindex");
    expect(headers["content-security-policy"]).toContain("default-src 'none'");
    const cookie = (await context.cookies()).find((c) => c.name === "admin_sid" || c.name === "__Host-admin");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict" });
    await context.close();
  });

  test("first setup needs the API admin token, then signs in", async ({ browser }) => {
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto("/admin/setup");
    await page.getByLabel("API admin token").fill("wrong-token-wrong-token");
    await page.getByLabel("Username").fill(ADMIN.username);
    await page.getByLabel("Password (at least").fill(ADMIN.password);
    await page.getByLabel("Password again").fill(ADMIN.password);
    await page.getByRole("button", { name: "Create admin" }).click();
    await expect(page.getByRole("alert")).toContainText("isn't the API admin token");

    await page.getByLabel("API admin token").fill(API_ADMIN_TOKEN);
    await page.getByLabel("Username").fill(ADMIN.username);
    await page.getByLabel("Password (at least").fill(ADMIN.password);
    await page.getByLabel("Password again").fill(ADMIN.password);
    await page.getByRole("button", { name: "Create admin" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();

    // Setup is closed once an admin exists (signed in, it leads back to the overview).
    await page.goto("/admin/setup");
    await expect(page).toHaveURL(/\/admin\/$/);
    const anonymous = await adminContext(browser);
    const fresh = await anonymous.newPage();
    await fresh.goto("/admin/setup");
    await expect(fresh).toHaveURL(/\/admin\/login$/);
    await anonymous.close();
    await context.close();
  });

  test("sign in and out", async ({ browser }) => {
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await signIn(page, { ...ADMIN, password: "not the password at all" });
    await expect(page.getByRole("alert")).toHaveText("Wrong username or password.");
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await context.close();
  });

  test("5 failed sign-ins lock the IP for 15 minutes, even with the right password", async ({ browser }) => {
    const lockedIp = ip();
    const context = await adminContext(browser, { forwardedFor: lockedIp });
    const page = await context.newPage();
    for (let i = 0; i < 5; i++) {
      await signIn(page, { username: `nobody-${i}`, password: "guess-guess-guess" });
      await expect(page.getByRole("alert")).toHaveText("Wrong username or password.");
    }
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Too many attempts");
    await expect(page.getByRole("alert")).toContainText("Try again in 15 minutes");
    await context.close();

    // Another IP is not affected.
    const other = await adminContext(browser);
    const otherPage = await other.newPage();
    await signIn(otherPage);
    await expect(otherPage.getByRole("heading", { level: 1 })).toHaveText("Overview");
    await other.close();
    expect(Number(sql("SELECT COUNT(*) FROM audit_log WHERE action = 'login.locked'"))).toBeGreaterThan(0);
  });

  test("leads: search, pipeline, notes, CSV export and delete on request", async ({ browser }) => {
    const unique = crypto.randomBytes(4).toString("hex");
    const email = `lead-${unique}@example.com`;
    sql(
      `INSERT INTO leads (created_at, source, intent, name, email, company, budget, message) VALUES
       (UTC_TIMESTAMP(), 'service:qa-health-check', 'service', 'Ada ${unique}', '${email}', '=HYPERLINK("x")', '1000-3000', 'Please audit our CI. <script>alert(1)</script>')`
    );
    const context = await adminContext(browser);
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`/admin/leads?q=${unique}`);
    const row = page.locator("tbody tr");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("service:qa-health-check");
    await row.getByRole("link", { name: `Ada ${unique}` }).click();

    // Output is escaped, not run
    await expect(page.locator(".adm-message")).toContainText("<script>alert(1)</script>");

    await page.getByLabel("Status").selectOption("contacted");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByRole("status")).toHaveText("Status: Contacted.");
    await page.getByLabel("Add a note").fill("Called, sending a proposal on Monday.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.locator(".adm-notes")).toContainText("Called, sending a proposal on Monday.");

    const download = await context.request.get(`/admin/leads.csv?q=${unique}`);
    expect(download.headers()["content-type"]).toContain("text/csv");
    const csv = await download.text();
    expect(csv).toContain(email);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`); // a formula is defused

    await page.getByRole("button", { name: "Delete lead" }).click(); // the box isn't ticked: the browser refuses
    await expect(page).toHaveURL(/\/admin\/leads\/\d+$/);
    await page.getByLabel(/asked for their data to be deleted/).check();
    await page.getByRole("button", { name: "Delete lead" }).click();
    await expect(page.getByRole("status")).toContainText("were deleted");
    expect(sql(`SELECT COUNT(*) FROM leads WHERE email = '${email}'`)).toBe("0");
    expect(sql("SELECT action FROM audit_log WHERE action LIKE 'lead.%' ORDER BY id DESC LIMIT 3").split("\n")).toEqual([
      "lead.deleted",
      "lead.note",
      "lead.status",
    ]);
    await context.close();
  });

  test("subscribers: resync from Buttondown, export and delete on request", async ({ browser }) => {
    const unique = crypto.randomBytes(4).toString("hex");
    const email = `reader-${unique}@example.com`;
    sql(
      `INSERT INTO subscribers (email, status, source, buttondown_id, created_at, updated_at) VALUES
       ('${email}', 'pending', 'footer', 'sub-${unique}000000', UTC_TIMESTAMP(), UTC_TIMESTAMP())`
    );
    const context = await adminContext(browser);
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`/admin/subscribers?q=${unique}`);
    await page.getByRole("button", { name: `Resync ${email} from Buttondown` }).click();
    await expect(page.getByRole("status")).toHaveText("Resynced from Buttondown: Confirmed.");
    expect(sql(`SELECT status FROM subscribers WHERE email = '${email}'`)).toBe("confirmed");

    const csv = await (await context.request.get(`/admin/subscribers.csv?q=${unique}`)).text();
    expect(csv).toContain(`${email},confirmed,footer`);

    await page.goto(`/admin/subscribers?q=${unique}`);
    await page.getByLabel(`Confirm deleting ${email}`).check();
    await page.getByRole("button", { name: `Delete ${email} on request` }).click();
    await expect(page.getByRole("status")).toContainText("deleted in Buttondown");
    expect(sql(`SELECT COUNT(*) FROM subscribers WHERE email = '${email}'`)).toBe("0");
    await context.close();
  });

  test("a form without the CSRF token, or from another site, is refused and logged", async ({ browser }) => {
    const context = await adminContext(browser);
    const page = await context.newPage();
    await signIn(page);
    const lead = sql(
      "INSERT INTO leads (created_at, source, name, email, message) VALUES (UTC_TIMESTAMP(), 'contact', 'Csrf Target', 'csrf@example.com', 'Testing the CSRF guard here.'); SELECT LAST_INSERT_ID();"
    );
    const noToken = await context.request.post(`/admin/leads/${lead}/status`, { form: { status: "won" }, maxRedirects: 0 });
    expect(noToken.status()).toBe(403);
    const token = await page.locator("input[name=_csrf]").first().inputValue();
    const foreign = await context.request.post(`/admin/leads/${lead}/status`, {
      form: { status: "won", _csrf: token },
      headers: { Origin: "https://evil.example" },
      maxRedirects: 0,
    });
    expect(foreign.status()).toBe(403);
    expect(sql(`SELECT status FROM leads WHERE id = ${lead}`)).toBe("new");
    expect(Number(sql("SELECT COUNT(*) FROM audit_log WHERE action = 'csrf.rejected'"))).toBeGreaterThanOrEqual(2);

    const ok = await context.request.post(`/admin/leads/${lead}/status`, { form: { status: "won", _csrf: token }, maxRedirects: 0 });
    expect(ok.status()).toBe(303);
    expect(sql(`SELECT status FROM leads WHERE id = ${lead}`)).toBe("won");
    sql(`DELETE FROM leads WHERE id = ${lead}`);
    await context.close();
  });

  test("two-factor sign-in: set up, required at sign-in, turned off", async ({ browser }) => {
    // Each code works once (replay protection), so the steps are spelled out and the test waits for a fresh one.
    test.setTimeout(150_000);
    const STEP = 30_000;
    const stepNow = () => Math.floor(Date.now() / STEP);
    const context = await adminContext(browser);
    const page = await context.newPage();
    await signIn(page);
    await page.goto("/admin/settings");
    await page.getByRole("button", { name: "Set up two-factor" }).click();
    const secret = (await page.locator(".adm-secret code").textContent())!.replace(/\s+/g, "");
    const enabledAt = stepNow();
    await page.getByLabel("Code from the app").fill(totp(secret, enabledAt * STEP));
    await page.getByRole("button", { name: "Turn on two-factor" }).click();
    await expect(page.getByRole("status")).toHaveText("Two-factor sign-in is on.");
    await page.getByRole("button", { name: "Sign out" }).click();

    await signIn(page);
    await expect(page).toHaveURL(/\/admin\/2fa$/);
    await page.getByLabel(/6-digit code/).fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByRole("alert")).toContainText("didn't work");
    // The code that turned it on is spent; the next step's code is accepted (one step of drift allowed).
    await page.getByLabel(/6-digit code/).fill(totp(secret, (enabledAt + 1) * STEP));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");

    // Turning it off needs the password and a code newer than the last one used.
    const wait = (enabledAt + 2) * STEP - Date.now() + 500;
    if (wait > 0) await page.waitForTimeout(wait);
    await page.goto("/admin/settings");
    await page.getByLabel("Password", { exact: true }).fill(ADMIN.password);
    await page.getByLabel("Current code").fill(totp(secret, (enabledAt + 2) * STEP));
    await page.getByRole("button", { name: "Turn off two-factor" }).click();
    await expect(page.getByRole("status")).toHaveText("Two-factor sign-in is off.");
    await context.close();
  });

  test("settings: notification email is used for new leads", async ({ browser }) => {
    const context = await adminContext(browser);
    const page = await context.newPage();
    await signIn(page);
    await page.goto("/admin/settings");
    await page.getByLabel("Email", { exact: true }).fill("leads@example.com");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("leads@example.com");
    expect(sql("SELECT value FROM settings WHERE name = 'notification_email'")).toBe("leads@example.com");
    // Back to the default, so the contact tests still find mail at the usual address.
    await page.getByLabel("Email", { exact: true }).fill("contact@aayushmishra.engineer");
    await page.getByRole("button", { name: "Save" }).click();
    await page.goto("/admin/audit");
    await expect(page.locator("tbody")).toContainText("settings.notification_email");
    await context.close();
  });
});
