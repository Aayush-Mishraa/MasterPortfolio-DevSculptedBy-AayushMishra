import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import "./CreativeFooter.css";
import { greeting, socialMediaLinks, experience } from "../../portfolio";
import ThemeSelector from "../themeSelector/ThemeSelector";

const buttondownEndpoint = process.env.REACT_APP_BUTTONDOWN_ENDPOINT;
const CONTACT_EMAIL = "contact@aayushmishra.engineer";
const currentRole = experience.sections[0].experiences[0];

const automationTools = [
  ["Selenium", "fa-solid fa-robot", "Web automation", "selenium"],
  ["Cypress", "fa-solid fa-circle-check", "E2E testing", "cypress"],
  ["Playwright", "fa-solid fa-theater-masks", "Cross-browser", "playwright"],
  ["JUnit", "fa-solid fa-flask", "Unit testing", "junit"],
  ["TestNG", "fa-solid fa-vial", "Test framework", "testng"],
  ["Postman", "fa-solid fa-paper-plane", "API testing", "postman"],
  ["Jenkins", "fa-solid fa-gear", "CI/CD pipeline", "jenkins"],
  ["GitHub Actions", "fa-brands fa-github", "Automation", "github-actions"],
  ["Docker", "fa-brands fa-docker", "Containerization", "docker"]
];

const sitemap = [
  ["Home", "/home"],
  ["Experience", "/experience"],
  ["Education", "/education"],
  ["Projects", "/projects"],
  ["Automation Arsenal", "/automation-arsenal"],
  ["Open Source", "/opensource"],
  ["Contact", "/contact"]
];

const exploring = ["AI test agents", "Browser Use", "Kane AI", "Visual regression"];

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible ? "is-visible" : ""];
}

function ISTClock() {
  const format = () => new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = setInterval(() => setTime(format()), 15000);
    return () => clearInterval(id);
  }, []);
  return <span>{time} IST</span>;
}

function StatusBar() {
  return (
    <div className="footer-status" role="status">
      <span className="status-live"><span className="status-dot" aria-hidden="true"></span>All systems operational</span>
      <span className="status-item"><i className="fa-solid fa-code-branch" aria-hidden="true"></i>main · build passing</span>
      <span className="status-item"><i className="fa-solid fa-location-dot" aria-hidden="true"></i>India · <ISTClock /></span>
      <span className="status-item status-hint"><kbd>Ctrl</kbd><kbd>K</kbd> to search</span>
    </div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  };
  return (
    <button type="button" className={`copy-email ${copied ? "is-copied" : ""}`} onClick={copy} aria-live="polite">
      <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} aria-hidden="true"></i>
      {copied ? "Copied to clipboard" : CONTACT_EMAIL}
    </button>
  );
}

function FooterHero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [ref, revealClass] = useReveal();

  const handleSubmit = async event => {
    event.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("error");
      setMessage("Enter a valid email address so I know where to send the next issue.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      if (buttondownEndpoint) {
        const response = await fetch(buttondownEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error("Subscription failed");
      } else {
        await new Promise(resolve => setTimeout(resolve, 700));
      }
      setStatus("success");
      setMessage(buttondownEndpoint ? "You're in — check your inbox." : "Preview captured — connect Buttondown to send issues.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage("That did not go through. Please try again or email me directly.");
    }
  };

  return (
    <section ref={ref} className={`footer-hero footer-reveal ${revealClass}`} aria-labelledby="footer-hero-title">
      <div className="footer-hero-copy">
        <span className="footer-eyebrow"><i aria-hidden="true"></i>Quality is a feature</span>
        <h2 id="footer-hero-title">Let&apos;s build something <span>reliable</span> together.</h2>
        <p>Open to remote and on-site opportunities where thoughtful engineering makes releases calmer.</p>
        <div className="footer-hero-actions">
          <a className="footer-cta" href={`mailto:${CONTACT_EMAIL}`}>
            Get in touch <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <CopyEmail />
        </div>
      </div>
      <form className="newsletter" onSubmit={handleSubmit} noValidate>
        <span className="footer-eyebrow"><i aria-hidden="true"></i>QA &amp; Automation Insights</span>
        <p>Release notes, testing tips, and tool breakdowns. Occasionally useful, never noisy.</p>
        <label htmlFor="footer-email">Email address</label>
        <div className={`newsletter-row ${status === "error" ? "has-error" : ""}`}>
          <input id="footer-email" type="email" value={email} onChange={event => { setEmail(event.target.value); setStatus("idle"); setMessage(""); }} placeholder="you@example.com" aria-invalid={status === "error"} aria-describedby="newsletter-status" />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? <span className="button-spinner" aria-hidden="true"></span> : null}
            {status === "success" ? "Subscribed" : "Subscribe"}
          </button>
        </div>
        <p id="newsletter-status" className={`newsletter-status ${status}`} role="status" aria-live="polite">
          {status === "success" ? <i className="fa-solid fa-check" aria-hidden="true"></i> : null}{message}
        </p>
      </form>
    </section>
  );
}

