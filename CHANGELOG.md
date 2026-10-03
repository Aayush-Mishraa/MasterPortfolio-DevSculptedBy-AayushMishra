# Changelog

All notable changes to aayushmishra.engineer. Newest first.

## 2026-10-03

### F01 · Data fixes
- One job title, "Senior SDET & QA Lead", and one site title, "Aayush Mishra · Senior SDET & QA Lead", across the hero, intro, footer, contact card, JSON-LD, index.html and the web manifest.
- JSON-LD Person no longer publishes an empty phone or address, or Instagram in `sameAs`; certificates carry a URL only when it is their own.
- Certificate cards corrected against the certificates themselves: links that opened another course's certificate are removed, and the Selenium, Postman, Swift and AWS cards name the right course and issuer.
- Copy fixes: "a variety of courses", "documentary", "Recurrence", "Volunteering".
- Test harness: Playwright (desktop 1280 px + mobile 375 px), axe checks against a baseline, a console-error guard, and cspell (`npm run spell`).

### Housekeeping
- Committed the privacy text and the index.html `onload` fix that were left uncommitted.
- Removed the GitHub Pages leftovers (`gh-pages` package, `predeploy`/`deploy` scripts).
