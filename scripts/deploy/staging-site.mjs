/**
 * Turns a finished build into the staging site (staging.aayushmishra.engineer,
 * served from public_html/staging).
 *
 *   node scripts/deploy/staging-site.mjs [--build build]
 *
 * - The whole site sits behind an HTTP Basic login (the .htpasswd is written
 *   by the staging deploy, outside the web root).
 * - Nothing is indexed: X-Robots-Tag on every response, robots.txt disallows all.
 * - It answers only on the staging host: the same files opened as
 *   aayushmishra.engineer/staging/... get a 403.
 * - The redirects in .htaccess point at the staging host, not production.
 *
 * Production builds never run this.
 */
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const buildIndex = args.indexOf("--build");
const BUILD = path.resolve(buildIndex === -1 ? "build" : args[buildIndex + 1]);
const HOST = process.env.STAGING_HOST || "staging.aayushmishra.engineer";
// The hosting account's home folder (hPanel → Subdomains shows the full path).
const HTPASSWD = process.env.STAGING_HTPASSWD_PATH || "/home/u778141320/domains/aayushmishra.engineer/private/staging.htpasswd";

const file = path.join(BUILD, ".htaccess");
let htaccess = fs.readFileSync(file, "utf8");

// Redirects stay on the staging host.
htaccess = htaccess.replace(/https:\/\/aayushmishra\.engineer/g, `https://${HOST}`);

// Staging-only host, before any other rewrite.
const hostPattern = HOST.replace(/\./g, "\\.");
htaccess = htaccess.replace(
  /RewriteBase \/\r?\n/,
  (match) => `${match}\n  # STAGING: only on ${HOST} (not as aayushmishra.engineer/staging/)\n  RewriteCond %{HTTP_HOST} !^${hostPattern}$ [NC]\n  RewriteRule ^ - [F,L]\n`
);

const header = [
  "# ------------------------------------------------------------------",
  `# STAGING (${HOST}): password-protected and never indexed.`,
  "# Written by scripts/deploy/staging-site.mjs; production never has this.",
  "# ------------------------------------------------------------------",
  "AuthType Basic",
  'AuthName "Staging: aayushmishra.engineer"',
  `AuthUserFile ${HTPASSWD}`,
  "Require valid-user",
  "",
  "<IfModule mod_headers.c>",
  '  Header always set X-Robots-Tag "noindex, nofollow"',
  "</IfModule>",
  "",
].join("\n");
fs.writeFileSync(file, `${header}\n${htaccess}`);

fs.writeFileSync(path.join(BUILD, "robots.txt"), "# Staging: nothing here is for search engines.\nUser-agent: *\nDisallow: /\n");

if (!htaccess.includes("RewriteRule ^ - [F,L]")) {
  console.error("[staging] couldn't add the host check to .htaccess (RewriteBase line not found)");
  process.exit(1);
}
console.log(`[staging] ${path.relative(process.cwd(), BUILD)} is now the staging site for ${HOST} (Basic login, noindex, host-locked)`);
