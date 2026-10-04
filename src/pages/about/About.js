import React from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import portraitWebp from "../../assets/images/ProfileImage.webp";
import portraitPng from "../../assets/images/ProfileImage.png";
import { CAREER_START, CORE_STACK, AI_AGENTS, PROFILE, TRAJECTORY, yearsSince } from "../home/homeData";
import { seo } from "../../portfolio";
import { HIRE_ME_WITH_FILM, startHireFilm } from "../hire/hireFilm";
import "./About.css";

/*
  F10: About is the person behind the services. It gathers what used to sit
  in the menu on its own (Experience, Education, the Automation Arsenal) and
  links to each. Every fact comes from src/portfolio.js through homeData (the
  current employer stays unnamed here, as on the home page).
*/

const SECTIONS = [
  { to: "/experience", label: "Experience", icon: "fa-solid fa-briefcase" },
  { to: "/education", label: "Education", icon: "fa-solid fa-graduation-cap" },
  { to: "/automation-arsenal", label: "Automation Arsenal", icon: "fa-solid fa-robot" },
  { to: "/work", label: "Work", icon: "fa-solid fa-diagram-project" },
];

export default function About({ theme }) {
  const years = yearsSince(CAREER_START);

  return (
    <PageShell theme={theme} className="ab">
      <section className="hm-section ab-hero" aria-labelledby="ab-title">
        <div className="hm-shell ab-hero__grid">
          <div>
            <p className="hm-eyebrow">About</p>
            <h1 className="ab-hero__title" id="ab-title">
              {PROFILE.name}, <span className="hm-grad">{PROFILE.role}.</span>
            </h1>
            <p className="hm-lead">
              I make software safe to ship: the frameworks, CI quality gates and AI-assisted tests that decide when a
              release is ready, and the QA team that runs them. I started in data science and machine learning, then
              merged it into quality engineering. That&apos;s why AI-assisted testing is home turf.
            </p>
            <dl className="ab-facts">
              <div>
                <dt>Experience</dt>
                <dd>{years}+ years in QA automation</dd>
              </div>
              <div>
                <dt>Based in</dt>
                <dd>
                  {PROFILE.country} · {PROFILE.workModes}
                </dd>
              </div>
              <div>
                <dt>Core stack</dt>
                <dd>{CORE_STACK.slice(0, 6).join(" · ")}</dd>
              </div>
              <div>
                <dt>AI testing</dt>
                <dd>{AI_AGENTS.join(" · ")}</dd>
              </div>
            </dl>
          </div>
          <picture className="hm-card ab-portrait">
            <source srcSet={portraitWebp} type="image/webp" />
            <img src={portraitPng} alt={`${PROFILE.name}, smiling, in a dark blazer`} width="760" height="653" />
          </picture>
        </div>
      </section>

      <section className="hm-section ab-career" aria-labelledby="ab-career-title">
        <div className="hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">Career</p>
              <h2 className="hm-h2" id="ab-career-title">
                git log <span className="hm-grad">--oneline</span>
              </h2>
            </div>
            <Link to="/experience" className="hm-link">
              Full experience <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </header>
          <ol className="hm-card ab-log">
            {TRAJECTORY.map((row) => (
              <li key={row.key} className={`ab-log__row ab-log__row--${row.type}`}>
                <span className="ab-log__date">{row.date}</span>
                <span className="ab-log__title">
                  {row.title}
                  {row.org && <span className="ab-log__org"> · {row.org}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hm-section ab-more" aria-labelledby="ab-more-title">
        <div className="hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">More about me</p>
              <h2 className="hm-h2" id="ab-more-title">
                The details, <span className="hm-grad">one page each.</span>
              </h2>
            </div>
          </header>
          <ul className="ab-more__grid">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <Link to={section.to} className="hm-card ab-more__card">
                  <i className={section.icon} aria-hidden="true" />
                  <strong>{section.label}</strong>
                  <span>{(seo.pages[section.to] || {}).description}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="ab-cta">
            <Link to="/services" className="hm-btn hm-btn--primary">
              Work with me <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link to={HIRE_ME_WITH_FILM} className="hm-btn hm-btn--ghost" onClick={startHireFilm}>
              Hiring full-time? <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
