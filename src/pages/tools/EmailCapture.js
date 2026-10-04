import React, { useEffect, useRef, useState } from "react";
import { prepareForm, submitForm } from "../../services/api/forms";

/*
  Stage 3: the email capture on the lead magnets. Posts to /api/magnet.php
  (saved as a lead "magnet:<key>", the deliverable emailed). The newsletter
  is a separate, unticked opt-in. `onDone(result)` gets the API's answer, so
  the checklist can show its download link at once.
*/

export default function EmailCapture({ magnet, detail = "", score, button = "Send it to me", note, onDone, askName = true }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [trap, setTrap] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | sending | sent | failed
  const [message, setMessage] = useState("");
  const emailRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    if ((phase === "sent" || phase === "failed") && statusRef.current) statusRef.current.focus();
  }, [phase]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email address doesn't look right.");
      emailRef.current.focus();
      return;
    }
    setError("");
    setPhase("sending");
    const result = await submitForm("magnet.php", "magnet", {
      magnet,
      email: email.trim(),
      name: name.trim(),
      newsletter,
      detail,
      ...(typeof score === "number" ? { score } : {}),
      page: window.location.pathname,
      website: trap,
    });
    if (result.ok) {
      setPhase("sent");
      if (onDone) onDone(result.data);
      return;
    }
    if (result.status === 422 && result.data.fields && result.data.fields.email) {
      setError(result.data.fields.email);
      setPhase("idle");
      return;
    }
    setMessage(
      result.status === 0 || result.status === 404
        ? "The server couldn't be reached from here. Please try again in a minute."
        : result.data.message || "That didn't go through. Please try again."
    );
    setPhase("failed");
    if (onDone) onDone(null);
  };

  if (phase === "sent") {
    return (
      <div className="sv-form__done ft-capture__done" role="status" tabIndex={-1} ref={statusRef}>
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        <div>
          <h3>On its way</h3>
          <p>
            Check {email.trim()} in a minute (and the spam folder, just in case).
            {newsletter ? " The newsletter sends its own confirmation email." : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="sv-form ft-capture" onSubmit={onSubmit} onFocus={() => prepareForm("magnet")} noValidate>
      <div className="sv-form__grid">
        {askName && (
          <label className="sv-form__field">
            <span>First name</span>
            <input name="name" autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
          </label>
        )}
        <label className={`sv-form__field${askName ? "" : " sv-form__field--wide"}`}>
          <span>
            Email <b aria-hidden="true">*</b>
          </span>
          <input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${magnet}-email-error` : undefined}
            maxLength={254}
          />
          {error && (
            <span className="sv-form__error" id={`${magnet}-email-error`}>
              {error}
            </span>
          )}
        </label>
        <label className="ft-check sv-form__field--wide">
          <input type="checkbox" checked={newsletter} onChange={(event) => setNewsletter(event.target.checked)} />
          <span>Also send me the occasional newsletter on testing and releases (confirm by email, unsubscribe any time).</span>
        </label>
        <div className="sv-form__trap" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
          </label>
        </div>
      </div>
      {phase === "failed" && (
        <div className="sv-form__failed" role="alert" tabIndex={-1} ref={statusRef}>
          <p>{message}</p>
        </div>
      )}
      <div className="sv-form__actions">
        <button type="submit" className="hm-btn hm-btn--primary" disabled={phase === "sending"}>
          {phase === "sending" ? "Sending…" : button} <i className="fa-solid fa-paper-plane" aria-hidden="true" />
        </button>
        <span className="sv-form__note">{note || "Used only to send you this. No spam."}</span>
      </div>
    </form>
  );
}