function Arsenal() {
  const [ref, revealClass] = useReveal();
  return (
    <section ref={ref} className={`footer-panel arsenal-panel footer-reveal ${revealClass}`} aria-labelledby="arsenal-title">
      <div className="panel-heading"><div><span className="footer-eyebrow"><i aria-hidden="true"></i>Proof of work</span><h3 id="arsenal-title">Automation Arsenal</h3></div><span className="panel-mark"><i className="fa-solid fa-crosshairs" aria-hidden="true"></i></span></div>
      <p className="panel-intro">500+ test cases automated across the tools I use to turn quality into momentum.</p>
      <div className="automation-grid">
        {automationTools.map(([name, icon, description, topic]) => (
          <a key={name} className="automation-tool" href={`https://github.com/Aayush-Mishraa?tab=repositories&q=${topic}`} target="_blank" rel="noopener noreferrer">
            <span className="tool-icon"><i className={icon} aria-hidden="true"></i></span>
            <span className="tool-info"><strong>{name}</strong><small>{description}</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square tool-arrow" aria-hidden="true"></i>
          </a>
        ))}
      </div>
    </section>
  );
}

function Navigate() {
  const [ref, revealClass] = useReveal();
  return (
    <nav ref={ref} className={`footer-panel nav-panel footer-reveal ${revealClass}`} aria-labelledby="nav-title">
      <span className="footer-eyebrow"><i aria-hidden="true"></i>Index</span><h3 id="nav-title">Navigate</h3>
      <ul className="sitemap">
        {sitemap.map(([label, to], i) => (
          <li key={to}><Link to={to}><span className="sitemap-num">{String(i + 1).padStart(2, "0")}</span>{label}<i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></li>
        ))}
      </ul>
    </nav>
  );
}

function Now() {
  const [ref, revealClass] = useReveal();
  return (
    <section ref={ref} className={`footer-panel now-panel footer-reveal ${revealClass}`} aria-labelledby="now-title">
      <span className="footer-eyebrow"><i aria-hidden="true"></i>Right now</span><h3 id="now-title">Now</h3>
      <div className="now-role">
        <span className="status-dot" aria-hidden="true"></span>
        <div><strong>{currentRole.title}</strong><span>{currentRole.company} · since {currentRole.duration.split(" - ")[0]}</span></div>
      </div>
      <span className="now-label">Exploring</span>
      <div className="now-tags">{exploring.map(tag => <span key={tag}>{tag}</span>)}</div>
      <span className="now-label">Elsewhere</span>
      <div className="social-links" aria-label="Social links">
        {socialMediaLinks.map(media => <a key={media.name} href={media.link} target="_blank" rel="noopener noreferrer" title={media.name}><i className={media.fontAwesomeIcon.indexOf("fa-brands") === 0 ? media.fontAwesomeIcon : `fab ${media.fontAwesomeIcon}`} aria-hidden="true"></i><span className="footer-sr-only">{media.name}</span></a>)}
      </div>
    </section>
  );
}

function Wordmark() {
  return (
    <div className="footer-wordmark" aria-hidden="true">
      <span>{greeting.title}</span>
    </div>
  );
}

