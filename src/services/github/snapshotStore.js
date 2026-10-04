/*
  The build-time GitHub snapshot (public/data/github, refreshed by the
  scheduled build): the only GitHub data the pages use. Nothing here calls
  api.github.com, so there is no rate limit to hit or show.

  Each file is fetched once per visit and kept, so a page can read it
  synchronously on its first render (src/index.js loads it before adopting a
  prerendered page, which then renders exactly what the HTML shows).
*/

const BASE = `${process.env.PUBLIC_URL || ""}/data/github`;
// The pages that render from the snapshot: Work, Open Source and each repo.
const DATA_PAGE = /^\/(work|work\/open-source|projects\/[^/]+)\/?$/;
const PROJECT_PAGE = /^\/projects\/([^/]+)\/?$/;

let index;
let indexRequest = null;
const repos = {};
const repoRequests = {};

// Default caching, so a <link rel="preload"> of the same file is reused.
const getJSON = (url) =>
  fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

/** The snapshot index (repos, contributions, recent commits, events, PRs), or undefined if not loaded yet. */
export const snapshotIndex = () => index;

/** Loads the index once; resolves null when it can't be read. */
export function loadSnapshotIndex() {
  if (!indexRequest) {
    indexRequest = getJSON(`${BASE}/index.json`).then((data) => {
      index = data;
      if (!data) indexRequest = null; // a failed load can be retried
      return data;
    });
  }
  return indexRequest;
}

/** One repository's detail (commits, languages, README, tree), or undefined if not loaded yet. */
export const snapshotRepo = (name) => repos[name];

export function loadSnapshotRepo(name) {
  if (!repoRequests[name]) {
    repoRequests[name] = getJSON(`${BASE}/repos/${encodeURIComponent(name)}.json`).then((data) => {
      repos[name] = data;
      if (!data) delete repoRequests[name];
      return data;
    });
  }
  return repoRequests[name];
}

/**
 * What a URL needs before its first render, so a prerendered page can be
 * adopted as it is. Resolves after at most `timeout` ms either way.
 */
export function preloadForPath(pathname, timeout = 4000) {
  const loads = [];
  if (DATA_PAGE.test(pathname)) loads.push(loadSnapshotIndex());
  const project = pathname.match(PROJECT_PAGE);
  if (project) loads.push(loadSnapshotRepo(decodeURIComponent(project[1])));
  if (!loads.length) return Promise.resolve();
  return Promise.race([Promise.all(loads), new Promise((resolve) => setTimeout(resolve, timeout))]);
}

/**
 * Which snapshot files a URL renders from: their generatedAt, space separated
 * ("none" for one that isn't loaded); "" for a page that uses none.
 * scripts/prerender stamps the same string on the HTML it writes.
 */
export function snapshotVersion(pathname) {
  const stamp = (data) => (data && data.generatedAt) || "none";
  const parts = [];
  if (DATA_PAGE.test(pathname)) parts.push(stamp(index));
  const project = pathname.match(PROJECT_PAGE);
  if (project) parts.push(stamp(repos[decodeURIComponent(project[1])]));
  return parts.join(" ");
}
