import React from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import { KIND_LABEL, TOOLS, toolPath } from "../../data/tools";
import "../services/Services.css";
import "./Tools.css";

/*
  /free-tools: every free tool and download in one place (Stage 3). The list
  is src/data/tools.js; the paid next steps are linked at the bottom.
*/

export default function ToolsHub({ theme }) {
  return (
    <PageShell theme={theme} className="ft ft-hub">
      <section className="hm-section ft-hero" aria-labelledby="ft-hub-title">
        <div className="hm-shell">
          <p className="hm-eyebrow">Free tools · no sign-up to use</p>
          <h1 className="ft-hero__title" id="ft-hub-title">
            Tools I built for <span className="hm-grad">shipping with confidence.</span>
          </h1>
          <p className="hm-lead">
            The checks and calculators I use with teams, free to use. Most run entirely in your browser: nothing you paste
            leaves your machine. The checklist and full quiz report arrive by email.
          </p>
        </div>
      </section>

      <section className="hm-section ft-hub__list" aria-label="Free tools">
        <div className="hm-shell">
          <ul className="ft-grid">
            {TOOLS.map((tool) => (
              <li key={tool.slug} className="hm-card ft-tile">
                <span className="ft-tile__icon" aria-hidden="true">
                  <i className={tool.icon} />
                </span>
                <p className="ft-tile__kind">{KIND_LABEL[tool.kind]}</p>
                <h2 className="ft-tile__title">
                  <Link to={toolPath(tool.slug)}>{tool.title}</Link>
                </h2>
                <p className="ft-tile__text">{tool.tagline}</p>
                <span className="ft-tile__go" aria-hidden="true">
                  Open <i className="fa-solid fa-arrow-right" />
                </span>
              </li>
            ))}
            <li className="hm-card ft-tile">
              <span className="ft-tile__icon" aria-hidden="true">
                <i className="fa-solid fa-comments" />
              </span>
              <p className="ft-tile__kind">AI, with its eval scores</p>
              <h2 className="ft-tile__title">
                <Link to="/ask">Ask my site&apos;s AI</Link>
              </h2>
              <p className="ft-tile__text">
                Questions about my work and services, answered only from this site, with sources and its own eval scores.
              </p>
              <span className="ft-tile__go" aria-hidden="true">
                Open <i className="fa-solid fa-arrow-right" />
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="hm-section ft-cta" aria-labelledby="ft-hub-next">
        <div className="hm-shell">
          <div className="hm-card ft-cta__card">
            <div>
              <p className="hm-eyebrow">When a tool isn&apos;t enough</p>
              <h2 className="hm-h2" id="ft-hub-next">
                Templates, mentoring and hands-on help.
              </h2>
              <p className="hm-lead">
                The Playwright + AI Starter Kit, mock interviews for SDETs, and QA services from a 60-minute release
                review to a fractional QA lead.
              </p>
            </div>
            <div className="ft-cta__actions">
              <Link to="/services" className="hm-btn hm-btn--primary">
                Services <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/starter-kit" className="hm-link">
                Starter Kit <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/mentoring" className="hm-link">
                Mentoring <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
