import React from "react";
import { Link } from "react-router-dom";
import { SERVICES, bookingFor, formatPrice } from "../../data/services";

/*
  One offer, drawn as a test case: id and file in the title bar, then
  preconditions (who it's for), steps (what you get), duration and the
  expected result, with the price and the next step at the bottom.
*/

export const caseId = (slug) => `TC-${String(SERVICES.findIndex((service) => service.slug === slug) + 1).padStart(2, "0")}`;

export default function TestCase({ service, headingLevel = 2, detail = false }) {
  const Heading = `h${headingLevel}`;
  const price = formatPrice(service.slug);
  const booking = bookingFor(service.slug);
  const titleId = `sv-case-${service.slug}`;

  return (
    <article className="hm-card sv-case" id={detail ? undefined : service.slug} aria-labelledby={titleId}>
      <div className="hm-bar">
        <span className="hm-bar__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="hm-bar__title">
          {caseId(service.slug)} · {service.slug}.spec.ts
        </span>
        <span className="sv-case__state">
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> ready
        </span>
      </div>

      <div className="sv-case__body">
        <header className="sv-case__head">
          <i className={`${service.icon} sv-case__icon`} aria-hidden="true" />
          <div>
            <Heading className="sv-case__title" id={titleId}>
              {service.title}
            </Heading>
            <p className="sv-case__tagline">{service.tagline}</p>
          </div>
        </header>

        <dl className="sv-case__grid">
          <div className="sv-case__block">
            <dt>Preconditions · who it&apos;s for</dt>
            <dd>
              <ul>
                {service.audience.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="sv-case__block">
            <dt>Steps · what you get</dt>
            <dd>
              <ol>
                {service.deliverables.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </dd>
          </div>
          <div className="sv-case__block sv-case__block--inline">
            <dt>Duration</dt>
            <dd>{service.timeline}</dd>
          </div>
          <div className="sv-case__block sv-case__block--inline">
            <dt>Expected result</dt>
            <dd>
              <i className="fa-solid fa-check" aria-hidden="true" /> {service.outcome}
            </dd>
          </div>
        </dl>
      </div>

      <footer className="sv-case__foot">
        {price && (
          <p className="sv-case__price">
            <span>Price</span>
            <strong>{price}</strong>
          </p>
        )}
        <div className="sv-case__actions">
          {booking && (
            <a href={booking.url} className="hm-btn hm-btn--primary" target="_blank" rel="noopener noreferrer">
              Book &amp; pay <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
            </a>
          )}
          {detail ? (
            <a href="#enquire" className={`hm-btn ${booking ? "hm-btn--ghost" : "hm-btn--primary"}`}>
              Enquire <i className="fa-solid fa-arrow-down" aria-hidden="true" />
            </a>
          ) : (
            <Link
              to={`/services/${service.slug}`}
              className={`hm-btn ${booking ? "hm-btn--ghost" : "hm-btn--primary"}`}
              aria-label={`${service.title}: details and enquiry`}
            >
              Details &amp; enquiry <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
