# F07 · Static GitHub data

**Stage 1 · Effort S · Depends on: nothing (works with F06) · Status: done (code)**

## Goal
Projects and Open Source never call the GitHub API from the visitor's browser. They show the build-time snapshot, refreshed by a scheduled build, render the real numbers from the first paint, and leave housekeeping commits out of the public feeds.

## Acceptance criteria
- [x] `/projects`, `/projects/<repo>` and `/opensource` read only `public/data/github` (`index.json` + `repos/<name>.json`). No request to `api.github.com/users|repos/Aayush-Mishraa`, `api.github.com/search/issues` or the contributions API from the browser (tested). `githubClient.js` keeps only the generic JSON cache the news feeds use.
- [x] The snapshot (`scripts/automation/fetch_projects_snapshot.mjs`, run in `prebuild`) now also holds the recent-commit stream, the public activity feed and authored pull requests.
- [x] Scheduled refresh: `deploy.yml` runs every 6 hours (`17 */6 * * *`) and on demand; `prebuild` re-fetches the snapshot, so a scheduled run rebuilds and redeploys with fresh data.
- [x] The "API x/60" counter and the refresh button are gone; the pill says "Synced from GitHub · <time ago>".
- [x] Public feeds leave out `ci:`, `chore:`, `fix:` and merge commits (also "Fix…/Fixed…"): Projects' latest commits and Open Source's activity log. Pushes are matched to their head commit in the snapshot (the events API no longer sends messages). The per-repository commit log on a project page still shows the full history, and the home film's bug log is about fixes by design.
- [x] Counters show the real number from the first render, never a fake 0 (a dash while data loads; no count-up from 0). The prerendered HTML carries the same numbers.
- [x] No flash or shift when the app takes over: the snapshot is preloaded with the HTML (`<link rel="preload">`) and `src/index.js` waits for it (max 4 s) before adopting the page.
- [x] HTML and data from different builds are never mixed. The CDN or a browser cache can serve the prerendered HTML of one scheduled build with the JSON of the next; hydrating that would patch the text and keep the old links (React 16 doesn't fix attributes). Data pages carry `data-snapshot` (the `generatedAt` of the files they were built from), and `src/index.js` adopts the page only when the loaded snapshot matches; otherwise it renders fresh. Found while testing F09; fix committed on top of F09.
- [x] Copy updated: "synced from GitHub several times a day", "re-synced every six hours", "Activity log" instead of "Live transmission".

## Security / privacy notes
Visitors' browsers no longer talk to GitHub for this data (no rate-limit errors, no third-party request with their IP). The CI token used by `prebuild` is the workflow's read-only `GITHUB_TOKEN`.

## Test plan
`tests/e2e/f07-static-github.spec.ts` (desktop + mobile): no own-data GitHub requests on three pages; no API counter or refresh button; the Repositories counter equals the snapshot in raw HTML and after boot; no housekeeping messages in the stream or activity log; layout shift < 0.02 while the app adopts `/projects` and `/opensource`; data pages carry the right `data-snapshot`; a matching snapshot keeps the prerendered nodes (hydrated), and the next build's snapshot gets a fresh render with the new links (failed before the fix).

## Rollback
Revert the F07 commit; the pages call the GitHub API live again (and show the rate-limit counter).
