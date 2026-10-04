import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CAREER_START, PROFILE, yearsSince } from "../homeData";
import { briefFacts, briefPlainText, briefProof } from "./briefData";
import { prefersReducedMotion } from "../lib/motion";
import bugLog from "../../../shared/opensource/bug_log.json";
import SignedOffFilm from "./film/SignedOffFilm";
import { unlockFilmScore } from "./film/filmScore";
import { runAudit, summarize } from "./film/liveAudit";

/*
  The 30-second version of the page for recruiters: everything an ATS note
  needs on one screen, plus a plain-text copy of it.

  It opens with "Signed Off", the same 30 seconds as a film, which hands off
  to this card when it ends (or on Skip / Escape). The card's rows then roll
  in like end credits. With reduced motion the card opens directly and the
  film waits behind "Watch the film".

  Two things on the card are live rather than written: the bug log (real fix
  commits, curated at build time) and the audit of this page, run in the
  visitor's browser (by the film, or here when the film didn't play).

  With filmOnly (the "Hire me" buttons) there is no card: the film fades out
  to the page underneath and the brief closes.
*/

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const filmFirst = () => !prefersReducedMotion();
const FIXES = bugLog.fixes.slice(0, 3);
const shortRepo = (name) => name.replace(/-+$/, "").replace(/-DevSculptedBy-AayushMishra$/i, "");
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const githubUser = (PROFILE.github || "").split("/").filter(Boolean).pop();

