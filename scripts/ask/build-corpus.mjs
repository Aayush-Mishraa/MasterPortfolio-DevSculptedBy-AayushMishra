/**
 * F31: builds the site assistant's knowledge from the prerendered pages.
 *
 *   node scripts/ask/build-corpus.mjs [--build build]
 *
 * Run after the prerender and stage-api (the build empties build/api). Reads
 * the main text of every page that's meant to be public (no Tech Universe
 * channels, no forks, no blocked client names, no scan reports), splits it
 * into ~700-character passages and writes build/api/data/ask-corpus.json.
 * The assistant can only answer from what lands here.
 */
import fs from "fs";
import path from "path";
import { blockedTerms } from "../prerender/routes.mjs";

const args = process.argv.slice(2);
const buildIndex = args.indexOf("--build");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const BUILD = path.resolve(buildIndex === -1 ? path.join(ROOT, "build") : args[buildIndex + 1]);
const OUT = path.join(BUILD, "api", "data", "ask-corpus.json");
const CHUNK = 700;

// /ask itself is skipped: its example questions would match every question.
const SKIP = [/^\/universe(\/|$)/, /^\/free-tools\/site-scanner\/report$/, /^\/splash$/, /^\/ask$/];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…", middot: "·" };
const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);

function mainText(html) {
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf("</main>");
  let body = start >= 0 && end > start ? html.slice(start, end) : html;
  body = body
    .replace(/<(script|style|svg|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+aria-hidden="true"[^>]*>[\s\S]*?<\/(span|div|i)>/gi, " ")
    .replace(/<\/(p|li|h[1-6]|div|section|dd|dt|tr|blockquote|summary)>/gi, ". ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decode(body)
    .replace(/\s+/g, " ")
    .replace(/(\s*\.\s*){2,}/g, ". ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function chunks(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 1);
  const out = [];
  let current = [];
  let length = 0;
  for (const sentence of sentences) {
    if (length + sentence.length > CHUNK && current.length) {
      out.push(current.join(" "));
      current = current.slice(-1); // one sentence of overlap
      length = current.join(" ").length;
    }
    current.push(sentence);
    length += sentence.length + 1;
  }
  if (current.length) out.push(current.join(" "));
  return out.filter((chunk) => chunk.length > 80);
}

function pages() {
  const list = [];
  const walk = (dir, prefix) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, `${prefix}/${entry.name}`);
      else if (entry.name.endsWith(".html")) list.push({ route: `${prefix}/${entry.name.replace(/\.html$/, "")}`, file: full });
    }
  };
  walk(path.join(BUILD, "_pages"), "");
  if (fs.existsSync(path.join(BUILD, "index.html"))) list.push({ route: "/", file: path.join(BUILD, "index.html") });
  return list;
}

function forks() {
  const file = path.join(BUILD, "data", "github", "index.json");
  if (!fs.existsSync(file)) return new Set();
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  return new Set((snapshot.repos || []).filter((repo) => repo.fork).map((repo) => `/projects/${repo.name}`));
}

const blocked = blockedTerms(ROOT).map((term) => term.toLowerCase());
const forked = forks();
const out = [];
for (const { route, file } of pages()) {
  if (SKIP.some((pattern) => pattern.test(route)) || forked.has(route)) continue;
  const html = fs.readFileSync(file, "utf8");
  if (/<meta name="robots" content="noindex/i.test(html)) continue;
  const title = decode((html.match(/<title>([^<]*)<\/title>/i) || [, route])[1]).replace(/\s*·\s*Aayush Mishra.*$/, "").trim();
  for (const text of chunks(mainText(html))) {
    if (blocked.some((term) => text.toLowerCase().includes(term) || route.toLowerCase().includes(term))) continue;
    out.push({ title, url: route, text });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ built_at: new Date().toISOString(), chunks: out }));
console.log(`[ask] ${out.length} passages from ${new Set(out.map((chunk) => chunk.url)).size} pages → ${path.relative(ROOT, OUT)}`);
