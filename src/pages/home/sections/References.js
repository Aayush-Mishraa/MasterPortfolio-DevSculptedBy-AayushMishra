import React, { useEffect, useRef, useState } from "react";
import { RECOMMENDATIONS } from "../homeData";
import { prefersReducedMotion, useOnScreen, useReveal } from "../lib/motion";
import "./References.css";

/*
  Kind words: one quote at a time, large and quiet. Only real recommendations
  appear (portfolio.js `recommendations`, each with a link to where it was
  given); with none, the section renders nothing.

  To see the design before there are real ones, open /home?preview-refs on the
  development server. The samples below are obviously generic and are never
  shown in a production build.
*/

const ROTATE_MS = 7000;

const SAMPLES = [
  {
    quote:
      "A real recommendation goes here: one or two specific sentences about working with you, in the recommender's own words.",
    name: "Recommender's name",
    role: "Their title",
    company: "Company",
    relation: "How you worked together",
    link: "#",
  },
  {
    quote:
      "Copy it from LinkedIn (Recommendations, Received) into portfolio.js under recommendations, with a link back to it.",
    name: "Second recommender",
    role: "Title",
    company: "Company",
    link: "#",
  },
  {
    quote: "Two or three short, specific quotes read better than many long ones.",
    name: "Third recommender",
    role: "Title",
    company: "Company",
    link: "#",
  },
];

const PREVIEW =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  /[?&]preview-refs\b/.test(window.location.search);

const initials = (name) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function References() {
  const ref = useRef(null);
  const items = RECOMMENDATIONS.length ? RECOMMENDATIONS : PREVIEW ? SAMPLES : [];
  const sample = !RECOMMENDATIONS.length && PREVIEW;
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const onScreen = useOnScreen(ref, { threshold: 0.3 });
  useReveal(ref, [items.length]);

  const rotating = items.length > 1 && onScreen && !held && !paused;

  useEffect(() => {
    if (!rotating) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [rotating, index, items.length]);

  if (!items.length) return null;

  const go = (next) => setIndex((next + items.length) % items.length);

  return (
    <section className="hm-section hm-refs" id="hm-references" aria-labelledby="hm-references-title" ref={ref}>
      <div className="hm-shell">
        <div className="hm-refs__inner" data-reveal>
          <p className="hm-eyebrow">
            <b>05</b> Kind words
          </p>
          <h2 className="hm-sr" id="hm-references-title">
            Recommendations
          </h2>
          {sample && (
            <p className="hm-refs__sample hm-mono">
              Sample preview · development only · add real recommendations in portfolio.js
            </p>
          )}

          <div
            className="hm-refs__stage"
            role="region"
            aria-roledescription="carousel"
            aria-label="Recommendations"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
          >
            <div className="hm-refs__slides" aria-live={rotating ? "off" : "polite"}>
              {items.map((item, i) => (
                <figure
                  key={`${item.name}-${i}`}
                  className={`hm-ref ${i === index ? "is-active" : ""}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${items.length}`}
                  aria-hidden={i === index ? undefined : "true"}
                >
                  <span className="hm-ref__mark" aria-hidden="true">
                    “
                  </span>
                  <blockquote>
                    <p>{item.quote}</p>
                  </blockquote>
                  <figcaption>
                    {item.photo ? (
                      <img src={item.photo} alt="" className="hm-ref__avatar" width="40" height="40" loading="lazy" />
                    ) : (
                      <span className="hm-ref__avatar" aria-hidden="true">
                        {initials(item.name)}
                      </span>
                    )}
                    <span className="hm-ref__who">
                      <strong>{item.name}</strong>
                      <span>{[item.role, item.company].filter(Boolean).join(" · ")}</span>
                      {item.relation && <em>{item.relation}</em>}
                    </span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hm-ref__source"
                      tabIndex={i === index ? 0 : -1}
                    >
                      Source <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                      <span className="hm-sr"> (recommendation from {item.name})</span>
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>

            {items.length > 1 && (
              <div className="hm-refs__controls">
                <button
                  type="button"
                  className="hm-refs__arrow"
                  onClick={() => go(index - 1)}
                  aria-label="Previous recommendation"
                >
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                </button>
                <div className="hm-refs__dots">
                  {items.map((item, i) => (
                    <button
                      key={`dot-${item.name}-${i}`}
                      type="button"
                      className={`hm-refs__dot ${i === index ? "is-active" : ""} ${rotating ? "is-rotating" : ""}`}
                      aria-label={`Show recommendation ${i + 1} of ${items.length}`}
                      aria-current={i === index ? "true" : undefined}
                      onClick={() => go(i)}
                      style={{ "--rotate": `${ROTATE_MS}ms` }}
                    >
                      <span />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="hm-refs__arrow"
                  onClick={() => go(index + 1)}
                  aria-label="Next recommendation"
                >
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hm-refs__pause"
                  onClick={() => setPaused((value) => !value)}
                  aria-pressed={paused}
                >
                  <i className={`fa-solid ${paused ? "fa-play" : "fa-pause"}`} aria-hidden="true" />
                  {paused ? "Play" : "Pause"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
