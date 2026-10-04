/**
 * Every route the site serves as a real page: the top-level pages, one page
 * per repository in the build's GitHub snapshot, and one per Tech Universe
 * channel. The prerender writes each to build/_pages/<route>.html ("/" to
 * build/index.html), the sitemap lists the indexable ones, and anything not
 * listed here is a 404 on the server.
 */
import fs from "fs";
import path from "path";

export const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/experience", priority: 0.9, changefreq: "monthly" },
  { path: "/work", priority: 0.9, changefreq: "daily" },
  { path: "/services", priority: 1.0, changefreq: "monthly" },
  { path: "/hire-me", priority: 0.8, changefreq: "monthly" },
  { path: "/about", priority: 0.7, changefreq: "monthly" },
  { path: "/contact", priority: 0.8, changefreq: "yearly" },
  { path: "/automation-arsenal", priority: 0.8, changefreq: "monthly" },
  { path: "/work/open-source", priority: 0.7, changefreq: "daily" },
  { path: "/education", priority: 0.7, changefreq: "monthly" },
  { path: "/universe", priority: 0.5, changefreq: "daily" },
  // Stage 3 + 4
  { path: "/products", priority: 0.9, changefreq: "monthly" },
  { path: "/free-tools", priority: 0.8, changefreq: "monthly" },
  { path: "/starter-kit", priority: 0.7, changefreq: "monthly" },
  { path: "/mentoring", priority: 0.7, changefreq: "monthly" },
  { path: "/ask", priority: 0.5, changefreq: "monthly" },
  // Reachable, not advertised: a printable one-pager and the report shell (?id=…).
  { path: "/hire-me/kit", priority: 0.1, changefreq: "monthly", sitemap: false, llms: false, noindex: true },
  { path: "/free-tools/site-scanner/report", priority: 0.1, changefreq: "yearly", sitemap: false, llms: false, noindex: true },
];

/** Repository names from the snapshot that the build ships (build/data/github/index.json). */
export function projectRoutes(build) {
  const file = path.join(build, "data", "github", "index.json");
  if (!fs.existsSync(file)) return [];
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  return (snapshot.repos || []).map((repo) => ({
    path: `/projects/${repo.name}`,
    priority: repo.fork ? 0.2 : 0.6,
    changefreq: "weekly",
    lastmod: repo.pushed_at || repo.updated_at || null,
    // Forks are other people's code: reachable, not advertised.
    sitemap: !repo.fork,
  }));
}

/** One page per offer (F11), read from src/data/services.js. */
export function serviceRoutes(root) {
  const source = fs.readFileSync(path.join(root, "src", "data", "services.js"), "utf8");
  const block = source.slice(source.indexOf("export const SERVICES"), source.indexOf("export const PROCESS"));
  return [...block.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((match) => ({
    path: `/services/${match[1]}`,
    priority: 0.8,
    changefreq: "monthly",
  }));
}

/** One page per free tool (Stage 3 + 4), read from src/data/tools.js. */
export function toolRoutes(root) {
  const source = fs.readFileSync(path.join(root, "src", "data", "tools.js"), "utf8");
  return [...source.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((match) => ({
    path: `/free-tools/${match[1]}`,
    priority: 0.8,
    changefreq: "monthly",
  }));
}

/** Tech Universe channel ids, read from src/pages/universe/modules.js. */
export function universeRoutes(root) {
  const source = fs.readFileSync(path.join(root, "src", "pages", "universe", "modules.js"), "utf8");
  const block = source.slice(source.indexOf("export const MODULES"));
  return [...block.matchAll(/^\s{4}id: "([a-z0-9-]+)",$/gm)].map((match) => ({
    path: `/universe/${match[1]}`,
    priority: 0.4,
    changefreq: "daily",
  }));
}

/** Client names that must never be advertised (tests/fixtures/blocked-terms.txt). */
export function blockedTerms(root) {
  const file = path.join(root, "tests", "fixtures", "blocked-terms.txt");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function allRoutes(root, build) {
  const blocked = blockedTerms(root).map((term) => term.toLowerCase());
  const routes = [...STATIC_ROUTES, ...serviceRoutes(root), ...toolRoutes(root), ...projectRoutes(build), ...universeRoutes(root)];
  return routes.map((route) => {
    // Still reachable (the page exists), never listed in sitemap.xml or llms.txt.
    const hidden = blocked.some((term) => route.path.toLowerCase().includes(term));
    return { sitemap: true, lastmod: null, ...route, ...(hidden ? { sitemap: false, llms: false } : {}) };
  });
}

/** Where a route's HTML lives inside build/. */
export function outputFile(build, routePath) {
  if (routePath === "/") return path.join(build, "index.html");
  return path.join(build, "_pages", `${routePath.replace(/^\//, "")}.html`);
}

/** The Open Graph image for a route (must match ogImagePath() in src/components/seoHeader/SeoHeader.js). */
export function ogImageFile(routePath) {
  return `og/${routePath === "/" ? "home" : routePath.replace(/^\//, "")}.jpg`;
}
