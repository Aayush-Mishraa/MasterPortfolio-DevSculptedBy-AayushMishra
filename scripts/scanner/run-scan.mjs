/**
 * F24 "Test my site": scans one URL and reports back.
 *
 *   SCAN_URL=https://example.com [SCAN_ID=… CALLBACK_URL=… SCAN_CALLBACK_SECRET=…] node run-scan.mjs
 *
 * Checks (each one passes, fails, warns or is skipped):
 *   the page loads, HTTPS, console errors, broken links (same origin, up to
 *   25), broken resources, mobile overflow at 375 px, accessibility (axe:
 *   serious + critical), five security headers, title / description /
 *   viewport / lang, and Core Web Vitals from Lighthouse (mobile: LCP, CLS,
 *   TBT as the lab stand-in for INP).
 *
 * Writes scan-out/report.json and scan-out/failing-checks.spec.ts (one
 * Playwright test per failed check), then POSTs both to CALLBACK_URL signed
 * with HMAC-SHA256(secret, "<timestamp>.<body>"). Without a callback it only
 * writes the files (manual runs and local checks).
 */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { execFile } from "child_process";
import crypto from "crypto";
import dns from "dns";
import fs from "fs";
import net from "net";
import path from "path";
import { promisify } from "util";

const run = promisify(execFile);
const OUT = path.resolve("scan-out");
const { SCAN_ID = "", SCAN_URL = "", CALLBACK_URL = "", SCAN_CALLBACK_SECRET = "", RUN_URL = "" } = process.env;
const MAX_LINKS = 25;
const MOBILE = { width: 375, height: 812 };
const UA_NOTE = "aayushmishra.engineer site scanner (https://aayushmishra.engineer/free-tools/site-scanner)";

/* ------------------------------------------------------------------ */
/* Address checks (the API checked too; DNS may have changed since)    */
/* ------------------------------------------------------------------ */

const BLOCKED_V4 = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

const v4ToInt = (ip) => ip.split(".").reduce((sum, part) => (sum << 8) + Number(part), 0) >>> 0;

export function isPublicIp(ip) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) ip = mapped[1];
  if (net.isIPv4(ip)) {
    const value = v4ToInt(ip);
    return !BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (value & mask) === (v4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return false;
    return !/^(fc|fd|fe8|fe9|fea|feb|ff|64:ff9b:|2001:db8:)/.test(lower);
  }
  return false;
}

const hostCache = new Map();
async function hostIsPublic(host) {
  if (!host) return false;
  if (net.isIP(host)) return isPublicIp(host);
  if (/(^|\.)(localhost|local|internal|lan|home|corp|localdomain|arpa|test|invalid)$/i.test(host)) return false;
  if (!hostCache.has(host)) {
    hostCache.set(
      host,
      dns.promises
        .lookup(host, { all: true, verbatim: true })
        .then((records) => records.length > 0 && records.every((record) => isPublicIp(record.address)))
        .catch(() => false)
    );
  }
  return hostCache.get(host);
}

/* ------------------------------------------------------------------ */
/* Callback                                                            */
/* ------------------------------------------------------------------ */

