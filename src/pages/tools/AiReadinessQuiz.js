import React, { useEffect, useRef, useState } from "react";
import ToolPage, { ToolCta, ToolHero } from "./ToolPage";
import EmailCapture from "./EmailCapture";
import { AREAS, QUESTIONS, areaScores, decode, gaps, scoreOf, verdict } from "../../data/aiReadiness";
import { toolBySlug } from "../../data/tools";

/*
  F23: the AI-Agent Readiness quiz. One question at a time; the result shows
  the score, the four areas and the top three gaps. The full report (every
  answer with what to do) unlocks after the email capture, and the emailed
  link (?r=<answers>) opens it directly.
*/

const TOOL = toolBySlug("ai-readiness-quiz");

function Ring({ value }) {
  return (
    <div className="ft-ring" style={{ "--value": value }} role="img" aria-label={`Score ${value} out of 100`}>
      <span>
        {value}
        <small>/100</small>
      </span>
    </div>
  );
}

export default function AiReadinessQuiz({ theme, location, history }) {
  const [step, setStep] = useState(-1); // -1 intro, 0..11 questions, 12 result
  const [answers, setAnswers] = useState(() => Array(QUESTIONS.length).fill(null));
  const [unlocked, setUnlocked] = useState(false);
  const headingRef = useRef(null);
  const firstRender = useRef(true);

  // The emailed link carries the answers: open the full report.
  useEffect(() => {
    const params = new URLSearchParams(location ? location.search : "");
    const decoded = decode(params.get("r"));
    if (decoded) {
      setAnswers(decoded);
      setUnlocked(true);
      setStep(QUESTIONS.length);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (headingRef.current) headingRef.current.focus();
  }, [step]);

  const done = step >= QUESTIONS.length;
  const complete = answers.every((value) => value !== null);
  const code = complete ? answers.join("") : "";
  const score = complete ? scoreOf(answers) : 0;
  const result = complete ? verdict(score) : null;

  const choose = (value) => setAnswers((current) => current.map((item, index) => (index === step ? value : item)));
  const restart = () => {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setUnlocked(false);
    setStep(0);
    if (history && location && location.search) history.replace({ pathname: location.pathname });
  };

  return (
    <ToolPage theme={theme} className="ft-quiz">
      <ToolHero
        tool={TOOL}
        title="Is your AI feature ready to ship?"
        lead="12 questions for teams shipping LLM features, RAG search or agents: evals, prompt injection, guardrails, privacy and operations. About three minutes. A score out of 100 and what to fix first."
      />

      <section className="hm-section" aria-label="Quiz">
        <div className="hm-shell">
          <div className="hm-card ft-panel">
            <div className="hm-bar">
              <span className="hm-bar__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="hm-bar__title">ai-readiness.spec</span>
            </div>
            <div className="ft-panel__body">
              {step === -1 && (
                <div className="ft-prose">
                  <h2 className="ft-h2">Four areas, three minutes</h2>
                  <ul>
                    {Object.values(AREAS).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                  <p className="ft-muted">Answer for the feature you&apos;re shipping next. Nothing is sent until you ask for the full report.</p>
                  <button type="button" className="hm-btn hm-btn--primary" onClick={() => setStep(0)}>
                    Start the quiz <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              )}

              {step >= 0 && !done && (
                <div>
                  <div className="ft-quiz__progress">
                    <span>
                      {step + 1} / {QUESTIONS.length}
                    </span>
                    <div className="ft-meter" aria-hidden="true">
                      <span style={{ transform: `scaleX(${(step + 1) / QUESTIONS.length})` }} />
                    </div>
                    <span>{AREAS[QUESTIONS[step].area]}</span>
                  </div>
                  <fieldset>
                    <legend tabIndex={-1} ref={headingRef}>
                      {QUESTIONS[step].q}
                    </legend>
                    <div className="ft-quiz__options">
                      {QUESTIONS[step].options.map((option, value) => (
                        <label key={option} className="ft-quiz__option">
                          <input
                            type="radio"
                            name={`q${step}`}
                            value={value}
                            checked={answers[step] === value}
                            onChange={() => choose(value)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="ft-quiz__nav">
                    <button type="button" className="hm-btn hm-btn--ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
                      <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
                    </button>
                    <button type="button" className="hm-btn hm-btn--primary" onClick={() => setStep(step + 1)} disabled={answers[step] === null}>
                      {step === QUESTIONS.length - 1 ? "See my score" : "Next"} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {done && complete && (
                <div>
                  <div className="ft-quiz__score">
                    <Ring value={score} />
                    <div>
                      <h2 className="ft-h2" tabIndex={-1} ref={headingRef}>
                        {result.label}
                      </h2>
                      <p className="ft-muted" style={{ maxWidth: "48ch", margin: 0 }}>
                        {result.text}
                      </p>
                    </div>
                  </div>
                  <ul className="ft-quiz__areas" aria-label="Score by area">
                    {areaScores(answers).map((area) => (
                      <li key={area.area}>
                        <div>
                          <span>{area.label}</span>
                          <b>{area.score}/100</b>
                        </div>
                        <div className="ft-meter" aria-hidden="true">
                          <span style={{ transform: `scaleX(${area.score / 100})` }} />
                        </div>
                      </li>
                    ))}
                  </ul>

                  <h3 className="ft-h3">{unlocked ? "Your full report" : "Fix these first"}</h3>
                  {gaps(answers).length === 0 && <p className="ft-muted">No gaps: every answer was the strongest one.</p>}
                  <ol className="ft-quiz__tips">
                    {(unlocked ? gaps(answers) : gaps(answers).slice(0, 3)).map((item) => (
                      <li key={item.index}>
                        <strong>{item.q}</strong>
                        <span className="ft-muted">You said: {item.options[item.points]}.</span> {item.tip}
                      </li>
                    ))}
                  </ol>

                  {!unlocked && gaps(answers).length > 3 && (
                    <div className="ft-two" style={{ marginTop: "1.75rem" }}>
                      <div className="ft-prose">
                        <h3 className="ft-h3" style={{ marginTop: 0 }}>
                          Get the full report
                        </h3>
                        <p>
                          All {gaps(answers).length} gaps with what to do about each, by email, plus a link back to this result.
                        </p>
                      </div>
                      <EmailCapture
                        magnet="ai-readiness"
                        detail={code}
                        score={score}
                        button="Email me the full report"
                        askName={false}
                        onDone={(response) => response && setUnlocked(true)}
                      />
                    </div>
                  )}
                  <div className="ft-quiz__nav">
                    <button type="button" className="hm-btn hm-btn--ghost" onClick={restart}>
                      <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Take it again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="Close the gaps before launch"
        title="Get your AI feature evaluated properly."
        text="The AI Feature Eval Pack builds an eval set from your real prompts, an automated harness in CI (quality, safety, prompt injection, regressions) and a report on where the feature fails today."
        to="/services/ai-feature-eval-pack"
        label="See the AI Feature Eval Pack"
      />
    </ToolPage>
  );
}
