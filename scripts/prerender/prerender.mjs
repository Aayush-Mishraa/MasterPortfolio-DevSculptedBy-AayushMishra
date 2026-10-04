/**
 * F06: prerender every route of the production build into real HTML.
 *
 *   node scripts/prerender/prerender.mjs [--build build] [--only /contact,/projects]
 *
 * Runs after `react-scripts build`. Serves build/ as a plain SPA, opens each
 * route in headless Chromium (reduced motion, so animations sit at their end
 * state) and saves the rendered document: build/index.html for /, and
 * build/_pages/<route>.html for the rest. A route that never appears here is a
 * real 404 on the server (public/.htaccess). Also writes build/404.html,
 * sitemap.xml, llms.txt and a 1200x630 Open Graph image per route.
 *
 * The prerendered HTML is what crawlers, link previews and the first paint
 * see. The app adopts it (hydrates) when it is the HTML of the URL being
 * opened, in the default theme and, for pages built from the GitHub snapshot,
 * with the same snapshot (data-snapshot); otherwise it renders over it
 * (src/index.js).
 */
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { allRoutes, outputFile, ogImageFile } from "./routes.mjs";
import { renderOgImages } from "./og-images.mjs";
import { writeSitemap, writeLlms } from "./seo-files.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const BUILD = path.resolve(option("build", "build"));
const ONLY = option("only", "");
const PORT = Number(process.env.PRERENDER_PORT || 4199);
const ORIGIN = `http://localhost:${PORT}`;
const SITE = "https://aayushmishra.engineer";
const NOT_FOUND_PROBE = "/__prerender-not-found__";

const log = (...parts) => console.log("[prerender]", ...parts);

// ---------------------------------------------------------------- server

function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, "scripts", "serve-build.mjs"), "--port", String(PORT), "--root", BUILD, "--spa"], {
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

// ---------------------------------------------------------------- capture

/**
 * Runs in the page: turns the live document into static HTML.
 * - CSS that styled-components / Styletron inserted through the CSSOM is
 *   written into its <style> tag (otherwise the tag is empty in HTML);
 * - scripts the app added at runtime go (webpack chunk tags in <head> would
 *   block rendering), the template's own scripts stay;
 * - the Font Awesome stylesheet goes back to its non-blocking media="print";
 * - the bundles load with defer;
 * - transient state on <html> (intro, Lenis) is dropped; the theme's CSS
 *   variables stay, so the page paints in the default theme.
 */
function serializeDocument({ templateScripts, snapshot }) {
  document.querySelectorAll("style").forEach((style) => {
    try {
      const rules = style.sheet ? Array.from(style.sheet.cssRules) : [];
      if (rules.length && !style.textContent.trim()) {
        style.textContent = rules.map((rule) => rule.cssText).join("\n");
      }
    } catch (error) {
      /* cross-origin sheet */
    }
  });
  document.querySelectorAll("script").forEach((script) => {
    const src = script.getAttribute("src");
    const type = script.getAttribute("type") || "";
    if (type === "application/ld+json") return;
    if (src && !templateScripts.includes(src)) script.remove();
  });
  document.querySelectorAll('link[onload*="this.media"]').forEach((link) => link.setAttribute("media", "print"));
  // The bundles needn't hold up the HTML parser: the page is already here.
  // (The inline webpack runtime still runs first and picks the chunks up.)
  document.querySelectorAll('body script[src^="/static/js/"]').forEach((script) => script.setAttribute("defer", ""));
  document.querySelectorAll(".intro, [data-prerender-skip]").forEach((node) => node.remove());
  const html = document.documentElement;
  html.classList.remove("intro-active", "intro-cover", "intro-gated", "lenis", "lenis-smooth", "lenis-stopped", "theme-pending");
  if (!html.className.trim()) html.removeAttribute("class");
  // Data the page renders from starts loading with the HTML (src/index.js waits for it).
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const preload = (href) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.crossOrigin = "anonymous";
    link.href = href;
    document.head.appendChild(link);
  };
  if (/^\/(projects|opensource)(\/|$)/.test(path)) preload("/data/github/index.json");
  const project = path.match(/^\/projects\/([^/]+)$/);
  if (project) preload(`/data/github/repos/${project[1]}.json`);
  // Which URL this HTML is, and which snapshot it shows: src/index.js hydrates only on a match.
  html.setAttribute("data-prerendered", location.pathname.replace(/\/+$/, "") || "/");
  if (snapshot) html.setAttribute("data-snapshot", snapshot);
  html.style.removeProperty("--page-bg");
  return "<!DOCTYPE html>\n" + html.outerHTML;
}

