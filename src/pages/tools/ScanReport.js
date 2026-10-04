import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import ToolPage, { ToolCta } from "./ToolPage";

/*
  F24: one scan's report, /free-tools/site-scanner/report?id=<id>. Reads
  /api/scan-report.php and polls while the job runs. Not indexed: each report
  belongs to whoever has the link.
*/

const STATUS = {
  waiting: "Waiting for a scanner slot. You'll get the report by email as soon as it runs.",
  queued: "Queued on the scanner. This usually takes 2–4 minutes.",
  running: "Scanning now: Playwright, axe and Lighthouse are running against the page.",
  failed: "The scan couldn't finish.",
};

const ICON = {
  pass: ["fa-solid fa-circle-check", "ft-pass", "passed"],
  fail: ["fa-solid fa-circle-xmark", "ft-fail", "failed"],
  warn: ["fa-solid fa-triangle-exclamation", "ft-warn", "warning"],
  skip: ["fa-solid fa-circle-minus", "ft-muted", "skipped"],
};

export default function ScanReport({ theme, location }) {
  const id = new URLSearchParams(location ? location.search : "").get("id") || "";
  const [state, setState] = useState({ loading: true, scan: null, error: "" });
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!/^[a-f0-9]{24}$/.test(id)) {
      setState({ loading: false, scan: null, error: "Open the report link from your email, or start a new scan from Test my site." });
      return undefined;
    }
    let timer = null;
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/scan-report.php?id=${id}`, { cache: "no-store" });
        const data = await response.json();
        if (!alive) return;
        if (!response.ok || !data.ok) {
          setState({ loading: false, scan: null, error: data.message || "This report couldn't be loaded." });
          return;
        }
        setState({ loading: false, scan: data.scan, error: "" });
        if (["waiting", "queued", "running"].includes(data.scan.status)) timer = setTimeout(load, data.scan.status === "waiting" ? 30000 : 8000);
      } catch (error) {
        if (alive) setState({ loading: false, scan: null, error: "The report service couldn't be reached. Try reloading in a minute." });
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  const { scan } = state;
  const report = scan && scan.report;
  const copy = (text, what) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => setCopied(what), () => {});
  };
  const reportUrl = typeof window !== "undefined" ? window.location.href : "";
  const badgeHtml = scan ? `<a href="${reportUrl}"><img src="${scan.badge}" alt="QA scan by aayushmishra.engineer"></a>` : "";
  const downloadSpec = () => {
    const blob = new Blob([scan.spec], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "failing-checks.spec.ts";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  return (
    <ToolPage theme={theme} className="ft-scan">
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className="hm-section ft-hero" aria-labelledby="ft-title">
        <div className="hm-shell">
          <nav className="sv-crumbs" aria-label="Breadcrumb">
            <Link to="/free-tools">Free tools</Link>
            <span aria-hidden="true">/</span>
            <Link to="/free-tools/site-scanner">Test my site</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Report</span>
          </nav>
          <h1 className="ft-hero__title" id="ft-title">
            Scan report
          </h1>
          <p className="hm-lead">{scan ? scan.url : state.loading ? "Loading the report…" : "No report here."}</p>
        </div>
      </section>

      <section className="hm-section" aria-label="Report">
        <div className="hm-shell">
          <div className="hm-card ft-panel">
            <div className="hm-bar">
              <span className="hm-bar__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="hm-bar__title">scan-report.json</span>
            </div>
            <div className="ft-panel__body" aria-live="polite">
              {state.error && <p>{state.error}</p>}
              {state.loading && <p className="ft-muted">Loading…</p>}
              {scan && scan.status !== "done" && (
                <div>
                  <p className="ft-scan__verdict">
                    <i
                      className={scan.status === "failed" ? "fa-solid fa-circle-xmark ft-fail" : "fa-solid fa-spinner fa-spin-pulse"}
                      aria-hidden="true"
                    />
                    {STATUS[scan.status] || scan.status}
                  </p>
                  {scan.error && <p className="ft-muted">{scan.error}</p>}
                  {scan.status !== "failed" && <p className="ft-muted">You can close this page: the report is also emailed.</p>}
                </div>
              )}
              {scan && scan.status === "done" && report && (
                <div>
                  <p className="ft-scan__verdict">
                    <span className="ft-pass">{scan.passed} passed</span> ·{" "}
                    <span className={scan.failed ? "ft-fail" : "ft-muted"}>{scan.failed} failed</span> ·{" "}
                    {scan.signed_off ? (
                      <span className="ft-badge ft-pass">Signed off ✓</span>
                    ) : (
                      <span className="ft-badge ft-fail">Not signed off</span>
                    )}
                  </p>
                  {report.metrics && report.metrics.performance != null && (
                    <dl className="ft-stats">
                      <div className="ft-stat">
                        <dt>Performance</dt>
                        <dd>{report.metrics.performance}</dd>
                      </div>
                      <div className="ft-stat">
                        <dt>Accessibility</dt>
                        <dd>{report.metrics.accessibility}</dd>
                      </div>
                      <div className="ft-stat">
                        <dt>Best practices</dt>
                        <dd>{report.metrics.bestPractices}</dd>
                      </div>
                      <div className="ft-stat">
                        <dt>SEO</dt>
                        <dd>{report.metrics.seo}</dd>
                      </div>
                    </dl>
                  )}
                  <ul className="ft-scan__checks">
                    {(report.checks || []).map((check) => {
                      const [icon, tone, word] = ICON[check.status] || ICON.skip;
                      return (
                        <li key={check.id} className="ft-scan__check">
                          <i className={`${icon} ${tone}`} aria-hidden="true" />
                          <div>
                            <strong>{check.title}</strong> <span className="ft-sr">({word})</span>
                            <p>{check.summary}</p>
                          </div>
                          {check.details && check.details.length > 0 && (
                            <ul>
                              {check.details.slice(0, 10).map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="ft-hint" style={{ marginTop: "1rem" }}>
                    Scanned {new Date(report.startedAt || scan.updated_at).toLocaleString()} with {report.scanner || "Playwright"}.
                  </p>

                  {scan.spec && (
                    <>
                      <h2 className="ft-h3">The failing checks as Playwright tests</h2>
                      <p className="ft-muted">Each test fails today and passes once the issue is fixed. Keep them as regression tests.</p>
                      <div className="ft-fd__actions" style={{ marginBottom: "0.75rem" }}>
                        <button type="button" className="hm-btn hm-btn--ghost" onClick={downloadSpec}>
                          <i className="fa-solid fa-download" aria-hidden="true" /> failing-checks.spec.ts
                        </button>
                      </div>
                      <pre className="ft-code">{scan.spec}</pre>
                    </>
                  )}

                  <h2 className="ft-h3">Badge</h2>
                  <p>
                    <img src={scan.badge} alt={`QA scan: ${scan.passed} passed, ${scan.failed} failed`} />
                  </p>
                  <div className="ft-fd__actions">
                    <button type="button" className="hm-btn hm-btn--ghost" onClick={() => copy(badgeHtml, "badge")} aria-live="polite">
                      <i className={copied === "badge" ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />{" "}
                      {copied === "badge" ? "Copied" : "Copy badge HTML"}
                    </button>
                    <button type="button" className="hm-btn hm-btn--link" onClick={() => copy(reportUrl, "link")}>
                      {copied === "link" ? "Link copied" : "Copy report link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="Fix it, and keep it fixed"
        title="Turn this report into a release process."
        text="The QA Health Check goes past what a scanner sees: your tests, CI, flaky suites and release risks, with a ranked plan. The Release Retainer signs off every release, with a badge to show for it."
        to="/services/qa-health-check"
        label="See the QA Health Check"
      />
    </ToolPage>
  );
}
