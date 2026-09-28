import React, { useEffect, useState } from "react";
import "./TopButton.css";

const scrollToTop = () => {
  if (window.__lenis) {
    window.__lenis.scrollTo(0);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

export default function TopButton({ theme }) {
  const [scrolled, setScrolled] = useState(false);
  const [footerInView, setFooterInView] = useState(false);

  useEffect(() => {
    let frame = null;
    const update = () => {
      frame = null;
      setScrolled(window.scrollY > 30);
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // The footer has its own back-to-top control, so step aside when it shows
  useEffect(() => {
    const closing = document.querySelector(".footer-closing");
    if (!closing || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting));
    observer.observe(closing);
    return () => observer.disconnect();
  }, []);

  const visible = scrolled && !footerInView;

  return (
    <button
      type="button"
      id="topButton"
      className={visible ? "is-visible" : ""}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      style={{ "--tb-fg": theme.body, "--tb-bg": theme.text }}
    >
      <i className="fas fa-arrow-up" id="arrow" aria-hidden="true" />
    </button>
  );
}
