import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/*
  Phones only: once the hero's buttons have scrolled away, the two actions
  that matter most (services first, F10) stay one tap away. It steps aside for the footer, which
  has its own contact block. Replaces the back-to-top button on the home page.
*/

export default function MobileBar() {
  const [heroGone, setHeroGone] = useState(false);
  const [footerIn, setFooterIn] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const hero = document.getElementById("hm-top");
    const footer = document.querySelector(".footer-hero") || document.querySelector(".footer-closing");
    const observers = [];
    if (hero) {
      const o = new IntersectionObserver(([entry]) => setHeroGone(!entry.isIntersecting), {
        rootMargin: "-40% 0px 0px 0px",
      });
      o.observe(hero);
      observers.push(o);
    }
    if (footer) {
      const o = new IntersectionObserver(([entry]) => setFooterIn(entry.isIntersecting));
      o.observe(footer);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const visible = heroGone && !footerIn;

  return (
    <div className={`hm-mobilebar ${visible ? "is-visible" : ""}`} aria-hidden={visible ? undefined : "true"}>
      <Link to="/services" className="hm-btn hm-btn--ghost" tabIndex={visible ? 0 : -1}>
        Services <i className="fa-solid fa-list-check" aria-hidden="true" />
      </Link>
      <Link to="/contact" className="hm-btn hm-btn--primary" tabIndex={visible ? 0 : -1}>
        Let&apos;s talk <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </Link>
    </div>
  );
}
