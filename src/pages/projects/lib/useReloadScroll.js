import { useEffect } from "react";

/*
  On a refresh (or Back/Forward from another site), the Projects pages are
  short until the GitHub data arrives, so the browser's own scroll restoration
  lands in the wrong place (often the footer) and the page then jumps as the
  content fills in. public/index.html turns the browser's restoration off for
  /projects pages; this hook saves the position when the page is left and puts
  the visitor back there once the content is on screen.
*/

const KEY = "projects-scroll:";
const loadedPath = window.location.pathname;

// Only the page instance this document was loaded on restores, and only once
let pending = (() => {
  try {
    const nav = window.performance.getEntriesByType("navigation")[0];
    return Boolean(nav && (nav.type === "reload" || nav.type === "back_forward"));
  } catch (error) {
    return false;
  }
})();
let left = false;

const autoRestore = () => {
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "auto";
};

// Jump, never glide: without Lenis (reduced motion) html's scroll-behavior is smooth
const jumpTo = (y) => {
  const lenis = window.__lenis;
  if (lenis) {
    // Lenis re-measures the page on a debounce; let it see the new height
    // first, or it clamps the jump to the old, shorter page
    if (typeof lenis.resize === "function") lenis.resize();
    lenis.scrollTo(y, { immediate: true, force: true });
    return;
  }
  try {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
  } catch (error) {
    window.scrollTo(0, y);
  }
};

export default function useReloadScroll(ready) {
  // Remember where the visitor was when they refresh or leave
  useEffect(() => {
    const save = () => {
      try {
        window.sessionStorage.setItem(KEY + window.location.pathname, String(Math.round(window.scrollY)));
      } catch (error) {
        // Storage blocked: a refresh starts at the top instead.
      }
      // Chrome decides whether to restore a reload from the mode in force when
      // the page is left (the next document's inline script is too late), and
      // its early restore lands on the not-yet-filled page
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      // Left the page (maybe before the data arrived): a later visit in this
      // tab starts fresh, and the browser handles scrolling again
      left = true;
      pending = false;
      autoRestore();
    };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    if (!pending || left || window.location.pathname !== loadedPath) {
      autoRestore();
      return undefined;
    }
    pending = false;
    let y = 0;
    try {
      y = Number(window.sessionStorage.getItem(KEY + loadedPath)) || 0;
    } catch (error) {
      y = 0;
    }
    // Lazy README images and late sections can still be growing the page, so
    // keep re-applying the position until it's reachable (at most 4 s) or the
    // visitor scrolls on their own
    let done = y <= 0;
    let observer = null;
    const stop = () => {
      done = true;
      if (observer) observer.disconnect();
      ["wheel", "touchstart", "keydown"].forEach((type) => window.removeEventListener(type, stop));
    };
    // Two frames: let the freshly rendered sections lay out first
    let started = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        started = true;
        autoRestore();
        if (done) return;
        jumpTo(y);
        ["wheel", "touchstart", "keydown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
        if (window.ResizeObserver) {
          observer = new window.ResizeObserver(() => {
            if (!done && Math.abs(window.scrollY - y) > 2) jumpTo(y);
          });
          observer.observe(document.body);
        }
      });
    });
    const timer = setTimeout(stop, 4000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      stop();
      // Not ready any more before the jump happened: try again next time
      // (unless the page is being left, which clears `pending` for good)
      if (!started && !left) pending = true;
    };
  }, [ready]);
}
