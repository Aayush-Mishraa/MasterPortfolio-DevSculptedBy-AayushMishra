import React, { useRef, useState } from "react";
import { AFFILIATIONS, STACK } from "../homeData";
import { prefersReducedMotion, useOnScreen } from "../lib/motion";
import Icon from "../components/Icon";
import "./Logos.css";

/*
  Two running rows under the hero. The first holds every company, program and
  university on the résumé, each captioned with what the connection is (years,
  role or degree), so no logo claims more than the résumé does. The second is
  the stack, brand by brand. Both pause on hover and when scrolled away, and
  sit still (and wrap) for visitors who prefer reduced motion.
*/

function Affiliation({ item }) {
  return (
    <>
      <img src={item.logo} alt="" className="hm-logo__mark" width="36" height="36" loading="lazy" />
      <span className="hm-logo__text">
        <strong>{item.name}</strong>
        <span className="hm-mono">{item.caption}</span>
      </span>
    </>
  );
}

function Tool({ item }) {
  return (
    <>
      {item.image ? (
        <img src={item.image} alt="" className="hm-tool-mark hm-tool-mark--img" width="20" height="20" loading="lazy" />
      ) : (
        <Icon name={item.icon} className="hm-tool-mark" />
      )}
      <span className="hm-tool-name">{item.name}</span>
    </>
  );
}

function Marquee({ items, label, render, reverse, seconds, variant, paused }) {
  const ref = useRef(null);
  const live = useOnScreen(ref, { rootMargin: "120px 0px" });
  const still = prefersReducedMotion();
  const copies = still ? [false] : [false, true];

  return (
    <div
      className={`hm-marquee hm-marquee--${variant} ${live && !paused ? "is-live" : ""} ${
        reverse ? "is-reverse" : ""
      } ${still ? "is-still" : ""}`}
      ref={ref}
      style={{ "--dur": `${seconds}s` }}
    >
      <ul className="hm-marquee__track" aria-label={label}>
        {copies.map((duplicate) =>
          items.map((item) => (
            <li
              key={`${duplicate ? "b" : "a"}-${item.key}`}
              className="hm-marquee__item"
              aria-hidden={duplicate ? "true" : undefined}
              style={item.color ? { "--brand": item.color } : undefined}
            >
              {render(item)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function Logos() {
  // Hover and focus pause a row; this pauses both, for anyone who can't hover.
  const [paused, setPaused] = useState(false);
  const still = prefersReducedMotion();

  return (
    <section className="hm-logos" id="hm-logos" aria-labelledby="hm-logos-title">
      <h2 className="hm-sr" id="hm-logos-title">
        Companies, programs, universities and tools
      </h2>

      <div className="hm-logos__row">
        <div className="hm-logos__head hm-shell">
          <p className="hm-logos__label hm-mono">Worked, studied and volunteered with</p>
          {!still && (
            <button
              type="button"
              className="hm-logos__pause"
              onClick={() => setPaused((value) => !value)}
              aria-pressed={paused}
            >
              <i className={`fa-solid ${paused ? "fa-play" : "fa-pause"}`} aria-hidden="true" />
              <span className="hm-logos__pause-text">{paused ? "Play" : "Pause"}</span>
              <span className="hm-sr"> the moving logos</span>
            </button>
          )}
        </div>
        <Marquee
          items={AFFILIATIONS}
          label="Companies, programs and universities"
          render={(item) => <Affiliation item={item} />}
          seconds={44}
          variant="brand"
          paused={paused}
        />
      </div>

      <div className="hm-logos__row">
        <div className="hm-logos__head hm-shell">
          <p className="hm-logos__label hm-mono">Tools and platforms I ship with</p>
        </div>
        <Marquee
          items={STACK}
          label="Tools and platforms"
          render={(item) => <Tool item={item} />}
          reverse
          seconds={70}
          variant="stack"
          paused={paused}
        />
      </div>
    </section>
  );
}
