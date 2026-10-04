/*
  F22 Flaky Test Doctor: the analysis, all in the browser.

  Input: one or more "runs". A run is a JUnit XML report or a CI log
  (Playwright, Jest, pytest, Cypress, Maven Surefire/TestNG, Go). A test is
  flaky when, for the same test, a run shows both a failure and a pass
  (a retry that passed, or different results across runs), or when the
  reporter itself says "flaky".

  Output: the flaky tests ranked by how much they hurt (failures, then how
  often they flip), each with a likely cause from its error messages and a fix.
*/

const MAX_MESSAGE = 1200;

/* ------------------------------------------------------------------ */
/* Likely causes                                                       */
/* ------------------------------------------------------------------ */

export const CAUSES = [
  {
    id: "overlay",
    title: "Something covers the element (animation, overlay, toast)",
    pattern: /intercepts pointer events|not stable|element is not visible|is obscured|click intercepted|other element would receive the click|outside of the viewport|scroll into view|animation/i,
    fix: "Wait for the overlay or spinner to be hidden before the click (expect(locator).toBeHidden()), disable animations in tests (reducedMotion: 'reduce' or a CSS override), and avoid force: true, which hides the real bug.",
  },
  {
    id: "timing",
    title: "Timing: the test doesn't wait for the right thing",
    pattern: /timeout|timed out|waiting for (selector|locator|element)|TimeoutError|exceeded while waiting|element not (found|visible|interactable)|no such element|NoSuchElement|ElementNotInteractable|cy\.(get|contains)\(\) .* never found/i,
    fix: "Replace fixed sleeps and one-off reads with auto-waiting assertions (toBeVisible, toHaveText, expect.poll), wait for the network response the UI depends on (page.waitForResponse), and give slow CI the timeout it needs instead of hoping.",
  },
  {
    id: "stale",
    title: "The DOM re-rendered under the test",
    pattern: /stale element|StaleElementReference|element is detached|not attached to the DOM|detached from the DOM|Execution context was destroyed|navigat(ed|ion) .* (destroyed|interrupted)/i,
    fix: "Don't hold on to element handles: re-query with a locator each time, and wait for the page or list to finish updating (a loading flag, a count) before acting on it.",
  },
  {
    id: "network",
    title: "Network or an external service",
    pattern: /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|getaddrinfo|net::ERR_|fetch failed|\b50[234]\b|Bad Gateway|Service Unavailable|Gateway Time-?out|connection (reset|refused)|rate limit|429/i,
    fix: "Mock third-party calls at the network layer (page.route / msw), run your own services as containers in CI with a health check before the tests start, and assert on your app's handling of the failure instead of the provider's uptime.",
  },
  {
    id: "data",
    title: "Shared test data or test order",
    pattern: /already exists|duplicate (key|entry)|unique constraint|violates .* constraint|\b409\b|Conflict|deadlock|lock wait timeout|not found.*(user|record|row|item)|expected (length|count|size)|to have (length|count)/i,
    fix: "Give every test its own data (unique ids per test or worker), clean up in afterEach or use transactions that roll back, and run the suite shuffled (--shuffle / pytest-randomly) to expose hidden order dependencies.",
  },
  {
    id: "clock",
    title: "Clock, dates or time zones",
    pattern: /time ?zone|timezone|\bUTC\b|daylight|midnight|Invalid Date|\bdate\b|\d{4}-\d{2}-\d{2}T\d{2}|moment|dayjs|date-fns/i,
    fix: "Freeze the clock in tests (page.clock.install / fake timers / freezegun), set TZ=UTC in CI and compare dates in one zone, and never assert on 'today' without controlling it.",
  },
  {
    id: "resources",
    title: "CI resources: the browser or worker crashed",
    pattern: /out of memory|heap (limit|out)|ENOSPC|ENOMEM|SIGKILL|killed|page crashed|Target (page, context or browser )?(has been )?closed|browser has been closed|worker (process )?(exited|crashed)|Protocol error/i,
    fix: "Run fewer workers on CI (or a bigger runner), close pages and contexts you open, and look for memory leaks in long-lived fixtures. A crash is rarely the test's fault; it shows up as flakiness.",
  },
  {
    id: "order",
    title: "Results come back in a different order",
    pattern: /order|sorted|random|shuffle|Math\.random|uuid|nondetermin/i,
    fix: "Sort both sides before comparing, assert on sets instead of arrays, and seed any randomness the test depends on.",
  },
  {
    id: "assertion",
    title: "An assertion reads async state too early",
    pattern: /expect(ed)?\b|AssertionError|assert(ion)? failed|toBe|toEqual|to equal|but (got|was|received)|Received:/i,
    fix: "Assert with retrying matchers (toHaveText, toHaveValue, expect.poll, Cypress .should) rather than reading a value once, and wait for the state change the test expects instead of the next tick.",
  },
];

