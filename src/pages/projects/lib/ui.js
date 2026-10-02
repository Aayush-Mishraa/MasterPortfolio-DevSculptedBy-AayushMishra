import { useEffect, useRef, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/* Theme → CSS custom properties                                       */
/* ------------------------------------------------------------------ */

const parseHex = (hex = "") => {
  const clean = String(hex).replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.slice(0, 6);
  const value = parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return null;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

export const mix = (a, b, amount) => {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return a;
  return toHex(x.map((channel, i) => channel + (y[i] - channel) * amount));
};

export const rgba = (hex, alpha) => {
  const rgb = parseHex(hex);
  return rgb ? `rgba(${rgb.join(",")},${alpha})` : hex;
};

const luminance = (hex) => {
  const rgb = parseHex(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * `color` nudged toward the ink (or toward black/white when even the ink is
 * faint) until it reads as small text on `bg`: WCAG AA, 4.5:1.
 */
const legible = (color, bg, ink) => {
  // fall back to whichever of white/black contrasts more (on a mid-tone
  // background white alone can't reach 4.5:1)
  const toward =
    contrast(ink, bg) >= 4.5 ? ink : contrast("#ffffff", bg) >= contrast("#000000", bg) ? "#ffffff" : "#000000";
  for (let t = 0; t <= 1.001; t += 0.05) {
    const candidate = mix(color, toward, t);
    if (contrast(candidate, bg) >= 4.5) return candidate;
  }
  return toward;
};

/**
 * Every theme in the portfolio is a handful of hex colors. The projects pages
 * derive a full surface system from them so all 20+ themes stay coherent.
 */
export const themeVars = (theme = {}) => {
  const bg = theme.body || "#EDF9FE";
  const ink = theme.text || "#001C55";
  const dark = luminance(bg) < 0.3;
  const accent = theme.imageHighlight || "#0E6BA8";
  const accent2 = theme.jacketColor || ink;
  const white = "#ffffff";
  const black = "#000000";
  // the theme's muted colour, nudged toward the ink when it can't be read as small text
  const mutedCheck = theme.secondaryText || mix(bg, ink, 0.6);
  const muted = contrast(mutedCheck, bg) >= 4.5 ? theme.secondaryText || rgba(ink, 0.6) : legible(mutedCheck, bg, ink);

  return {
    dark,
    style: {
      "--pj-bg": bg,
      "--pj-bg-deep": dark ? mix(bg, black, 0.25) : mix(bg, ink, 0.035),
      "--pj-ink": ink,
      "--pj-ink-soft": rgba(ink, dark ? 0.86 : 0.78),
      "--pj-muted": muted,
      "--pj-accent": accent,
      /* accent for small text (kickers, commit ids, links); --pj-accent stays for fills and icons */
      "--pj-accent-ink": legible(accent, bg, ink),
      "--pj-accent-2": accent2,
      "--pj-accent-soft": rgba(accent, dark ? 0.2 : 0.12),
      "--pj-accent-glow": rgba(accent, 0.45),
      "--pj-soft": theme.highlight || rgba(accent, 0.3),
      "--pj-surface": dark ? rgba(mix(bg, white, 0.06), 0.72) : rgba(white, 0.62),
      "--pj-surface-solid": dark ? mix(bg, white, 0.06) : mix(bg, white, 0.7),
      "--pj-surface-raised": dark ? mix(bg, white, 0.1) : white,
      "--pj-line": rgba(ink, dark ? 0.16 : 0.1),
      "--pj-line-strong": rgba(ink, dark ? 0.28 : 0.18),
      "--pj-grid": rgba(ink, dark ? 0.06 : 0.045),
      "--pj-heat-0": rgba(ink, dark ? 0.08 : 0.06),
      "--pj-shadow": dark
        ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 50px -24px rgba(0,0,0,0.7)"
        : `0 1px 0 rgba(255,255,255,0.8) inset, 0 24px 48px -28px ${rgba(ink, 0.35)}`,
    },
  };
};

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Flags an element once it scrolls into view (never un-flags). Returns a
 * callback ref so it also works for elements that mount after data loads.
 */
export const useInView = (options = { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }) => {
  const [node, ref] = useState(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node || inView) return undefined;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, inView]);

  return [ref, inView];
};

/**
 * True while the element is on screen, and false again once it leaves: for
 * pausing decorative loops nobody can see. Starts true so nothing is paused
 * before the observer's first callback.
 */
export const useOnScreen = (margin = "120px") => {
  const [node, ref] = useState(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    if (!node || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: margin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, margin]);

  return [ref, onScreen];
};

/**
 * Puts `className` on the element while it's scrolled out of view, straight on
 * the DOM: for page-level sections, so crossing the viewport pauses their
 * decorations without re-rendering the whole page. Leave `className` out of
 * the element's JSX className (React only rewrites it when that prop changes).
 */
export const useOffScreenClass = (className = "is-off", margin = "120px") => {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => node.classList.toggle(className, !entry.isIntersecting), {
      rootMargin: margin,
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.classList.remove(className);
    };
  }, [className, margin]);

  return ref;
};

/** Eased count-up that starts when `start` flips true and re-runs when `target` changes. */
export const useCountUp = (target, start = true, duration = 1400) => {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!start || !Number.isFinite(target)) return undefined;
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }
    const from = fromRef.current;
    const began = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = from + (target - from) * eased;
      fromRef.current = current;
      setValue(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, duration]);

  return value;
};

/** Re-renders every `interval` ms so relative timestamps stay honest. */
export const useNow = (interval = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
};

/** Sets --mx/--my on the element for cursor-following spotlight effects. */
export const useSpotlight = () =>
  useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);

export const useDocumentTitle = (title) => {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
};
