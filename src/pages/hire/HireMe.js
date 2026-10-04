import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import RecruiterBrief from "../home/components/RecruiterBrief";
import { unlockFilmScore } from "../home/components/film/filmScore";
import { briefFacts, briefPlainText, briefProof } from "../home/components/briefData";
import { Snapshot } from "../home/sections/Trajectory";
import { CAPABILITIES, CAREER_START, PROFILE, useGithub, yearsSince } from "../home/homeData";
import { prefersReducedMotion } from "../home/lib/motion";
import { KIT_PAGE, RECRUITER_KIT, hasVideo } from "../../data/recruiterKit";
import "./HireMe.css";

/*
  F10: the recruiter path. The home page is services-first, so everything a
  hiring team needs lives here: the résumé, the recruiter brief (the same facts
  as the home page's 30-second brief, plus its film), the hiring snapshot and
  what I'd bring to a team. Every line comes from src/portfolio.js.
*/

// Loads the YouTube player only when asked (no third-party requests before the click).
function IntroVideo({ video, name }) {
  const [playing, setPlaying] = useState(false);
  if (video.mp4) {
    return (
      <video className="hr-video__frame" controls preload="none" poster={video.poster || undefined}>
        <source src={video.mp4} type="video/mp4" />
      </video>
    );
  }
  if (playing) {
    return (
      <iframe
        className="hr-video__frame"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeId)}?autoplay=1&rel=0`}
        title={`${name}: a 60-second introduction`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button type="button" className="hr-video__frame hr-video__play" onClick={() => setPlaying(true)}>
      {video.poster && <img src={video.poster} alt="" loading="lazy" />}
      <span>
        <i className="fa-solid fa-circle-play" aria-hidden="true" /> Play the 60-second intro
      </span>
    </button>
  );
}

export default function HireMe({ theme, location, history }) {
  const [briefOpen, setBriefOpen] = useState(false);
  // True when a "Hire me" button sent us here: the film plays, then the page.
  const [filmOnly, setFilmOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  // The contributions count joins the highlights once the brief asks for the snapshot.
  const github = useGithub(briefOpen);
  const years = yearsSince(CAREER_START);
  const facts = useMemo(() => briefFacts(years), [years]);
  const proof = briefProof(null);

  const openBrief = useCallback(() => {
    // Still inside the click: lets the film's score start on Safari too.
    if (!prefersReducedMotion()) unlockFilmScore();
    setFilmOnly(false);
    setBriefOpen(true);
  }, []);
  const closeBrief = useCallback(() => setBriefOpen(false), []);

  // Arrived from a "Hire me" button (see hireFilm.js). The flag is cleared
  // straight away, so a refresh or Back doesn't replay the film.
  useEffect(() => {
    if (!location || !location.state || !location.state.film) return;
    history.replace({ pathname: location.pathname, search: location.search, hash: location.hash });
    if (prefersReducedMotion()) return;
    setFilmOnly(true);
    setBriefOpen(true);
  }, [location, history]);

  const copy = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(briefPlainText(facts, briefProof(github), window.location.origin)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }, () => {});
  };

  return (
    <PageShell
      theme={theme}
      className="hr"
      after={(passVars) => (
        <RecruiterBrief open={briefOpen} onClose={closeBrief} github={github} style={passVars} filmOnly={filmOnly} />
      )}
    >
      <section className="hm-section hr-hero" aria-labelledby="hr-title">
        <div className="hm-shell">
          <p className="hm-pill hr-hero__status">
            <span className="hm-live" aria-hidden="true" />
            <span>{PROFILE.status}</span>
          </p>
          <p className="hm-eyebrow">Hire me · recruiter brief</p>
          <h1 className="hr-hero__title" id="hr-title">
            Hiring a <span className="hm-grad">{PROFILE.role}?</span>
          </h1>
          <p className="hm-lead">
            The short version for hiring teams: what I do today, the roles I&apos;m open to, and the proof behind it.
            Copy it into your ATS notes, grab the résumé, or start a conversation.
          </p>
          <div className="hr-hero__actions">
            <a href={PROFILE.resume} target="_blank" rel="noopener noreferrer" className="hm-btn hm-btn--primary">
              Résumé <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
            </a>
            <button type="button" className="hm-btn hm-btn--ghost" onClick={copy} aria-live="polite">
              <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
              {copied ? "Copied" : "Copy brief as text"}
            </button>
            <button type="button" className="hm-btn hm-btn--link" onClick={openBrief}>
              <i className="fa-solid fa-circle-play" aria-hidden="true" /> 30-second brief
            </button>
            <Link to={KIT_PAGE} className="hm-btn hm-btn--link">
              <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Recruiter kit (one page)
            </Link>
          </div>
          <p className="hr-egg">
            Psst: type <kbd>sudo hire aayush</kbd> anywhere on the site.
          </p>
        </div>
      </section>

      {/* F26: the 60-second intro, once there's a video (src/data/recruiterKit.js). */}
      {hasVideo() && (
        <section className="hm-section hr-video" aria-labelledby="hr-video-title">
          <div className="hm-shell">
            <header className="hm-head">
              <div>
                <p className="hm-eyebrow">60 seconds</p>
                <h2 className="hm-h2" id="hr-video-title">
                  Hear it from me.
                </h2>
              </div>
            </header>
            <IntroVideo video={RECRUITER_KIT.video} name={PROFILE.name} />
          </div>
        </section>
      )}

      <section className="hm-section hr-brief" aria-labelledby="hr-brief-title">
        <div className="hm-shell hr-brief__grid">
          <article className="hm-card hr-card">
            <div className="hm-bar">
              <span className="hm-bar__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="hm-bar__title">recruiter-brief.md</span>
            </div>
            <div className="hr-card__body">
              <h2 className="hr-h3" id="hr-brief-title">
                {PROFILE.name}
              </h2>
              <dl className="hr-facts">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>
                      <strong>{fact.value}</strong>
                      {fact.note && <span>{fact.note}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              <ul className="hr-proof" aria-label="Highlights">
                {proof.map((item) => (
                  <li key={item}>
                    <i className="fa-solid fa-check" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
          <Snapshot onOpenBrief={openBrief} />
        </div>
      </section>

      <section className="hm-section hr-bring" aria-labelledby="hr-bring-title">
        <div className="hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">What I&apos;d bring</p>
              <h2 className="hm-h2" id="hr-bring-title">
                What your team <span className="hm-grad">gets on day one.</span>
              </h2>
            </div>
          </header>
          <ul className="hr-bring__grid">
            {CAPABILITIES.map((group) => (
              <li className="hm-card hr-bring__item" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.points.slice(0, 3).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hm-section hr-next" aria-labelledby="hr-next-title">
        <div className="hm-shell">
          <div className="hm-card hr-next__card">
            <div>
              <p className="hm-eyebrow">Next step</p>
              <h2 className="hm-h2" id="hr-next-title">
                Let&apos;s talk about the role.
              </h2>
              <p className="hm-lead">
                Typical reply time: {PROFILE.responseTime}. The full history is on the Experience page, and the code is
                under Work.
              </p>
            </div>
            <div className="hr-next__actions">
              <Link to="/contact" className="hm-btn hm-btn--primary">
                Start a conversation <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/experience" className="hm-link">
                Experience <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/work" className="hm-link">
                Work <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/education" className="hm-link">
                Education <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
