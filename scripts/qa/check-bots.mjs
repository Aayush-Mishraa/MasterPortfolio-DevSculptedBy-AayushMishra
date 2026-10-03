/**
 * F08: can crawlers and server-to-server callers reach the site?
 *
 *   node scripts/qa/check-bots.mjs [base-url]      (default https://aayushmishra.engineer)
 *
 * Fetches a page with each crawler's user agent and expects a 200 with the real
 * page (not a challenge). Also checks that /api/ answers server user agents
 * (Cal.com and Buttondown webhooks, GitHub Actions) once the backend exists.
 * Exits 1 if any required check fails. Hostinger's CDN decides per user agent
 * and per IP, so run it both locally and from CI.
 */
const BASE = (process.argv[2] || process.env.BASE_URL || "https://aayushmishra.engineer").replace(/\/+$/, "");

// required: true = must get 200; false = reported only
const CRAWLERS = [
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true],
  ["Googlebot smartphone", "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true],
  ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", true],
  ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)", true],
  ["OAI-SearchBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot", true],
  ["ChatGPT-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot", true],
  ["ClaudeBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)", true],
  ["Claude-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)", true],
  ["Claude-SearchBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +Claude-SearchBot@anthropic.com)", true],
  ["PerplexityBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)", true],
  ["Perplexity-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)", true],
  ["Applebot", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)", true],
  ["CCBot", "CCBot/2.0 (https://commoncrawl.org/faq/)", true],
  ["Chrome (a visitor)", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36", true],
];

// Webhook senders and CI: they call /api/, never the pages.
const SERVERS = [
  ["Cal.com webhook (undici)", "undici"],
  ["Buttondown webhook (python-requests)", "python-requests/2.32.3"],
  ["GitHub Actions (curl)", "curl/8.5.0"],
  ["Go HTTP client", "Go-http-client/1.1"],
];

const CHALLENGE = /checking your browser|verifying (that )?you are (not a robot|human)|just a moment|captcha/i;

async function probe(url, userAgent) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "*/*" }, redirect: "manual" });
    const body = await response.text();
    return { status: response.status, body, ms: Date.now() - started, headers: response.headers };
  } catch (error) {
    return { status: 0, body: String(error.message || error), ms: Date.now() - started, headers: new Headers() };
  }
}

const rows = [];
let failed = 0;

for (const [name, userAgent, required] of CRAWLERS) {
  const result = await probe(`${BASE}/contact`, userAgent);
  const realPage = result.status === 200 && /id="root"/.test(result.body) && !CHALLENGE.test(result.body);
  const ok = realPage;
  if (!ok && required) failed += 1;
  rows.push([ok ? "PASS" : required ? "FAIL" : "warn", name, result.status, `${result.ms}ms`, ok ? "page" : CHALLENGE.test(result.body) ? "challenge page" : "blocked"]);
}

// The backend (F02+): /api/health.php must answer server user agents with JSON.
const health = await probe(`${BASE}/api/health.php`, "curl/8.5.0");
const hasApi = health.status !== 404 && /application\/json/.test(health.headers.get("content-type") || "");
for (const [name, userAgent] of SERVERS) {
  if (!hasApi) {
    rows.push(["skip", `${name} → /api/health.php`, health.status, "", "no backend deployed yet"]);
    continue;
  }
  const result = await probe(`${BASE}/api/health.php`, userAgent);
  const json = /application\/json/.test(result.headers.get("content-type") || "") && !CHALLENGE.test(result.body);
  const ok = result.status === 200 && json;
  if (!ok) failed += 1;
  rows.push([ok ? "PASS" : "FAIL", `${name} → /api/health.php`, result.status, `${result.ms}ms`, ok ? "json" : "blocked"]);
}

const widths = [4, 44, 6, 8, 24];
const line = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join("  ");
console.log(`Bot access check for ${BASE}  (${new Date().toISOString()})\n`);
console.log(line(["", "user agent", "status", "time", "result"]));
rows.forEach((row) => console.log(line(row)));
console.log(`\n${failed ? `${failed} check(s) failed` : "all required checks passed"}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const fs = await import("fs");
  const table = ["| | User agent | Status | Time | Result |", "|---|---|---|---|---|", ...rows.map((row) => `| ${row.join(" | ")} |`)];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Bot access: ${BASE}\n\n${table.join("\n")}\n`);
}

process.exit(failed ? 1 : 0);
