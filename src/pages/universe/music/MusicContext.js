import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocalState } from "../lib/useFeed";

/*
 * One music engine for the whole Tech Universe. It lives in the app shell, so
 * playback continues while visitors move between channels.
 *
 * Playback goes through a single plain <audio> element. It is never routed
 * through Web Audio: Audius serves the final file from storage without CORS
 * headers, and routing non-CORS audio through an analyser outputs silence.
 * The visualizer is instead driven by each track's BPM (see BeatVisualizer).
 */

const MusicContext = createContext(null);
export const useMusic = () => useContext(MusicContext);

export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export function MusicProvider({ children }) {
  const audio = useRef(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [status, setStatus] = useState("idle"); // idle | loading | playing | paused | error
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [meta, setMeta] = useState(null); // { label, id } of the station or search that filled the queue
  const [notice, setNotice] = useState(null);
  const [volume, setVolumeState] = useLocalState("music:volume", 0.75);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useLocalState("music:shuffle", false);
  const [repeat, setRepeat] = useLocalState("music:repeat", "all"); // off | all | one
  const failures = useRef(0);
  const latest = useRef({});
  latest.current = { queue, index, shuffle, repeat, volume, muted };
  const handlers = useRef({});

  const track = queue[index] || null;

  /* ---------------- core ---------------- */

  const start = useCallback((list, position, source) => {
    const el = audio.current;
    const item = list[position];
    if (!el || !item) return;
    el.src = item.stream;
    el.volume = latest.current.volume;
    el.muted = latest.current.muted;
    setQueue(list);
    setIndex(position);
    if (source !== undefined) setMeta(source);
    setTime(0);
    setDuration(item.duration || 0);
    setStatus("loading");
    const attempt = el.play();
    if (attempt && attempt.catch) {
      attempt.catch((error) => {
        if (error.name === "NotAllowedError") setStatus("paused");
        else if (error.name !== "AbortError") handlers.current.failed();
      });
    }
  }, []);

  const pick = useCallback((direction) => {
    const { queue: list, index: at, shuffle: random, repeat: mode } = latest.current;
    if (!list.length) return -1;
    if (random && direction > 0 && list.length > 1) {
      let next = at;
      while (next === at) next = Math.floor(Math.random() * list.length);
      return next;
    }
    const next = at + direction;
    if (next >= list.length) return mode === "off" ? -1 : 0;
    if (next < 0) return list.length - 1;
    return next;
  }, []);

  const next = useCallback(() => {
    const target = pick(1);
    if (target >= 0) start(latest.current.queue, target);
    else {
      const el = audio.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
      setStatus("paused");
    }
  }, [pick, start]);

  const prev = useCallback(() => {
    const el = audio.current;
    const current = latest.current.queue[latest.current.index];
    if (el && current && current.kind === "track" && el.currentTime > 4) {
      el.currentTime = 0;
      return;
    }
    const target = pick(-1);
    if (target >= 0) start(latest.current.queue, target);
  }, [pick, start]);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    const { queue: list, index: at } = latest.current;
    if (!el.paused) {
      el.pause();
      return;
    }
    if (el.getAttribute("src")) {
      setStatus("loading");
      el.play().catch((error) => error.name !== "AbortError" && setStatus("paused"));
    } else if (list.length) start(list, Math.max(0, at));
  }, [start]);

  const stop = useCallback(() => {
    const el = audio.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    setQueue([]);
    setIndex(-1);
    setMeta(null);
    setStatus("idle");
    setTime(0);
    setDuration(0);
  }, []);

  const seek = useCallback((seconds) => {
    const el = audio.current;
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      el.currentTime = Math.max(0, Math.min(el.duration - 0.25, seconds));
      setTime(el.currentTime);
    }
  }, []);

  const setVolume = useCallback(
    (value) => {
      const clamped = Math.max(0, Math.min(1, value));
      setVolumeState(clamped);
      if (audio.current) audio.current.volume = clamped;
      if (clamped > 0 && latest.current.muted) {
        setMuted(false);
        if (audio.current) audio.current.muted = false;
      }
    },
    [setVolumeState]
  );

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      if (audio.current) audio.current.muted = !value;
      return !value;
    });
  }, []);

  const cycleRepeat = useCallback(() => setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off")), [setRepeat]);
  const toggleShuffle = useCallback(() => setShuffle((value) => !value), [setShuffle]);
  const getTime = useCallback(() => (audio.current ? audio.current.currentTime : 0), []);

  handlers.current.failed = () => {
    const current = latest.current.queue[latest.current.index];
    failures.current += 1;
    if (failures.current >= 3 || latest.current.queue.length < 2) {
      setStatus("error");
      setNotice({ tone: "error", text: "These tracks aren't loading right now. Try another station." });
      return;
    }
    setNotice({ tone: "info", text: `Couldn't play “${current ? current.title : "this track"}”. Skipping.` });
    setTimeout(() => next(), 700);
  };
  handlers.current.ended = () => {
    const el = audio.current;
    if (latest.current.repeat === "one" && el) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else next();
  };

  /* ---------------- audio element ---------------- */

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audio.current = el;
    const on = (type, fn) => el.addEventListener(type, fn);
    on("playing", () => {
      failures.current = 0;
      setStatus("playing");
    });
    on("pause", () => setStatus((current) => (current === "error" || current === "idle" ? current : "paused")));
    on("waiting", () => setStatus("loading"));
    on("timeupdate", () => setTime(el.currentTime));
    on("durationchange", () => setDuration(Number.isFinite(el.duration) ? el.duration : 0));
    on("ended", () => handlers.current.ended());
    on("error", () => {
      // Clearing src also fires "error"; only real load failures count.
      if (!el.getAttribute("src") || (el.error && el.error.code === 1)) return;
      handlers.current.failed();
    });
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, []);

  /* ---------------- OS media controls ---------------- */

  useEffect(() => {
    if (!("mediaSession" in navigator)) return undefined;
    const session = navigator.mediaSession;
    const set = (action, fn) => {
      try {
        session.setActionHandler(action, fn);
      } catch (error) {
        /* action not supported */
      }
    };
    set("play", () => toggle());
    set("pause", () => toggle());
    set("nexttrack", () => next());
    set("previoustrack", () => prev());
    set("seekto", (details) => details && seek(details.seekTime));
    return () => ["play", "pause", "nexttrack", "previoustrack", "seekto"].forEach((action) => set(action, null));
  }, [toggle, next, prev, seek]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
    navigator.mediaSession.metadata = track
      ? new window.MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: meta ? meta.label : "Tech Universe",
          artwork: track.artwork ? [{ src: track.artwork, sizes: "480x480", type: "image/jpeg" }] : [],
        })
      : null;
  }, [track, meta]);

  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = status === "playing" ? "playing" : track ? "paused" : "none";
  }, [status, track]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(id);
  }, [notice]);

  const value = useMemo(
    () => ({
      queue,
      index,
      track,
      status,
      playing: status === "playing" || status === "loading",
      time,
      duration,
      meta,
      notice,
      volume,
      muted,
      shuffle,
      repeat,
      start,
      toggle,
      next,
      prev,
      stop,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      getTime,
      dismissNotice: () => setNotice(null),
    }),
    [queue, index, track, status, time, duration, meta, notice, volume, muted, shuffle, repeat, start, toggle, next, prev, stop, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat, getTime]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}
