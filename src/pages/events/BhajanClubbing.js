import React from "react";
import { Helmet } from "react-helmet";
import "./BhajanClubbing.css";

const details = [
  { label: "Event", value: "DSN Special Mega Satsang" },
  { label: "Singer", value: "Kushagra Ji" },
  { label: "Special Presence", value: "Pawan Tayla Ji" },
  { label: "Date", value: "15 March" },
  { label: "Venue", value: "World Peace Center" },
  { label: "Time", value: "5:30 PM onwards" },
];

const contacts = [
  {
    phone: "+91 99888 46474",
  },
  {
    phone: "+91 83604 01440",
  },
  {
    phone: "+91 86977 46065",
  },
  {
    phone: "+91 98184 85160",
  },
];

function BhajanClubbing() {
  return (
    <div className="bc-page" id="top">
      <Helmet>
        <title>DSN Special Mega Satsang - Bhajan Clubing</title>
        <meta
          name="description"
          content="Join DSN Special Mega Satsang - Bhajan Clubing at World Peace Center for Satsang, Kirtan, and devotional celebration."
        />
        <meta
          property="og:title"
          content="DSN Special Mega Satsang - Bhajan Clubing"
        />
        <meta
          property="og:description"
          content="Come sing, celebrate, and meditate in divine Satsang and Kirtan with the Art of Living community."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="/eventimages/guruji%20main%20image.jpeg"
        />
      </Helmet>

      <header className="bc-top">
        <img
          className="bc-top-logo"
          src="/eventimages/logo%20of%20art%20of%20living.jpeg"
          alt="Art of Living logo"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />

        <figure className="bc-gurudev-photo">
          <img
            src="/eventimages/guruji%20main%20image.jpeg"
            alt="Gurudev Sri Sri Ravi Shankar"
            loading="eager"
            decoding="async"
            fetchpriority="high"
          />
        </figure>

        <p className="bc-eyebrow">Art of Living Presents</p>
        <h1>DSN Special Mega Satsang - Bhajan Clubing</h1>
        <p className="bc-subtitle">Sing &bull; Celebrate &bull; Meditate</p>
        <p className="bc-intro">
          Experience the divine energy of Satsang, Kirtan, and Bhajan Clubing
          with the Art of Living community.
        </p>
        <a className="bc-btn-primary" href="#details">
          View Event Details
        </a>
      </header>

      <main>
        <section className="bc-section" id="details">
          <h2>Event Details</h2>
          <div className="bc-details-grid">
            {details.map((item) => (
              <article className="bc-detail-card" key={item.label}>
                <p className="bc-label">{item.label}</p>
                <p className="bc-value">{item.value}</p>
              </article>
            ))}
          </div>

          <p className="bc-prasadam">
            Followed by <strong>Prasadam</strong>
          </p>

          <div className="bc-presence-grid">
            <article className="bc-person-card">
              <img
                src="/eventimages/Pavan%20Sir.jpeg"
                alt="Special Presence Pawan Tayla Ji"
                loading="lazy"
                decoding="async"
              />
              <p>Special Presence: Pawan Tayla Ji</p>
            </article>
            <article className="bc-person-card">
              <img
                src="/eventimages/kushagra%20ji%20new%20image.jpeg"
                alt="Singer Kushagra Ji"
                loading="lazy"
                decoding="async"
              />
              <p>Singer Kushagra Ji</p>
            </article>
            <article className="bc-person-card">
              <img
                src="/eventimages/Tabla%20master.jpeg"
                alt="Tabla master supporting Bhajan Clubing"
                loading="lazy"
                decoding="async"
              />
              <p>Tabla support for Satsang and Kirtan</p>
            </article>
          </div>
        </section>

        <section className="bc-section bc-story">
          <h2>Invitation Message</h2>
          <p>
            In today&apos;s busy world, we often forget the joy of singing
            together. Satsang and Kirtan create a beautiful space where hearts
            connect through devotion and music.
          </p>
          <p>
            Bhajan Clubing is not just music. It is an experience of divine
            energy, peace, and inner celebration.
          </p>
          <p>
            You are most welcome. Bring your friends, family, and loved ones.
            Share this invitation with more people so everyone can experience
            the divine power of Bhajan Clubing.
          </p>
        </section>

        <section className="bc-section bc-quote">
          <div className="bc-quote-card">
            <img
              src="/eventimages/guru%20ji.jpeg"
              alt="Gurudev portrait"
              loading="lazy"
              decoding="async"
            />
            <div>
              <blockquote>
                &quot;Music and meditation uplift the spirit and bring people
                together in joy.&quot;
              </blockquote>
              <p className="bc-quote-author">- Gurudev Sri Sri Ravi Shankar</p>
            </div>
          </div>
        </section>

        <section className="bc-section bc-contact" id="contact-info">
          <h2>Call for Information</h2>
          <p className="bc-contact-intro">
            Connect by WhatsApp or by call on the numbers below.
          </p>
          <div className="bc-contact-grid">
            {contacts.map((person) => (
              <article className="bc-contact-card" key={person.phone}>
                <div className="bc-contact-content">
                  <p className="bc-contact-number">{person.phone}</p>
                  <div className="bc-contact-actions">
                    <a
                      className="bc-contact-whatsapp"
                      href={`https://wa.me/${person.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                    <a
                      className="bc-contact-call"
                      href={`tel:${person.phone.replace(/\s+/g, "")}`}
                    >
                      Call
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bc-section bc-final">
          <h2>Everyone is Most Welcome</h2>
          <p>
            Come sing, celebrate, and experience the divine energy of Satsang,
            Kirtan, and Bhajan Clubing.
          </p>
          <p>
            Please share this invitation with more people so they can also
            experience this spiritual celebration.
          </p>
          <div className="bc-cta-row">
            <a
              className="bc-btn-primary"
              href="https://wa.me/?text=You%20are%20invited%20to%20DSN%20Special%20Mega%20Satsang%20-%20Bhajan%20Clubing%20on%2015%20March%20at%205%3A30%20PM%20at%20World%20Peace%20Center.%20Everyone%20is%20most%20welcome."
              target="_blank"
              rel="noopener noreferrer"
            >
              Share Invitation
            </a>
            <a
              className="bc-btn-secondary"
              href="https://maps.google.com/?q=World+Peace+Center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default BhajanClubbing;
