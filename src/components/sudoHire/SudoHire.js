import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PROFILE } from "../../pages/home/homeData";
import { KIT_PAGE, KIT_PDF, RECRUITER_KIT } from "../../data/recruiterKit";
import "./SudoHire.css";

/*
  F26: the "sudo hire aayush" easter egg. Typed anywhere on the site (outside
  form fields), it opens a small terminal that "grants recruiter privileges"
  and hands over the recruiter kit: the one-page PDF, the one-pager and a way
  to book a call. Esc or the close button dismisses it.
*/

const SECRET = "sudo hire aayush";

const LINES = [
  { tone: "cmd", text: `$ ${SECRET}` },
  { tone: "dim", text: "[sudo] password for recruiter: ********" },
  { tone: "dim", text: "verifying recruiter privileges… ok" },
  { tone: "ok", text: "✓ permission granted" },
  { tone: "dim", text: "packing recruiter-kit.pdf (role fit, highlights, references, calendar)…" },
  { tone: "ok", text: `✓ ${PROFILE.name} · ${PROFILE.role}` },
  { tone: "ok", text: `✓ ${PROFILE.status}` },
  { tone: "out", text: "Your kit is ready:" },
];

const isField = (element) =>
  element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));

export default function SudoHire() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);
  const buffer = useRef("");
  const dialogRef = useRef(null);
  const returnTo = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    if (returnTo.current && returnTo.current.focus) returnTo.current.focus();
  }, []);

  // Listen for the phrase; also open on ?sudo=hire (handy to share).
  useEffect(() => {
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isField(event.target)) return;
      if (event.key.length !== 1) return;
      buffer.current = (buffer.current + event.key.toLowerCase()).slice(-SECRET.length);
      if (buffer.current === SECRET) {
        buffer.current = "";
        returnTo.current = document.activeElement;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    if (/[?&]sudo=hire\b/.test(window.location.search)) setOpen(true);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Type the lines out (all at once with reduced motion).
  useEffect(() => {
    if (!open) {
      setShown(0);
      return undefined;
    }
    if (dialogRef.current) dialogRef.current.focus();
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(LINES.length);
      return undefined;
    }
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= LINES.length) clearInterval(timer);
    }, 260);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;
  const done = shown >= LINES.length;

  return (
    <div className="sudo-overlay" onClick={close} role="presentation">
      <div
        className="sudo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sudo-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sudo__bar">
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <em id="sudo-title">recruiter@aayushmishra.engineer: ~</em>
          <button type="button" className="sudo__close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <ol className="sudo__body" aria-live="polite">
          {LINES.slice(0, shown).map((line) => (
            <li key={line.text} className={`is-${line.tone}`}>
              {line.text}
            </li>
          ))}
        </ol>
        {done && (
          <div className="sudo__actions">
            <a href={KIT_PDF} className="sudo__btn sudo__btn--primary" download>
              ⬇ recruiter-kit.pdf
            </a>
            <Link to={KIT_PAGE} className="sudo__btn" onClick={close}>
              open the one-pager
            </Link>
            {RECRUITER_KIT.calendarUrl ? (
              <a href={RECRUITER_KIT.calendarUrl} className="sudo__btn" target="_blank" rel="noopener noreferrer">
                book a call
              </a>
            ) : (
              <a href={`mailto:${PROFILE.email}?subject=${encodeURIComponent("Role at our company")}`} className="sudo__btn">
                email {PROFILE.firstName}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
