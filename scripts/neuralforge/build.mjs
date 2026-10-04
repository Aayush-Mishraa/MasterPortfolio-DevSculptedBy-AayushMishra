/**
 * F30: builds NeuralForge for its own subdomain.
 *
 *   node scripts/neuralforge/build.mjs [--build build]
 *
 * Writes build/neuralforge/ (uploaded with the rest of build/ to
 * public_html/neuralforge, which hPanel uses as the document root of
 * neuralforge.aayushmishra.engineer):
 *
 *   index.html   public/tools/neuralforge.html with its own title, canonical
 *                and share tags, links to the main site made absolute, and
 *                the progress-sync script (neuralforge/nf-sync.js)
 *   nf-sync.js
 *   api/nf.php   a two-line wrapper around the main API's api/nf.php, so the
 *                sync calls stay same-origin on the subdomain
 *   .htaccess    no listing, no caching of the API, the app's own headers
 *
 * Run after the React build (which empties build/) and stage-api.
 */
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const buildIndex = args.indexOf("--build");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const BUILD = path.resolve(buildIndex === -1 ? path.join(ROOT, "build") : args[buildIndex + 1]);
const OUT = path.join(BUILD, "neuralforge");
const MAIN = "https://aayushmishra.engineer";
const SUB = "https://neuralforge.aayushmishra.engineer";
const LIVE = process.env.NEURALFORGE_LIVE === "1";

let html = fs.readFileSync(path.join(ROOT, "public", "tools", "neuralforge.html"), "utf8");

// Links to the main site (header, footer, field guides) become absolute; the app's own hash routes stay.
html = html.replace(/(\s)(href|src)="\/(?!\/)(?!learn\/)/g, `$1$2="${MAIN}/`);

const title = "NeuralForge · The SDET → AI Engineer path, free · by Aayush Mishra";
const description =
  "NeuralForge: a free 21-level path from SDET to AI engineer. Python, LLMs, RAG, agents, MCP, evals, AI testing and security, with labs and projects. Sign in with your email to sync progress.";
const head = [
  `<link rel="canonical" href="${SUB}/">`,
  `<meta name="description" content="${description}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:url" content="${SUB}/">`,
  `<meta property="og:title" content="${title}">`,
  `<meta property="og:description" content="${description}">`,
  `<meta property="og:image" content="${MAIN}/og/home.jpg">`,
  `<meta name="twitter:card" content="summary_large_image">`,
].join("\n");
html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
html = html.replace(/<link rel="canonical"[^>]*>\s*/g, "").replace(/<meta (name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g, "");
html = html.replace("</head>", `${head}\n</head>`);
html = html.replace("</body>", `<script src="nf-sync.js" defer></script>\n</body>`);

fs.mkdirSync(path.join(OUT, "api"), { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);
fs.copyFileSync(path.join(ROOT, "neuralforge", "nf-sync.js"), path.join(OUT, "nf-sync.js"));
fs.writeFileSync(
  path.join(OUT, "api", "nf.php"),
  "<?php\n\n// NeuralForge's sync API on its subdomain: the main site's api/nf.php (F30).\nrequire __DIR__ . '/../../api/nf.php';\n"
);
fs.writeFileSync(
  path.join(OUT, ".htaccess"),
  [
    "# NeuralForge (F30): the document root of neuralforge.aayushmishra.engineer.",
    "Options -Indexes -MultiViews",
    "DirectoryIndex index.html",
    "",
    "<IfModule mod_rewrite.c>",
    "  RewriteEngine On",
    "  # The sync API reads the session from Authorization",
    "  RewriteCond %{HTTP:Authorization} .",
    "  RewriteRule ^ - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]",
    // Once the subdomain answers (NEURALFORGE_LIVE=1 in the deploy), /neuralforge/ on the main domain moves there.
    ...(LIVE
      ? [
          "  # Opened on the main domain (/neuralforge/...): send it to the subdomain",
          "  RewriteCond %{HTTP_HOST} ^(www\\.)?aayushmishra\\.engineer$ [NC]",
          `  RewriteRule ^(.*)$ ${SUB}/$1 [R=301,L]`,
        ]
      : []),
    "</IfModule>",
    "",
    "<IfModule mod_headers.c>",
    '  <FilesMatch "\\.html$">',
    '    Header set Cache-Control "no-cache"',
    "  </FilesMatch>",
    '  <FilesMatch "\\.php$">',
    '    Header set Cache-Control "no-store, private, max-age=0"',
    '    Header set X-Robots-Tag "noindex, nofollow"',
    "  </FilesMatch>",
    '  Header always set X-Content-Type-Options "nosniff"',
    '  Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    "</IfModule>",
    "",
  ].join("\n")
);
console.log(`[neuralforge] built ${path.relative(ROOT, OUT)} (index.html ${Math.round(html.length / 1024)} KB, sync + API wrapper)`);
