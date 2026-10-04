import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { SERVICES, formatPrice } from "../../../data/services";
import { useReveal } from "../lib/motion";
import "./Offers.css";

/*
  F10/F11: the home page is services-first, so the offers come right after
  the hero: the featured test cases from src/data/services.js, each with its
  price and a link to its page, and the way to the full plan.
*/

const FEATURED = SERVICES.filter((service) => service.featured);

export default function Offers() {
  const ref = useRef(null);
  useReveal(ref);

  return (
    <section className="hm-section hm-offers" id="hm-services" aria-labelledby="hm-offers-title" ref={ref}>
      <div className="hm-shell">
        <header className="hm-head">
          <div data-reveal>
            <p className="hm-eyebrow">
              <b>01</b> Services
            </p>
            <h2 className="hm-h2" id="hm-offers-title">
              Hire the release check, <span className="hm-grad">not just the tester.</span>
            </h2>
            <p className="hm-lead">
              Fixed-scope QA work for teams that ship: start small with a review, or bring me in to build the suite.
            </p>
          </div>
          <Link to="/services" className="hm-btn hm-btn--ghost" data-reveal style={{ "--d": "120ms" }}>
            <i className="fa-solid fa-list-check" aria-hidden="true" /> All {SERVICES.length} services
          </Link>
        </header>

        <ul className="hm-offers__grid">
          {FEATURED.map((service, i) => (
            <li key={service.slug} data-reveal style={{ "--d": `${i * 90}ms` }}>
              <Link to={`/services/${service.slug}`} className="hm-card hm-offer">
                <span className="hm-offer__id hm-mono">
                  <i className="fa-solid fa-check" aria-hidden="true" /> TC-
                  {String(SERVICES.indexOf(service) + 1).padStart(2, "0")}
                </span>
                <i className={`${service.icon} hm-offer__icon`} aria-hidden="true" />
                <strong className="hm-offer__title">{service.title}</strong>
                <span className="hm-offer__tagline">{service.tagline}</span>
                <span className="hm-offer__meta">
                  <span>{service.timeline}</span>
                  {formatPrice(service.slug) && <b>{formatPrice(service.slug)}</b>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
