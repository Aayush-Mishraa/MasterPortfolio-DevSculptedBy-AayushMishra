import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import Error404 from "../errors/error404/Error";
import TestCase, { caseId } from "./TestCase";
import EnquiryForm from "./EnquiryForm";
import { PROVIDER } from "./Services";
import { SERVICES, bookingFor, formatPrice, serviceBySlug, serviceSchema } from "../../data/services";
import { PROFILE } from "../home/homeData";
import "./Services.css";

/*
  F11: one page per offer (/services/<slug>), for search and for sharing a
  single offer: the full test case, how to start (F12 adds the enquiry form
  here: F12) and the other offers.
*/

export default function ServiceDetail({ theme, match, location }) {
  const service = serviceBySlug(match.params.slug);
  if (!service) return <Error404 theme={theme} location={location} />;
  const booking = bookingFor(service.slug);
  const others = SERVICES.filter((item) => item.slug !== service.slug);
  const schema = JSON.stringify({ "@context": "https://schema.org", ...serviceSchema(service, PROVIDER) });

  return (
    <PageShell theme={theme} className="sv sv-detail">
      <Helmet>
        <script type="application/ld+json">{schema}</script>
      </Helmet>

      <section className="hm-section sv-hero sv-detail__hero" aria-labelledby="sv-detail-title">
        <div className="hm-shell">
          <nav className="sv-crumbs" aria-label="Breadcrumb">
            <Link to="/services">Services</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{caseId(service.slug)}</span>
          </nav>
          <h1 className="sv-hero__title" id="sv-detail-title">
            {service.title}
          </h1>
          <p className="hm-lead">
            {service.tagline} {service.outcome}
          </p>
          <dl className="sv-detail__facts">
            {formatPrice(service.slug) && (
              <div>
                <dt>Price</dt>
                <dd>{formatPrice(service.slug)}</dd>
              </div>
            )}
            <div>
              <dt>Duration</dt>
              <dd>{service.timeline}</dd>
            </div>
            <div>
              <dt>Replies</dt>
              <dd>{PROFILE.responseTime}</dd>
            </div>
          </dl>
          {service.slug === "mentoring" && (
            <p className="hm-lead">
              <Link to="/mentoring">See the sessions, prices in rupees and booking links on the mentoring page →</Link>
            </p>
          )}
        </div>
      </section>

      <section className="hm-section sv-detail__case" aria-label="The test case">
        <div className="hm-shell">
          <TestCase service={service} headingLevel={2} detail />
        </div>
      </section>

      <section className="hm-section sv-enquire" id="enquire" aria-labelledby="sv-enquire-title">
        <div className="hm-shell">
          <div className="hm-card sv-enquire__card">
            <p className="hm-eyebrow">Enquire</p>
            <h2 className="hm-h2" id="sv-enquire-title">
              Start with <span className="hm-grad">{service.title}.</span>
            </h2>
            <p className="hm-lead">
              Tell me about your product, stack and timeline. You&apos;ll get a reply in {PROFILE.responseTime} and,
              if it&apos;s a fit, a free 20-minute scope call.
            </p>
            {booking && (
              <div className="sv-enquire__book">
                <p>
                  <strong>Ready to go?</strong> Pick a time and pay on {booking.provider}; the call is confirmed at
                  once.
                </p>
                <a href={booking.url} className="hm-btn hm-btn--primary" target="_blank" rel="noopener noreferrer">
                  Book &amp; pay · {formatPrice(service.slug)}{" "}
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                </a>
              </div>
            )}
            <EnquiryForm service={service} />
          </div>
        </div>
      </section>

      <section className="hm-section sv-others" aria-labelledby="sv-others-title">
        <div className="hm-shell">
          <header className="hm-head">
            <div>
              <p className="hm-eyebrow">Other services</p>
              <h2 className="hm-h2" id="sv-others-title">
                The rest of <span className="hm-grad">the plan.</span>
              </h2>
            </div>
            <Link to="/services" className="hm-link">
              All services <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </header>
          <ul className="sv-others__grid">
            {others.map((item) => (
              <li key={item.slug}>
                <Link to={`/services/${item.slug}`} className="hm-card sv-others__card">
                  <span className="sv-others__id">{caseId(item.slug)}</span>
                  <strong>{item.title}</strong>
                  <span>{item.tagline}</span>
                  {formatPrice(item.slug) && <em>{formatPrice(item.slug)}</em>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
