/**
 * Films the real website for "Signed Off", the recruiter-brief film on the
 * home page. Every frame is the live site: stills of the pages, and two clips
 * of its own animations (the Open Source contribution skyline rising, the
 * Automation Arsenal orbit), filmed in slow motion for smooth frames.
 *
 * Run it against the dev server whenever the pages change:
 *   npm start                                   (in another terminal)
 *   npm i --no-save playwright-core
 *   node scripts/film/capture-footage.mjs [http://localhost:3000]
 *
 * Needs ffmpeg with libx264 and libwebp on PATH (or FFMPEG=/path/to/ffmpeg).
 * CHROME_PATH picks the browser (default: Playwright's Chromium). THEME picks
 * the site theme to film in (default: amoled).
 *
 * Output: src/assets/film/site-*.webp, site-*.webm + .mp4, report.webp
 */
import { createRequire } from "module";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const OUT = path.resolve("src/assets/film");
const THEME = process.env.THEME || "amoled";
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const VIEWPORT = { width: 1440, height: 900 };
const FPS = 24;
const SLOW = 0.1; // CSS animations run at a tenth of their speed while filming
const REPORT_URL =
  "https://raw.githubusercontent.com/Aayush-Mishraa/Phoenix-Inwarranty-Flow-API-Tests-/static-content/Report.png";

const chromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), ".cache"), "ms-playwright");
  const builds = fs.existsSync(root) ? fs.readdirSync(root).filter((name) => /^chromium-\d+$/.test(name)) : [];
  const latest = builds.sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))[0];
  return latest ? path.join(root, latest, "chrome-win64", "chrome.exe") : undefined;
};

const ffmpeg = (args) => {
  const run = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
};

const kb = (file) => `${Math.round(fs.statSync(file).size / 1024)} KB`;

const still = (png, name, width = 1440) => {
  const file = path.join(OUT, `${name}.webp`);
  ffmpeg(["-i", png, "-vf", `scale=${width}:-2:flags=lanczos`, "-c:v", "libwebp", "-quality", "74", file]);
  console.log(`  ${name}.webp  ${kb(file)}`);
};

// Each clip twice: H.264 MP4 (hardware-decoded by every mainstream browser)
// and VP9 WebM for builds without H.264. The page offers the MP4 first.
const clip = (dir, name) => {
  const input = ["-framerate", String(FPS), "-i", path.join(dir, "%04d.jpg")];
  const scale = ["-vf", "scale=1280:-2:flags=lanczos,format=yuv420p", "-an"];
  const webm = path.join(OUT, `${name}.webm`);
  ffmpeg([
    ...input,
    ...scale,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "33",
    "-row-mt",
    "1",
    "-deadline",
    "good",
    webm,
  ]);
  const mp4 = path.join(OUT, `${name}.mp4`);
  ffmpeg([
    ...input,
    ...scale,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "22",
    "-profile:v",
    "high",
    "-movflags",
    "+faststart",
    mp4,
  ]);
  console.log(`  ${name}.webm  ${kb(webm)}   ${name}.mp4  ${kb(mp4)}`);
};

async function open(browser, route) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  await context.addInitScript((theme) => localStorage.setItem("portfolioTheme", theme), THEME);
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(3500);
  return page;
}

// Jump (not smooth-scroll) to an element, leaving `offset` px above it.
const jumpTo = (page, selector, offset = 0) =>
  page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      const top = el ? el.getBoundingClientRect().top + window.scrollY - off : 0;
      if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
      window.scrollTo({ top, behavior: "instant" });
    },
    [selector, offset]
  );

// Films `seconds` of the page's CSS animation, slowed down so every frame
// lands on time, then encodes it.
async function film(page, name, seconds, trigger) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `film-${name}-`));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: SLOW });
  if (trigger) await trigger();
  const frames = Math.round(seconds * FPS);
  const step = 1000 / FPS / SLOW;
  const start = Date.now();
  for (let i = 0; i < frames; i++) {
    const wait = start + i * step - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
  }
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
  clip(dir, name);
  // The poster is a late frame: what the clip settles on.
  still(path.join(dir, `${String(Math.round(frames * 0.85)).padStart(4, "0")}.jpg`), `${name}-poster`, 1280);
  fs.rmSync(dir, { recursive: true, force: true });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "film-stills-"));
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true });
  const shot = async (page, name) => {
    const png = path.join(tmp, `${name}.png`);
    await page.screenshot({ path: png });
    still(png, name);
  };

  console.log(`Filming ${BASE} in the "${THEME}" theme`);

  let page = await open(browser, "/home");
  await shot(page, "site-home");
  await page.context().close();

  // The skyline rises when it scrolls into view: film from that moment.
  page = await open(browser, "/opensource");
  await film(page, "site-skyline", 2.6, () => jumpTo(page, "#os-skyline", 40));
  await page.context().close();

  page = await open(browser, "/automation-arsenal");
  await film(page, "site-orbit", 2.5);
  await page.context().close();

  page = await open(browser, "/universe");
  await shot(page, "site-universe");
  await page.context().close();

  page = await open(browser, "/projects");
  await shot(page, "site-projects");
  await page.context().close();

  await browser.close();

  // A real test report, from the Phoenix API suite's README.
  const report = path.join(tmp, "report.png");
  const response = await fetch(REPORT_URL);
  if (response.ok) {
    fs.writeFileSync(report, Buffer.from(await response.arrayBuffer()));
    still(report, "report", 1280);
  } else {
    console.warn(`  report.png: HTTP ${response.status}, kept the previous one`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("Done.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