async function callback(payload) {
  if (!CALLBACK_URL || !SCAN_CALLBACK_SECRET || !SCAN_ID) return;
  const body = JSON.stringify({ scan_id: SCAN_ID, run_url: RUN_URL, ...payload });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", SCAN_CALLBACK_SECRET).update(`${timestamp}.${body}`).digest("hex");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(CALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Scan-Timestamp": timestamp, "X-Scan-Signature": signature, "User-Agent": UA_NOTE },
        body,
      });
      console.log(`[scan] callback (${payload.status}): HTTP ${response.status}`);
      if (response.ok) return;
    } catch (error) {
      console.log(`[scan] callback failed: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

const checks = [];
const add = (check) => checks.push({ details: [], ...check });
const pass = (id, title, category, summary, extra = {}) => add({ id, title, category, status: "pass", summary, ...extra });
const fail = (id, title, category, summary, extra = {}) => add({ id, title, category, status: "fail", summary, ...extra });
const warn = (id, title, category, summary, extra = {}) => add({ id, title, category, status: "warn", summary, ...extra });
const skip = (id, title, category, summary) => add({ id, title, category, status: "skip", summary });

async function guardedContext(browser, options) {
  const context = await browser.newContext({ ...options, userAgent: undefined, ignoreHTTPSErrors: false });
  // Every request (and every redirect hop of a page load) must go to a public address.
  await context.route("**/*", async (route) => {
    const request = route.request();
    let url;
    try {
      url = new URL(request.url());
    } catch (error) {
      return route.abort();
    }
    if (url.protocol === "data:" || url.protocol === "blob:") return route.continue();
    if (!/^https?:$/.test(url.protocol) || !(await hostIsPublic(url.hostname))) return route.abort("blockedbyclient");
    if (request.resourceType() !== "document") return route.continue();
    // Documents: fetch without following redirects, so each hop is checked again.
    try {
      const response = await route.fetch({ maxRedirects: 0, timeout: 30000 });
      return route.fulfill({ response });
    } catch (error) {
      return route.abort("failed");
    }
  });
  return context;
}

async function scanPage(browser, target) {
  const context = await guardedContext(browser, { viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const brokenResources = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => consoleErrors.push(`Uncaught: ${String(error.message || error).slice(0, 300)}`));
  page.on("response", (response) => {
    const request = response.request();
    if (response.status() >= 400 && request.resourceType() !== "document") {
      brokenResources.push(`${response.status()} ${request.resourceType()} ${request.url().slice(0, 200)}`);
    }
  });

  let response = null;
  try {
    response = await page.goto(target, { waitUntil: "load", timeout: 45000 });
  } catch (error) {
    fail("loads", "The page loads", "Basics", `The page didn't load: ${error.message.split("\n")[0]}`);
    await context.close();
    return null;
  }
  const status = response ? response.status() : 0;
  const finalUrl = page.url();
  if (status >= 400 || status === 0) {
    fail("loads", "The page loads", "Basics", `The server answered HTTP ${status}.`);
  } else {
    pass("loads", "The page loads", "Basics", `HTTP ${status}${finalUrl !== target ? `, after redirecting to ${finalUrl}` : ""}.`);
  }
  await page.waitForTimeout(3000);

  // HTTPS
  if (finalUrl.startsWith("https://")) pass("https", "Served over HTTPS", "Security", "The final page is on HTTPS.");
  else fail("https", "Served over HTTPS", "Security", "The page is served over plain HTTP.", { spec: { finalUrl } });

  // Console errors
  if (consoleErrors.length === 0) pass("console", "No console errors", "Basics", "No errors in the browser console during load.");
  else
    fail("console", "No console errors", "Basics", `${consoleErrors.length} error${consoleErrors.length === 1 ? "" : "s"} in the console.`, {
      details: consoleErrors.slice(0, 10),
    });

  // Broken resources
  const resources = [...new Set(brokenResources)];
  if (resources.length === 0) pass("resources", "No broken resources", "Basics", "Every script, style, image and font loaded.");
  else fail("resources", "No broken resources", "Basics", `${resources.length} resource${resources.length === 1 ? "" : "s"} failed to load.`, { details: resources.slice(0, 10) });

  // Head basics
  const head = await page.evaluate(() => ({
    title: document.title.trim(),
    description: (document.querySelector('meta[name="description"]') || {}).content || "",
    viewport: (document.querySelector('meta[name="viewport"]') || {}).content || "",
    lang: document.documentElement.getAttribute("lang") || "",
    links: Array.from(document.querySelectorAll("a[href]")).map((a) => a.href),
  }));
  if (head.title) pass("title", "Page title", "SEO", `"${head.title.slice(0, 80)}"`);
  else fail("title", "Page title", "SEO", "The page has no <title>.");
  if (head.description.trim().length >= 50) pass("description", "Meta description", "SEO", `${head.description.trim().length} characters.`);
  else fail("description", "Meta description", "SEO", head.description ? "The meta description is very short (under 50 characters)." : "No meta description.");
  if (/width\s*=\s*device-width/i.test(head.viewport)) pass("viewport", "Mobile viewport", "Mobile", "Has width=device-width.");
  else fail("viewport", "Mobile viewport", "Mobile", "No <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.");
  if (head.lang) pass("lang", "Page language", "Accessibility", `lang="${head.lang}".`);
  else fail("lang", "Page language", "Accessibility", "The <html> element has no lang attribute.");

  // Accessibility (axe)
  try {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    const minor = results.violations.length - serious.length;
    const details = serious.map((violation) => `${violation.impact}: ${violation.id} (${violation.nodes.length}×) ${violation.help}`);
    if (serious.length === 0)
      pass("axe", "Accessibility (axe)", "Accessibility", minor ? `No serious issues (${minor} minor or moderate).` : "No issues found by axe.");
    else
      fail("axe", "Accessibility (axe)", "Accessibility", `${serious.length} serious or critical rule${serious.length === 1 ? "" : "s"} failed.`, {
        details,
        spec: { rules: serious.map((violation) => violation.id) },
      });
  } catch (error) {
    skip("axe", "Accessibility (axe)", "Accessibility", `axe couldn't run: ${error.message.split("\n")[0]}`);
  }

  // Security headers (from the page's own response)
  const headers = response ? await response.allHeaders() : {};
  const csp = headers["content-security-policy"] || "";
  const headerCheck = (id, title, ok, good, bad, header) =>
    ok ? pass(id, title, "Security", good) : fail(id, title, "Security", bad, { spec: { header } });
  if (finalUrl.startsWith("https://"))
    headerCheck("hsts", "HSTS header", Boolean(headers["strict-transport-security"]), headers["strict-transport-security"] || "", "No Strict-Transport-Security header.", "strict-transport-security");
  else skip("hsts", "HSTS header", "Security", "Not on HTTPS, so HSTS doesn't apply yet.");
  headerCheck("csp", "Content-Security-Policy", Boolean(csp), "Present.", "No Content-Security-Policy header.", "content-security-policy");
  headerCheck("nosniff", "X-Content-Type-Options", /nosniff/i.test(headers["x-content-type-options"] || ""), "nosniff.", "No X-Content-Type-Options: nosniff.", "x-content-type-options");
  headerCheck(
    "framing",
    "Clickjacking protection",
    Boolean(headers["x-frame-options"]) || /frame-ancestors/i.test(csp),
    headers["x-frame-options"] ? `X-Frame-Options: ${headers["x-frame-options"]}.` : "CSP frame-ancestors.",
    "Neither X-Frame-Options nor CSP frame-ancestors is set.",
    "x-frame-options"
  );
  if (headers["referrer-policy"]) pass("referrer", "Referrer-Policy", "Security", headers["referrer-policy"]);
  else warn("referrer", "Referrer-Policy", "Security", "No Referrer-Policy header (browsers default to strict-origin-when-cross-origin).");

  // Broken links (same origin, up to MAX_LINKS)
  const origin = new URL(finalUrl).origin;
  const links = [...new Set(head.links.map((href) => href.split("#")[0]).filter((href) => href.startsWith(origin)))].slice(0, MAX_LINKS);
  const broken = [];
  for (const link of links) {
    if (!(await hostIsPublic(new URL(link).hostname))) continue;
    try {
      let result = await context.request.head(link, { maxRedirects: 0, timeout: 15000, failOnStatusCode: false });
      if (result.status() === 405 || result.status() === 501) result = await context.request.get(link, { maxRedirects: 0, timeout: 15000, failOnStatusCode: false });
      if (result.status() >= 400) broken.push({ url: link, status: result.status() });
    } catch (error) {
      broken.push({ url: link, status: 0 });
    }
  }
  if (!links.length) skip("links", "No broken links", "Basics", "No same-site links on the page.");
  else if (!broken.length) pass("links", "No broken links", "Basics", `${links.length} same-site link${links.length === 1 ? "" : "s"} checked.`);
  else
    fail("links", "No broken links", "Basics", `${broken.length} of ${links.length} links are broken.`, {
      details: broken.map((item) => `${item.status || "no answer"} ${item.url}`),
      spec: { urls: broken.map((item) => item.url) },
    });
  await context.close();

  // Mobile overflow
  const mobile = await guardedContext(browser, { viewport: MOBILE, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const phone = await mobile.newPage();
  try {
    await phone.goto(finalUrl, { waitUntil: "load", timeout: 45000 });
    await phone.waitForTimeout(1500);
    const overflow = await phone.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const scroll = document.scrollingElement ? document.scrollingElement.scrollWidth : document.body.scrollWidth;
      const offenders = [];
      if (scroll > width + 1) {
        for (const element of Array.from(document.querySelectorAll("body *"))) {
          const box = element.getBoundingClientRect();
          if (box.right > width + 1 && box.width > 0 && getComputedStyle(element).position !== "fixed") {
            const name = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : "") + (element.classList[0] ? `.${element.classList[0]}` : "");
            offenders.push(`${name} ends at ${Math.round(box.right)}px`);
            if (offenders.length >= 5) break;
          }
        }
      }
      return { width, scroll, offenders };
    });
    if (overflow.scroll <= overflow.width + 1) pass("overflow", "No sideways scroll on mobile", "Mobile", "Nothing spills past a 375 px screen.");
    else
      fail("overflow", "No sideways scroll on mobile", "Mobile", `The page is ${overflow.scroll}px wide on a ${overflow.width}px screen.`, {
        details: overflow.offenders,
      });
  } catch (error) {
    skip("overflow", "No sideways scroll on mobile", "Mobile", "The mobile load failed.");
  }
  await mobile.close();
  return finalUrl;
}

