import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ARSENAL_TOOLS, PIPELINE } from "../homeData";
import { DEPTHS } from "../../automationArsenal/arsenalData";
import { prefersReducedMotion, scramble, useOnScreen, useReveal } from "../lib/motion";
import { Check } from "../components/EvidenceLog";
import "./Pipeline.css";

/*
  From user story to signed-off release: the Automation Arsenal's pipeline as
  tabs. The first time it's in view it runs itself, one stage at a time (each
  command decodes, prints its log and passes), and ends signed off. Any tab
  takes over from the run; Pause and Replay are always there.
*/

const STAGE_MS = 1500;
const DECODE_MS = 400;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function Decode({ text, play }) {
  const [shown, setShown] = useState(play ? "" : text);
  useEffect(() => {
    if (!play) {
      setShown(text);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / DECODE_MS);
      setShown(progress >= 1 ? text : scramble(text, progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, play]);
  return shown;
}

function Terminal({ stage, animate }) {
  const [first, ...rest] = stage.terminal;
  const command = first.map(([, text]) => text).join("");
  return (
    <div className={`hm-term__body ${animate ? "is-animated" : ""}`}>
      <div className="hm-term__line hm-term__line--cmd" aria-label={command}>
        <span aria-hidden="true">
          <span className="hm-term__prompt">$ </span>
          <span className="hm-term__cmd">
            <Decode text={command.replace(/^\$\s*/, "")} play={animate} />
          </span>
        </span>
      </div>
      {rest.map((line, i) => (
        <div className="hm-term__line" key={i} style={{ "--i": i }}>
          {line.map(([tone, text], j) => (
            <span className={`hm-term__${tone}`} key={j}>
              {text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function ToolCard({ tool }) {
  const depth = DEPTHS[tool.depth];
  return (
    <a href={tool.docsPath} className="hm-card hm-tool" style={{ "--tool": tool.accent }}>
      <img src={tool.image} alt="" width="36" height="36" loading="lazy" />
      <span className="hm-tool__text">
        <strong>{tool.name}</strong>
        <span>
          {tool.category}
          {depth ? ` · ${depth.label}` : ""}
        </span>
      </span>
      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
    </a>
  );
}

export default function Pipeline() {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const tabsRef = useRef([]);
  const reduced = prefersReducedMotion();
  const [stage, setStage] = useState(0);
  const [passed, setPassed] = useState(reduced ? PIPELINE.length : 0);
  // idle → running ⇄ paused → done; "manual" once a visitor picks a tab
  const [mode, setMode] = useState("idle");
  const [runId, setRunId] = useState(0);
  const inView = useOnScreen(panelRef, { threshold: 0.4, once: true });
  useReveal(ref);

  // The first sighting starts the run.
  useEffect(() => {
    if (inView && mode === "idle" && !reduced) setMode("running");
  }, [inView, mode, reduced]);

  // Each stage runs for STAGE_MS, then passes and hands on to the next.
  useEffect(() => {
    if (mode !== "running") return undefined;
    const id = setTimeout(() => {
      setPassed((count) => Math.max(count, stage + 1));
      if (stage < PIPELINE.length - 1) setStage(stage + 1);
      else setMode("done");
    }, STAGE_MS);
    return () => clearTimeout(id);
  }, [mode, stage, runId]);

  const select = (index, focus) => {
    setStage(index);
    if (mode === "running" || mode === "paused" || mode === "idle") setMode("manual");
    if (focus && tabsRef.current[index]) tabsRef.current[index].focus();
  };

  const onTabKey = (event, index) => {
    const last = PIPELINE.length - 1;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(Math.max(0, Math.min(last, next)), true);
  };

  const replay = () => {
    setPassed(0);
    setStage(0);
    setRunId((n) => n + 1);
    setMode("running");
  };

  const toggle = () => {
    if (mode === "running") setMode("paused");
    else if (mode === "paused") setMode("running");
    else replay();
  };

  const current = PIPELINE[stage];
  const allPassed = passed >= PIPELINE.length;
  const status =
    mode === "running"
      ? `Running stage ${stage + 1} of ${PIPELINE.length}`
      : mode === "paused"
      ? `Paused at stage ${stage + 1}`
      : allPassed
      ? `Signed off · ${PIPELINE.length}/${PIPELINE.length} stages`
      : `${passed}/${PIPELINE.length} stages passed`;

  return (
    <section className="hm-section hm-pipeline" id="hm-pipeline" aria-labelledby="hm-pipeline-title" ref={ref}>
      <div className="hm-shell">
        <header className="hm-head">
          <div data-reveal>
            <p className="hm-eyebrow">
              <b>02</b> Pipeline
            </p>
            <h2 className="hm-h2" id="hm-pipeline-title">
              From user story to <span className="hm-grad">signed-off release.</span>
            </h2>
            <p className="hm-lead">
              The system I bring to every team, in {WORDS[PIPELINE.length] || PIPELINE.length} stages, and the{" "}
              {ARSENAL_TOOLS.length} tools behind it. Each one opens a hands-on case study.
            </p>
          </div>
        </header>

        <div className="hm-run" data-reveal>
          <div className="hm-run__top">
            <div className="hm-run__rail" role="tablist" aria-label="Pipeline stages">
              <span className="hm-run__track" aria-hidden="true">
                <span
                  style={{ transform: `scaleX(${Math.min(passed, PIPELINE.length - 1) / (PIPELINE.length - 1)})` }}
                />
              </span>
              {PIPELINE.map((item, i) => {
                const isPassed = i < passed;
                const isRunning = mode === "running" && i === stage && !isPassed;
                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      tabsRef.current[i] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`hm-tab-${item.id}`}
                    aria-selected={i === stage}
                    aria-controls="hm-run-panel"
                    tabIndex={i === stage ? 0 : -1}
                    className={`hm-run__tab ${i === stage ? "is-current" : ""} ${isPassed ? "is-passed" : ""} ${
                      isRunning ? "is-running" : ""
                    }`}
                    onClick={() => select(i)}
                    onKeyDown={(event) => onTabKey(event, i)}
                  >
                    <span className="hm-run__node" aria-hidden="true">
                      {isPassed ? <Check /> : <i className={item.icon} />}
                    </span>
                    <span className="hm-run__label">
                      <span className="hm-mono">{item.index}</span>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="hm-run__controls">
              <span className={`hm-run__status hm-mono ${allPassed ? "is-green" : ""}`} role="status">
                {allPassed && <Check />}
                {status}
              </span>
              <button type="button" className="hm-run__btn" onClick={toggle}>
                <i
                  className={`fa-solid ${
                    mode === "running" ? "fa-pause" : mode === "paused" ? "fa-play" : "fa-rotate-right"
                  }`}
                  aria-hidden="true"
                />
                {mode === "running" ? "Pause" : mode === "paused" ? "Resume" : "Replay"}
              </button>
            </div>
          </div>

          <div
            className="hm-run__panel"
            id="hm-run-panel"
            role="tabpanel"
            aria-labelledby={`hm-tab-${current.id}`}
            ref={panelRef}
          >
            <div className="hm-run__copy">
              <span className="hm-run__index hm-mono">
                <i className={current.icon} aria-hidden="true" /> Stage {current.index}
              </span>
              <h3>{current.label}</h3>
              <p>{current.summary}</p>
              <div className="hm-run__tools">
                {current.tools.map((tool) => (
                  <ToolCard tool={tool} key={tool.id} />
                ))}
              </div>
            </div>

            <div className="hm-card hm-term">
              <div className="hm-bar">
                <span className="hm-bar__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="hm-bar__title">quality-pipeline · {current.id}</span>
                {allPassed && (
                  <span className="hm-term__stamp hm-mono">
                    <Check /> Signed off
                  </span>
                )}
              </div>
              <Terminal stage={current} animate={!reduced && mode !== "idle"} key={`${current.id}-${runId}`} />
            </div>
          </div>

          <div className="hm-run__cta">
            <Link to="/automation-arsenal" className="hm-link">
              Explore the Automation Arsenal <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
