import { githubFetch, cachedJSON } from "./githubClient";

export const GITHUB_USERNAME = "Aayush-Mishraa";
const API = "https://api.github.com";
const SNAPSHOT_BASE = `${process.env.PUBLIC_URL || ""}/data/github`;
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/* ------------------------------------------------------------------ */
/* Languages                                                           */
/* ------------------------------------------------------------------ */

export const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#663399",
  SCSS: "#c6538c",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Kotlin: "#A97BFF",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Rust: "#dea584",
  Shell: "#89e051",
  PowerShell: "#012456",
  Dockerfile: "#384d54",
  Gherkin: "#5B2063",
  "Jupyter Notebook": "#DA5B0B",
  Procfile: "#3B2F63",
  Batchfile: "#C1F12E",
  Handlebars: "#f7931e",
  EJS: "#a91e50",
};

export const languageColor = (name = "") => {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
};

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  {
    id: "ai",
    label: "AI Agents",
    icon: "fa-solid fa-robot",
    keywords: ["ai", "agent", "llm", "nova", "bedrock", "gpt", "openai", "langchain", "mcp"],
  },
  {
    id: "api",
    label: "API Testing",
    icon: "fa-solid fa-plug-circle-check",
    keywords: ["api", "postman", "newman", "rest", "restapi", "rest-api", "graphql", "jsonpath"],
  },
  {
    id: "e2e",
    label: "UI & E2E Automation",
    icon: "fa-solid fa-vial-circle-check",
    keywords: ["playwright", "selenium", "cypress", "e2e", "automation", "cucumber", "test", "testing", "ecommerce", "allure", "pom", "bdd"],
  },
  {
    id: "data",
    label: "Data & ML",
    icon: "fa-solid fa-brain",
    keywords: ["nlp", "streamlit", "streemlit", "machine-learning", "ml", "pandas", "jupyter", "startup", "dataset"],
  },
  {
    id: "learning",
    label: "Learning & Notes",
    icon: "fa-solid fa-book-open",
    keywords: ["dsa", "notes", "practice", "prectice", "basic", "basics", "bootcamp", "tutorial", "learn"],
  },
  {
    id: "web",
    label: "Web & Tools",
    icon: "fa-solid fa-layer-group",
    keywords: ["portfolio", "react", "weather", "app", "excel", "config", "website"],
  },
];

export const categoryById = (id) => CATEGORIES.find((category) => category.id === id);

const tokenize = (text = "") =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// Name says what a repo is; topics confirm it; descriptions mention everything.
const classify = (repo) => {
  const sources = [
    [tokenize(repo.name), 3],
    [(repo.topics || []).flatMap((topic) => [topic, ...tokenize(topic)]), 2],
    [tokenize(repo.description || ""), 1],
  ];
  let best = { id: "web", score: 0 };
  CATEGORIES.forEach((category) => {
    const score = sources.reduce(
      (sum, [tokens, weight]) =>
        sum + weight * tokens.filter((token) => category.keywords.includes(token)).length,
      0
    );
    if (score > best.score) best = { id: category.id, score };
  });
  return best.id;
};

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

const KEEP_TOGETHER = ["JavaScript", "TypeScript", "PlayWright", "NodeJs", "GitHub", "OpenCart", "TechProduct", "SecureFlow", "AutoCart"];
const WORD_FIXES = { api: "API", e2e: "E2E", fw: "FW", ts: "TS", js: "JS", nlp: "NLP", dsa: "DSA", ai: "AI", sdet: "SDET", ui: "UI", playwright: "Playwright", nodejs: "Node.js" };

export const prettyName = (name = "") => {
  let working = name;
  const placeholders = [];
  KEEP_TOGETHER.forEach((word) => {
    working = working.replace(new RegExp(word, "g"), () => {
      placeholders.push(word === "PlayWright" ? "Playwright" : word);
      return `\u0000${placeholders.length - 1}\u0000`;
    });
  });
  working = working
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_.]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/\u0000(\d+)\u0000/g, (_, index) => ` ${placeholders[index]} `)
    .replace(/\s+/g, " ")
    .trim();
  return working
    .split(" ")
    .map((word) => {
      if (WORD_FIXES[word.toLowerCase()]) return WORD_FIXES[word.toLowerCase()];
      const lower = word.length > 2 && word === word.toUpperCase() ? word.toLowerCase() : word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\bE Commerce\b/g, "E-Commerce");
};

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

