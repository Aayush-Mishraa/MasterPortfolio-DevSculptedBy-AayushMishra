# F26 · Recruiter kit

**Stage 3 · Effort S · Status: done in code (not merged or deployed). Waiting for: notice period, a calendar link, the 60-second video.**

## Acceptance criteria
- [x] "sudo hire aayush" typed anywhere on the site (outside form fields) opens a terminal dialog that "grants recruiter privileges" and offers the one-page PDF, the one-pager and "book a call" (or email). Esc / × / backdrop close it; focus returns. `?sudo=hire` opens it too. The Experience page's terminal command now leads to the kit.
- [x] `/hire-me/kit` (noindex): role fit, highlights, what I'd bring, references, next step. Prints to exactly one A4 page; the deploy prints it to `/aayush-mishra-recruiter-kit.pdf` (`scripts/magnets/build-pdfs.mjs`).
- [x] References: real, linkable recommendations from `portfolio.js` only; until there are any, "Available on request".
- [x] `/hire-me`: a "Recruiter kit" link, a hint about the easter egg, and a 60-second video section that appears once `RECRUITER_KIT.video` is set (YouTube privacy-enhanced embed, loaded only on click, or an MP4).

## To fill in (`src/data/recruiterKit.js`)
`noticePeriod`, `calendarUrl` (or the contact page's booking link), `video.youtubeId` or `video.mp4` + `poster`.

## Tests owed
Playwright: typing the phrase opens the dialog (and not inside an input), Esc closes; `/hire-me/kit` print = 1 page; the video facade.
