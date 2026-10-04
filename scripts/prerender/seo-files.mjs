/**
 * sitemap.xml and llms.txt, built from the routes that were prerendered (so
 * both list exactly the pages that exist) and from each page's own title and
 * description.
 */
import fs from "fs";
import path from "path";
import { pageMeta } from "./og-images.mjs";

const xml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function metaFor(build, routePath) {
  const file = routePath === "/" ? path.join(build, "index.html") : path.join(build, "_pages", `${routePath.slice(1)}.html`);
  return fs.existsSync(file) ? pageMeta(fs.readFileSync(file, "utf8")) : { title: routePath, description: "" };
}

export function writeSitemap(build, site, routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .filter((route) => route.sitemap !== false)
    .map((route) => {
      const lastmod = (route.lastmod || today).slice(0, 10);
      return [
        "  <url>",
        `    <loc>${xml(site + (route.path === "/" ? "/" : route.path))}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq || "monthly"}</changefreq>`,
        `    <priority>${Number(route.priority || 0.5).toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n");
    });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(build, "sitemap.xml"), body);
  console.log(`[prerender] sitemap.xml: ${urls.length} URLs`);
}

export function writeLlms(build, site, routes) {
  const home = metaFor(build, "/");
  const line = (route) => {
    const meta = metaFor(build, route.path);
    const name = meta.title.split(" · ")[0];
    return `- [${name}](${site}${route.path === "/" ? "/" : route.path})${meta.description ? `: ${meta.description}` : ""}`;
  };
  const listed = routes.filter((route) => route.llms !== false);
  // Top-level pages and the pages under Work (Open Source, case studies); repos and channels get their own lists.
  const top = listed.filter((route) => route.path !== "/" && !/^\/(projects|universe|services)\//.test(route.path));
  const services = listed.filter((route) => route.path.startsWith("/services/"));
  const projects = listed.filter((route) => route.path.startsWith("/projects/") && route.sitemap !== false);
  const universe = listed.filter((route) => route.path.startsWith("/universe/"));

  const text = [
    `# ${home.title}`,
    "",
    `> ${home.description}`,
    "",
    "Aayush Mishra is a Senior SDET and QA lead based in India. He builds test automation frameworks (Playwright, Selenium, REST Assured, Postman/Newman), CI quality gates and AI-assisted testing, and leads QA teams. The site's facts come from his own portfolio data and a build-time snapshot of his public GitHub repositories.",
    "",
    "## Pages",
    line({ path: "/" }),
    ...top.map(line),
    "",
    "## Services (QA offers, with prices)",
    ...services.map(line),
    "",
    "## Projects (public GitHub repositories)",
    ...projects.map(line),
    "",
    "## Tech Universe (live tech feeds)",
    ...universe.map(line),
    "",
    "## Contact",
    "- Email: contact@aayushmishra.engineer",
    `- Contact form: ${site}/contact (replies within 24 hours, IST working hours)`,
    "- GitHub: https://github.com/Aayush-Mishraa",
    "- LinkedIn: https://www.linkedin.com/in/aayushmishra33/",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(build, "llms.txt"), text);
  console.log(`[prerender] llms.txt: ${text.length} bytes`);
}
