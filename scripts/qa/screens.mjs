/**
 * Report screenshots at 1280px and 375px.
 *
 *   node scripts/qa/screens.mjs <out-dir> <base-url> <name>=<path>[@<selector>] ...
 *
 * Each shot is the viewport after load, or the element matching <selector>
 * (scrolled into view). Motion is reduced and the intro marked as seen.
 */
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const [outDir, baseUrl, ...specs] = process.argv.slice(2);
if (!outDir || !baseUrl || !specs.length) {
  console.error("usage: node scripts/qa/screens.mjs <out-dir> <base-url> name=/path[@selector] ...");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { label: "1280", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false },
  { label: "375", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true },
];

const browser = await chromium.launch();
try {
  for (const view of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: view.viewport,
      deviceScaleFactor: view.deviceScaleFactor,
      isMobile: view.isMobile,
      hasTouch: view.isMobile,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      try {
        window.sessionStorage.setItem("portfolio:intro-seen", "1");
      } catch (error) {
        /* ignore */
      }
    });
    const page = await context.newPage();
    for (const spec of specs) {
      const [name, target] = spec.split("=");
      const [route, selector] = target.split("@");
      await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForLoadState("load").catch(() => {});
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await page.waitForTimeout(600);
      const file = path.join(outDir, `${name}-${view.label}.png`);
      if (selector) {
        const element = page.locator(selector).first();
        await element.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await element.screenshot({ path: file });
      } else {
        await page.screenshot({ path: file });
      }
      console.log(file);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
