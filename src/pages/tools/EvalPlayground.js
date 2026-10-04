import React, { useEffect, useRef, useState } from "react";
import ToolPage, { ToolCta, ToolHero } from "./ToolPage";
import { runSuite } from "./evals/graders";
import { SCENARIOS } from "./evals/scenarios";
import { prefersReducedMotion } from "../home/lib/motion";
import { toolBySlug } from "../../data/tools";

/*
  F29: the AI Eval Playground. Pick a scenario and a chatbot answer (or write
  one), run the suite, and watch each assertion print like a test runner.
  The graders (./evals/graders.js) are deterministic, so this runs with no
  model and no server; the page says so.
*/

const TOOL = toolBySlug("ai-eval-playground");
const CUSTOM = -1;

function consoleLines(scenario, label, results) {
  const failed = results.filter((result) => !result.pass).length;
  const lines = [
    { tone: "dim", text: `$ npx eval run --suite chatbot-quality --case ${scenario.id}/${label.toLowerCase().replace(/\s+/g, "-")}` },
    { tone: "dim", text: "" },
    { tone: "head", text: `chatbot-quality › ${scenario.title}` },
  ];
  results.forEach((result) => {
    lines.push({ tone: result.pass ? "pass" : "fail", text: `  ${result.pass ? "✓" : "✗"} ${result.group}: ${result.name}` });
    lines.push({ tone: "dim", text: `      ${result.metric}` });
    result.detail.slice(0, 3).forEach((detail) => lines.push({ tone: "fail", text: `      ${detail}` }));
  });
  lines.push({ tone: "dim", text: "" });
  lines.push({
    tone: failed ? "fail" : "pass",
    text: `${results.length - failed} passed · ${failed} failed · ${failed ? "BLOCKED: would not ship" : "SIGNED OFF ✓"}`,
  });
  return lines;
}

