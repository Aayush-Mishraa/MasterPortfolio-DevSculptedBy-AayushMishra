# F09 · Hygiene

**Stage 1 · Effort S · Status: done, except the résumé PDF (waiting for Aayush's new file)**

## Acceptance criteria
- [ ] **Résumé at `/resume.pdf`:** ready to switch. The Google Drive PDF is outdated (old title, Keywords Studios "Present", personal phone and Gmail), so it was not copied. Drop the new file at `public/resume.pdf` and set `greeting.resumeLink` to `"/resume.pdf"` in `src/portfolio.js`; the contact page's label follows, and `tests/e2e/f09-hygiene.spec.ts` checks the link returns a PDF.
- [x] **Scroll-reveal content visible by default.** Every reveal (home sections, contact sections, footer, Projects panels and brief, Open Source gauges) and the Projects / Open Source hero entrances now start visible and only slide in; nothing sits at `opacity: 0` waiting for a scroll that a screenshot, crawler or background tab never makes. (Slides are transforms, which don't count as layout shift.)
- [x] **Favicon and manifest.** One manifest link (there were two); manifest gets `id`, `scope`, `start_url: "/"`, a description, the page colour as background, and `purpose: "any"` (the logo isn't drawn inside a maskable safe zone). `/favicon.ico` and `/apple-touch-icon.png` exist at the root (browsers ask for them directly, and since F06 a missing file is a real 404). Every icon the HTML and manifest reference exists (tested).
- [x] **CLS stays 0.** Under 0.02 on every top-level page at 1280 px and 375 px (tested), ~0.000–0.003 measured. What it took:
  - metric-matched fallback fonts (F06);
  - **self-hosted Inter and JetBrains Mono** (`public/fonts/`, OFL): the latin files are preloaded and use `font-display: optional`, so the real font is there for the first paint and a late font never swaps in and reflows text. This fixed a 41 px jump of the contact hero on phones, and drops the Google Fonts request (one less third party);
  - the contact status pill keeps to one line on phones (its text changes length with the time and used to wrap).
- [x] Found on the way: the Projects "Ready when you are" label failed contrast (3.3:1) once it was visible; now #15803d on light themes (passes AA in the axe check) and #4ade80 on dark.

## Measurements (2026-10-04, final build)
Real throttled Chrome at 375 px (4× CPU, 1.6 Mbps, 150 ms, cold cache) on the local Apache stack. Each comparison is one session with alternating runs (median of 4), because absolute numbers on this machine move by up to ±0.7 s between sessions.

| Same page, only the font setup changed | `/` LCP | `/contact` LCP | `/contact` CLS |
|---|---|---|---|
| F09: self-hosted, preloaded, `optional` | **4.2 s** | **4.1 s** | **0.001** |
| F07: Google Fonts, not blocking, `swap` | 5.1 s | 4.8 s | 0.036 |

| Second session | `/` LCP | `/contact` LCP |
|---|---|---|
| F09 as built | **4.6 s** | **4.3 s** |
| F09 without the two font preloads | 5.6 s | 5.7 s |

So the self-hosted fonts are faster as well as stable, and the preloads earn their place. FCP = LCP on both pages: the largest text is there in the first paint. Lighthouse mobile (simulated) today: performance 35 / 38 / 30 on `/`, `/contact`, `/projects`, CLS 0.001 everywhere; its simulated LCP of 12–15 s is the JavaScript bundle (see F06), and its TBT read 1,120 ms against 260 ms in the F07 run with no JavaScript change in between, so Lighthouse scores aren't comparable across sessions on this machine. The 2.5 s gate is still open.

## Test plan
`tests/e2e/f09-hygiene.spec.ts`: reveal blocks visible without their in-view state on 4 pages; favicons, touch icon and every manifest icon return images; one manifest link; the résumé link (Drive today, a PDF once switched); no layout shift on 8 pages at both widths.

## Rollback
Revert the F09 commit.
