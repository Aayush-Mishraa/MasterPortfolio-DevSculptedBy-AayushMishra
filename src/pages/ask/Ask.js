import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import { prepareForm, submitForm } from "../../services/api/forms";
import { bookingFor } from "../../data/services";
import "../services/Services.css";
import "../tools/Tools.css";
import "./Ask.css";

/*
  F31: "Ask Aayush's AI". Answers come from /api/ask.php, which only uses
  passages of this site (and Claude Haiku 4.5 to word them, when it's on).
  Every answer shows its sources and its own eval scores, and the page offers
  a booking. Questions aren't kept in the browser after a reload.
*/

const SUGGESTIONS = [
  "What does a QA Health Check include?",
  "Which test automation tools does Aayush use?",
  "Is Aayush open to full-time roles?",
  "How does the Release Review call work?",
  "Has he built AI testing agents?",
];

const pct = (value) => (value == null ? "—" : `${Math.round(value * 100)}%`);
const tone = (value) => (value == null ? "" : value >= 0.8 ? "ft-pass" : value >= 0.5 ? "ft-warn" : "ft-fail");

const MODE = {
  llm: "Written by Claude Haiku 4.5 from the passages below",
  retrieval: "Passages from the site (the AI writer is off right now)",
  refused: "Not covered by the site",
};

function Evals({ evals, mode }) {
  if (!evals) return null;
  return (
    <dl className="ask-evals" aria-label="Eval scores for this answer">
      <div title="Share of the answer's sentences backed by the cited passages (numbers must match exactly).">
        <dt>Grounded</dt>
        <dd className={tone(evals.grounded)}>{pct(evals.grounded)}</dd>
      </div>
      <div title="Share of sentences that cite a source.">
        <dt>Cited</dt>
        <dd className={tone(evals.cited)}>{pct(evals.cited)}</dd>
      </div>
      <div title="How much of the question the best passage covers.">
        <dt>Retrieval match</dt>
        <dd className={tone(evals.retrieval)}>{pct(evals.retrieval)}</dd>
      </div>
      <div>
        <dt>Mode</dt>
        <dd>{mode === "llm" ? "LLM + RAG" : mode === "retrieval" ? "Retrieval" : "Declined"}</dd>
      </div>
    </dl>
  );
}

// "[1]" in the answer links to source 1.
function AnswerText({ text, sources, id }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="ask-answer__text">
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (!match) return <React.Fragment key={index}>{part}</React.Fragment>;
        const source = sources.find((item) => item.n === Number(match[1]));
        return source ? (
          <a key={index} className="ask-cite" href={`#${id}-s${source.n}`} aria-label={`Source ${source.n}: ${source.title}`}>
            {match[1]}
          </a>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </p>
  );
}

