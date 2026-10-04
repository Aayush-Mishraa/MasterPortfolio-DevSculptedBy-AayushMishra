import React, { useEffect, useRef, useState } from "react";
import { prepareForm, submitForm } from "../../services/api/forms";
import { SERVICES, TIMELINES, asksBudget, budgetOptions } from "../../data/services";
import { PROFILE } from "../home/homeData";

/*
  F12: the enquiry form on each /services/<slug> page. Posts to
  /api/enquiry.php (saved as a lead with source "service:<slug>" and emailed),
  with the same protections as the contact form: a signed form token, a
  honeypot and server-side validation. If the server can't take it, the
  visitor gets a ready-to-send email instead.
*/

const BUDGETS = budgetOptions();
const MIN_MESSAGE = 20;

const EMPTY = { name: "", email: "", company: "", budget: "", timeline: "", message: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Your name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "That email address doesn't look right.";
  if (form.message.trim().length < MIN_MESSAGE) errors.message = `A few more words, please (at least ${MIN_MESSAGE} characters).`;
  return errors;
}

export default function EnquiryForm({ service: initial }) {
  const [service, setService] = useState(initial.slug);
  const [form, setForm] = useState(EMPTY);
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle"); // idle | sending | sent | failed
  const [failure, setFailure] = useState({ message: "", mailto: false });
  const statusRef = useRef(null);
  const serviceRef = useRef(null);
  const refs = { name: useRef(null), email: useRef(null), message: useRef(null) };

  // A different offer page keeps the form but switches the service.
  useEffect(() => setService(initial.slug), [initial.slug]);
  // React 16 doesn't correct a select's choice when it adopts prerendered
  // HTML, so the DOM is told directly.
  useEffect(() => {
    if (serviceRef.current && serviceRef.current.value !== service) serviceRef.current.value = service;
  }, [service]);
  useEffect(() => {
    if ((phase === "sent" || phase === "failed") && statusRef.current) statusRef.current.focus();
  }, [phase]);

  const title = (SERVICES.find((item) => item.slug === service) || initial).title;
  const update = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const mailto = () => {
    const body = [form.message, "", `Company: ${form.company || "-"}`, `Timeline: ${form.timeline || "-"}`].join("\n");
    return `mailto:${PROFILE.email}?subject=${encodeURIComponent(`Enquiry: ${title}`)}&body=${encodeURIComponent(body)}`;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = ["name", "email", "message"].find((field) => found[field]);
    if (first) {
      refs[first].current.focus();
      return;
    }
    setPhase("sending");
    const result = await submitForm("enquiry.php", "enquiry", {
      service,
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      budget: asksBudget(service) && form.budget ? form.budget : null,
      timeline: form.timeline || null,
      message: form.message.trim(),
      page: window.location.pathname,
      website: trap,
    });
    if (result.ok) {
      setPhase("sent");
      return;
    }
    if (result.status === 422 && result.data.fields) {
      setErrors(result.data.fields);
      setPhase("idle");
      return;
    }
    setFailure({
      message: result.data.message || "The enquiry couldn't be sent from here.",
      // Rate limits and server or network failures: email still works.
      mailto: result.status === 0 || result.status >= 500 || result.status === 429 || result.status === 404,
    });
    setPhase("failed");
  };

  if (phase === "sent") {
    return (
      <div className="sv-form__done" role="status" tabIndex={-1} ref={statusRef}>
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        <div>
          <h3>Enquiry received</h3>
          <p>
            Thanks, {form.name.trim().split(" ")[0]}. I&apos;ll reply to {form.email.trim()} in {PROFILE.responseTime}{" "}
            about the {title}.
          </p>
        </div>
      </div>
    );
  }

  const fieldError = (field) =>
    errors[field] ? (
      <span className="sv-form__error" id={`enq-${field}-error`}>
        {errors[field]}
      </span>
    ) : null;
  const described = (field) => (errors[field] ? `enq-${field}-error` : undefined);

  return (
    <form className="sv-form" onSubmit={onSubmit} onFocus={() => prepareForm("enquiry")} noValidate>
      <div className="sv-form__grid">
        <label className="sv-form__field sv-form__field--wide">
          <span>Service</span>
          <select ref={serviceRef} value={service} onChange={(event) => setService(event.target.value)} name="service">
            {SERVICES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="sv-form__field">
          <span>
            Name <b aria-hidden="true">*</b>
          </span>
          <input
            ref={refs.name}
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={update("name")}
            required
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={described("name")}
            maxLength={100}
          />
          {fieldError("name")}
        </label>
        <label className="sv-form__field">
          <span>
            Work email <b aria-hidden="true">*</b>
          </span>
          <input
            ref={refs.email}
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            required
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={described("email")}
            maxLength={254}
          />
          {fieldError("email")}
        </label>
        <label className="sv-form__field">
          <span>Company</span>
          <input name="company" autoComplete="organization" value={form.company} onChange={update("company")} maxLength={120} />
        </label>
        {asksBudget(service) && (
          <label className="sv-form__field">
            <span>Budget</span>
            <select name="budget" value={form.budget} onChange={update("budget")}>
              <option value="">Choose a range</option>
              {BUDGETS.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="sv-form__field">
          <span>Timeline</span>
          <select name="timeline" value={form.timeline} onChange={update("timeline")}>
            <option value="">When do you need it?</option>
            {TIMELINES.map((timeline) => (
              <option key={timeline} value={timeline}>
                {timeline}
              </option>
            ))}
          </select>
        </label>
        <label className="sv-form__field sv-form__field--wide">
          <span>
            What are you shipping, and where does testing hurt? <b aria-hidden="true">*</b>
          </span>
          <textarea
            ref={refs.message}
            name="message"
            rows={6}
            value={form.message}
            onChange={update("message")}
            required
            aria-invalid={errors.message ? "true" : undefined}
            aria-describedby={described("message")}
            maxLength={5000}
          />
          {fieldError("message")}
        </label>
        {/* Honeypot: hidden from people and assistive tech */}
        <div className="sv-form__trap" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
          </label>
        </div>
      </div>

      {phase === "failed" && (
        <div className="sv-form__failed" role="alert" tabIndex={-1} ref={statusRef}>
          <p>{failure.message}</p>
          {failure.mailto && (
            <a className="hm-btn hm-btn--ghost" href={mailto()}>
              <i className="fa-regular fa-envelope" aria-hidden="true" /> Email it instead
            </a>
          )}
        </div>
      )}

      <div className="sv-form__actions">
        <button type="submit" className="hm-btn hm-btn--primary" disabled={phase === "sending"}>
          {phase === "sending" ? "Sending…" : "Send enquiry"}{" "}
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
        </button>
        <span className="sv-form__note">
          <b aria-hidden="true">*</b> required · Used only to reply to you.
        </span>
      </div>
    </form>
  );
}
