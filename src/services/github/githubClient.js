/**
 * A small localStorage cache for third-party JSON (the news feeds). The
 * portfolio's own GitHub data comes from the build-time snapshot instead
 * (snapshotStore.js), so nothing here talks to the GitHub API any more.
 */

const CACHE_PREFIX = "gh-cache:v1:";

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
