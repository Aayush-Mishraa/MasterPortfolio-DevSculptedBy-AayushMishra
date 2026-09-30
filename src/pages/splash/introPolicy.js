import { settings } from "../../portfolio";

// When the intro plays. The router and the home page both ask here, so the
// page never waits for an intro that isn't coming (or starts under one that is).
//  - /splash (the header logo) always plays it
//  - / plays it on the first visit of a browser session, when settings.isSplash
//    is on; later visits in the same session go straight to the page

const SEEN_KEY = "portfolio:intro-seen";

export function introPlaysAt(pathname) {
  if (pathname === "/splash") return true;
  if (!settings.isSplash || pathname !== "/") return false;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch (error) {
    return true;
  }
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch (error) {
    // Storage blocked: the intro may play again on the next visit to /.
  }
}