export const timeAgo = (iso, now = Date.now()) => {
  if (!iso) return "—";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["w", 604800],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];
  const [unit, size] = units.find(([, span]) => seconds >= span) || ["m", 60];
  return `${Math.max(1, Math.floor(seconds / size))}${unit} ago`;
};

export const formatDate = (iso, options = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso).toLocaleDateString("en-US", options) : "—";

export const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}`;
};

/** Weekly buckets ending this week, oldest first. */
export const weeklySeries = (dates = [], weeks = 26, now = Date.now()) => {
  const buckets = new Array(weeks).fill(0);
  dates.forEach((iso) => {
    const index = weeks - 1 - Math.floor((now - new Date(iso).getTime()) / WEEK);
    if (index >= 0 && index < weeks) buckets[index] += 1;
  });
  return buckets;
};

/**
 * 26 weekly buckets. Quiet repos get a window ending at their last commit, so
 * the sparkline shows how the project was built instead of a flat line.
 */
const activityWindow = (dates) => {
  const latest = dates.reduce((max, iso) => Math.max(max, new Date(iso).getTime()), 0);
  const recent = !latest || Date.now() - latest < 20 * WEEK;
  const end = recent ? Date.now() : latest + WEEK;
  return {
    activity: weeklySeries(dates, 26, end),
    activityLabel: recent
      ? "commits · last 26 weeks"
      : `commits · 26 weeks to ${new Date(latest).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
  };
};

/* ------------------------------------------------------------------ */
/* Repo model                                                          */
/* ------------------------------------------------------------------ */

const languageBreakdown = (bytesByLanguage, fallbackLanguage) => {
  const entries = Object.entries(bytesByLanguage || {});
  if (!entries.length) {
    return fallbackLanguage
      ? [{ name: fallbackLanguage, bytes: 1, percent: 100, color: languageColor(fallbackLanguage) }]
      : [];
  }
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: total ? (bytes / total) * 100 : 0,
      color: languageColor(name),
    }));
};

export const enrichRepo = (repo, snapshotExtras) => {
  const extras = snapshotExtras || repo.snapshot || null;
  const languages = languageBreakdown(extras?.languages, repo.language);
  const commitDates = extras?.commitDates || [];
  const category = classify(repo);
  const pushedAt = repo.pushed_at || repo.updated_at;
  const daysSincePush = (Date.now() - new Date(pushedAt).getTime()) / DAY;
  const commitTotal = extras?.commitTotal || commitDates.length || 0;

  // How much a recruiter would get out of opening this repo.
  const signal =
    (repo.description ? 3 : 0) +
    Math.min((repo.topics || []).length, 6) * 0.8 +
    Math.log2(1 + commitTotal) * 1.4 +
    (repo.stargazers_count || 0) * 0.5 +
    Math.max(0, 4 - daysSincePush / 45) +
    (category === "learning" || category === "web" ? -2 : 0) +
    (repo.fork ? -10 : 0) +
    (repo.name.toLowerCase() === GITHUB_USERNAME.toLowerCase() ? -6 : 0);

  return {
    id: repo.id,
    name: repo.name,
    title: prettyName(repo.name),
    description: repo.description || "",
    url: repo.html_url,
    homepage: repo.homepage || "",
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    language: repo.language || languages[0]?.name || null,
    languages,
    topics: repo.topics || [],
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    watchers: repo.watchers_count || 0,
    openIssues: repo.open_issues_count || 0,
    sizeKb: repo.size || 0,
    defaultBranch: repo.default_branch || "main",
    license: typeof repo.license === "string" ? repo.license : repo.license?.spdx_id || null,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt,
    daysSincePush,
    category,
    commitTotal,
    commitDates,
    lastCommit: extras?.lastCommit || null,
    ...activityWindow(commitDates),
    signal,
  };
};

/* ------------------------------------------------------------------ */
/* Loaders                                                             */
/* ------------------------------------------------------------------ */

