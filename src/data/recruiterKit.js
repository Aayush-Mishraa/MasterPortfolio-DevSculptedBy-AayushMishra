import { contactPageData } from "../portfolio";

/*
  F26: the recruiter kit. The one-pager (/hire-me/kit, also built into
  /aayush-mishra-recruiter-kit.pdf at deploy) and the 60-second video on
  /hire-me. Everything else on the one-pager comes from src/portfolio.js.

  Empty values are simply left out: no notice period line until it's set,
  no video section until there's a video, references "on request" until
  there are real, linkable recommendations (portfolio.js `recommendations`).
*/

const booking = (contactPageData.contactSection && contactPageData.contactSection.booking) || {};

export const RECRUITER_KIT = {
  // e.g. "30 days" or "Immediate". Left out of the one-pager while empty.
  noticePeriod: "",
  // A calendar link for a first call; defaults to the contact page's booking link.
  calendarUrl: booking.url || "",
  // The 60-second intro video: a YouTube id (privacy-enhanced embed) or an MP4 under public/.
  video: { youtubeId: "", mp4: "", poster: "" },
};

export const KIT_PDF = "/aayush-mishra-recruiter-kit.pdf";
export const KIT_PAGE = "/hire-me/kit";

export const hasVideo = () => Boolean(RECRUITER_KIT.video.youtubeId || RECRUITER_KIT.video.mp4);