async function lighthouse(url) {
  const metrics = {};
  try {
    const chrome = chromium.executablePath();
    const { stdout } = await run(
      "npx",
      [
        "lighthouse",
        url,
        "--quiet",
        "--output=json",
        "--only-categories=performance,accessibility,best-practices,seo",
        `--chrome-path=${chrome}`,
        "--chrome-flags=--headless=new --no-sandbox",
        "--max-wait-for-load=45000",
      ],
      { maxBuffer: 64 * 1024 * 1024, timeout: 180000, env: { ...process.env, CHROME_PATH: chrome } }
    );
    const lhr = JSON.parse(stdout);
    const audit = (id) => (lhr.audits[id] ? lhr.audits[id].numericValue : null);
    Object.assign(metrics, {
      performance: lhr.categories.performance ? Math.round(lhr.categories.performance.score * 100) : null,
      accessibility: lhr.categories.accessibility ? Math.round(lhr.categories.accessibility.score * 100) : null,
      bestPractices: lhr.categories["best-practices"] ? Math.round(lhr.categories["best-practices"].score * 100) : null,
      seo: lhr.categories.seo ? Math.round(lhr.categories.seo.score * 100) : null,
      lcp: audit("largest-contentful-paint"),
      cls: audit("cumulative-layout-shift"),
      tbt: audit("total-blocking-time"),
      fcp: audit("first-contentful-paint"),
    });
  } catch (error) {
    console.log(`[scan] lighthouse failed: ${String(error.message).split("\n")[0]}`);
    skip("lcp", "Largest Contentful Paint", "Performance", "Lighthouse couldn't run on this page.");
    return metrics;
  }
  const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
  if (metrics.lcp == null) skip("lcp", "Largest Contentful Paint", "Performance", "Not measured.");
  else if (metrics.lcp <= 2500) pass("lcp", "Largest Contentful Paint", "Performance", `${seconds(metrics.lcp)} on a throttled phone (good is ≤ 2.5 s).`);
  else fail("lcp", "Largest Contentful Paint", "Performance", `${seconds(metrics.lcp)} on a throttled phone (good is ≤ 2.5 s).`, { spec: { lcp: metrics.lcp } });
  if (metrics.cls == null) skip("cls", "Cumulative Layout Shift", "Performance", "Not measured.");
  else if (metrics.cls <= 0.1) pass("cls", "Cumulative Layout Shift", "Performance", `${metrics.cls.toFixed(3)} (good is ≤ 0.1).`);
  else fail("cls", "Cumulative Layout Shift", "Performance", `${metrics.cls.toFixed(3)} (good is ≤ 0.1).`, { spec: { cls: metrics.cls } });
  if (metrics.tbt == null) skip("tbt", "Total Blocking Time", "Performance", "Not measured.");
  else if (metrics.tbt <= 200) pass("tbt", "Total Blocking Time", "Performance", `${Math.round(metrics.tbt)} ms (good is ≤ 200 ms; the lab stand-in for INP).`);
  else fail("tbt", "Total Blocking Time", "Performance", `${Math.round(metrics.tbt)} ms (good is ≤ 200 ms; the lab stand-in for INP).`);
  return metrics;
}

