import { useEffect, useLayoutEffect, useState } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { settings } from "../../../portfolio";

gsap.registerPlugin(CustomEase);

// The house curve, cubic-bezier(0.22, 1, 0.36, 1), shared with --hm-ease in
// Home.css and the other redesigned pages.
export const EASE = CustomEase.create("hm", "0.22,1,0.36,1");

export { gsap };

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia) &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const hasFinePointer = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia) &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ------------------------------------------------------------------ */
/* The intro handshake                                                  */
/* ------------------------------------------------------------------ */

/*
  Splash.js plays over the home page on /splash (and on / when
  settings.isSplash is on). It sets html.intro-cover while the page is hidden
  and html.intro-active until its signature lands on the header logo.

  The route has to decide whether to wait: our effects run before the intro's
  own effect adds those classes, so checking the classes alone would start the
  hero behind the curtain.
*/
const introExpected = () => {
  const path = window.location.pathname;
  return path === "/splash" || (settings.isSplash && path === "/");
};

const LAND_WITHOUT_INTRO_MS = 700;
const REVEAL_AFTER_CURTAIN_S = 0.4;
const FAILSAFE_MS = 12000;

/**
 * Drives a hero through hold → reveal → land, in step with the intro.
 *  - onHold()        the intro is about to cover the page: reset to the start
 *  - onReveal(delay) the curtain is lifting (delay in seconds), or no intro
 *  - onLand()        the signature has landed (or 700ms after a plain load)
 * Re-arms when the logo replays the intro over the mounted page.
 * Returns a cleanup function.
 */
export const watchIntro = ({ onHold, onReveal, onLand }) => {
  const html = document.documentElement;
  let covered = html.classList.contains("intro-cover");
  let active = html.classList.contains("intro-active");
  let waiting = false;
  let landTimer = null;
  let failsafe = null;

  const land = () => {
    clearTimeout(failsafe);
    if (!waiting) return;
    waiting = false;
    onLand();
  };

  const hold = () => {
    clearTimeout(landTimer);
    clearTimeout(failsafe);
    waiting = true;
    onHold();
    failsafe = setTimeout(() => {
      onReveal(0);
      land();
    }, FAILSAFE_MS);
  };

  const observer = new MutationObserver(() => {
    const nowCovered = html.classList.contains("intro-cover");
    const nowActive = html.classList.contains("intro-active");
    if (nowCovered && !covered && !waiting) hold();
    if (!nowCovered && covered) onReveal(REVEAL_AFTER_CURTAIN_S);
    if (!nowActive && active) land();
    covered = nowCovered;
    active = nowActive;
  });
  observer.observe(html, { attributes: true, attributeFilter: ["class"] });

  if (covered || active || introExpected()) {
    hold();
  } else {
    waiting = true;
    onReveal(0);
    landTimer = setTimeout(land, LAND_WITHOUT_INTRO_MS);
  }

  return () => {
    observer.disconnect();
    clearTimeout(landTimer);
    clearTimeout(failsafe);
  };
};

/* ------------------------------------------------------------------ */
/* Hooks                                                                */
/* ------------------------------------------------------------------ */

// useLayoutEffect warns during server rendering; this app only renders in the browser.
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Runs `setup` inside a gsap.context scoped to `ref`, so every tween it creates
 * is reverted on unmount. `setup` may return its own cleanup.
 */
export const useGsap = (ref, setup, deps = []) => {
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return undefined;
    let cleanup;
    const ctx = gsap.context(() => {
      cleanup = setup();
    }, ref);
    return () => {
      if (typeof cleanup === "function") cleanup();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * True while the element is on screen (or within `rootMargin` of it).
 * `once` keeps it true after the first sighting.
 */
export const useOnScreen = (ref, { rootMargin = "0px", threshold = 0, once = false } = {}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin, threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, once]);
  return visible;
};

/**
 * Marks every [data-reveal] inside `ref` with data-in as it scrolls into view,
 * staggered by its --d delay. CSS does the actual transition. It's an
 * attribute rather than a class because React rewrites className whenever a
 * component re-renders, which would hide revealed elements again.
 */
export const useReveal = (ref, deps = []) => {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const nodes = Array.from(root.querySelectorAll("[data-reveal]:not([data-in])"));
    const show = (node) => node.setAttribute("data-in", "");
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      nodes.forEach(show);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/** Ticks every `interval` ms; used by the live clocks. */
export const useNow = (interval = 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
};

/* ------------------------------------------------------------------ */
/* Text                                                                 */
/* ------------------------------------------------------------------ */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_/<>";

/** Left-to-right decode, each character flickering before it settles (as in the intro). */
export const scramble = (text, progress) => {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const start = (i / text.length) * 0.7;
    if (text[i] === " " || progress >= start + 0.3) out += text[i];
    else if (progress < start) out += " ";
    else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return out;
};
