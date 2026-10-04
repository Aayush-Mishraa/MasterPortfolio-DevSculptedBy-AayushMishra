import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import portraitWebp from "../../../assets/images/ProfileImage.webp";
import portraitPng from "../../../assets/images/ProfileImage.png";
import { CAREER_START, HIGHLIGHTS, PROFILE, availabilityAt, utcLabel, yearsSince } from "../homeData";
import { EASE, gsap, hasFinePointer, prefersReducedMotion, useGsap, useNow, watchIntro } from "../lib/motion";
import EvidenceLog from "../components/EvidenceLog";
import { scrollToId } from "../lib/scroll";
import { introSoundOn } from "../../splash/introPolicy";
import { unlockIntroSound } from "../../splash/introSound";
import { HIRE_ME_WITH_FILM, startHireFilm } from "../../hire/hireFilm";
import "./Hero.css";

/*
  The verdict. Above the fold, in five seconds: who (byline), what (headline
  and lead), proof (the evidence log) and the next step. Services-first
  (F10): the main button goes to /services; hiring teams have their own path
  at /hire-me.

  The intro signs the name; this page is the release report that follows.
  When the intro plays over the page, the hero rises as its curtain lifts, and
  the moment the signature lands on the header logo the underline draws and
  the log passes. On a plain visit the same handshake runs 0.7s after load.
*/