const UNKNOWN = {
  id: "unknown",
  title: "No error message to go on",
  fix: "Reproduce it: run only this test with --repeat-each=30 (Playwright) or a loop, keep traces and videos on the first retry, and compare a failing trace with a passing one step by step.",
};

export function likelyCause(messages) {
  const text = messages.join("\n");
  if (!text.trim()) return UNKNOWN;
  return CAUSES.find((cause) => cause.pattern.test(text)) || UNKNOWN;
}

/* ------------------------------------------------------------------ */
/* Collecting results                                                  */
/* ------------------------------------------------------------------ */

function collector() {
  const tests = new Map();
  const get = (suite, name) => {
    const key = `${suite || ""}::${name}`;
    if (!tests.has(key)) tests.set(key, { key, suite: suite || "", name, outcomes: [], messages: [], marked: false, retriedPass: 0 });
    return tests.get(key);
  };
  return {
    tests,
    record(run, suite, name, outcome, message) {
      const test = get(suite, name);
      test.outcomes.push({ run, outcome });
      if (message && test.messages.length < 5) test.messages.push(String(message).slice(0, MAX_MESSAGE).trim());
      return test;
    },
    mark(suite, name, message) {
      const test = get(suite, name);
      test.marked = true;
      if (message && test.messages.length < 5) test.messages.push(String(message).slice(0, MAX_MESSAGE).trim());
      return test;
    },
  };
}

/* ------------------------------------------------------------------ */
/* JUnit XML                                                           */
/* ------------------------------------------------------------------ */

export function looksLikeJunit(text) {
  return /<testsuites?[\s>]/.test(text) || /<testcase[\s>]/.test(text);
}

function parseJunit(text, run, sink) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("This XML couldn't be read (is the file complete?).");
  const cases = Array.from(doc.getElementsByTagName("testcase"));
  if (!cases.length) throw new Error("No <testcase> elements in this XML.");
  cases.forEach((node) => {
    const name = node.getAttribute("name") || "(unnamed)";
    const suite = node.getAttribute("classname") || (node.parentNode && node.parentNode.getAttribute && node.parentNode.getAttribute("name")) || "";
    const child = (tag) => Array.from(node.children).filter((element) => element.tagName.toLowerCase() === tag.toLowerCase());
    const describe = (element) => [element.getAttribute("message"), element.textContent].filter(Boolean).join("\n");
    const failures = child("failure").concat(child("error"));
    // Surefire / Gradle / pytest-rerunfailures retry markers
    const flaky = child("flakyFailure").concat(child("flakyError"));
    const reruns = child("rerunFailure").concat(child("rerunError"), child("rerun"));
    const skipped = child("skipped").length > 0;

    if (flaky.length) {
      // Failed, then passed on a rerun inside this run.
      flaky.forEach((element) => sink.record(run, suite, name, "fail", describe(element)));
      sink.record(run, suite, name, "pass").retriedPass += 1;
    } else if (failures.length) {
      reruns.forEach((element) => sink.record(run, suite, name, "fail", describe(element)));
      sink.record(run, suite, name, "fail", describe(failures[0]));
    } else if (skipped) {
      sink.record(run, suite, name, "skip");
    } else {
      sink.record(run, suite, name, "pass");
    }
    const props = Array.from(node.getElementsByTagName("property"));
    if (props.some((prop) => /flaky/i.test(prop.getAttribute("name") || "") && /true|1|yes/i.test(prop.getAttribute("value") || "")))
      sink.mark(suite, name);
  });
  return cases.length;
}

