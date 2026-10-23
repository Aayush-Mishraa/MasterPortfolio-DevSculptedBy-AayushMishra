// When the intro plays (F05: opt-in). It never starts on its own: it plays on
// /splash only, which the hero's "Play intro" button and the header logo link
// to, so every visit lands straight on the page (and its LCP isn't held back).
// The router and the home page both ask here, so the page never waits for an
// intro that isn't coming.

const SEEN_KEY = "portfolio:intro-seen";

export function introPlaysAt(pathname) {
  return pathname === "/splash";
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch (error) {
    // Storage blocked: nothing depends on it.
  }
}
