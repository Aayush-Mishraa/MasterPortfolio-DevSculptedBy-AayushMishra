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
  { path: "/projects", priority: 0.9, changefreq: "daily" },
  { path: "/contact", priority: 0.8, changefreq: "yearly" },
  { path: "/automation-arsenal", priority: 0.8, changefreq: "monthly" },
  { path: "/opensource", priority: 0.7, changefreq: "daily" },
  { path: "/education", priority: 0.7, changefreq: "monthly" },
  { path: "/universe", priority: 0.5, changefreq: "daily" },
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
  const routes = [...STATIC_ROUTES, ...projectRoutes(build), ...universeRoutes(root)];
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
