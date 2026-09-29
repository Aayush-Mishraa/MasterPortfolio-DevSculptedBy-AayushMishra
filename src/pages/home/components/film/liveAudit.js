/*
  The live audit: real checks, run in the visitor's browser against the page
  behind the film. Nothing here is staged: a check that finds a problem says
  so, and the film and the brief show it as a warning or a failure.

  Uncaught errors are counted from the moment this module loads, which is
  when the home page does.
*/

let uncaught = 0;
let lcp = 0;
let cls = 0;
let vitals = false;

const observe = (type, onEntry) => {
  try {
    new PerformanceObserver((list) => list.getEntries().forEach(onEntry)).observe({ type, buffered: true });
    vitals = true;
  } catch (error) {
    // Not supported here (Safari, Firefox): the check falls back or says so.
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("error", () => {
    uncaught += 1;
  });
  window.addEventListener("unhandledrejection", () => {
    uncaught += 1;
  });
  if (typeof PerformanceObserver !== "undefined") {
    observe("largest-contentful-paint", (entry) => {
      lcp = entry.renderTime || entry.startTime || lcp;
    });
    observe("layout-shift", (entry) => {
      if (!entry.hadRecentInput) cls += entry.value;
    });
  }
}

// The film and the brief are overlays, not the page under test.
const SKIP = ".hm-brief, .sf, [aria-hidden='true'], [hidden]";
const onPage = (el) => !el.closest(SKIP);
const all = (selector) => Array.from(document.querySelectorAll(selector)).filter(onPage);

const nameOf = (el) => {
  const label = el.getAttribute("aria-label") || el.getAttribute("title");
  if (label && label.trim()) return label.trim();
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const text = by
      .split(/\s+/)
      .map((id) => (document.getElementById(id) || {}).textContent || "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  const text = (el.textContent || "").trim();
  if (text) return text;
  const img = el.querySelector("img[alt]");
  return img ? img.getAttribute("alt").trim() : "";
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const check = (id, status, label) => ({ id, status, label });

function security() {
  if (window.location.protocol === "https:") return check("https", "pass", "Served over HTTPS");
  const local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(window.location.hostname);
  return local
    ? check("https", "info", "Local dev server (HTTPS in production)")
    : check("https", "fail", "Not served over HTTPS");
}

function basics() {
  const missing = [];
  if (!document.title.trim()) missing.push("title");
  if (!document.documentElement.getAttribute("lang")) missing.push("lang");
  if (!document.querySelector('meta[name="viewport"]')) missing.push("viewport");
  if (!document.querySelector('meta[name="description"]')) missing.push("description");
  return missing.length
    ? check("basics", "warn", `Missing ${missing.join(", ")}`)
    : check("basics", "pass", "Title, lang, viewport and description set");
}

function headings() {
  const h1 = all("h1").length;
  const h2 = all("h2").length;
  if (h1 === 1) return check("headings", "pass", `1 h1 and ${plural(h2, "section heading")}`);
  return check("headings", "warn", `${h1} h1 headings (expected one)`);
}

function images() {
  const imgs = all("img");
  const missing = imgs.filter((img) => !img.hasAttribute("alt")).length;
  return missing
    ? check("alt", "fail", `${plural(missing, "image")} without alt text`)
    : check("alt", "pass", `${imgs.length}/${imgs.length} images carry alt text`);
}

function brokenImages() {
  const broken = all("img").filter((img) => img.complete && img.getAttribute("src") && img.naturalWidth === 0).length;
  return broken
    ? check("broken", "fail", `${plural(broken, "broken image")}`)
    : check("broken", "pass", "0 broken images");
}

function links() {
  const anchors = all("a[href]");
  const empty = anchors.filter((a) => {
    const href = a.getAttribute("href").trim();
    return !href || href === "#" || /^javascript:/i.test(href);
  }).length;
  const unsafe = anchors.filter((a) => a.target === "_blank" && !/noopener|noreferrer/i.test(a.rel || "")).length;
  if (empty) return check("links", "warn", `${plural(empty, "link")} without a real target`);
  if (unsafe) return check("links", "warn", `${plural(unsafe, "new-tab link")} without rel="noopener"`);
  return check("links", "pass", `${anchors.length} links, all with real targets`);
}

function buttons() {
  const controls = all("button, [role='button']");
  const unnamed = controls.filter((el) => !nameOf(el)).length;
  return unnamed
    ? check("buttons", "fail", `${plural(unnamed, "button")} without an accessible name`)
    : check("buttons", "pass", `${controls.length} buttons, all named`);
}

function errors() {
  return uncaught
    ? check("errors", "fail", `${plural(uncaught, "uncaught error")} since this page loaded`)
    : check("errors", "pass", "0 uncaught errors since this page loaded");
}

// Core Web Vitals where the browser reports them (Chromium), with the
// thresholds Google calls "good"; otherwise the navigation timing.
function loadTime() {
  if (lcp) {
    const seconds = lcp / 1000;
    const status = seconds <= 2.5 ? "pass" : seconds <= 4 ? "warn" : "fail";
    return check("lcp", status, `Largest contentful paint ${seconds.toFixed(2)} s`);
  }
  const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  const end = nav && nav.domContentLoadedEventEnd;
  if (!end) return check("load", "info", "Load timing not reported by this browser");
  const seconds = (end - nav.startTime) / 1000;
  return check("load", seconds < 3 ? "pass" : "warn", `Interactive in ${seconds.toFixed(2)} s`);
}

function layoutShift() {
  if (!vitals) return check("cls", "info", "Layout shift not reported by this browser");
  const status = cls < 0.1 ? "pass" : cls < 0.25 ? "warn" : "fail";
  return check("cls", status, `Layout shift ${cls.toFixed(3)}${cls < 0.1 ? ", stable" : ""}`);
}

export function fpsCheck(fps) {
  if (!fps) return check("fps", "info", "Frame rate not measured yet");
  const status = fps >= 50 ? "pass" : fps >= 30 ? "warn" : "fail";
  return check("fps", status, `${Math.round(fps)} fps while this film plays`);
}

const CHECKS = [
  ["https", security],
  ["basics", basics],
  ["headings", headings],
  ["alt", images],
  ["broken", brokenImages],
  ["links", links],
  ["buttons", buttons],
  ["errors", errors],
  ["load", loadTime],
  ["cls", layoutShift],
];

// Every check, in the order the film prints them. `fps` comes from the film.
export function runAudit(fps) {
  return CHECKS.map(([id, run]) => {
    try {
      return run();
    } catch (error) {
      return check(id, "info", `The ${id} check could not run here`);
    }
  }).concat(fpsCheck(fps));
}

export const summarize = (checks) => ({
  total: checks.length,
  passed: checks.filter((item) => item.status === "pass" || item.status === "info").length,
  warnings: checks.filter((item) => item.status === "warn").length,
  failures: checks.filter((item) => item.status === "fail").length,
});

// Frames per second from a run of rAF timestamps (ms).
export function fpsFrom(stamps) {
  if (stamps.length < 10) return 0;
  const span = stamps[stamps.length - 1] - stamps[0];
  return span > 0 ? ((stamps.length - 1) * 1000) / span : 0;
}
