/**
 * Build-time GitHub snapshot for the Projects pages.
 *
 * The browser talks to the GitHub API live, but unauthenticated clients are
 * capped at 60 requests/hour. This script runs before every build (with a
 * token when one is available) and writes a same-origin JSON snapshot that the
 * pages render instantly and fall back to whenever the live API is throttled.
 *
 * Output:
 *   public/data/github/index.json          profile, repos, contributions
 *   public/data/github/repos/<name>.json   commits, languages, readme, tree
 *
 * The script never fails the build: on any error it keeps the previous snapshot.
 */
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const USERNAME = process.env.GITHUB_USERNAME || "Aayush-Mishraa";
const TOKEN = process.env.GITHUB_TOKEN || "";
const OUT_DIR = path.resolve("public/data/github");
const REPO_DIR = path.join(OUT_DIR, "repos");
const API = "https://api.github.com";
const CONCURRENCY = 6;

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": `${USERNAME}-portfolio-snapshot`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

class RateLimitError extends Error {}

async function gh(url, accept) {
  const response = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
    headers: accept ? { ...headers, Accept: accept } : headers,
  });
  if (response.status === 403 || response.status === 429) {
    if (response.headers.get("x-ratelimit-remaining") === "0") {
      throw new RateLimitError("GitHub rate limit reached");
    }
  }
  if (response.status === 404 || response.status === 409) return null; // missing / empty repo
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function ghJSON(url) {
  const response = await gh(url);
  return response ? response.json() : null;
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

const normalizeCommit = (item) => ({
  sha: item.sha,
  message: item.commit?.message || "",
  date: item.commit?.author?.date || item.commit?.committer?.date,
  author: item.commit?.author?.name || item.author?.login || "unknown",
  login: item.author?.login || null,
  avatar: item.author?.avatar_url || null,
  verified: Boolean(item.commit?.verification?.verified),
  url: item.html_url,
});

async function commitTotal(repo) {
  const response = await gh(`/repos/${USERNAME}/${repo}/commits?per_page=1`);
  if (!response) return 0;
  const link = response.headers.get("link") || "";
  const match = link.match(/[?&]page=(\d+)>; rel="last"/);
  if (match) return Number(match[1]);
  const body = await response.json();
  return Array.isArray(body) ? body.length : 0;
}

// Same field set the browser keeps from the live /repos response.
const REPO_FIELDS = [
  "id", "name", "full_name", "description", "html_url", "homepage", "fork",
  "language", "topics", "stargazers_count", "watchers_count", "forks_count",
  "open_issues_count", "size", "default_branch", "created_at", "updated_at",
  "pushed_at", "archived", "license", "visibility",
];

const pickRepo = (repo) =>
  Object.fromEntries(
    REPO_FIELDS.map((key) => [
      key,
      key === "license" ? repo.license?.spdx_id || null : repo[key] ?? null,
    ])
  );

function summarizeTree(tree) {
  if (!tree || !Array.isArray(tree.tree)) return null;
  const files = tree.tree.filter((node) => node.type === "blob");
  const extensions = {};
  files.forEach((file) => {
    const base = file.path.split("/").pop();
    const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : "other";
    extensions[ext] = (extensions[ext] || 0) + 1;
  });
  const topLevel = tree.tree
    .filter((node) => !node.path.includes("/"))
    .map((node) => ({ name: node.path, type: node.type === "tree" ? "dir" : "file" }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  return {
    fileCount: files.length,
    dirCount: tree.tree.filter((node) => node.type === "tree").length,
    truncated: Boolean(tree.truncated),
    extensions: Object.entries(extensions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([ext, count]) => ({ ext, count })),
    topLevel: topLevel.slice(0, 40),
  };
}

async function snapshotRepo(repo) {
  const name = repo.name;
  const [languages, commits, total, readme, tree] = await Promise.all([
    ghJSON(`/repos/${USERNAME}/${name}/languages`),
    ghJSON(`/repos/${USERNAME}/${name}/commits?per_page=100`),
    commitTotal(name),
    gh(`/repos/${USERNAME}/${name}/readme`, "application/vnd.github.html+json")
      .then((r) => (r ? r.text() : null)),
    ghJSON(`/repos/${USERNAME}/${name}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`),
  ]);

  const detail = {
    name,
    generatedAt: new Date().toISOString(),
    languages: languages || {},
    commitTotal: total,
    commits: Array.isArray(commits) ? commits.map(normalizeCommit) : [],
    readmeHtml: readme,
    tree: summarizeTree(tree),
  };
  fs.writeFileSync(path.join(REPO_DIR, `${name}.json`), JSON.stringify(detail));
  return detail;
}

async function main() {
  if (!TOKEN) {
    console.warn("[snapshot] No GITHUB_TOKEN; running unauthenticated (60 req/h).");
  }

  const [user, repos, contributions] = await Promise.all([
    ghJSON(`/users/${USERNAME}`),
    ghJSON(`/users/${USERNAME}/repos?per_page=100&sort=pushed&type=owner`),
    fetch(`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  if (!Array.isArray(repos)) throw new Error("Could not list repositories");

  fs.mkdirSync(REPO_DIR, { recursive: true });

  const details = await pool(repos, async (repo) => {
    try {
      return await snapshotRepo(repo);
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      console.warn(`[snapshot] ${repo.name}: ${error.message}`);
      return null;
    }
  });

  const byName = Object.fromEntries(
    details.filter(Boolean).map((detail) => [detail.name, detail])
  );

  const index = {
    generatedAt: new Date().toISOString(),
    user: user && {
      login: user.login,
      name: user.name,
      avatar: user.avatar_url,
      bio: user.bio,
      followers: user.followers,
      publicRepos: user.public_repos,
      createdAt: user.created_at,
      url: user.html_url,
    },
    repos: repos.map((repo) => {
      const detail = byName[repo.name];
      return {
        ...pickRepo(repo),
        // extras only the snapshot can afford to compute
        snapshot: detail
          ? {
              languages: detail.languages,
              commitTotal: detail.commitTotal,
              // commit dates only; the full log lives in the per-repo file
              commitDates: detail.commits.map((commit) => commit.date),
              lastCommit: detail.commits[0] || null,
            }
          : null,
      };
    }),
    contributions,
  };

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index));
  console.log(
    `[snapshot] Wrote ${repos.length} repos (${Object.keys(byName).length} detailed) to ${OUT_DIR}`
  );
}

main().catch((error) => {
  console.warn(`[snapshot] Skipped, keeping previous snapshot: ${error.message}`);
  process.exit(0);
});
