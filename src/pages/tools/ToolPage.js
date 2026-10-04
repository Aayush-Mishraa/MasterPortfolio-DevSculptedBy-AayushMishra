import React from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import { KIND_LABEL } from "../../data/tools";
// The form styles (.sv-form*) and crumbs come from the services page.
import "../services/Services.css";
import "./Tools.css";

/*
  The frame every free tool shares (/free-tools/<slug>): breadcrumb, title,
  lead, the tool itself, then a closing call to action that leads to a
  service. Each tool brings only its body.
*/

export function ToolHero({ tool, title, lead, children }) {
  return (
    <section className="hm-section ft-hero" aria-labelledby="ft-title">
      <div className="hm-shell">
        <nav className="sv-crumbs" aria-label="Breadcrumb">
          <Link to="/free-tools">Free tools</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{tool.title}</span>
        </nav>
        <p className="hm-pill ft-hero__kind">
          <i className={tool.icon} aria-hidden="true" /> {KIND_LABEL[tool.kind]}
        </p>
        <h1 className="ft-hero__title" id="ft-title">
          {title || tool.title}
        </h1>
        <p className="hm-lead">{lead || tool.tagline}</p>
        {children}
      </div>
    </section>
  );
}

export function ToolCta({ eyebrow = "Need a human on it?", title, text, to = "/services", label = "See the services" }) {
  return (
    <section className="hm-section ft-cta" aria-labelledby="ft-cta-title">
      <div className="hm-shell">
        <div className="hm-card ft-cta__card">
          <div>
            <p className="hm-eyebrow">{eyebrow}</p>
            <h2 className="hm-h2" id="ft-cta-title">
              {title}
            </h2>
            <p className="hm-lead">{text}</p>
          </div>
          <div className="ft-cta__actions">
            <Link to={to} className="hm-btn hm-btn--primary">
              {label} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link to="/free-tools" className="hm-link">
              More free tools <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ToolPage({ theme, className = "", children }) {
  return (
    <PageShell theme={theme} className={`ft ${className}`}>
      {children}
    </PageShell>
  );
}
