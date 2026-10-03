/**
 * A tiny static server for the production build, for tests and the prerender
 * step. It serves build/ the way public/.htaccess does on Hostinger closely
 * enough for those jobs; the HTTP-level checks (404 status, redirects, headers)
 * run against real Apache instead (see tests/server/).
 *
 *   node scripts/serve-build.mjs [--port 4173] [--root build] [--spa]
 *
 * --spa  serve index.html for every unknown path (what the prerender needs,
 *        before any prerendered page exists; also the default for a build
 *        with no _pages/ folder). Otherwise a prerendered page
 *        (_pages/<route>.html) wins and unknown paths get 404.html with a 404.
 */
import http from "http";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const PORT = Number(option("port", process.env.PORT || 4173));
const ROOT = path.resolve(option("root", "build"));
// A build without prerendered pages (no _pages/) is a plain SPA.
const SPA = args.includes("--spa") || !fs.existsSync(path.join(ROOT, "_pages"));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".map": "application/json",
};

const isFile = (file) => {
  try {
    return fs.statSync(file).isFile();
  } catch (error) {
    return false;
  }
};

const send = (res, status, file, extraHeaders = {}) => {
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": type.startsWith("text/html") ? "no-cache" : "public, max-age=60",
    ...extraHeaders,
  });
  fs.createReadStream(file).pipe(res);
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (error) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  // No path traversal out of the build folder.
  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (pathname !== "/" && isFile(file)) return send(res, 200, file);
  if (pathname === "/" && isFile(path.join(ROOT, "index.html"))) return send(res, 200, path.join(ROOT, "index.html"));

  const route = pathname.replace(/\/+$/, "");
  if (route === "/home") {
    res.writeHead(301, { Location: "/" });
    res.end();
    return;
  }

  const prerendered = path.join(ROOT, "_pages", `${route}.html`);
  if (!SPA && isFile(prerendered)) return send(res, 200, prerendered);

  // Known client-side routes that are never prerendered.
  if (SPA || route === "/splash") return send(res, 200, path.join(ROOT, "index.html"));

  const notFound = path.join(ROOT, "404.html");
  if (isFile(notFound)) return send(res, 404, notFound);
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[serve-build] ${ROOT} on http://localhost:${PORT}${SPA ? " (SPA fallback)" : ""}`);
});
