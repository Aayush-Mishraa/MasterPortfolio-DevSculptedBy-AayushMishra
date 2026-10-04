/**
 * A 1200x630 Open Graph image per route, drawn from the page's own title and
 * description (read from its prerendered HTML) in the site's light-blue
 * "release report" style. Written to build/og/<route>.jpg.
 */
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const escape = (text) =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const decode = (text) =>
  String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

export function pageMeta(html) {
  const title = decode((html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || "").trim();
  const description = decode((html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/) || [])[1] || "").trim();
  return { title, description };
}

function card({ title, description, route }) {
  const [headline, ...rest] = title.split(" · ");
  const kicker = route === "/" ? "aayushmishra.engineer" : `aayushmishra.engineer${route}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: local("Inter"), local("Inter Regular"); }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 85% 15%, #cfeafb 0, transparent 45%), linear-gradient(135deg, #edf9fe 0%, #dbeefb 100%);
      color: #001c55; display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; position: relative; overflow: hidden; }
    body::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(0,28,85,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,28,85,.05) 1px, transparent 1px); background-size: 40px 40px; }
    .top, .bottom, h1, p { position: relative; }
    .top { display: flex; justify-content: space-between; align-items: center; font: 500 22px/1 "JetBrains Mono", Consolas, monospace; color: #0e6ba8; }
    .pass { display: inline-flex; gap: 10px; align-items: center; padding: 10px 18px; border-radius: 999px; background: #e6f6ee; color: #0a7a46; font-weight: 600; }
    .pass::before { content: "✓"; }
    h1 { font-size: ${headline.length > 38 ? 58 : 72}px; line-height: 1.05; letter-spacing: -0.03em; font-weight: 800; max-width: 1000px; }
    p { margin-top: 22px; font-size: 26px; line-height: 1.4; color: #29466f; max-width: 980px;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .bottom { display: flex; justify-content: space-between; align-items: flex-end; font-size: 24px; color: #29466f; }
    .bottom strong { color: #001c55; font-size: 28px; }
  </style></head><body>
    <div class="top"><span>${escape(kicker)}</span><span class="pass">signed off</span></div>
    <div><h1>${escape(headline)}</h1>${description ? `<p>${escape(description)}</p>` : ""}</div>
    <div class="bottom"><span><strong>Aayush Mishra</strong> · Senior SDET &amp; QA Lead</span><span>${escape(rest.filter((part) => part !== "Aayush Mishra").join(" · "))}</span></div>
  </body></html>`;
}

/** @param {Array<{path: string, image: string}>} routes */
export async function renderOgImages(build, routes) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (const route of routes) {
      const file = route.path === "/" ? path.join(build, "index.html") : path.join(build, "_pages", `${route.path.slice(1)}.html`);
      if (!fs.existsSync(file)) continue;
      const meta = pageMeta(fs.readFileSync(file, "utf8"));
      await page.setContent(card({ ...meta, route: route.path }), { waitUntil: "load" });
      const target = path.join(build, route.image);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await page.screenshot({ path: target, type: "jpeg", quality: 88 });
    }
  } finally {
    await browser.close();
  }
  console.log(`[prerender] ${routes.length} Open Graph images in ${path.join(build, "og")}`);
}
