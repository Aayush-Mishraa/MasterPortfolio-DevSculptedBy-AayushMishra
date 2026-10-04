import { unlockFilmScore } from "../home/components/film/filmScore";
import { prefersReducedMotion } from "../home/lib/motion";

/*
  The "Hire me" and "Hiring full-time?" buttons play the 30-second film first,
  then land on /hire-me: the film plays over the page and fades out to it.
  The flag rides in history state, so a shared or typed /hire-me URL opens
  the page straight away. With reduced motion the page opens with no film.
*/

export const HIRE_ME_WITH_FILM = { pathname: "/hire-me", state: { film: true } };

// Call it inside the click: lets the film's score start on Safari too.
export function startHireFilm() {
  if (!prefersReducedMotion()) unlockFilmScore();
}