export default function Ask({ theme }) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [trap, setTrap] = useState("");
  const inputRef = useRef(null);
  const lastRef = useRef(null);
  const booking = bookingFor("release-review");

  useEffect(() => {
    if (lastRef.current) lastRef.current.focus();
  }, [thread.length]);

  const ask = async (text) => {
    const value = (text || question).trim();
    if (value.length < 3 || busy) return;
    setBusy(true);
    setError("");
    const result = await submitForm("ask.php", "ask", { question: value, website: trap });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.status === 0 || result.status === 404
          ? "The assistant couldn't be reached. Please try again in a minute."
          : result.data.message || "That didn't work. Please try again."
      );
      return;
    }
    setThread((current) => current.concat([{ question: value, ...result.data }]));
    setQuestion("");
  };

  return (
    <PageShell theme={theme} className="ft ask">
      <section className="hm-section ft-hero" aria-labelledby="ask-title">
        <div className="hm-shell">
          <p className="hm-eyebrow">Ask my site · with its eval scores</p>
          <h1 className="ft-hero__title" id="ask-title">
            Ask about my work. <span className="hm-grad">Check the answer.</span>
          </h1>
          <p className="hm-lead">
            An assistant that answers only from this site: my experience, services, tools and projects. Every answer shows
            its sources and how well it scored on groundedness and citations, the same checks I build for AI teams.
          </p>
        </div>
      </section>

      <section className="hm-section" aria-label="Questions and answers">
        <div className="hm-shell ask-layout">
          <div>
            <ol className="ask-thread">
              {thread.map((item, index) => {
                const id = `a${index}`;
                return (
                  <li key={id} className="hm-card ask-item">
                    <p className="ask-q">
                      <i className="fa-regular fa-user" aria-hidden="true" /> {item.question}
                    </p>
                    <div className="ask-answer" tabIndex={-1} ref={index === thread.length - 1 ? lastRef : null}>
                      <p className="ft-hint">{MODE[item.mode]}</p>
                      <AnswerText text={item.answer} sources={item.sources || []} id={id} />
                      <Evals evals={item.evals} mode={item.mode} />
                      {item.sources && item.sources.length > 0 && (
                        <details className="ask-sources">
                          <summary>Sources ({item.sources.length})</summary>
                          <ol>
                            {item.sources.map((source) => (
                              <li key={source.n} id={`${id}-s${source.n}`}>
                                <a href={source.url}>{source.title}</a>
                                <span>{source.snippet}</span>
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <form
              className="sv-form ask-form"
              onSubmit={(event) => {
                event.preventDefault();
                ask();
              }}
              onFocus={() => prepareForm("ask")}
            >
              <label className="sv-form__field sv-form__field--wide">
                <span>{thread.length ? "Ask another question" : "Your question"}</span>
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={question}
                  maxLength={400}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      ask();
                    }
                  }}
                />
              </label>
              <div className="sv-form__trap" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
                </label>
              </div>
              {error && (
                <div className="sv-form__failed" role="alert">
                  <p>{error}</p>
                </div>
              )}
              <div className="sv-form__actions">
                <button type="submit" className="hm-btn hm-btn--primary" disabled={busy || question.trim().length < 3}>
                  {busy ? "Thinking…" : "Ask"} <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                </button>
                <span className="sv-form__note">Questions are logged to improve the answers. Don&apos;t share personal data.</span>
              </div>
            </form>
            <div className="ask-suggest" aria-label="Example questions">
              {SUGGESTIONS.map((text) => (
                <button key={text} type="button" className="hm-chip ask-chip" onClick={() => ask(text)} disabled={busy}>
                  {text}
                </button>
              ))}
            </div>
          </div>

          <aside className="hm-card ft-panel ask-side" aria-labelledby="ask-side-title">
            <div className="ft-panel__body">
              <h2 className="ft-h2" id="ask-side-title">
                Rather talk to me?
              </h2>
              <p className="ft-muted">The assistant knows what the site says. I know the rest.</p>
              <div className="ft-cta__actions">
                {booking ? (
                  <a href={booking.url} className="hm-btn hm-btn--primary" target="_blank" rel="noopener noreferrer">
                    Book a Release Review <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  </a>
                ) : (
                  <Link to="/services/release-review" className="hm-btn hm-btn--primary">
                    Book a Release Review <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </Link>
                )}
                <Link to="/contact" className="hm-link">
                  Email me <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
                <Link to="/hire-me" className="hm-link">
                  Recruiter brief <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
              <h3 className="ft-h3">How it works</h3>
              <ol className="ask-how">
                <li>Your question is matched against passages of this site (BM25 search).</li>
                <li>Claude Haiku 4.5 writes a short answer from those passages only, citing each one.</li>
                <li>
                  The answer is graded: <strong>grounded</strong> (sentences backed by the sources), <strong>cited</strong>{" "}
                  and <strong>retrieval match</strong>.
                </li>
                <li>Nothing relevant on the site? It says so instead of guessing.</li>
              </ol>
              <p className="ft-hint">
                Curious how evals work? Try the <Link to="/free-tools/ai-eval-playground">AI Eval Playground</Link>.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
