import React, { useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import { briefFacts, briefProof } from "../home/components/briefData";
import { CAPABILITIES, CAREER_START, PROFILE, RECOMMENDATIONS, yearsSince } from "../home/homeData";
import { KIT_PDF, RECRUITER_KIT } from "../../data/recruiterKit";
import "../services/Services.css";
import "./RecruiterKit.css";

/*
  F26: the recruiter one-pager, /hire-me/kit. Prints to exactly one A4 page
  (the deploy renders it to /aayush-mishra-recruiter-kit.pdf), and "sudo hire
  aayush" leads here. Role fit, availability, references and a calendar link,
  all from src/portfolio.js and src/data/recruiterKit.js.
*/

export default function RecruiterKit({ theme }) {
  const facts = useMemo(() => briefFacts(yearsSince(CAREER_START)), []);
  const proof = briefProof(null);
  const fit = facts.filter((fact) => ["Now", "Experience", "Open to", "Location", "Core stack", "AI testing", "Education"].includes(fact.label));
  const site = "aayushmishra.engineer";

  return (
    <PageShell theme={theme} className="rk">
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="hm-shell rk-actions">
        <nav className="sv-crumbs" aria-label="Breadcrumb">
          <Link to="/hire-me">Hire me</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Recruiter kit</span>
        </nav>
        <div className="rk-actions__buttons">
          <a href={KIT_PDF} className="hm-btn hm-btn--primary" download>
            <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Download PDF
          </a>
          <button type="button" className="hm-btn hm-btn--ghost" onClick={() => window.print()}>
            <i className="fa-solid fa-print" aria-hidden="true" /> Print
          </button>
        </div>
      </div>

      <article className="rk-sheet" aria-labelledby="rk-name">
        <header className="rk-head">
          <div>
            <h1 id="rk-name">{PROFILE.name}</h1>
            <p className="rk-role">{PROFILE.role}</p>
            <p className="rk-status">
              <span className="hm-live" aria-hidden="true" /> {PROFILE.status}
            </p>
          </div>
          <ul className="rk-contact">
            <li>
              <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
            </li>
            {PROFILE.linkedin && (
              <li>
                <a href={PROFILE.linkedin}>{PROFILE.linkedin.replace(/^https?:\/\/(www\.)?/, "")}</a>
              </li>
            )}
            {PROFILE.github && (
              <li>
                <a href={PROFILE.github}>{PROFILE.github.replace(/^https?:\/\/(www\.)?/, "")}</a>
              </li>
            )}
            <li>
              <a href={`https://${site}/hire-me`}>{site}/hire-me</a>
            </li>
          </ul>
        </header>

        <section className="rk-block" aria-labelledby="rk-fit">
          <h2 id="rk-fit">Role fit</h2>
          <dl className="rk-facts">
            {fit.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  <strong>{fact.value}</strong>
                  {fact.note && <span>{fact.note}</span>}
                </dd>
              </div>
            ))}
            {RECRUITER_KIT.noticePeriod && (
              <div>
                <dt>Notice period</dt>
                <dd>
                  <strong>{RECRUITER_KIT.noticePeriod}</strong>
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rk-block" aria-labelledby="rk-proof">
          <h2 id="rk-proof">Highlights</h2>
          <ul className="rk-list">
            {proof.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rk-block" aria-labelledby="rk-bring">
          <h2 id="rk-bring">What I&apos;d bring</h2>
          <div className="rk-bring">
            {CAPABILITIES.slice(0, 4).map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                <ul className="rk-list">
                  {group.points.slice(0, 2).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rk-block rk-two" aria-label="References and next step">
          <div>
            <h2>References</h2>
            {RECOMMENDATIONS.length ? (
              <ul className="rk-refs">
                {RECOMMENDATIONS.slice(0, 2).map((item) => (
                  <li key={item.name}>
                    <q>{item.quote.length > 160 ? `${item.quote.slice(0, 157)}…` : item.quote}</q>
                    <a href={item.link}>
                      {item.name}
                      {item.role ? `, ${item.role}` : ""}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Available on request: former leads and teammates who can speak to my work.</p>
            )}
          </div>
          <div>
            <h2>Next step</h2>
            <p>
              {RECRUITER_KIT.calendarUrl ? (
                <>
                  Book a call: <a href={RECRUITER_KIT.calendarUrl}>{RECRUITER_KIT.calendarUrl.replace(/^https?:\/\//, "")}</a>
                </>
              ) : (
                <>
                  Email <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
                </>
              )}
              . Reply within {PROFILE.responseTime}. Résumé and the full brief: <a href={`https://${site}/hire-me`}>{site}/hire-me</a>
            </p>
          </div>
        </section>
      </article>
    </PageShell>
  );
}
