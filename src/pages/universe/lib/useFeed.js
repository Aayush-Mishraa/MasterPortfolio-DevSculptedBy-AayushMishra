import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Stale-while-revalidate for the Tech Universe feeds.
 *
 * The shaped result of each fetcher is kept in localStorage, so a returning
 * visitor sees the last good data instantly while a fresh copy loads. If the
 * network fails, the cached copy stays on screen and `error` explains why.
 */

const PREFIX = "uv-cache:v3:";

// One network request per key at a time, however many components ask for it.
const inflight = new Map();

// Drop entries written by older versions of the data shapes.
try {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("uv-cache:") && !key.startsWith(PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
} catch (error) {
  /* storage unavailable */
}

const read = (key) => {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const write = (key, data) => {
  const entry = JSON.stringify({ data, at: Date.now() });
  try {
    window.localStorage.setItem(PREFIX + key, entry);
  } catch (error) {
    // Storage full: evict our own oldest entries once and retry.
    try {
      const ours = Object.keys(window.localStorage)
        .filter((storageKey) => storageKey.startsWith(PREFIX))
        .map((storageKey) => {
          let at = 0;
          try {
            at = JSON.parse(window.localStorage.getItem(storageKey)).at || 0;
          } catch (ignored) {
            /* corrupt entry: evict first */
          }
          return { storageKey, at };
        })
        .sort((a, b) => a.at - b.at);
      ours.slice(0, Math.max(3, Math.ceil(ours.length / 3))).forEach(({ storageKey }) => window.localStorage.removeItem(storageKey));
      window.localStorage.setItem(PREFIX + key, entry);
    } catch (ignored) {
      /* storage unavailable: live data still works */
    }
  }
};

export function useFeed(key, fetcher, { ttl = 10 * 60 * 1000, refreshMs = 0, enabled = true } = {}) {
  const [state, setState] = useState(() => {
    const cached = key ? read(key) : null;
    return { data: cached ? cached.data : null, syncedAt: cached ? cached.at : null, loading: false, error: null };
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const load = useCallback(
    (force = false) => {
      if (!key) return;
      const cached = read(key);
      if (!force && cached && Date.now() - cached.at < ttl) {
        setState({ data: cached.data, syncedAt: cached.at, loading: false, error: null });
        return;
      }
      const id = ++requestId.current;
      setState((previous) => ({
        data: previous.data ?? (cached ? cached.data : null),
        syncedAt: previous.syncedAt ?? (cached ? cached.at : null),
        loading: true,
        error: null,
      }));
      let request = inflight.get(key);
      if (!request) {
        request = Promise.resolve()
          .then(() => fetcherRef.current())
          .finally(() => inflight.delete(key));
        inflight.set(key, request);
      }
      request
        .then((data) => {
          if (id !== requestId.current) return;
          write(key, data);
          setState({ data, syncedAt: Date.now(), loading: false, error: null });
        })
        .catch((error) => {
          if (id !== requestId.current) return;
          setState((previous) => ({ ...previous, loading: false, error: error.message || "Request failed" }));
        });
    },
    [key, ttl]
  );

  // A new key means a different query: show its cache (or nothing) straight away.
  useEffect(() => {
    if (!key) return;
    const cached = read(key);
    setState({ data: cached ? cached.data : null, syncedAt: cached ? cached.at : null, loading: false, error: null });
  }, [key]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    if (!refreshMs) return undefined;
    const timer = setInterval(() => document.visibilityState === "visible" && load(true), refreshMs);
    return () => clearInterval(timer);
  }, [load, enabled, refreshMs]);

  return { ...state, reload: () => load(true) };
}

/** Small persisted state for per-visitor things: high scores, reading lists, checklists. */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(`uv:${key}`);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch (error) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(`uv:${key}`, JSON.stringify(value));
    } catch (error) {
      /* private mode: keep it in memory only */
    }
  }, [key, value]);
  return [value, setValue];
}
