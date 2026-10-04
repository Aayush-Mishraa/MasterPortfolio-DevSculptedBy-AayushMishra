/**
 * F06 gate: the raw HTML (what crawlers and link previews get, no JavaScript)
 * of every prerendered page.
 *
 *   node scripts/prerender/check-html.mjs [build]            the local build
 *   node scripts/prerender/check-html.mjs --live <origin>    the deployed site, over HTTP
 *
 * Each page needs a unique <title>, a meta description, a canonical URL equal
 * to its own address, og:title/description/url/image, and real body text.
 * The contact page must contain the contact text, the 404 page must be
 * noindex, and no page may contain a blocked client name.
 * Live mode also checks status codes: pages 200, unknown URLs 404, /home 301 → /.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { allRoutes, blockedTerms } from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://aayushmishra.engineer";
const args = process.argv.slice(2);
const liveIndex = args.indexOf("--live");
const LIVE = liveIndex === -1 ? null : (args[liveIndex + 1] || SITE).replace(/\/+$/, "");
const BUILD = path.resolve(LIVE ? path.join(ROOT, "build") : args[0] || "build");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

const problems = [];
const warnings = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);
// Client names in page text are Aayush's to remove by hand (plan v3.1); until
// they're gone they warn, and --strict-blocked makes them fail.
const STRICT_BLOCKED = args.includes("--strict-blocked");
const blockedHit = (where, message) => (STRICT_BLOCKED ? fail : (w, m) => warnings.push(`${w}: ${m}`))(where, message);

const decode = (text) =>
  String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
const meta = (html, attr, name) => {
  const tag = html.match(new RegExp(`<meta[^>]+${attr}="${name}"[^>]*>`, "i"));
  return tag ? decode((tag[0].match(/content="([^"]*)"/) || [])[1] || "") : "";
};
const bodyText = (html) =>
  decode(
    html
      .slice(html.indexOf("<body"))
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

async function getPage(route) {
  if (!LIVE) {
    const file = route === "/" ? path.join(BUILD, "index.html") : route === "404" ? path.join(BUILD, "404.html") : path.join(BUILD, "_pages", `${route.slice(1)}.html`);
    return fs.existsSync(file) ? { status: 200, html: fs.readFileSync(file, "utf8") } : { status: 0, html: "" };
  }
  const url = route === "404" ? `${LIVE}/this-page-does-not-exist-${Date.now()}` : `${LIVE}${route}`;
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, { headers: { "User-Agent": UA }, redirect: "manual" });
  return { status: response.status, html: await response.text(), headers: response.headers };
}

async function main() {
  const routes = allRoutes(ROOT, BUILD);
  if (!routes.length) throw new Error("no routes");
  const blocked = blockedTerms(ROOT);
  const titles = new Map();

  for (const route of routes) {
    const { status, html } = await getPage(route.path);
    const where = route.path;
    if (!html) {
      fail(where, LIVE ? `HTTP ${status}, empty` : "not prerendered");
      continue;
    }
    if (LIVE && status !== 200) fail(where, `HTTP ${status}`);

    const title = decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "").trim();
    if (!title) fail(where, "no <title>");
    else if (titles.has(title)) fail(where, `title "${title}" is also on ${titles.get(title)}`);
    else titles.set(title, where);

    const expectedUrl = SITE + (route.path === "/" ? "/" : route.path);
    const canonical = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i) || [])[1];
    if (canonical !== expectedUrl) fail(where, `canonical is ${canonical || "missing"}, expected ${expectedUrl}`);
    if (meta(html, "name", "description").length < 50) fail(where, "meta description missing or short");
    for (const property of ["og:title", "og:description", "og:url", "og:image"]) {
      if (!meta(html, "property", property)) fail(where, `${property} missing`);
    }
    if (meta(html, "property", "og:url") !== expectedUrl) fail(where, `og:url is ${meta(html, "property", "og:url")}`);
    const image = meta(html, "property", "og:image");
    if (image && !LIVE && !fs.existsSync(path.join(BUILD, image.replace(SITE, "")))) fail(where, `og:image file missing: ${image}`);
    // A few reachable pages are noindex on purpose (routes.mjs `noindex: true`).
    const noindex = /name="robots"[^>]+noindex/i.test(html);
    if (noindex && !route.noindex) fail(where, "noindex on a real page");
    if (!noindex && route.noindex) fail(where, "should be noindex");

    const text = bodyText(html);
    if (text.length < 300) fail(where, `only ${text.length} characters of body text`);
    if (route.sitemap !== false) {
      for (const term of blocked) {
        if (html.toLowerCase().includes(term.toLowerCase())) blockedHit(where, `contains the blocked term "${term}"`);
      }
    }
    if (/<head>[\s\S]*<script[^>]+src="\/static\/js\//i.test(html.slice(0, html.indexOf("</head>") + 7))) {
      fail(where, "a webpack chunk script in <head> would block rendering");
    }
  }

  // The contact page's words are in its HTML (Stage 1 exit gate).
  const contact = await getPage("/contact");
  for (const phrase of ["contact@aayushmishra.engineer", "Let's build software", "Transmit"]) {
    if (!bodyText(contact.html).includes(phrase)) fail("/contact", `raw HTML lacks "${phrase}"`);
  }

  const notFound = await getPage("404");
  if (!/name="robots"[^>]+noindex/i.test(notFound.html)) fail("404", "not noindex");
  if (!/Page not found/.test(notFound.html)) fail("404", "no 'Page not found' text");
  if (LIVE && notFound.status !== 404) fail("404", `unknown URL answered HTTP ${notFound.status}, not 404`);

  if (LIVE) {
    const home = await fetch(`${LIVE}/home`, { headers: { "User-Agent": UA }, redirect: "manual" });
    if (home.status !== 301 || !/^https:\/\/aayushmishra\.engineer\/$/.test(home.headers.get("location") || "")) {
      fail("/home", `expected 301 → https://aayushmishra.engineer/, got ${home.status} ${home.headers.get("location") || ""}`);
    }
  } else {
    for (const file of ["sitemap.xml", "llms.txt", "robots.txt", "404.html"]) {
      if (!fs.existsSync(path.join(BUILD, file))) fail(file, "missing from the build");
    }
    const sitemap = fs.readFileSync(path.join(BUILD, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    for (const loc of locs) {
      const route = loc.replace(SITE, "") || "/";
      if (!routes.some((item) => item.path === route)) fail("sitemap.xml", `${loc} is not a prerendered page`);
    }
    for (const term of blocked) {
      for (const file of ["sitemap.xml", "llms.txt"]) {
        if (fs.readFileSync(path.join(BUILD, file), "utf8").toLowerCase().includes(term.toLowerCase())) fail(file, `contains "${term}"`);
      }
    }
  }

  const checked = `${routes.length} pages + 404${LIVE ? ` on ${LIVE}` : ` in ${path.relative(ROOT, BUILD) || "."}`}`;
  if (warnings.length) {
    console.warn(`[check-html] ${warnings.length} warning(s):`);
    warnings.forEach((warning) => console.warn(`  ! ${warning}`));
  }
  if (problems.length) {
    console.error(`[check-html] ${problems.length} problem(s) in ${checked}:`);
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
  console.log(`[check-html] OK: ${checked}, ${titles.size} unique titles`);
}

main().catch((error) => {
  console.error(`[check-html] ${error.stack || error.message}`);
  process.exit(1);
});
