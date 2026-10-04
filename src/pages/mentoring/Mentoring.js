import React from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import EnquiryForm from "../services/EnquiryForm";
import { MENTORING_FAQ, SESSIONS, formatInr, sessionLinks, sessionPrice } from "../../data/mentoring";
import { serviceBySlug } from "../../data/services";
import "../services/Services.css";
import "../tools/Tools.css";

/*
  F28: /mentoring. Three sessions in INR, each booked and paid on Cal.com
  (card), Razorpay (UPI) or Topmate: whichever links are set in
  src/data/pricing.js. Until a session has a link, the enquiry form below
  (service "mentoring") takes the request.
*/

const MENTORING = serviceBySlug("mentoring");

export default function Mentoring({ theme }) {
  const anyLinks = SESSIONS.some((session) => sessionLinks(session.id).length > 0);

  return (
    <PageShell theme={theme} className="ft mentoring">
      <section className="hm-section ft-hero" aria-labelledby="mt-title">
        <div className="hm-shell">
          <p className="hm-eyebrow">Mentoring · SDET mock interviews</p>
          <h1 className="ft-hero__title" id="mt-title">
            Practise the interview <span className="hm-grad">before the one that counts.</span>
          </h1>
          <p className="hm-lead">
            One-to-one sessions with a Senior SDET and QA lead: mock interviews with honest written feedback, career calls
            for testers moving into automation, and reviews of your framework or résumé.
          </p>
          <div className="ft-hero__actions">
            <a href="#sessions" className="hm-btn hm-btn--primary">
              Pick a session <i className="fa-solid fa-arrow-down" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="hm-section" id="sessions" aria-labelledby="mt-sessions">
        <div className="hm-shell">
          <h2 className="ft-h2" id="mt-sessions">
            Sessions
          </h2>
          <ul className="ft-grid">
            {SESSIONS.map((session) => {
              const price = sessionPrice(session.id);
              const links = sessionLinks(session.id);
              return (
                <li key={session.id} className="hm-card ft-cl__section" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <span className="ft-tile__icon" aria-hidden="true">
                    <i className={session.icon} />
                  </span>
                  <h3 style={{ margin: "0.4rem 0 0" }}>
                    {session.title} {session.featured && <span>start here</span>}
                  </h3>
                  <p className="ft-stat" style={{ margin: 0, padding: "0.6rem 0.8rem" }}>
                    <strong style={{ fontSize: "1.4rem", color: "var(--hm-text)" }}>{price ? formatInr(price) : "—"}</strong>{" "}
                    <span className="ft-muted">· {session.length}</span>
                  </p>
                  <p className="ft-muted" style={{ margin: 0 }}>
                    {session.for}
                  </p>
                  <ul>
                    {session.covers.map((point) => (
                      <li key={point}>
                        <i className="fa-solid fa-check" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: "auto", display: "grid", gap: "0.5rem" }}>
                    {links.length ? (
                      links.map((link, index) => (
                        <a
                          key={link.url}
                          href={link.url}
                          className={`hm-btn ${index === 0 ? "hm-btn--primary" : "hm-btn--ghost"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.label}
                          {link.note ? ` (${link.note})` : ""}
                        </a>
                      ))
                    ) : (
                      <a href="#request" className="hm-btn hm-btn--ghost">
                        Request this session
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="ft-hint" style={{ marginTop: "1rem" }}>
            Prices in Indian rupees, per session. Paying from outside India works by card on the booking page.
          </p>
        </div>
      </section>

      <section className="hm-section" id="request" aria-labelledby="mt-request">
        <div className="hm-shell ft-two">
          <div className="ft-prose">
            <h2 className="ft-h2" id="mt-request">
              {anyLinks ? "Something else in mind?" : "Request a session"}
            </h2>
            <p>
              Tell me the role you&apos;re preparing for, your timeline and the session you want. I&apos;ll reply with times
              and a payment link.
            </p>
            {MENTORING_FAQ.map((item) => (
              <details key={item.q} className="ft-roi__math">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
            <p style={{ marginTop: "1.5rem" }}>
              <Link to="/starter-kit" className="hm-link">
                Learning Playwright? The Starter Kit <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </p>
          </div>
          <div className="hm-card ft-panel">
            <div className="ft-panel__body sv">{MENTORING && <EnquiryForm service={MENTORING} />}</div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