/* ------------------------------------------------------------------ */
/* CI logs                                                             */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line no-control-regex
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
// GitHub Actions / GitLab prefixes: "2026-10-04T10:11:12.1234567Z "
const stripStamp = (line) => line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\s?/, "");

function playwrightTitle(rest) {
  // "[chromium] › tests/login.spec.ts:12:5 › Login › signs in (retry #1) (5.1s)"
  const clean = rest.replace(/\s+\(\d+(\.\d+)?m?s\)\s*$/, "").replace(/\s+\(retry #\d+\)\s*$/i, "").trim();
  const parts = clean.split(/\s+›\s+/);
  const project = /^\[[^\]]+\]$/.test(parts[0]) ? parts.shift() : "";
  const file = parts.length > 1 ? parts.shift().replace(/:\d+:\d+$/, "") : "";
  return { suite: [project, file].filter(Boolean).join(" "), name: parts.join(" › ") || clean };
}

function parseLog(raw, run, sink) {
  const lines = stripAnsi(raw).split("\n").map(stripStamp);
  let found = 0;
  let section = null;
  let lastFailed = null;
  const errorLines = [];
  const flush = () => {
    if (lastFailed && errorLines.length) {
      lastFailed.messages.push(errorLines.join("\n").slice(0, MAX_MESSAGE));
    }
    errorLines.length = 0;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let match;

    // ---- Playwright list/line reporter ----
    if ((match = /^\s*(✓|✘|×|✗|-|ok|x)\s+\d+\s+(\[[^\]]+\]\s+›.*|.+?\.(spec|test)\.[jt]sx?:\d+:\d+\s+›.*)$/.exec(line))) {
      flush();
      const { suite, name } = playwrightTitle(match[2]);
      const failed = /✘|×|✗|x/.test(match[1]);
      const retry = /\(retry #\d+\)/i.test(match[2]);
      if (match[1] === "-") sink.record(run, suite, name, "skip");
      else {
        const test = sink.record(run, suite, name, failed ? "fail" : "pass");
        if (!failed && retry) test.retriedPass += 1;
        lastFailed = failed ? test : null;
      }
      found += 1;
      continue;
    }
    // Playwright summary: "  2 flaky" followed by indented titles
    if ((match = /^\s*\d+\s+(flaky|failed|passed|skipped|did not run)\s*$/.exec(line))) {
      flush();
      section = match[1] === "flaky" ? "pw-flaky" : null;
      continue;
    }
    if (section === "pw-flaky") {
      if ((match = /^\s+(\[[^\]]+\]\s+›.+|.+?\.(spec|test)\.[jt]sx?:\d+:\d+\s+›.+)$/.exec(line))) {
        const { suite, name } = playwrightTitle(match[1]);
        sink.mark(suite, name);
        found += 1;
        continue;
      }
      if (!line.trim()) continue;
      section = null;
    }

    // ---- Maven Surefire / Failsafe "Flakes:" block ----
    if (/^\[(WARNING|ERROR|INFO)\]\s+Flakes:\s*$/.test(line)) {
      flush();
      section = "mvn-flakes";
      continue;
    }
    if (section === "mvn-flakes") {
      if ((match = /^\[(WARNING|ERROR|INFO)\]\s+([\w.$]+)\.([\w$]+)(\[.*\])?\s*$/.exec(line))) {
        const test = sink.mark(match[2], match[3] + (match[4] || ""));
        lastFailed = test;
        found += 1;
        continue;
      }
      if ((match = /^\[(WARNING|ERROR|INFO)\]\s+Run \d+:\s+(PASS|.+)$/.exec(line))) {
        if (lastFailed && match[2] !== "PASS") lastFailed.messages.push(match[2].slice(0, MAX_MESSAGE));
        continue;
      }
      if (/^\[(WARNING|ERROR|INFO)\]\s*$/.test(line)) continue;
      section = null;
    }

    // ---- pytest ----
    if ((match = /^([\w/.\\-]+\.py)::(\S+?)\s+(PASSED|FAILED|ERROR|SKIPPED|XFAIL|XPASS|RERUN)\b/.exec(line))) {
      flush();
      const outcome = match[3] === "PASSED" || match[3] === "XPASS" ? "pass" : match[3] === "SKIPPED" || match[3] === "XFAIL" ? "skip" : "fail";
      const test = sink.record(run, match[1], match[2], outcome);
      lastFailed = outcome === "fail" ? test : null;
      found += 1;
      continue;
    }
    if ((match = /^(FAILED|ERROR)\s+([\w/.\\-]+\.py)::(\S+)(?:\s+-\s+(.*))?$/.exec(line))) {
      // The short summary repeats earlier results: keep only its message.
      const existing = sink.tests.get(`${match[2]}::${match[3]}`);
      if (existing && match[4] && existing.messages.length < 5) existing.messages.push(match[4].slice(0, MAX_MESSAGE));
      continue;
    }

    // ---- Go ----
    if ((match = /^\s*--- (PASS|FAIL|SKIP): (\S+)/.exec(line))) {
      flush();
      const outcome = match[1] === "PASS" ? "pass" : match[1] === "SKIP" ? "skip" : "fail";
      const test = sink.record(run, "go", match[2], outcome);
      lastFailed = outcome === "fail" ? test : null;
      found += 1;
      continue;
    }

    // ---- Jest / Vitest / Mocha / Cypress spec lines ----
    if ((match = /^\s+(✓|✔|√|✕|✖|×)\s+(.+?)(?:\s+\(\d+(?:\.\d+)?\s*m?s\))?\s*$/.exec(line))) {
      flush();
      const failed = /✕|✖|×/.test(match[1]);
      const name = match[2].replace(/\s+\(attempt \d+ of \d+\)$/i, "").trim();
      const test = sink.record(run, "", name, failed ? "fail" : "pass");
      if (!failed && /\(attempt [2-9]\d* of \d+\)/i.test(match[2])) test.retriedPass += 1;
      lastFailed = failed ? test : null;
      found += 1;
      continue;
    }
    // Mocha / Cypress numbered failures: "  1) Login does x:"
    if ((match = /^\s+\d+\)\s+(.+?):?\s*$/.exec(line)) && !/passing|failing|pending/.test(line)) {
      flush();
      const parts = match[1].split(/\s{2,}|\s›\s/).filter(Boolean);
      const name = parts[parts.length - 1];
      const existing = Array.from(sink.tests.values()).find((test) => test.name === name || match[1].endsWith(test.name));
      lastFailed = existing || sink.record(run, "", name, "fail");
      continue;
    }
    // Jest retry marker: "  ● Suite › test name › RETRY 1"
    if ((match = /^\s+●\s+(.+?)\s+›\s+RETRY\s+\d+/.exec(line))) {
      const name = match[1].split(" › ").pop();
      sink.record(run, "", name, "fail");
      found += 1;
      continue;
    }
    // Jest failure header: "  ● Suite › test name" → the error follows
    if ((match = /^\s+●\s+(.+)$/.exec(line))) {
      flush();
      const name = match[1].split(" › ").pop().trim();
      lastFailed = Array.from(sink.tests.values()).find((test) => test.name === name) || null;
      continue;
    }

    // ---- error text under the last failed test ----
    if (lastFailed && line.trim() && errorLines.length < 12) {
      if (/(Error|Exception|expect|Timeout|timed out|assert|Received|Expected|ECONN|net::|locator|waiting for)/i.test(line) || errorLines.length) {
        errorLines.push(line.trim());
      }
    }
  }
  flush();
  return found;
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

