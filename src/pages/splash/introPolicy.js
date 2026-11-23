import { settings } from "../../portfolio";

// When the intro plays. The router and the home page both ask here, so the
// page never waits for an intro that isn't coming (or starts under one that is).
//  - /splash (the hero's "Play intro" and the header logo) always plays it
//  - / plays it on a browser's first visit, when settings.isSplash is on;
//    once seen (played, skipped or left) / goes straight to the page.
//    Browsers block sound until a click, so it opens on the Enter screen.
//  - crawlers and Lighthouse never get it: they always land on the page
// public/index.html makes the same call before the app loads (intro-boot),
// so keep the two in step.

const SEEN_KEY = "portfolio:intro-seen";
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|pagespeed|prerender|facebookexternalhit|embedly|preview/i;

export function introPlaysAt(pathname) {
  if (pathname === "/splash") return true;
  if (!settings.isSplash || pathname !== "/") return false;
  if (BOT_UA.test(navigator.userAgent || "")) return false;
  try {
    return window.localStorage.getItem(SEEN_KEY) !== "1";
  } catch (error) {
    // Storage blocked: we couldn't remember it, so don't replay it every visit.
    return false;
  }
}

export function markIntroSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch (error) {
    // Storage blocked: introPlaysAt already skips the auto-play then.
  }
}