export default function EvalPlayground({ theme }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [choice, setChoice] = useState(0);
  const [custom, setCustom] = useState("");
  const [lines, setLines] = useState([]);
  const [shown, setShown] = useState(0);
  const timer = useRef(null);

  const scenario = SCENARIOS[scenarioIndex];
  const answer = choice === CUSTOM ? custom : scenario.answers[choice].text;
  const label = choice === CUSTOM ? "your answer" : scenario.answers[choice].label;

  useEffect(() => () => clearInterval(timer.current), []);

  const run = () => {
    clearInterval(timer.current);
    const next = consoleLines(scenario, label, runSuite({ question: scenario.question, context: scenario.context, answer }));
    setLines(next);
    if (prefersReducedMotion()) {
      setShown(next.length);
      return;
    }
    setShown(0);
    let count = 0;
    timer.current = setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= next.length) clearInterval(timer.current);
    }, 90);
  };

  const pickScenario = (index) => {
    setScenarioIndex(index);
    setChoice(0);
    setLines([]);
  };

  const finished = lines.length > 0 && shown >= lines.length;

  return (
    <ToolPage theme={theme} className="ft-eval">
      <ToolHero
        tool={TOOL}
        title="Watch an eval suite grade a chatbot"
        lead="LLM features can't be tested with assert equals. Pick a chatbot answer, run the suite, and see how evals catch hallucinations, toxicity, leaked personal data and prompt injection, assertion by assertion."
      />

      <section className="hm-section" aria-labelledby="ev-setup">
        <div className="hm-shell ft-two">
          <div className="hm-card ft-panel">
            <div className="ft-panel__body">
              <h2 className="ft-h2" id="ev-setup">
                1. The test case
              </h2>
              <div className="ft-tabs" role="group" aria-label="Scenario">
                {SCENARIOS.map((item, index) => (
                  <button key={item.id} type="button" aria-pressed={index === scenarioIndex} onClick={() => pickScenario(index)}>
                    {item.title}
                  </button>
                ))}
              </div>
              <h3 className="ft-h3">User asks</h3>
              <p className="ft-eval__context">{scenario.question}</p>
              <h3 className="ft-h3">Retrieved context (what the bot was given)</h3>
              <p className="ft-eval__context">{scenario.context}</p>
              <p className="ft-hint">One retrieved passage hides an instruction, like a poisoned web page or document would.</p>
            </div>
          </div>

          <div className="hm-card ft-panel">
            <div className="ft-panel__body">
              <h2 className="ft-h2">2. The chatbot&apos;s answer</h2>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="ft-sr">Pick an answer to grade</legend>
                <div className="ft-eval__answers">
                  {scenario.answers.map((item, index) => (
                    <label key={item.label} className="ft-eval__answer">
                      <input type="radio" name="answer" checked={choice === index} onChange={() => setChoice(index)} />
                      <span>
                        <em>{item.label}</em>
                        {item.text}
                      </span>
                    </label>
                  ))}
                  <label className="ft-eval__answer">
                    <input type="radio" name="answer" checked={choice === CUSTOM} onChange={() => setChoice(CUSTOM)} />
                    <span>
                      <em>Write your own</em>
                      Type an answer below and see how it scores.
                    </span>
                  </label>
                </div>
              </fieldset>
              {choice === CUSTOM && (
                <div className="sv-form" style={{ marginTop: "1rem" }}>
                  <label className="sv-form__field sv-form__field--wide">
                    <span>Your answer</span>
                    <textarea rows={5} value={custom} onChange={(event) => setCustom(event.target.value)} maxLength={2000} />
                  </label>
                </div>
              )}
              <div className="ft-fd__actions">
                <button type="button" className="hm-btn hm-btn--primary" onClick={run} disabled={!answer.trim()}>
                  <i className="fa-solid fa-play" aria-hidden="true" /> 3. Run the evals
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="ev-out">
        <div className="hm-shell">
          <h2 className="ft-h2" id="ev-out">
            Eval output
          </h2>
          <ol className="ft-eval__console" aria-live="polite" aria-busy={lines.length > 0 && !finished}>
            {lines.length === 0 && <li className="is-dim">Pick an answer and press Run the evals.</li>}
            {lines.slice(0, shown).map((line, index) => (
              <li key={index} className={`is-${line.tone}`}>
                {line.text || " "}
              </li>
            ))}
          </ol>
          <div className="ft-two" style={{ marginTop: "2rem" }}>
            <div className="ft-prose">
              <h3 className="ft-h3">What each eval checks</h3>
              <ul>
                <li>
                  <strong>Faithfulness:</strong> every sentence must be backed by the retrieved context, numbers included.
                  This catches hallucinations.
                </li>
                <li>
                  <strong>Relevance:</strong> the answer covers what was asked.
                </li>
                <li>
                  <strong>Toxicity:</strong> no insults, contempt or blaming the user.
                </li>
                <li>
                  <strong>Privacy:</strong> no emails, phone or card numbers the user didn&apos;t give.
                </li>
                <li>
                  <strong>Prompt injection:</strong> instructions hidden in retrieved content must be ignored.
                </li>
              </ul>
            </div>
            <div className="ft-prose">
              <h3 className="ft-h3">Honest note</h3>
              <p>
                These graders are deterministic heuristics (word overlap, patterns, checksums) so the demo runs in your
                browser with no model. In a real eval pack, faithfulness and toxicity are scored by calibrated LLM judges and
                classifiers over hundreds of cases from your own traffic, and the suite runs in CI on every prompt, model or
                retrieval change. The structure is the same: assertions, thresholds, a ship / don&apos;t ship verdict.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="Shipping an LLM feature?"
        title="Get this suite built for your product."
        text="The AI Feature Eval Pack: an eval set from your real prompts and failures, an automated harness in CI scoring quality, safety and injection on every change, and a report on where the feature fails today."
        to="/services/ai-feature-eval-pack"
        label="See the AI Feature Eval Pack"
      />
    </ToolPage>
  );
}
