import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import TestCase from "./TestCase";
import { FAQ, PROCESS, SERVICES, catalogSchema, currenciesInUse, currencyLabel, priceOf } from "../../data/services";
import { PROFILE } from "../home/homeData";
import "./Services.css";

/*
  F11: /services, written as a test plan. The offers, process and FAQ come
  from src/data/services.js, the prices from src/data/pricing.js.
*/

export const PROVIDER = { "@type": "Person", name: PROFILE.name, jobTitle: PROFILE.role, url: "https://aayushmishra.engineer/" };

const SCHEMA = JSON.stringify(catalogSchema(PROVIDER));

// "Prices in US dollars; mentoring in Indian rupees."
function currencyNote() {
  const used = currenciesInUse();
  if (used.length < 2) return `Prices in ${currencyLabel(used[0])}.`;
  const [main, ...rest] = used;
  const others = rest
    .map((code) => {
      const titles = SERVICES.filter((service) => (priceOf(service.slug) || {}).currency === code).map((service) =>
        service.title.split(" ")[0].toLowerCase()
      );
      return `${titles.join(", ")} in ${currencyLabel(code)}`;
    })
    .join("; ");
  return `Prices in ${currencyLabel(main)}; ${others}.`;
}

export default function Services({ theme }) {
  return (
    <PageShell theme={theme} className="sv">
      <Helmet>
        <script type="application/ld+json">{SCHEMA}</script>
      </Helmet>

      <section className="hm-section sv-hero" aria-labelledby="sv-title">
        <div className="hm-shell sv-hero__grid">
          <div>
            <p className="hm-eyebrow">Services · test plan</p>
            <h1 className="sv-hero__title" id="sv-title">
              A test plan for <span className="hm-grad">your next release.</span>
            </h1>
            <p className="hm-lead">
              QA work I take on for teams: release reviews, audits, Playwright frameworks, AI-feature evals and
              accessibility checks. Each one below is written like a test case: who it&apos;s for, what you get, how
              long it takes and the result to expect.
            </p>
            <div className="sv-hero__actions">
              <a href="#plan" className="hm-btn hm-btn--primary">
                See the plan <i className="fa-solid fa-arrow-down" aria-hidden="true" />
              </a>
              <Link to="/services/release-review" className="hm-btn hm-btn--ghost">
                Start with a Release Review <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="hm-card sv-summary" aria-label="Plan summary">
            <div className="hm-bar">
              <span className="hm-bar__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="hm-bar__title">services.plan.ts</span>
            </div>
            <ol className="sv-summary__list">
              {SERVICES.map((service, i) => (
                <li key={service.slug}>
                  <a href={`#${service.slug}`}>
                    <i className="fa-solid fa-check" aria-hidden="true" />
                    <span className="sv-summary__id">TC-{String(i + 1).padStart(2, "0")}</span>
                    <span className="sv-summary__name">{service.title}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="sv-summary__foot">
              {SERVICES.length} cases · {currencyNote()}
            </p>
          </aside>
        </div>
      </section>

      <section className="hm-section sv-plan" id="plan" aria-labelledby="sv-plan-title">
        <div className="hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">The plan</p>
              <h2 className="hm-h2" id="sv-plan-title">
                {SERVICES.length} ways to <span className="hm-grad">ship with confidence.</span>
              </h2>
            </div>
          </header>
          <div className="sv-plan__list">
            {SERVICES.map((service) => (
              <TestCase key={service.slug} service={service} headingLevel={3} />
            ))}
          </div>
        </div>
      </section>

      <section className="hm-section sv-process" aria-labelledby="sv-process-title">
        <div className="hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">Process</p>
              <h2 className="hm-h2" id="sv-process-title">
                How an engagement <span className="hm-grad">runs.</span>
              </h2>
            </div>
          </header>
          <ol className="sv-process__list">
            {PROCESS.map((item, i) => (
              <li className="hm-card sv-process__step" key={item.step}>
                <span className="sv-process__index">{String(i + 1).padStart(2, "0")}</span>
                <h3>{item.step}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hm-section sv-faq" aria-labelledby="sv-faq-title">
        <div className="hm-shell sv-faq__grid">
          <header>
            <p className="hm-eyebrow">FAQ</p>
            <h2 className="hm-h2" id="sv-faq-title">
              Before you <span className="hm-grad">ask.</span>
            </h2>
            <p className="hm-lead">
              Anything else? <Link to="/contact">Send a message</Link>; I reply in {PROFILE.responseTime}.
            </p>
          </header>
          <div className="sv-faq__list">
            {FAQ.map((item) => (
              <details className="hm-card sv-faq__item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