/**
 * @param {{name: string, text: string}[]} inputs one entry per file or paste (each is a run)
 * @returns {{runs: number, tests: number, flaky: object[], alwaysFailing: object[], warnings: string[], kinds: string[]}}
 */
export function analyze(inputs) {
  const sink = collector();
  const warnings = [];
  const kinds = [];
  let runs = 0;
  inputs.forEach((input) => {
    const text = (input.text || "").trim();
    if (!text) return;
    try {
      if (looksLikeJunit(text)) {
        // Several reports pasted one after another: split on the XML prolog or root.
        const docs = text.split(/(?=<\?xml)/).filter((part) => part.trim());
        docs.forEach((doc) => {
          parseJunit(doc, runs, sink);
          runs += 1;
          kinds.push("JUnit XML");
        });
      } else {
        const count = parseLog(text, runs, sink);
        if (!count) warnings.push(`${input.name}: no test results recognised. Supported: Playwright, Jest/Vitest, pytest, Cypress/Mocha, Maven Surefire, Go.`);
        else {
          runs += 1;
          kinds.push("CI log");
        }
      }
    } catch (error) {
      warnings.push(`${input.name}: ${error.message}`);
    }
  });

  const all = Array.from(sink.tests.values());
  const summarise = (test) => {
    const fails = test.outcomes.filter((o) => o.outcome === "fail").length;
    const passes = test.outcomes.filter((o) => o.outcome === "pass").length;
    let flips = 0;
    const ordered = test.outcomes.filter((o) => o.outcome !== "skip");
    for (let i = 1; i < ordered.length; i += 1) if (ordered[i].outcome !== ordered[i - 1].outcome) flips += 1;
    const attempts = fails + passes;
    const failRate = attempts ? fails / attempts : 0;
    const flipRate = ordered.length > 1 ? flips / (ordered.length - 1) : 0;
    const cause = likelyCause(test.messages);
    // Impact: failures it caused, weighted up when it flips often (it can't be trusted either way).
    const score = Math.round((fails * 10 + flips * 6 + (test.marked ? 8 : 0) + test.retriedPass * 4) * (0.6 + flipRate));
    return { ...test, fails, passes, flips, failRate, flipRate, cause, score };
  };
  const flaky = all
    .filter((test) => test.marked || (test.outcomes.some((o) => o.outcome === "fail") && test.outcomes.some((o) => o.outcome === "pass")))
    .map(summarise)
    .sort((a, b) => b.score - a.score || b.fails - a.fails || a.name.localeCompare(b.name));
  const alwaysFailing = all
    .filter((test) => !flaky.find((item) => item.key === test.key) && test.outcomes.length && test.outcomes.every((o) => o.outcome === "fail"))
    .map(summarise);

  return { runs, tests: all.length, flaky, alwaysFailing, warnings, kinds: Array.from(new Set(kinds)) };
}

/** A Markdown summary for a ticket or a PR comment. */
export function toMarkdown(result) {
  const rows = result.flaky.map(
    (test, index) =>
      `| ${index + 1} | \`${test.name.replace(/\|/g, "\\|")}\` | ${test.fails} | ${Math.round(test.failRate * 100)}% | ${test.cause.title} |`
  );
  return [
    `## Flaky tests (${result.flaky.length} of ${result.tests}, from ${result.runs} run${result.runs === 1 ? "" : "s"})`,
    "",
    "| # | Test | Failures | Fail rate | Likely cause |",
    "|---|------|---------:|----------:|--------------|",
    ...rows,
    "",
    ...result.flaky.slice(0, 5).map((test) => `**${test.name}**: ${test.cause.fix}`),
    "",
    "_Found with the Flaky Test Doctor: https://aayushmishra.engineer/free-tools/flaky-test-doctor_",
  ].join("\n");
}