export default function Hero() {
  const rootRef = useRef(null);
  const [landed, setLanded] = useState(prefersReducedMotion);
  const now = useNow(30000);
  const status = availabilityAt(now);
  const years = yearsSince(CAREER_START);

  const rows = [
    { name: "experience", value: `${years}+ yrs` },
    { name: HIGHLIGHTS.testCases.label, value: HIGHLIGHTS.testCases.value },
    { name: HIGHLIGHTS.bugs.label, value: HIGHLIGHTS.bugs.value },
    { name: "manual regression cut", value: HIGHLIGHTS.regression.value },
  ];

  useGsap(
    rootRef,
    () => {
      const q = gsap.utils.selector(rootRef);
      const reduced = prefersReducedMotion();
      let held = false;
      let entrance = null;

      const stop = watchIntro({
        onHold: () => {
          held = true;
          if (reduced) return;
          if (entrance) entrance.kill();
          setLanded(false);
          gsap.set(q(".hm-hero__line > span"), { yPercent: 108 });
          gsap.set(q("[data-rise]"), { autoAlpha: 0, y: 26 });
        },
        onReveal: (delay) => {
          // A plain visit is already on screen: nothing rises, the handshake is the moment.
          if (!held) return;
          held = false;
          if (reduced) return;
          entrance = gsap
            .timeline({ delay, defaults: { ease: EASE, duration: 1 } })
            .to(q(".hm-hero__line > span"), { yPercent: 0, duration: 1.1, stagger: 0.1 }, 0)
            .to(
              q("[data-rise]"),
              { autoAlpha: 1, y: 0, stagger: 0.06, clearProps: "opacity,visibility,transform" },
              0.08
            );
        },
        onLand: () => setLanded(true),
      });

      // The entrance is created later, outside this gsap.context, so it's
      // killed here rather than by the context's revert.
      return () => {
        stop();
        if (entrance) entrance.kill();
      };
    },
    []
  );

  // Only the key light follows the pointer, and only a little.
  useEffect(() => {
    const root = rootRef.current;
    const light = root && root.querySelector(".hm-shot__light");
    if (!light || prefersReducedMotion() || !hasFinePointer()) return undefined;
    const toX = gsap.quickTo(light, "x", { duration: 1.4, ease: "power3" });
    const toY = gsap.quickTo(light, "y", { duration: 1.4, ease: "power3" });
    const onMove = (event) => {
      const rect = root.getBoundingClientRect();
      toX(((event.clientX - rect.left) / rect.width - 0.5) * 24);
      toY(((event.clientY - rect.top) / rect.height - 0.5) * 24);
    };
    const onLeave = () => {
      toX(0);
      toY(0);
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section
      className={`hm-hero ${landed ? "is-landed" : ""}`}
      id="hm-top"
      ref={rootRef}
      aria-labelledby="hm-hero-title"
    >
      <div className="hm-shell hm-hero__grid">
        <div className="hm-hero__copy">
          <p className="hm-pill hm-hero__status" data-rise>
            <span className="hm-live" aria-hidden="true" />
            <span>{PROFILE.servicesStatus}</span>
            <span className="hm-pill__sep" aria-hidden="true" />
            <span className="hm-mono" aria-hidden="true">
              {PROFILE.country} · {status.time} IST
            </span>
          </p>

          <p className="hm-hero__byline" data-rise>
            <picture className="hm-hero__avatar">
              <source srcSet={portraitWebp} type="image/webp" />
              <img src={portraitPng} alt="" width="52" height="52" />
            </picture>
            <span>
              <strong>{PROFILE.name}</strong>
              <span className="hm-hero__byline-sep" aria-hidden="true">
                {" "}
                ·{" "}
              </span>
              <span className="hm-hero__role">{PROFILE.role}</span>
            </span>
          </p>

          <h1 className="hm-hero__title" id="hm-hero-title">
            <span className="hm-sr">{PROFILE.name}: </span>
            <span className="hm-hero__line">
              <span>Every release,</span>
            </span>{" "}
            <span className="hm-hero__line">
              <span className="hm-hero__signed">
                <span className="hm-grad">signed off.</span>
                <svg className="hm-hero__underline" viewBox="0 0 320 24" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M6 15.5C58 7.5 128 4.5 196 8.5c40 2.4 76 6.8 118 3.2" pathLength="1" />
                </svg>
              </span>
            </span>
          </h1>

          <p className="hm-lead hm-hero__lead" data-rise>
            I make software safe to ship. I help teams with release reviews, QA health checks, Playwright frameworks
            and AI-feature evals: the same work I do every day as a QA lead.
          </p>

          <div className="hm-hero__actions" data-rise>
            <Link to="/services" className="hm-btn hm-btn--primary">
              See services <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link to="/contact" className="hm-btn hm-btn--ghost">
              Let&apos;s talk <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link to={HIRE_ME_WITH_FILM} className="hm-btn hm-btn--link" onClick={startHireFilm}>
              <i className="fa-solid fa-user-tie" aria-hidden="true" /> Hiring full-time?
            </Link>
            {/* The intro is opt-in (F05): it plays over this page on /splash. */}
            <Link
              to="/splash"
              className="hm-btn hm-btn--link hm-hero__intro"
              onClick={() => {
                if (introSoundOn()) unlockIntroSound();
              }}
            >
              <i className="fa-solid fa-signature" aria-hidden="true" /> Play intro
            </Link>
          </div>

          <dl className="hm-hero__facts" data-rise>
            <div>
              <dt>Based in</dt>
              <dd>
                {PROFILE.country} · IST ({utcLabel()})
              </dd>
            </div>
            <div>
              <dt>Works</dt>
              <dd>{PROFILE.workModes}</dd>
            </div>
            <div>
              <dt>Replies</dt>
              <dd>within 24h</dd>
            </div>
          </dl>
        </div>

        <div className="hm-hero__visual" data-rise>
          <div className="hm-hero__stage">
            <figure className="hm-shot">
              <div className="hm-shot__grid" aria-hidden="true" />
              <div className="hm-shot__light" aria-hidden="true" />
              <picture className="hm-shot__portrait">
                <source srcSet={portraitWebp} type="image/webp" />
                <img src={portraitPng} alt={`${PROFILE.name}, smiling, in a dark blazer`} width="760" height="653" />
              </picture>
              <span className="hm-shot__corner hm-shot__corner--tl" aria-hidden="true" />
              <span className="hm-shot__corner hm-shot__corner--tr" aria-hidden="true" />
              <span className="hm-shot__corner hm-shot__corner--bl" aria-hidden="true" />
              <span className="hm-shot__corner hm-shot__corner--br" aria-hidden="true" />
              <div className="hm-shot__locator hm-mono" aria-hidden="true">
                <span>
                  getByRole(&apos;img&apos;, {"{"} name: &apos;{PROFILE.name}&apos; {"}"})
                </span>
                <b>✓ visible</b>
              </div>
            </figure>

            <EvidenceLog
              className="hm-hero__log"
              file="aayush.spec.ts"
              rows={rows}
              passed={landed}
              footer={
                <a href="#hm-evidence" className="hm-elog__more" onClick={scrollToId("hm-evidence")}>
                  Full report <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                </a>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
