/**
 * The bug log: real fixes from the GitHub snapshot, for the home page's film
 * and recruiter brief.
 *
 * Reads the per-repo snapshots written by fetch_projects_snapshot.mjs and keeps
 * the commits that are fixes, authored by me, in my own (non-fork) repos. The
 * count covers every such fix; the list is curated for reading: vague messages
 * ("Fix some code") are left out and test-related fixes rank first.
 *
 * Output: src/shared/opensource/bug_log.json (imported by the page, so the
 * film has it without a request).
 *
 * Runs after the snapshot in `prebuild`, and on its own with
 *   node scripts/automation/build_bug_log.mjs
 * It never fails the build: on any error it keeps the previous log.
 */
import fs from "fs";
import path from "path";

const USERNAME = process.env.GITHUB_USERNAME || "Aayush-Mishraa";
const SNAPSHOT = path.resolve("public/data/github");
const OUT = path.resolve("src/shared/opensource/bug_log.json");
const KEEP = 24;

// "fix: x", "fix(ci): x", "Fix x", "Fixed x", "Fixes x"
const FIX = /^fix(?:e[sd])?(?:\([^)]*\))?\s*[:\-–]?\s+/i;
const VAGUE = /^(?:the\s+|some\s+)?(?:code|error|errors|bug|bugs|issue|issues|xml file|file|it|build|push|stuff)\s*(?:push)?\.?$/i;
const MUDDLED = /^(?:the|some|an?)\s+(?:error|issue|bug|code)\b|=/i;
// Test fixes rank first, then CI and deploy fixes, then the rest.
const TIERS = [
  /test|locator|testng|newman|postman|playwright|selenium|cypress|appium|e2e|end-to-end|assert|flaky|report/i,
  /jenkins|workflow|\bci\b|pipeline|deploy|build/i,
];
const tierOf = (text) => {
  const index = TIERS.findIndex((pattern) => pattern.test(text));
  return index === -1 ? 0 : TIERS.length - index;
};

const firstLine = (message) =>
  String(message || "")
    .split("\n")[0]
    .trim();
const tidy = (text) => {
  const clean = text
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

// A subject that runs on into the body ("…issue: Updated x to correctly") is
// cut at its colon, where the thought is complete.
const subjectOf = (message) => {
  const line = firstLine(message).replace(FIX, "");
  const continues =
    String(message || "")
      .trim()
      .split("\n").length > 1;
  const head = line.split(/:\s+/)[0];
  return continues && head !== line && head.length >= 12 ? head : line;
};

// Round-robin across repos, so one busy repo doesn't fill the log.
const interleave = (items) => {
  const byRepo = new Map();
  items.forEach((item) => byRepo.set(item.repo, (byRepo.get(item.repo) || []).concat(item)));
  const queues = Array.from(byRepo.values());
  const out = [];
  while (queues.some((queue) => queue.length)) queues.forEach((queue) => queue.length && out.push(queue.shift()));
  return out;
};

function build() {
  const index = JSON.parse(fs.readFileSync(path.join(SNAPSHOT, "index.json"), "utf8"));
  const own = new Set(index.repos.filter((repo) => !repo.fork).map((repo) => repo.name));
  const fixes = [];

  own.forEach((name) => {
    const file = path.join(SNAPSHOT, "repos", `${name}.json`);
    if (!fs.existsSync(file)) return;
    const detail = JSON.parse(fs.readFileSync(file, "utf8"));
    (detail.commits || []).forEach((commit) => {
      const line = firstLine(commit.message);
      if (!FIX.test(line) || /^merge\b/i.test(line)) return;
      if (commit.login && commit.login.toLowerCase() !== USERNAME.toLowerCase()) return;
      const what = subjectOf(commit.message);
      fixes.push({
        sha: commit.sha,
        short: commit.sha.slice(0, 7),
        date: commit.date,
        repo: name,
        message: tidy(what),
        url: commit.url,
        verified: Boolean(commit.verified),
        tier: tierOf(line),
        vague: what.length < 18 || VAGUE.test(what.trim()) || MUDDLED.test(what),
      });
    });
  });

  const ranked = fixes
    .filter((fix) => !fix.vague && fix.message.length <= 90)
    .sort((a, b) => b.tier - a.tier || new Date(b.date) - new Date(a.date));
  const readable = TIERS.map((_, i) => TIERS.length - i)
    .concat(0)
    .reduce((acc, tier) => acc.concat(interleave(ranked.filter((fix) => fix.tier === tier))), [])
    .slice(0, KEEP)
    .map(({ vague, ...fix }) => fix);

  const log = {
    generatedAt: new Date().toISOString(),
    user: USERNAME,
    total: fixes.length,
    repos: new Set(fixes.map((fix) => fix.repo)).size,
    latest: fixes.reduce((a, b) => (!a || new Date(b.date) > new Date(a.date) ? b : a), null)?.date || null,
    fixes: readable,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`[bug-log] ${log.total} fixes in ${log.repos} repos, ${readable.length} kept for display`);
}

try {
  build();
} catch (error) {
  console.warn(`[bug-log] kept the previous log: ${error.message}`);
}
