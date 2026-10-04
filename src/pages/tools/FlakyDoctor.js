import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import ToolPage, { ToolCta, ToolHero } from "./ToolPage";
import { analyze, toMarkdown } from "./flaky/analyze";
import { SAMPLE_RUNS } from "./flaky/samples";
import { toolBySlug } from "../../data/tools";

/*
  F22: the Flaky Test Doctor. Files are read with FileReader and parsed in
  the page (./flaky/analyze.js); nothing is uploaded. Built to be shared on
  its own (Product Hunt / Show HN): clear privacy line, sample data, a
  Markdown export for the ticket.
*/

const TOOL = toolBySlug("flaky-test-doctor");
const MAX_FILE = 20 * 1024 * 1024;

const readFile = (file) =>
  new Promise((resolve) => {
    if (file.size > MAX_FILE) {
      resolve({ name: file.name, text: "", error: "larger than 20 MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, text: String(reader.result || "") });
    reader.onerror = () => resolve({ name: file.name, text: "", error: "couldn't be read" });
    reader.readAsText(file);
  });

const percent = (value) => `${Math.round(value * 100)}%`;

function RunStrip({ outcomes }) {
  return (
    <div className="ft-fd__runs" aria-hidden="true">
      {outcomes.slice(0, 60).map((outcome, index) => (
        <span key={index} className={outcome.outcome === "fail" ? "is-fail" : outcome.outcome === "skip" ? "is-skip" : ""} />
      ))}
    </div>
  );
}

export default function FlakyDoctor({ theme }) {
  const [files, setFiles] = useState([]);
  const [paste, setPaste] = useState("");
  const [over, setOver] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);
  const inputRef = useRef(null);

  const addFiles = async (list) => {
    const read = await Promise.all(Array.from(list).slice(0, 50).map(readFile));
    setFiles((current) => current.concat(read));
  };

  const run = (inputs) => {
    const next = analyze(inputs);
    setResult(next);
    setCopied(false);
    setTimeout(() => resultRef.current && resultRef.current.focus(), 0);
  };

  const onAnalyze = () => {
    const inputs = files.filter((file) => file.text).concat(paste.trim() ? [{ name: "pasted text", text: paste }] : []);
    run(inputs);
  };

  const onSample = () => {
    setFiles(SAMPLE_RUNS.map((sample) => ({ name: sample.name, text: sample.text })));
    setPaste("");
    run(SAMPLE_RUNS);
  };

  const reset = () => {
    setFiles([]);
    setPaste("");
    setResult(null);
  };

  const copyMarkdown = () => {
    if (!result || !navigator.clipboard) return;
    navigator.clipboard.writeText(toMarkdown(result)).then(() => setCopied(true), () => {});
  };

  const flakeRate = result && result.runs && result.tests ? Math.min(50, Math.round((result.flaky.length / result.tests) * 100)) : null;

  return (
    <ToolPage theme={theme} className="ft-fd">
      <ToolHero
        tool={TOOL}
        title="Flaky Test Doctor"
        lead="Drop in JUnit XML reports or paste a CI log. Get your flaky tests ranked by how much they hurt, with the likely cause and a fix for each."
      >
        <p className="ft-muted">
          <i className="fa-solid fa-lock" aria-hidden="true" /> Runs entirely in your browser. Your reports never leave this
          page.
        </p>
      </ToolHero>

      <section className="hm-section" aria-labelledby="fd-input-title">
        <div className="hm-shell">
          <div className="hm-card ft-panel">
            <div className="ft-panel__body ft-fd__input">
              <h2 className="ft-h2" id="fd-input-title">
                Your test results
              </h2>
              <p className="ft-muted">
                Best: the JUnit XML from several CI runs of the same code (each file is a run). One log works too when it has
                retries. Supported: JUnit XML (Playwright, Jest, pytest, Cypress, Maven Surefire, Gradle, TestNG), and logs
                from Playwright, Jest/Vitest, pytest, Cypress/Mocha, Maven and Go.
              </p>
              <label
                className={`ft-drop${over ? " is-over" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setOver(false);
                  addFiles(event.dataTransfer.files);
                }}
              >
                <i className="fa-solid fa-file-arrow-up" aria-hidden="true" />
                <strong>Drop .xml or .log files here, or choose files</strong>
                <span>Up to 50 files, 20 MB each</span>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".xml,.log,.txt,text/xml,text/plain"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {files.length > 0 && (
                <ul className="ft-fd__files" aria-label="Files added">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <i className={file.error ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-file-lines"} aria-hidden="true" />
                      {file.name}
                      {file.error ? ` (${file.error})` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <div className="sv-form">
                <label className="sv-form__field sv-form__field--wide" style={{ marginTop: "1.25rem" }}>
                  <span>Or paste a CI log or JUnit XML</span>
                  <textarea value={paste} onChange={(event) => setPaste(event.target.value)} spellCheck="false" rows={8} />
                </label>
              </div>
              <div className="ft-fd__actions">
                <button type="button" className="hm-btn hm-btn--primary" onClick={onAnalyze} disabled={!files.length && !paste.trim()}>
                  <i className="fa-solid fa-stethoscope" aria-hidden="true" /> Diagnose
                </button>
                <button type="button" className="hm-btn hm-btn--ghost" onClick={onSample}>
                  Try it with sample data
                </button>
                {(files.length > 0 || paste || result) && (
                  <button type="button" className="hm-btn hm-btn--link" onClick={reset}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <section className="hm-section" aria-labelledby="fd-result-title">
          <div className="hm-shell">
            <div className="hm-card ft-panel">
              <div className="hm-bar">
                <span className="hm-bar__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="hm-bar__title">diagnosis.md</span>
              </div>
              <div className="ft-panel__body">
                <h2 className="ft-h2" id="fd-result-title" tabIndex={-1} ref={resultRef}>
                  {result.flaky.length
                    ? `${result.flaky.length} flaky test${result.flaky.length === 1 ? "" : "s"} found`
                    : result.tests
                    ? "No flaky tests found"
                    : "Nothing to diagnose yet"}
                </h2>
                <dl className="ft-stats">
                  <div className="ft-stat">
                    <dt>Runs read</dt>
                    <dd>{result.runs}</dd>
                  </div>
                  <div className="ft-stat">
                    <dt>Tests seen</dt>
                    <dd>{result.tests}</dd>
                  </div>
                  <div className="ft-stat ft-stat--lead">
                    <dt>Flaky</dt>
                    <dd>{result.flaky.length}</dd>
                  </div>
                  <div className="ft-stat">
                    <dt>Always failing</dt>
                    <dd>{result.alwaysFailing.length}</dd>
                  </div>
                </dl>
                {result.warnings.length > 0 && (
                  <ul className="ft-hint" style={{ marginTop: "1rem" }}>
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
                {result.runs === 1 && !result.flaky.length && result.tests > 0 && (
                  <p className="ft-muted" style={{ marginTop: "1rem" }}>
                    With a single run, only retries can show flakiness. Add reports from a few more runs of the same commit to
                    catch tests that fail now and then.
                  </p>
                )}

                {result.flaky.length > 0 && (
                  <>
                    <div className="ft-fd__actions">
                      <button type="button" className="hm-btn hm-btn--ghost" onClick={copyMarkdown} aria-live="polite">
                        <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />{" "}
                        {copied ? "Copied" : "Copy as Markdown"}
                      </button>
                      {flakeRate !== null && (
                        <Link to={`/free-tools/qa-roi-calculator?flake=${Math.max(1, flakeRate)}`} className="hm-link">
                          What does this cost you a year? <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                    <ol className="ft-fd__list">
                      {result.flaky.map((test, index) => (
                        <li key={test.key} className="hm-card ft-fd__item">
                          <div className="ft-fd__head">
                            <h3 className="ft-fd__name">
                              {index + 1}. {test.name}
                              {test.suite && <span className="ft-fd__suite">{test.suite}</span>}
                            </h3>
                            <span className="ft-fd__score">
                              {test.fails} fail{test.fails === 1 ? "" : "s"} · {percent(test.failRate)} fail rate
                              {test.retriedPass ? ` · passed on retry ${test.retriedPass}×` : ""}
                              {test.marked && !test.fails ? " · marked flaky by the runner" : ""}
                            </span>
                          </div>
                          <RunStrip outcomes={test.outcomes} />
                          <div className="ft-fd__cause">
                            <p>
                              <strong>Likely cause:</strong> {test.cause.title}
                            </p>
                            <p>
                              <strong>Fix:</strong> {test.cause.fix}
                            </p>
                          </div>
                          {test.messages[0] && (
                            <details>
                              <summary className="ft-hint">Error message</summary>
                              <pre className="ft-fd__error">{test.messages[0]}</pre>
                            </details>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {result.alwaysFailing.length > 0 && (
                  <>
                    <h3 className="ft-h3">Failing in every run (not flaky: broken)</h3>
                    <ul className="ft-hint">
                      {result.alwaysFailing.slice(0, 20).map((test) => (
                        <li key={test.key}>
                          <code>{test.name}</code>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="hm-section" aria-labelledby="fd-how-title">
        <div className="hm-shell ft-two">
          <div className="ft-prose">
            <h2 className="ft-h2" id="fd-how-title">
              How it decides
            </h2>
            <p>
              A test is flaky when the same test both fails and passes on the same code: across the runs you give it, or
              inside one run when a retry passes. Runner markers count too (Playwright&apos;s &quot;flaky&quot; list,
              Surefire&apos;s <code>flakyFailure</code> and &quot;Flakes:&quot; block, pytest&apos;s <code>RERUN</code>).
            </p>
            <p>
              Tests are ranked by the failures they caused, weighted up when they flip often. The likely cause comes from the
              error messages: timing and waits, overlays and animations, re-rendered DOM, network, shared test data, clocks
              and time zones, CI resources, ordering, or assertions that read async state too early.
            </p>
          </div>
          <div className="ft-prose">
            <h2 className="ft-h2">Getting JUnit XML</h2>
            <ul>
              <li>
                Playwright: <code>--reporter=junit</code> (set <code>PLAYWRIGHT_JUNIT_OUTPUT_NAME</code>)
              </li>
              <li>
                Jest: <code>jest-junit</code> · Vitest: <code>--reporter=junit</code>
              </li>
              <li>
                pytest: <code>--junitxml=report.xml</code>
              </li>
              <li>Cypress: the built-in junit reporter</li>
              <li>Maven / Gradle: target/surefire-reports, build/test-results</li>
            </ul>
            <p className="ft-muted">Download the report artifact from your last 5–10 CI runs and drop them all in at once.</p>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="Too many to fix alone?"
        title="Get the flaky suite back to green."
        text="The QA Health Check finds and ranks every source of flakiness in your suite and CI, with a 30-day plan to fix them. Five working days."
        to="/services/qa-health-check"
        label="See the QA Health Check"
      />
    </ToolPage>
  );
}
