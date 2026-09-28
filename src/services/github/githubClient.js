/**
 * Tiny rate-limit-aware GitHub fetcher for the browser.
 *
 * Unauthenticated clients get 60 requests/hour, so every response is cached in
 * localStorage together with its ETag. Within `ttl` the cache is served
 * directly; after that a conditional request is sent, and a 304 reply is free
 * (it does not count against the limit). When GitHub refuses, stale cache wins.
 */

const CACHE_PREFIX = "gh-cache:v1:";
const inflight = new Map();
const listeners = new Set();

export const rateLimit = { remaining: null, limit: null, reset: null };

const notify = () => listeners.forEach((listener) => listener({ ...rateLimit }));

export const onRateLimitChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const readCache = (key) => {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const writeCache = (key, entry) => {
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    // Quota exceeded or storage blocked: drop our oldest entries and move on.
    try {
      Object.keys(window.localStorage)
        .filter((storageKey) => storageKey.startsWith(CACHE_PREFIX))
        .slice(0, 10)
        .forEach((storageKey) => window.localStorage.removeItem(storageKey));
    } catch (ignored) {
      /* storage unavailable */
    }
  }
};

export class GithubError extends Error {
  constructor(message, { status, rateLimited } = {}) {
    super(message);
    this.status = status;
    this.rateLimited = Boolean(rateLimited);
  }
}

const trackRateLimit = (response) => {
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining === null) return;
  rateLimit.remaining = Number(remaining);
  rateLimit.limit = Number(response.headers.get("x-ratelimit-limit"));
  rateLimit.reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
  notify();
};

/**
 * @returns {Promise<{data: any, fromCache: boolean, stale: boolean, fetchedAt: number}>}
 */
export function githubFetch(url, { ttl = 5 * 60 * 1000, accept, force = false, text = false } = {}) {
  const key = `${accept || "json"}|${url}`;
  if (inflight.has(key)) return inflight.get(key);

  const cached = readCache(key);
  if (cached && !force && Date.now() - cached.fetchedAt < ttl) {
    return Promise.resolve({ data: cached.data, fromCache: true, stale: false, fetchedAt: cached.fetchedAt });
  }

  const headers = { Accept: accept || "application/vnd.github+json" };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;

  const request = fetch(url, { headers })
    .then(async (response) => {
      trackRateLimit(response);

      if (response.status === 304 && cached) {
        const entry = { ...cached, fetchedAt: Date.now() };
        writeCache(key, entry);
        return { data: cached.data, fromCache: true, stale: false, fetchedAt: entry.fetchedAt };
      }

      if (!response.ok) {
        const rateLimited =
          (response.status === 403 || response.status === 429) &&
          response.headers.get("x-ratelimit-remaining") === "0";
        throw new GithubError(
          rateLimited ? "GitHub API rate limit reached" : `GitHub responded ${response.status}`,
          { status: response.status, rateLimited }
        );
      }

      const data = text ? await response.text() : await response.json();
      const entry = { data, etag: response.headers.get("etag"), fetchedAt: Date.now() };
      writeCache(key, entry);
      return { data, fromCache: false, stale: false, fetchedAt: entry.fetchedAt };
    })
    .catch((error) => {
      if (cached) {
        return { data: cached.data, fromCache: true, stale: true, fetchedAt: cached.fetchedAt, error };
      }
      throw error instanceof GithubError ? error : new GithubError(error.message);
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

/**
 * Plain same-origin / third-party JSON with the same stale-while-error safety.
 * `fetchUrl` lets a URL with volatile parts (timestamps) share a stable cache key.
 */
export function cachedJSON(url, { ttl = 10 * 60 * 1000, fetchUrl = url } = {}) {
  const key = `plain|${url}`;
  const cached = readCache(key);
  if (cached && Date.now() - cached.fetchedAt < ttl) return Promise.resolve(cached.data);
  return fetch(fetchUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status}`);
      return response.json();
    })
    .then((data) => {
      writeCache(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .catch((error) => {
      if (cached) return cached.data;
      throw error;
    });
}