/** Waits for what each kind of page loads after its first render. */
async function waitForContent(page, route) {
  await page.waitForSelector("#root > *", { timeout: 20000 });
  await page.waitForFunction(() => document.fonts && document.fonts.status === "loaded", null, { timeout: 15000 }).catch(() => {});
  if (route === "/projects") {
    await page.waitForSelector(".pj-card:not(.pj-card--skeleton)", { timeout: 15000 });
  } else if (route.startsWith("/projects/")) {
    await page.waitForSelector(".pd-hero:not(.is-loading), .pd-missing", { timeout: 15000 });
    await page.waitForSelector("#commits .pd-commit, #commits .pj-empty-note", { timeout: 15000 }).catch(() => {});
  } else if (route === "/opensource") {
    await page.waitForSelector(".os-hud-value", { timeout: 15000 }).catch(() => {});
  }
  // Scroll the whole page once so sections that load near the viewport do.
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
}

/** The snapshot files a route renders from, as src/services/github/snapshotStore.js snapshotVersion() reports them. */
function snapshotStamp(route) {
  const stamp = (file) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(BUILD, "data", "github", file), "utf8")).generatedAt || "none";
    } catch (error) {
      return "none";
    }
  };
  const parts = [];
  if (/^\/(projects|opensource)(\/|$)/.test(route)) parts.push(stamp("index.json"));
  const project = route.match(/^\/projects\/([^/]+)$/);
  if (project) parts.push(stamp(`repos/${decodeURIComponent(project[1])}.json`));
  return parts.join(" ");
}

async function prerenderRoute(context, route, templateScripts) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(ORIGIN + route, { waitUntil: "load", timeout: 30000 });
    if (!response || response.status() >= 400) throw new Error(`HTTP ${response && response.status()}`);
    await waitForContent(page, route);
    const html = await page.evaluate(serializeDocument, { templateScripts, snapshot: snapshotStamp(route) });
    const title = await page.title();
    return { html, title, errors };
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------- main

async function main() {
  if (!fs.existsSync(path.join(BUILD, "index.html"))) throw new Error(`${BUILD}/index.html is missing: run the build first`);
  const template = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");
  const templateScripts = [...template.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((match) => match[1]);

  let routes = allRoutes(ROOT, BUILD);
  if (ONLY) {
    const wanted = ONLY.split(",");
    routes = routes.filter((route) => wanted.includes(route.path));
  }
  log(`${routes.length} routes`);

  const staging = path.join(BUILD, "_prerender");
  fs.rmSync(staging, { recursive: true, force: true });
  fs.rmSync(path.join(BUILD, "_pages"), { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Prerender",
  });
  await context.addInitScript(() => {
    window.__PRERENDER__ = true;
  });
  // Live third-party data (news, models, status feeds...) isn't baked into the
  // HTML: those requests are held, so the page captures its loading state.
  await context.route(/^https?:\/\/(?!localhost)/, (route) => {
    const type = route.request().resourceType();
    if (type === "fetch" || type === "xhr" || type === "websocket" || type === "eventsource") return; // never answered
    return route.continue();
  });

  const results = [];
  let failed = 0;
  try {
    const queue = [...routes, { path: NOT_FOUND_PROBE, notFound: true }];
    const workers = Array.from({ length: Number(process.env.PRERENDER_CONCURRENCY || 3) }, async () => {
      while (queue.length) {
        const route = queue.shift();
        const started = Date.now();
        try {
          const { html, title, errors } = await prerenderRoute(context, route.path, templateScripts);
          const target = route.notFound
            ? path.join(staging, "404.html")
            : path.join(staging, path.relative(BUILD, outputFile(BUILD, route.path)));
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, html);
          results.push({ ...route, title });
          log(`${route.path} → ${title} (${Date.now() - started} ms)${errors.length ? `  [${errors.length} page error(s): ${errors[0]}]` : ""}`);
        } catch (error) {
          failed += 1;
          console.error(`[prerender] FAILED ${route.path}: ${error.message}`);
        }
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
    server.kill();
  }

  if (failed) throw new Error(`${failed} route(s) failed`);

  // Move the pages into place (index.html last: the server used it as the shell).
  for (const entry of fs.readdirSync(staging, { withFileTypes: true })) {
    fs.renameSync(path.join(staging, entry.name), path.join(BUILD, entry.name === "index.html" ? "index.html.prerendered" : entry.name));
  }
  fs.rmSync(staging, { recursive: true, force: true });
  if (fs.existsSync(path.join(BUILD, "index.html.prerendered"))) {
    fs.renameSync(path.join(BUILD, "index.html.prerendered"), path.join(BUILD, "index.html"));
  }

  const pages = results.filter((route) => !route.notFound);
  if (!ONLY) {
    writeSitemap(BUILD, SITE, pages);
    writeLlms(BUILD, SITE, pages);
  }
  await renderOgImages(BUILD, pages.map((route) => ({ ...route, image: ogImageFile(route.path) })));
  log(`done: ${pages.length} pages + 404`);
}

main().catch((error) => {
  console.error(`[prerender] ${error.stack || error.message}`);
  process.exit(1);
});