/* ------------------------------------------------------------------ */
/* The runnable spec                                                   */
/* ------------------------------------------------------------------ */

const q = (value) => JSON.stringify(value);

function specFor(check, url) {
  const name = q(`${check.title}: ${check.summary}`.slice(0, 160));
  switch (check.id) {
    case "loads":
      return `test(${name}, async ({ page }) => {\n  const response = await page.goto(URL);\n  expect(response && response.status()).toBeLessThan(400);\n});`;
    case "https":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL);\n  expect(page.url()).toMatch(/^https:\\/\\//);\n});`;
    case "console":
      return `test(${name}, async ({ page }) => {\n  const errors: string[] = [];\n  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));\n  page.on("pageerror", (error) => errors.push(String(error)));\n  await page.goto(URL, { waitUntil: "load" });\n  await page.waitForTimeout(3000);\n  expect(errors).toEqual([]);\n});`;
    case "resources":
      return `test(${name}, async ({ page }) => {\n  const broken: string[] = [];\n  page.on("response", (response) => {\n    if (response.status() >= 400 && response.request().resourceType() !== "document") broken.push(response.status() + " " + response.url());\n  });\n  await page.goto(URL, { waitUntil: "load" });\n  await page.waitForTimeout(3000);\n  expect(broken).toEqual([]);\n});`;
    case "links":
      return `test(${name}, async ({ request }) => {\n  const links = ${q((check.spec && check.spec.urls) || [])};\n  for (const link of links) {\n    const response = await request.get(link, { maxRedirects: 5 });\n    expect.soft(response.status(), link).toBeLessThan(400);\n  }\n});`;
    case "overflow":
      return `test(${name}, async ({ browser }) => {\n  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });\n  const page = await context.newPage();\n  await page.goto(URL, { waitUntil: "load" });\n  const { width, scroll } = await page.evaluate(() => ({\n    width: document.documentElement.clientWidth,\n    scroll: document.scrollingElement!.scrollWidth,\n  }));\n  expect(scroll).toBeLessThanOrEqual(width + 1);\n  await context.close();\n});`;
    case "axe":
      return `// npm i -D @axe-core/playwright\ntest(${name}, async ({ page }) => {\n  const { default: AxeBuilder } = await import("@axe-core/playwright");\n  await page.goto(URL, { waitUntil: "load" });\n  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();\n  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");\n  expect(serious.map((violation) => violation.id)).toEqual([]);\n});`;
    case "title":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL);\n  expect((await page.title()).trim()).not.toBe("");\n});`;
    case "description":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL);\n  const description = await page.locator('meta[name="description"]').getAttribute("content");\n  expect((description || "").trim().length).toBeGreaterThanOrEqual(50);\n});`;
    case "viewport":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL);\n  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);\n});`;
    case "lang":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL);\n  await expect(page.locator("html")).toHaveAttribute("lang", /.+/);\n});`;
    case "hsts":
    case "csp":
    case "nosniff":
      return `test(${name}, async ({ request }) => {\n  const response = await request.get(URL);\n  expect(response.headers()[${q(check.spec.header)}]).toBeTruthy();\n});`;
    case "framing":
      return `test(${name}, async ({ request }) => {\n  const headers = (await request.get(URL)).headers();\n  const csp = headers["content-security-policy"] || "";\n  expect(Boolean(headers["x-frame-options"]) || /frame-ancestors/i.test(csp)).toBe(true);\n});`;
    case "lcp":
      return `// Measured on an emulated phone; Lighthouse adds CPU and network throttling on top.\ntest(${name}, async ({ browser }) => {\n  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });\n  const page = await context.newPage();\n  await page.goto(URL, { waitUntil: "load" });\n  const lcp = await page.evaluate(() => new Promise<number>((resolve) => {\n    new PerformanceObserver((list) => {\n      const entries = list.getEntries();\n      resolve(entries[entries.length - 1].startTime);\n    }).observe({ type: "largest-contentful-paint", buffered: true });\n    setTimeout(() => resolve(0), 5000);\n  }));\n  expect(lcp).toBeLessThanOrEqual(2500);\n  await context.close();\n});`;
    case "cls":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL, { waitUntil: "load" });\n  await page.mouse.wheel(0, 2000);\n  await page.waitForTimeout(2000);\n  const cls = await page.evaluate(() => new Promise<number>((resolve) => {\n    let total = 0;\n    new PerformanceObserver((list) => {\n      for (const entry of list.getEntries() as any[]) if (!entry.hadRecentInput) total += entry.value;\n    }).observe({ type: "layout-shift", buffered: true });\n    setTimeout(() => resolve(total), 1000);\n  }));\n  expect(cls).toBeLessThanOrEqual(0.1);\n});`;
    case "tbt":
      return `test(${name}, async ({ page }) => {\n  await page.goto(URL, { waitUntil: "load" });\n  const blocking = await page.evaluate(() => new Promise<number>((resolve) => {\n    let total = 0;\n    new PerformanceObserver((list) => {\n      for (const entry of list.getEntries()) total += Math.max(0, entry.duration - 50);\n    }).observe({ type: "longtask", buffered: true });\n    setTimeout(() => resolve(total), 3000);\n  }));\n  expect(blocking).toBeLessThanOrEqual(200);\n});`;
    default:
      return null;
  }
}

function buildSpec(url, failed) {
  const tests = failed.map((check) => specFor(check, url)).filter(Boolean);
  return [
    "/**",
    ` * Failing checks from the aayushmishra.engineer scan of ${url}`,
    ` * (${new Date().toISOString().slice(0, 10)}). One test per failed check: each fails today`,
    " * and passes once the issue is fixed. Keep them as regression tests.",
    " *",
    " *   npm i -D @playwright/test && npx playwright install chromium",
    " *   npx playwright test failing-checks.spec.ts",
    " */",
    'import { test, expect } from "@playwright/test";',
    "",
    `const URL = ${q(url)};`,
    "",
    tests.join("\n\n"),
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!SCAN_URL) throw new Error("SCAN_URL is required");
  const target = new URL(SCAN_URL);
  if (!/^https?:$/.test(target.protocol) || target.username || target.password || (target.port && !["80", "443"].includes(target.port))) {
    await callback({ status: "failed", error: "That address can't be scanned." });
    throw new Error("refused: scheme, credentials or port");
  }
  if (!(await hostIsPublic(target.hostname))) {
    await callback({ status: "failed", error: "That address doesn't resolve to a public website." });
    throw new Error("refused: not a public address");
  }
  await callback({ status: "running" });

  const started = Date.now();
  const browser = await chromium.launch();
  let finalUrl = target.href;
  try {
    finalUrl = (await scanPage(browser, target.href)) || target.href;
  } finally {
    await browser.close();
  }
  const metrics = checks.some((check) => check.id === "loads" && check.status === "pass") ? await lighthouse(finalUrl) : {};

  const failed = checks.filter((check) => check.status === "fail");
  const report = {
    url: target.href,
    finalUrl,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    summary: {
      passed: checks.filter((check) => check.status === "pass").length,
      failed: failed.length,
      warned: checks.filter((check) => check.status === "warn").length,
      skipped: checks.filter((check) => check.status === "skip").length,
    },
    checks: checks.map(({ spec, ...check }) => check),
    metrics,
    scanner: "Playwright + axe-core + Lighthouse (mobile)",
  };
  const spec = failed.length ? buildSpec(finalUrl, failed) : null;
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  if (spec) fs.writeFileSync(path.join(OUT, "failing-checks.spec.ts"), spec);
  console.log(`[scan] ${report.summary.passed} passed · ${report.summary.failed} failed · ${failed.length ? "NOT SIGNED OFF" : "SIGNED OFF"}`);
  await callback({ status: "done", report, spec });
}

main().catch(async (error) => {
  console.error(`[scan] ${error.stack || error}`);
  if (!String(error.message).startsWith("refused")) await callback({ status: "failed", error: "The scan job hit an error. You can try again later." });
  process.exit(1);
});
