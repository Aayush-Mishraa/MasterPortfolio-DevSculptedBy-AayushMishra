import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ToolPage, { ToolCta, ToolHero } from "./ToolPage";
import { prepareForm, submitForm } from "../../services/api/forms";
import { toolBySlug } from "../../data/tools";

/*
  F24: "Test my site" (beta). The form posts to /api/scan.php; the scan runs
  as a GitHub Actions job (Playwright + axe + Lighthouse) and the report is
  emailed and shown at /free-tools/site-scanner/report?id=<id>.
*/

const TOOL = toolBySlug("site-scanner");

export const SCAN_CHECKS = [
  "The page loads (HTTP status)",
  "Served over HTTPS",
  "No console errors",
  "No broken scripts, styles or images",
  "No broken links (25 same-site links)",
  "No sideways scroll on a 375 px phone",
  "Accessibility: axe, serious and critical rules",
  "Title, meta description, viewport, lang",
  "Security headers: HSTS, CSP, nosniff, framing",
  "Core Web Vitals on mobile: LCP, CLS, TBT",
];

export default function SiteScanner({ theme, history }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle"); // idle | sending | failed
  const [message, setMessage] = useState("");
  const statusRef = useRef(null);
  const refs = { url: useRef(null), email: useRef(null), consent: useRef(null) };

  useEffect(() => {
    if (phase === "failed" && statusRef.current) statusRef.current.focus();
  }, [phase]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(url.trim())) found.url = "Enter a full web address, like https://example.com.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) found.email = "That email address doesn't look right.";
    if (!consent) found.consent = "Please confirm you may test this site.";
    setErrors(found);
    const first = ["url", "email", "consent"].find((field) => found[field]);
    if (first) {
      refs[first].current.focus();
      return;
    }
    setPhase("sending");
    const result = await submitForm("scan.php", "scan", {
      url: url.trim(),
      email: email.trim(),
      consent: true,
      page: window.location.pathname,
      website: trap,
    });
    if (result.ok && result.data.id) {
      history.push(`/free-tools/site-scanner/report?id=${result.data.id}`);
      return;
    }
    if (result.ok) {
      setMessage("Thanks. The report will arrive by email.");
      setPhase("failed");
      return;
    }
    if (result.status === 422 && result.data.fields) {
      setErrors(result.data.fields);
      setPhase("idle");
      const field = ["url", "email", "consent"].find((name) => result.data.fields[name]);
      if (field && refs[field].current) refs[field].current.focus();
      return;
    }
    setMessage(
      result.status === 0 || result.status === 404
        ? "The scanner couldn't be reached. Please try again in a minute."
        : result.data.message || "The scan couldn't be started."
    );
    setPhase("failed");
  };

  const fieldError = (field) =>
    errors[field] ? (
      <span className="sv-form__error" id={`scan-${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  return (
    <ToolPage theme={theme} className="ft-scan">
      <ToolHero
        tool={TOOL}
        title="Test my site"
        lead="A real browser test of your page: Playwright, axe-core and Lighthouse run against it on a clean machine. You get a pass/fail report by email, a runnable Playwright test for every failure, and a badge."
      />

      <section className="hm-section" aria-labelledby="scan-form-title">
        <div className="hm-shell ft-two">
          <div className="hm-card ft-panel">
            <div className="ft-panel__body">
              <h2 className="ft-h2" id="scan-form-title">
                Start a scan
              </h2>
              <form className="sv-form" onSubmit={onSubmit} onFocus={() => prepareForm("scan")} noValidate style={{ marginTop: 0 }}>
                <div className="sv-form__grid">
                  <label className="sv-form__field sv-form__field--wide">
                    <span>
                      Page to test <b aria-hidden="true">*</b>
                    </span>
                    <input
                      ref={refs.url}
                      type="url"
                      inputMode="url"
                      name="url"
                      placeholder="https://your-site.com"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      aria-invalid={errors.url ? "true" : undefined}
                      aria-describedby={errors.url ? "scan-url-error" : undefined}
                      maxLength={500}
                      required
                    />
                    {fieldError("url")}
                  </label>
                  <label className="sv-form__field sv-form__field--wide">
                    <span>
                      Email for the report <b aria-hidden="true">*</b>
                    </span>
                    <input
                      ref={refs.email}
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      aria-invalid={errors.email ? "true" : undefined}
                      aria-describedby={errors.email ? "scan-email-error" : undefined}
                      maxLength={254}
                      required
                    />
                    {fieldError("email")}
                  </label>
                  <label className="ft-check sv-form__field--wide">
                    <input
                      ref={refs.consent}
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      aria-invalid={errors.consent ? "true" : undefined}
                      aria-describedby={errors.consent ? "scan-consent-error" : undefined}
                    />
                    <span>
                      This is my site, or I have permission to test it. <b aria-hidden="true">*</b>
                    </span>
                  </label>
                  {fieldError("consent")}
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
                    {phase === "sending" ? "Starting…" : "Scan it"} <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
                  </button>
                  <span className="sv-form__note">Beta: two scans a day. Public sites only.</span>
                </div>
              </form>
            </div>
          </div>
          <div className="ft-prose">
            <h2 className="ft-h2">What it checks</h2>
            <ul className="ft-scan__what">
              {SCAN_CHECKS.map((check) => (
                <li key={check}>
                  <i className="fa-solid fa-check" aria-hidden="true" />
                  {check}
                </li>
              ))}
            </ul>
            <h3 className="ft-h3">What you get</h3>
            <p>
              An email in a few minutes: <strong>&quot;14 passed · 3 failed · NOT SIGNED OFF&quot;</strong> style, every check
              with the reason, a <code>failing-checks.spec.ts</code> with one Playwright test per failure (it fails now and
              passes once fixed), and an embeddable badge.
            </p>
            <p className="ft-muted">
              Only the one page you enter is loaded, plus a HEAD request to up to 25 links on it. Private and internal
              addresses are refused. Your email is used to send the report, and the request is kept so I can follow up if you
              reply. Nothing else.
            </p>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="An automated scan is a start"
        title="Want the things a scanner can't see?"
        text="The QA Health Check reviews your tests, CI and release process by hand: flaky tests, coverage gaps and the risks in how you ship. Or start with the free checklist."
        to="/services/qa-health-check"
        label="See the QA Health Check"
      />
      <section className="hm-section" aria-label="Related">
        <div className="hm-shell">
          <p className="ft-muted">
            Before a release, run through the <Link to="/free-tools/release-readiness-checklist">Release Readiness Checklist</Link>.
          </p>
        </div>
      </section>
    </ToolPage>
  );
}
