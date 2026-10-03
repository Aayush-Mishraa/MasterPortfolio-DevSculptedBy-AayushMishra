import { test, expect } from "./fixtures";

// F08: every approved crawler is allowed, and none of them crawls the API,
// the admin area or the intro replay route.
const APPROVED = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
];

test("robots.txt allows the approved crawlers", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const text = await response.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  for (const bot of APPROVED) expect(lines).toContain(`User-agent: ${bot}`);
  expect(lines).toContain("Allow: /");
  for (const path of ["/api/", "/admin/", "/splash"]) expect(lines).toContain(`Disallow: ${path}`);
  expect(lines).toContain("Sitemap: https://aayushmishra.engineer/sitemap.xml");
  // One group: nobody is singled out with a stricter rule set.
  expect(lines.filter((line) => /^Disallow:\s*\/\s*$/.test(line))).toEqual([]);
});
