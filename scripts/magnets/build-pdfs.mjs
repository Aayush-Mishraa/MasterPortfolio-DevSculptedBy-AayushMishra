/**
 * Stage 3: renders the PDFs the site hands out.
 *
 *   node scripts/magnets/build-pdfs.mjs [--build build]
 *
 *   build/api/assets/release-readiness-checklist.pdf   F20, from src/data/checklist.js,
 *       served only through api/download.php's signed links (api/assets is closed to the web)
 *   build/aayush-mishra-recruiter-kit.pdf               F26, the /hire-me/kit page printed to A4
 *
 * Run after the prerender and stage-api (the build empties build/api). Uses
 * the same Chromium as the prerender.
 */
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const buildIndex = args.indexOf("--build");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const BUILD = path.resolve(buildIndex === -1 ? path.join(ROOT, "build") : args[buildIndex + 1]);
const PORT = Number(process.env.PDF_PORT || 4198);

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** src/data/checklist.js has no imports, so it loads as a module straight from its source. */
async function loadChecklist() {
  const source = fs.readFileSync(path.join(ROOT, "src", "data", "checklist.js"), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function checklistHtml({ CHECKLIST, CHECKLIST_COUNT, CHECKLIST_VERSION }) {
  const sections = CHECKLIST.map(
    (section, index) => `
    <section>
      <h2><span>${String(index + 1).padStart(2, "0")}</span> ${esc(section.title)}</h2>
      <ol start="${CHECKLIST.slice(0, index).reduce((sum, item) => sum + item.items.length, 0) + 1}">
        ${section.items.map((item) => `<li><i></i><p>${esc(item)}</p></li>`).join("")}
      </ol>
    </section>`
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Release Readiness Checklist</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10pt/1.45 "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif; color: #111827; }
  header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px; border-bottom: 3px solid #111827; margin-bottom: 14px; }
  header h1 { margin: 0; font-size: 22pt; letter-spacing: -0.02em; }
  header p { margin: 4px 0 0; color: #4b5563; }
  header .by { text-align: right; font-size: 9pt; color: #4b5563; }
  header .by strong { display: block; color: #111827; font-size: 10pt; }
  .how { margin: 0 0 14px; padding: 8px 12px; border-left: 3px solid #15803d; background: #f0fdf4; font-size: 9.5pt; }
  .grid { columns: 2; column-gap: 18px; }
  section { break-inside: avoid; margin-bottom: 12px; }
  h2 { margin: 0 0 6px; font-size: 11.5pt; }
  h2 span { font-family: Consolas, monospace; color: #15803d; margin-right: 4px; }
  ol { margin: 0; padding: 0; list-style: none; counter-reset: none; }
  li { display: flex; gap: 8px; margin: 0 0 5px; }
  li i { flex: none; width: 11px; height: 11px; margin-top: 3px; border: 1.5px solid #111827; border-radius: 2px; }
  li p { margin: 0; }
  footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 8.5pt; color: #4b5563; display: flex; justify-content: space-between; }
</style></head><body>
<header>
  <div><h1>Release Readiness Checklist</h1><p>${CHECKLIST_COUNT} checks to run before you ship · ${esc(CHECKLIST_VERSION)}</p></div>
  <div class="by"><strong>Aayush Mishra</strong>Senior SDET &amp; QA Lead<br>aayushmishra.engineer</div>
</header>
<p class="how">Tick what's true for this release. Anything you can't tick is either a risk you accept in writing (with an owner), or a reason to wait. The goal isn't ${CHECKLIST_COUNT} ticks: it's no surprises.</p>
<div class="grid">${sections}</div>
<footer><span>Free to share and use in your team. © Aayush Mishra</span><span>Want a second pair of eyes? aayushmishra.engineer/services/release-review</span></footer>
</body></html>`;
}

function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, "scripts", "serve-build.mjs"), "--port", String(PORT), "--root", BUILD], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("static server didn't start")), 15000);
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("http://localhost")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on("exit", (code) => reject(new Error(`static server exited (${code})`)));
  });
}

async function main() {
  const browser = await chromium.launch();
  try {
    // F20: the checklist
    const checklist = await loadChecklist();
    const page = await browser.newPage();
    await page.setContent(checklistHtml(checklist), { waitUntil: "load" });
    const assets = path.join(BUILD, "api", "assets");
    fs.mkdirSync(assets, { recursive: true });
    await page.pdf({ path: path.join(assets, "release-readiness-checklist.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
    await page.close();
    console.log(`[pdfs] ${checklist.CHECKLIST_COUNT}-point checklist → build/api/assets/release-readiness-checklist.pdf`);

    // F26: the recruiter one-pager, printed from the real page
    if (!fs.existsSync(path.join(BUILD, "index.html"))) {
      console.log("[pdfs] no build/index.html: skipped the recruiter kit");
      return;
    }
    const server = await startServer();
    try {
      const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1000, height: 1400 } });
      // Same flag as the prerender: no intro, no live third-party data.
      await context.addInitScript(() => {
        window.__PRERENDER__ = true;
      });
      const kit = await context.newPage();
      await kit.goto(`http://localhost:${PORT}/hire-me/kit`, { waitUntil: "networkidle", timeout: 60000 });
      await kit.waitForSelector(".rk-sheet", { timeout: 30000 });
      await kit.emulateMedia({ media: "print" });
      const out = path.join(BUILD, "aayush-mishra-recruiter-kit.pdf");
      await kit.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
      const pages = (fs.readFileSync(out, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
      console.log(`[pdfs] recruiter kit → build/aayush-mishra-recruiter-kit.pdf (${pages} page${pages === 1 ? "" : "s"})`);
      if (pages > 1) console.log("[pdfs] warning: the recruiter kit should fit on one page");
      await context.close();
    } finally {
      server.kill();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`[pdfs] ${error.stack || error}`);
  process.exit(1);
});