export default function RecruiterBrief({ open, onClose, github, style, filmOnly = false }) {
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);
  // "playing" -> "leaving" (the card mounts under the fading film) -> "off"
  const [film, setFilm] = useState(() => (filmFirst() ? "playing" : "off"));
  const [take, setTake] = useState(0);
  const [credits, setCredits] = useState(false);
  const [audit, setAudit] = useState(null);
  const showCard = film !== "playing" && !filmOnly;
  // Whatever opened the brief, noted while rendering: the film takes focus in
  // its own effects, which run before this component's.
  const opener = useRef(null);
  if (open && !opener.current) opener.current = document.activeElement;
  const years = yearsSince(CAREER_START);
  const facts = useMemo(() => briefFacts(years), [years]);
  const proof = briefProof(github);
  const plainText = () => briefPlainText(facts, proof, window.location.origin);

  const copy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(plainText()).then(done, () => {});
    }
  };

  // Modal behaviour: pause smooth scroll, trap focus, close on Escape, and
  // hand focus back to whatever opened it.
  useEffect(() => {
    if (!open) return undefined;
    const previous = opener.current;
    const lenis = window.__lenis;
    if (lenis) lenis.stop();
    document.documentElement.classList.add("hm-brief-open");

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("hm-brief-open");
      if (lenis) lenis.start();
      opener.current = null;
      if (previous && previous.focus) previous.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  // Closed: the next open starts with the film again.
  useEffect(() => {
    if (open) return;
    setFilm(filmFirst() ? "playing" : "off");
    setCredits(false);
  }, [open]);

  // The card takes focus as soon as it mounts, while the film fades over it.
  useEffect(() => {
    if (open && showCard && panelRef.current) panelRef.current.focus({ preventScroll: true });
  }, [open, showCard]);

  // No film ran (reduced motion): audit the page here.
  useEffect(() => {
    if (open && showCard && !audit) setAudit(runAudit(0));
  }, [open, showCard, audit]);
  const checks = audit ? summarize(audit) : null;

  const playFilm = () => {
    unlockFilmScore();
    setCredits(false);
    setTake((n) => n + 1);
    setFilm("playing");
  };
  const filmLeaving = useCallback(() => {
    setCredits(true);
    setFilm("leaving");
  }, []);
  const filmGone = useCallback(() => {
    setFilm("off");
    if (filmOnly) onClose();
  }, [filmOnly, onClose]);
  const filmAudit = useCallback((result) => setAudit(result), []);

  if (!open) return null;

  return createPortal(
    <div
      className={`hm hm-brief${filmOnly ? " hm-brief--film-only" : ""}`}
      style={style}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {film !== "off" && (
        <SignedOffFilm
          key={take}
          next={filmOnly ? "page" : "brief"}
          onLeave={filmLeaving}
          onGone={filmGone}
          onAudit={filmAudit}
        />
      )}
      {showCard && (
        <div
          className={`hm-brief__panel${credits ? " hm-brief__panel--credits" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hm-brief-title"
          aria-describedby="hm-brief-desc"
          ref={panelRef}
          tabIndex={-1}
          data-lenis-prevent
        >
          <div className="hm-bar">
            <span className="hm-bar__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="hm-bar__title">recruiter-brief.md</span>
            <button type="button" className="hm-brief__film" onClick={playFilm}>
              <i className="fa-solid fa-play" aria-hidden="true" /> {credits ? "Replay the film" : "Watch the film"}
            </button>
            <button type="button" className="hm-brief__close" onClick={onClose} aria-label="Close the brief">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>

          <div className="hm-brief__body">
            <p className="hm-eyebrow">The 30-second version</p>
            <h2 id="hm-brief-title" className="hm-brief__title">
              {PROFILE.name}
            </h2>
            <p id="hm-brief-desc" className="hm-brief__lead">
              Everything a hiring team asks first. Copy it into your ATS notes, or jump straight to a conversation.
            </p>

            <dl className="hm-brief__facts">
              {facts.map((fact, i) => (
                <div className="hm-brief__fact" key={fact.label} style={{ "--i": i }}>
                  <dt>{fact.label}</dt>
                  <dd>
                    <strong>{fact.value}</strong>
                    {fact.note && <span>{fact.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="hm-brief__proof" aria-label="Highlights">
              {proof.map((item, i) => (
                <li key={item} style={{ "--i": i }}>
                  <i className="fa-solid fa-check" aria-hidden="true" />
                  {item}
                </li>
              ))}
              {checks && (
                <li
                  className={`hm-brief__audit${checks.failures ? " is-fail" : checks.warnings ? " is-warn" : ""}`}
                  style={{ "--i": proof.length }}
                  title="Run just now in your browser: HTTPS, headings, alt text, links, buttons, errors, Core Web Vitals"
                >
                  <i className="fa-solid fa-gauge-high" aria-hidden="true" />
                  {checks.passed}/{checks.total} live checks passed on this page
                </li>
              )}
            </ul>

            {FIXES.length > 0 && (
              <section className="hm-brief__log" aria-labelledby="hm-brief-log">
                <h3 id="hm-brief-log">
                  <i className="fa-solid fa-bug" aria-hidden="true" /> Bug log
                  <span>
                    {bugLog.total} fixes in {bugLog.repos} repos · real commits
                  </span>
                </h3>
                <ol>
                  {FIXES.map((fix, i) => (
                    <li key={fix.sha} style={{ "--i": i }}>
                      <a href={fix.url} target="_blank" rel="noopener noreferrer">
                        <b>Fixed</b>
                        <span className="hm-brief__log-msg">{fix.message}</span>
                        <span className="hm-brief__log-meta">
                          {shortRepo(fix.repo)} · {shortDate(fix.date)} · <code>{fix.short}</code>
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
                {githubUser && (
                  <a
                    className="hm-brief__log-all"
                    href={`https://github.com/search?q=author%3A${githubUser}+fix&type=commits`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    All fixes on GitHub <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  </a>
                )}
              </section>
            )}
          </div>

          <div className="hm-brief__actions">
            <Link to="/contact" className="hm-btn hm-btn--primary" onClick={onClose}>
              Start a conversation <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <a href={PROFILE.resume} target="_blank" rel="noopener noreferrer" className="hm-btn hm-btn--ghost">
              <i className="fa-regular fa-file-lines" aria-hidden="true" /> Résumé
            </a>
            <button type="button" className="hm-btn hm-btn--ghost" onClick={copy} aria-live="polite">
              <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
              {copied ? "Copied" : "Copy as text"}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