const scrollToTop = () => {
  if (window.__lenis) {
    window.__lenis.scrollTo(0);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

function BackToTop() {
  const ref = useRef(null);
  useEffect(() => {
    let frame = null;
    const update = () => {
      frame = null;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (ref.current) ref.current.style.setProperty("--progress", progress);
    };
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame !== null) cancelAnimationFrame(frame); };
  }, []);
  return (
    <button ref={ref} className="back-to-top" type="button" aria-label="Back to top" onClick={scrollToTop}>
      <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" pathLength="1" /></svg>
      <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
    </button>
  );
}

const legalNotes = {
  privacy: {
    title: "Privacy",
    body: [
      "This site uses Google Analytics and Google Ads/AdSense, which may set cookies to measure visits and serve ads. See Google's privacy policy for how that data is handled.",
      "Your theme choice, contact-form drafts and cached GitHub data are kept in your own browser's local storage and never sent to me.",
      "If you email me, subscribe or send the contact form, your address is used only to reply. It is never sold or shared."
    ],
    link: ["Google privacy policy", "https://policies.google.com/privacy"]
  },
  terms: {
    title: "Terms",
    body: [
      "Everything here is a personal portfolio. Code samples and case studies are shared as-is, for learning, with no warranty.",
      "The site's source code is MIT-licensed on GitHub. Logos and trademarks belong to their owners."
    ],
    link: ["Source on GitHub", "https://github.com/Aayush-Mishraa/MasterPortfolio-DevSculptedBy-AayushMishra"]
  },
  accessibility: {
    title: "Accessibility",
    body: [
      "The site aims for WCAG 2.1 AA: keyboard navigation (Ctrl/⌘ K opens search), readable contrast in every theme and reduced motion when your system asks for it.",
      `Found a barrier? Email ${CONTACT_EMAIL} and I will fix it.`
    ],
    link: ["Email me", `mailto:${CONTACT_EMAIL}`]
  }
};

function LegalDialog({ note, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    if (closeRef.current) closeRef.current.focus();
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);
  const [label, href] = note.link;
  const external = href.startsWith("http");
  return createPortal(
    <div className="legal-backdrop" onClick={onClose} data-lenis-prevent>
      <div className="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-title" onClick={(event) => event.stopPropagation()}>
        <div className="legal-head">
          <h3 id="legal-title">{note.title}</h3>
          <button ref={closeRef} type="button" className="legal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        {note.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <a className="legal-link" href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
      </div>
    </div>,
    document.body
  );
}

function ClosingBar() {
  const [ref, revealClass] = useReveal();
  const [openNote, setOpenNote] = useState(null);
  const closeNote = useCallback(() => setOpenNote(null), []);
  return (
    <div ref={ref} className={`footer-closing footer-reveal ${revealClass}`}>
      <div className="closing-meta">
        <span>© {new Date().getFullYear()} {greeting.title}. Crafted in India.</span>
        <cite>&quot;Quality is not an act, it is a habit.&quot; — Aristotle</cite>
      </div>
      <div className="quiet-links">
        {Object.keys(legalNotes).map((key) => (
          <button key={key} type="button" onClick={() => setOpenNote(key)} aria-haspopup="dialog">{legalNotes[key].title}</button>
        ))}
      </div>
      {openNote && <LegalDialog note={legalNotes[openNote]} onClose={closeNote} />}
      <div className="closing-actions">
        <div className="theme-wrap"><ThemeSelector /></div>
        <div className="tech-icons" aria-label="Built with React, CSS and JavaScript"><i className="fab fa-react" title="React"></i><i className="fab fa-css3-alt" title="CSS"></i><i className="fab fa-js-square" title="JavaScript"></i></div>
        <BackToTop />
      </div>
    </div>
  );
}

export default function CreativeFooter() {
  return (
    <footer className="creative-footer">
      <div className="footer-background">
        <div className="footer-grid-bg" aria-hidden="true"></div>
        <div className="footer-glow" aria-hidden="true"></div>
        <div className="footer-container">
          <StatusBar />
          <FooterHero />
          <div className="footer-link-grid"><Arsenal /><Navigate /><Now /></div>
          <ClosingBar />
        </div>
        <Wordmark />
      </div>
    </footer>
  );
}
