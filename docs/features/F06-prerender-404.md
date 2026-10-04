# F06 · Prerender + real 404

**Stage 1 · Effort M · Depends on: F05 · Status: done (code); mobile LCP target not met yet (see Measurements)**

## Goal
Every URL serves real HTML (title, meta, canonical, Open Graph, body text) before any JavaScript runs; unknown URLs get a real 404; there is one home URL.

## Acceptance criteria
- [x] After the build, `scripts/prerender/prerender.mjs` (playwright-core, headless Chromium, reduced motion, no intro) renders every route and writes `build/index.html` (/) and `build/_pages/<route>.html`: 8 pages, one per repository in the snapshot (34) and one per Tech Universe channel (13). Live third-party feeds aren't baked in (their requests are held, so those panels show their loading state).
- [x] Raw HTML per page: unique `<title>`, meta description, canonical, og:title/description/url/image (1200×630 per route in `build/og/`), Twitter image, JSON-LD, and the page's text. Tech Universe pages now get the same SEO header as the rest of the site.
- [x] `public/.htaccess` (LiteSpeed-safe directives only) serves `_pages/` under clean URLs; an unknown page, repository or channel is a real **404** with the site's own 404 page (`build/404.html`, noindex); `/home` → 301 → `/` (query kept); `/contact/` → 301 → `/contact`; www → apex; `/universe/radio` → `/universe/music`; `/_pages/…` itself is 403.
- [x] `sitemap.xml` (51 URLs: pages, own repositories, channels) and `llms.txt` generated from the prerendered pages. A repository whose name contains a blocked client term (`tests/fixtures/blocked-terms.txt`) is reachable but never listed; forks aren't listed.
- [x] Canonical home is `/` (decision); `/splash` stays a client-side replay route.
- [x] CI: the deploy prerenders, then `scripts/prerender/check-html.mjs` asserts unique titles, canonicals, OG tags, body text, the contact text on `/contact`, a noindex 404, and a sitemap that lists only real pages. The Live check runs the same checks over HTTP on the live site, plus real 404 status and the `/home` 301.
- [x] The app adopts the prerendered page (`ReactDOM.hydrate`) when it is that URL's HTML in the default theme; otherwise (a visitor's own theme, `/splash`, the 404 page) it renders over it. Either way the HTML paints first.
- [ ] After deploy: flush the Hostinger CDN and check with `?v=<random>` (Aayush, hPanel).
- [ ] Mobile LCP < 2.5 s (Stage 1 gate): not yet, see below.

## Measurements (local Apache, Chrome 153, mobile 412 px)
| | Before (F05) | After F06 |
|---|---|---|
| Real throttled run (4× CPU, 1.6 Mbps, 150 ms), `/contact` | FCP ≈ LCP ≈ 13 s (nothing paints until the app runs) | FCP = LCP ≈ 5.0 s, from the HTML |
| Same, `/` | ≈ 13 s | FCP = LCP ≈ 5.2–7.6 s |
| Lighthouse mobile (simulated), `/contact` | FCP 13.5 s, LCP 14.2 s | FCP 4.2 s, LCP 11.5 s (Lantern's estimate; varies run to run) |
| CLS on load, `/experience` / `/` | 0.033 / 0.008 | 0.003 / 0.001 |

What stands between this and 2.5 s, from traces: one layout pass of the large page (~2,000 objects) costs ~2.7 s at 4× CPU, and the 432 KB (82 KB gz) stylesheet and ~1 MB of JavaScript compete for the same bandwidth. Next steps (not done today): per-page critical CSS with the full stylesheet loaded async, splitting the JS and CSS by route, and a lighter home page DOM. Lighthouse desktop and real mid-range phones on 4G will be far better than the simulated slow-4G numbers.

## Related changes made here
- Metric-matched fallback fonts (`Inter Fallback`, `JetBrains Mono Fallback` in `src/index.css`) after every Inter/JetBrains Mono stack, so the font swap doesn't move text (this is F09's "CLS stays 0").
- Google Fonts CSS no longer blocks the first paint; self-hosted fonts use `font-display: swap`; the contact avatar is WebP (24 KB instead of a 262 KB PNG).
- The bundles load with `defer` in prerendered pages; the GitHub Pages redirect hack (`public/404.html`, the decoder script in `index.html`) is gone; the `<noscript>` banner is removed (it broke the no-JS layout).

## Security notes
Prerendering runs against the local build only; no secrets involved. `_pages/` isn't directly addressable; `/api` and `/admin` keep their own rules.

## Test plan
- `scripts/prerender/check-html.mjs` (CI, every build) and `--live` (after every deploy).
- `tests/e2e/f06-prerender.spec.ts`: raw HTML of /contact, unique titles, real 404s (page, repo, channel) with the 404 page, `/home` 301 with query, sitemap/llms/OG image, and no layout shift while the app boots on the prerendered page (static pages; F07 adds the data pages).
- Whole suite against Apache (`tests/server`): 92 passed.

## Rollback
Revert the F06 commit and redeploy, then flush the CDN. The old `.htaccess` sends every path to `index.html` again (soft 404s).
