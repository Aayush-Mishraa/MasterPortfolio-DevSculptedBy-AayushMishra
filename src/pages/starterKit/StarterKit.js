import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import EmailCapture from "../tools/EmailCapture";
import { KIT, kitCheckout, kitPrice } from "../../data/starterKit";
import "../services/Services.css";
import "../tools/Tools.css";

/*
  F27: the Starter Kit storefront. "Buy" links out to the checkout provider
  (Lemon Squeezy / Gumroad) once CHECKOUT["starter-kit"].url is set in
  src/data/pricing.js; until then the page collects a waitlist (magnet
  "starter-kit"). No card handling here. Product JSON-LD only with a price.
*/

const money = (price) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(price.amount);

export default function StarterKit({ theme }) {
  const price = kitPrice();
  const checkout = kitCheckout();
  const priced = price && price.amount != null;
  const schema =
    priced && checkout
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: KIT.name,
          description: KIT.tagline,
          url: "https://aayushmishra.engineer/starter-kit",
          brand: { "@type": "Person", name: "Aayush Mishra" },
          offers: { "@type": "Offer", price: String(price.amount), priceCurrency: price.currency, url: checkout.url, availability: "https://schema.org/InStock" },
        })
      : null;

  return (
    <PageShell theme={theme} className="ft kit">
      {schema && (
        <Helmet>
          <script type="application/ld+json">{schema}</script>
        </Helmet>
      )}
      <section className="hm-section ft-hero" aria-labelledby="kit-title">
        <div className="hm-shell">
          <p className="hm-pill">
            <i className="fa-solid fa-box-open" aria-hidden="true" /> {checkout ? "Available now" : "Coming soon"}
          </p>
          <h1 className="ft-hero__title" id="kit-title">
            {KIT.name}
          </h1>
          <p className="hm-lead">{KIT.tagline}</p>
          <div className="ft-hero__actions">
            {checkout ? (
              <a href={checkout.url} className="hm-btn hm-btn--primary" rel="noopener noreferrer">
                Buy{priced ? ` · ${money(price)}` : ""} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
              </a>
            ) : (
              <a href="#waitlist" className="hm-btn hm-btn--primary">
                Join the waitlist <i className="fa-solid fa-arrow-down" aria-hidden="true" />
              </a>
            )}
            <a href="#inside" className="hm-btn hm-btn--ghost">
              What&apos;s inside
            </a>
          </div>
          {checkout && <p className="ft-hint">Checkout and invoices by {checkout.provider}. This site never sees your card.</p>}
        </div>
      </section>

      <section className="hm-section" id="inside" aria-labelledby="kit-inside">
        <div className="hm-shell">
          <h2 className="ft-h2" id="kit-inside">
            {checkout ? "What's inside" : "What's planned"}
          </h2>
          <ul className="ft-grid">
            {KIT.includes.map((group) => (
              <li key={group.title} className="hm-card ft-cl__section">
                <span className="ft-tile__icon" aria-hidden="true">
                  <i className={group.icon} />
                </span>
                <h3 style={{ marginTop: "0.75rem" }}>{group.title}</h3>
                <ul>
                  {group.points.map((point) => (
                    <li key={point}>
                      <i className="fa-solid fa-check" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {!checkout && (
        <section className="hm-section" id="waitlist" aria-labelledby="kit-wait">
          <div className="hm-shell ft-two">
            <div className="ft-prose">
              <h2 className="ft-h2" id="kit-wait">
                Join the waitlist
              </h2>
              <p>{KIT.status} One email when it launches, with the launch price. Nothing else.</p>
              <p className="ft-muted">
                Need it sooner? The free <Link to="/free-tools/release-readiness-checklist">Release Readiness Checklist</Link>{" "}
                and the <Link to="/free-tools/flaky-test-doctor">Flaky Test Doctor</Link> are ready today.
              </p>
            </div>
            <div className="hm-card ft-panel">
              <div className="ft-panel__body">
                <EmailCapture magnet="starter-kit" button="Put me on the list" note="One launch email. Unsubscribe any time." />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="hm-section" aria-labelledby="kit-faq">
        <div className="hm-shell ft-prose">
          <h2 className="ft-h2" id="kit-faq">
            Questions
          </h2>
          {KIT.faq.map((item) => (
            <details key={item.q} className="ft-roi__math">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
          <p style={{ marginTop: "1.5rem" }}>
            <Link to="/services/playwright-starter-sprint" className="hm-link">
              See the Playwright Starter Sprint <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