export const loadSnapshot = () =>
  fetch(`${SNAPSHOT_BASE}/index.json`, { cache: "no-cache" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

export const loadRepoSnapshot = (name) =>
  fetch(`${SNAPSHOT_BASE}/repos/${encodeURIComponent(name)}.json`, { cache: "no-cache" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

export const fetchLiveRepos = (options) =>
  githubFetch(`${API}/users/${GITHUB_USERNAME}/repos?per_page=100&sort=pushed&type=owner`, {
    ttl: 2 * 60 * 1000,
    ...options,
  });

export const fetchLiveUser = () =>
  githubFetch(`${API}/users/${GITHUB_USERNAME}`, { ttl: 30 * 60 * 1000 });

export const fetchContributions = () =>
  cachedJSON(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`, {
    ttl: 30 * 60 * 1000,
  });

export const fetchPublicEvents = (options) =>
  githubFetch(`${API}/users/${GITHUB_USERNAME}/events/public?per_page=40`, { ttl: 2 * 60 * 1000, ...options });

/** Every pull request I've opened, anywhere on GitHub (search API has its own rate limit). */
export const fetchAuthoredPullRequests = (options) =>
  githubFetch(`${API}/search/issues?q=author:${GITHUB_USERNAME}+type:pr&sort=created&order=desc&per_page=50`, {
    ttl: 10 * 60 * 1000,
    ...options,
  });

export const normalizeCommit = (item) => ({
  sha: item.sha,
  message: item.commit?.message || "",
  date: item.commit?.author?.date || item.commit?.committer?.date,
  author: item.commit?.author?.name || item.author?.login || "unknown",
  login: item.author?.login || null,
  avatar: item.author?.avatar_url || null,
  verified: Boolean(item.commit?.verification?.verified),
  url: item.html_url,
});

export const fetchRepoCommits = (name, perPage = 100, options) =>
  githubFetch(`${API}/repos/${GITHUB_USERNAME}/${name}/commits?per_page=${perPage}`, {
    ttl: 2 * 60 * 1000,
    ...options,
  }).then((result) => ({
    ...result,
    data: Array.isArray(result.data) ? result.data.map(normalizeCommit) : [],
  }));

/**
 * Merge the live repo list over the snapshot. Live data always wins for
 * metadata; the snapshot contributes what the live API is too expensive for.
 */
export const mergeRepos = (snapshotRepos = [], liveRepos = null) => {
  const extrasByName = {};
  snapshotRepos.forEach((repo) => {
    extrasByName[repo.name] = repo.snapshot;
  });
  const source = Array.isArray(liveRepos) && liveRepos.length ? liveRepos : snapshotRepos;
  return source.map((repo) => {
    const extras = extrasByName[repo.name];
    const enriched = enrichRepo(repo, extras);
    // A push newer than the snapshot means the commit count is out of date.
    enriched.snapshotBehind = Boolean(
      extras?.lastCommit?.date &&
        new Date(enriched.pushedAt) - new Date(extras.lastCommit.date) > 60 * 1000
    );
    return enriched;
  });
};

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

export const contributionStreaks = (days = []) => {
  const today = new Date().toISOString().slice(0, 10);
  const valid = days.filter((day) => day.date <= today);
  let longest = 0;
  let running = 0;
  valid.forEach((day) => {
    running = day.count > 0 ? running + 1 : 0;
    longest = Math.max(longest, running);
  });
  let current = 0;
  for (let i = valid.length - 1; i >= 0; i -= 1) {
    // today with no commits yet should not break the streak
    if (valid[i].count > 0) current += 1;
    else if (i === valid.length - 1) continue;
    else break;
  }
  return { current, longest };
};

export const aggregateStats = (repos, contributions) => {
  const own = repos.filter((repo) => !repo.fork);
  // Each project gets one equal vote split across its languages, so a repo
  // full of generated HTML reports can't drown out the rest of the stack.
  const share = {};
  own.forEach((repo) =>
    repo.languages.forEach((language) => {
      share[language.name] = (share[language.name] || 0) + language.percent / 100;
    })
  );
  const shareTotal = Object.values(share).reduce((sum, value) => sum + value, 0);
  const languages = Object.entries(share)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      projects: own.filter((repo) => repo.languages.some((language) => language.name === name)).length,
      percent: shareTotal ? (value / shareTotal) * 100 : 0,
      color: languageColor(name),
    }));

  const days = contributions?.contributions || [];
  const streaks = contributionStreaks(days);
  const lastYear = contributions?.total?.lastYear ?? days.reduce((sum, day) => sum + day.count, 0);

  const topics = {};
  own.forEach((repo) => repo.topics.forEach((topic) => (topics[topic] = (topics[topic] || 0) + 1)));

  const monthly = {};
  days.forEach((day) => {
    const key = day.date.slice(0, 7);
    monthly[key] = (monthly[key] || 0) + day.count;
  });

  const busiestDay = days.reduce((best, day) => (day.count > (best?.count || 0) ? day : best), null);
  // the calendar pads out to whole weeks (up to 371 cells); count the last 365 days only
  const activeDays = days.slice(-365).filter((day) => day.count > 0).length;

  return {
    repoCount: repos.length,
    ownCount: own.length,
    forkCount: repos.length - own.length,
    stars: own.reduce((sum, repo) => sum + repo.stars, 0),
    commits: own.reduce((sum, repo) => sum + repo.commitTotal, 0),
    contributions: lastYear,
    streaks,
    activeDays,
    busiestDay,
    languages,
    topics: Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    monthly: Object.entries(monthly)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, count]) => ({ month, count })),
    lastPush: own.reduce((latest, repo) => (repo.pushedAt > latest ? repo.pushedAt : latest), ""),
    categoryCounts: CATEGORIES.reduce((acc, category) => {
      acc[category.id] = repos.filter((repo) => repo.category === category.id).length;
      return acc;
    }, {}),
  };
};

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/** Every query token must hit somewhere; name hits outrank description hits. */
export const searchScore = (repo, query) => {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 1;
  const fields = [
    [repo.title.toLowerCase() + " " + repo.name.toLowerCase(), 6],
    [repo.topics.join(" ").toLowerCase(), 4],
    [repo.languages.map((language) => language.name).join(" ").toLowerCase(), 3],
    [(categoryById(repo.category)?.label || "").toLowerCase(), 2],
    [repo.description.toLowerCase(), 2],
  ];
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    fields.forEach(([text, weight]) => {
      const index = text.indexOf(token);
      if (index === -1) return;
      const wordStart = index === 0 || /[\s\-_./]/.test(text[index - 1]);
      best = Math.max(best, weight + (wordStart ? 1.5 : 0));
    });
    if (!best) return 0;
    score += best;
  }
  return score;
};

/* ------------------------------------------------------------------ */
/* Single repository                                                   */
/* ------------------------------------------------------------------ */

const repoPath = (name) => `${API}/repos/${GITHUB_USERNAME}/${encodeURIComponent(name)}`;

export const fetchRepo = (name, options) => githubFetch(repoPath(name), { ttl: 2 * 60 * 1000, ...options });

export const fetchRepoLanguages = (name) => githubFetch(`${repoPath(name)}/languages`, { ttl: 30 * 60 * 1000 });

export const fetchReadmeHtml = (name) =>
  githubFetch(`${repoPath(name)}/readme`, {
    ttl: 10 * 60 * 1000,
    accept: "application/vnd.github.html+json",
    text: true,
  });

export const fetchRepoTree = (name, branch) =>
  githubFetch(`${repoPath(name)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { ttl: 30 * 60 * 1000 });

/** Mirrors summarizeTree() in scripts/automation/fetch_projects_snapshot.mjs. */
export const summarizeTree = (tree) => {
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
};

/** Conventional-commit prefix, if the message has one. */
export const commitKind = (message = "") => {
  const match = message.match(/^(feat|fix|chore|docs|refactor|test|tests|ci|build|perf|style|revert)(\(.+?\))?!?:/i);
  if (match) return match[1].toLowerCase().replace("tests", "test");
  if (/^merge /i.test(message)) return "merge";
  if (/^(add|create|implement|introduce)/i.test(message)) return "feat";
  if (/^(fix|resolve|correct|patch)/i.test(message)) return "fix";
  if (/^(update|improve|refine|tweak|enhance)/i.test(message)) return "update";
  if (/^(remove|delete|clean)/i.test(message)) return "chore";
  return "commit";
};
