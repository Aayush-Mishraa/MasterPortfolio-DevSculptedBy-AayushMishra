import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { greeting } from "../../portfolio.js";
import {
  prefersReducedMotion,
  themeVars,
  useCountUp,
  useInView,
  useOffScreenClass,
  useOnScreen,
} from "../projects/lib/ui";
import { DEPTHS, GRID_ORDER, PROOFS, SCENARIOS, STAGES, automationTools, toolById } from "./arsenalData";
import "./AutomationArsenal.css";

// Kept as a named export: the home-page preview imports the tool list from here.
export { automationTools };

const RINGS = [
  { id: 0, label: "AI agents", duration: 46, reverse: false },
  { id: 1, label: "Frameworks & APIs", duration: 72, reverse: true },
  { id: 2, label: "Pipelines & platforms", duration: 104, reverse: false },
];

const luminance = (hex = "") => {
  const clean = String(hex).replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.slice(0, 6);
  const value = parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return null;
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The theme accent when it reads as text on the background (≥ 3:1), otherwise the ink colour. */
const readableAccent = (theme = {}) => {
  const bg = luminance(theme.body);
  const accent = luminance(theme.imageHighlight);
  if (bg === null || accent === null) return theme.text;
  const ratio = (Math.max(bg, accent) + 0.05) / (Math.min(bg, accent) + 0.05);
  return ratio >= 3 ? theme.imageHighlight : theme.text;
};

const stageById = (id) => STAGES.find((stage) => stage.id === id);
const toolsInStage = (stageId) => automationTools.filter((tool) => tool.stage === stageId);
const gridIndex = (id) => String(GRID_ORDER.indexOf(id) + 1).padStart(2, "0");

const matches = (tool, query) => {
  if (!query) return true;
  const stage = stageById(tool.stage);
  const haystack = [tool.name, tool.category, tool.description, stage ? stage.label : "", ...tool.tags]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

const scrollToId = (id) => {
  const node = document.getElementById(id);
  if (node) node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
};

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const Stat = ({ value, label, start }) => {
  const animated = useCountUp(value, start, 1200);
  return (
    <div className="aa-stat">
      <dt>{label}</dt>
      <dd>{Math.round(animated)}</dd>
    </div>
  );
};

const Orbit = ({ onPick }) => {
  const stageRef = useRef(null);

  const handleMove = useCallback((event) => {
    const node = stageRef.current;
    if (!node || prefersReducedMotion()) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
  }, []);

  const handleLeave = useCallback(() => {
    const node = stageRef.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }, []);

  return (
    <div className="aa-orbit-stage" ref={stageRef} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div className="aa-orbit" role="group" aria-label="Arsenal tools in orbit">
        <div className="aa-orbit-core" aria-hidden="true">
          <span className="aa-core-ring" />
          <span className="aa-core-pulse" />
          <span className="aa-core-label">
            <small>SDET</small>
            core
          </span>
        </div>

        {RINGS.map((ring) => {
          const tools = automationTools.filter((tool) => tool.ring === ring.id);
          return (
            <div
              key={ring.id}
              className={`aa-ring aa-ring--${ring.id}`}
              style={{
                "--spin": `${ring.duration}s`,
                "--dir": ring.reverse ? "reverse" : "normal",
                "--counter": ring.reverse ? "normal" : "reverse",
              }}
            >
              {tools.map((tool, index) => {
                const angle = (360 / tools.length) * index + ring.id * 24;
                return (
                  <div key={tool.id} className="aa-arm" style={{ "--angle": `${angle}deg` }}>
                    <div className="aa-node-anchor">
                      <div className="aa-node-counter">
                        <button
                          type="button"
                          className="aa-node"
                          style={{ "--tool": tool.accent }}
                          onClick={() => onPick(tool.id)}
                          aria-label={`${tool.name}: jump to card`}
                        >
                          <img src={tool.image} alt="" />
                          <span className="aa-node-label">{tool.name}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="aa-orbit-hint">
        <i className="fa-regular fa-hand-pointer" aria-hidden="true" />
        <span className="aa-hint-pointer">Hover to pause · click a tool to jump to it</span>
        <span className="aa-hint-touch">Tap a tool to jump to it</span>
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Pipeline + terminal                                                 */
/* ------------------------------------------------------------------ */

const lineLength = (line) => line.reduce((sum, [, text]) => sum + text.length, 0) + 1;

const Terminal = ({ stage, typed, done }) => {
  let remaining = typed;
  const rendered = [];

  for (let li = 0; li < stage.terminal.length; li += 1) {
    if (remaining <= 0) break;
    const line = stage.terminal[li];
    const segments = [];
    for (let si = 0; si < line.length && remaining > 0; si += 1) {
      const [tone, text] = line[si];
      const shown = text.slice(0, remaining);
      remaining -= shown.length;
      segments.push(
        <span key={si} className={`aa-t-${tone}`}>
          {shown}
        </span>
      );
    }
    remaining -= 1; // the newline acts as a short pause between lines
    rendered.push(segments);
  }

  return (
    <div className="aa-terminal" aria-live="polite">
      <div className="aa-terminal-bar">
        <span className="aa-dot aa-dot--r" />
        <span className="aa-dot aa-dot--y" />
        <span className="aa-dot aa-dot--g" />
        <span className="aa-terminal-title">arsenal — stage {stage.index}</span>
      </div>
      <pre className="aa-terminal-body">
        <code>
          {rendered.map((segments, index) => (
            <span className="aa-t-line" key={`${stage.id}-${index}`}>
              {segments}
              {!done && index === rendered.length - 1 && <span className="aa-caret" />}
            </span>
          ))}
          {done && (
            <span className="aa-t-line">
              <span className="aa-t-prompt">$ </span>
              <span className="aa-caret" />
            </span>
          )}
        </code>
      </pre>
    </div>
  );
};

const Pipeline = ({ onShowStage }) => {
  const [sectionRef, inView] = useInView({ threshold: 0.25 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  // Typed characters are tagged with their stage so a switch never flashes stale output.
  const [progress, setProgress] = useState({ stageId: null, count: 0 });

  const stage = STAGES[activeIndex];
  const total = useMemo(() => stage.terminal.reduce((sum, line) => sum + lineLength(line), 0), [stage]);
  const typed = progress.stageId === stage.id ? progress.count : 0;
  const done = typed >= total;

  // Type the active stage's output.
  useEffect(() => {
    if (!inView) return undefined;
    if (prefersReducedMotion()) {
      setProgress({ stageId: stage.id, count: total });
      return undefined;
    }
    setProgress({ stageId: stage.id, count: 0 });
    const id = setInterval(() => {
      setProgress((current) => {
        if (current.count >= total) {
          clearInterval(id);
          return current;
        }
        return { stageId: stage.id, count: current.count + 2 };
      });
    }, 18);
    return () => clearInterval(id);
  }, [stage.id, inView, total]);

  // Auto-advance until the visitor takes control.
  useEffect(() => {
    if (!inView || pinned || !done || prefersReducedMotion()) return undefined;
    const id = setTimeout(() => setActiveIndex((index) => (index + 1) % STAGES.length), 2600);
    return () => clearTimeout(id);
  }, [done, inView, pinned]);

  const select = (index) => {
    setPinned(true);
    setActiveIndex(index);
  };

  const handleKeys = (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + step + STAGES.length) % STAGES.length;
    select(next);
    const buttons = event.currentTarget.querySelectorAll("button");
    if (buttons[next]) buttons[next].focus();
  };

  const tools = toolsInStage(stage.id);

  return (
    <section className={`aa-section aa-pipeline ${inView ? "is-in" : ""}`} id="pipeline" ref={sectionRef}>
      <header className="aa-section-head">
        <span className="aa-kicker">
          <span className="aa-kicker-dot" /> How it fits together
        </span>
        <h2>One quality pipeline, five stages</h2>
        <p>
          Tools only matter when they work together. This is how each one feeds the next, from the first
          scenario to a gated release.
        </p>
      </header>

      <div
        className="aa-stages"
        role="tablist"
        aria-label="Pipeline stages"
        onKeyDown={handleKeys}
        style={{ "--progress": activeIndex / (STAGES.length - 1) }}
      >
        <span className="aa-stages-track" aria-hidden="true">
          <span className="aa-stages-fill" />
          <span className="aa-stages-pulse" />
        </span>
        {STAGES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`aa-stage-tab-${item.id}`}
            aria-selected={index === activeIndex}
            aria-controls="aa-stage-panel"
            tabIndex={index === activeIndex ? 0 : -1}
            className={`aa-stage ${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-past" : ""}`}
            onClick={() => select(index)}
          >
            <span className="aa-stage-node">
              <i className={item.icon} aria-hidden="true" />
            </span>
            <span className="aa-stage-index">{item.index}</span>
            <span className="aa-stage-label">{item.label}</span>
            <span className="aa-stage-count">
              {toolsInStage(item.id).length} tool{toolsInStage(item.id).length === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>

      <div
        className="aa-pipeline-body"
        id="aa-stage-panel"
        role="tabpanel"
        aria-labelledby={`aa-stage-tab-${stage.id}`}
      >
        <Terminal stage={stage} typed={typed} done={done} />

        <div className="aa-stage-detail" key={stage.id}>
          <span className="aa-stage-detail-index">Stage {stage.index}</span>
          <h3>{stage.label}</h3>
          <p>{stage.summary}</p>
          <ul className="aa-stage-tools">
            {tools.map((tool) => (
              <li key={tool.id} style={{ "--tool": tool.accent }}>
                <a href={tool.docsPath}>
                  <img src={tool.image} alt="" />
                  <span>{tool.name}</span>
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <button type="button" className="aa-btn aa-btn--ghost" onClick={() => onShowStage(stage.id)}>
            Filter the arsenal to this stage <i className="fa-solid fa-arrow-down" aria-hidden="true" />
          </button>
          {!pinned && (
            <span className="aa-autoplay">
              <span className="aa-autoplay-dot" /> Auto-playing · pick a stage to take control
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Arsenal grid                                                        */
/* ------------------------------------------------------------------ */

// The dashes and the hub pulse repaint the SVG every frame: paused off-screen
const SystemGlyph = () => {
  const [glyphRef, onScreen] = useOnScreen();
  return (
  <svg className={`aa-glyph ${onScreen ? "" : "is-off"}`} viewBox="0 0 160 120" aria-hidden="true" ref={glyphRef}>
    <g className="aa-glyph-edges">
      <path d="M80 60 L28 24" />
      <path d="M80 60 L136 22" />
      <path d="M80 60 L22 92" />
      <path d="M80 60 L132 98" />
      <path d="M28 24 L136 22" />
      <path d="M22 92 L132 98" />
      <path d="M80 60 L80 8" />
    </g>
    <g className="aa-glyph-nodes">
      <circle cx="80" cy="60" r="9" className="is-hub" />
      <circle cx="28" cy="24" r="5" />
      <circle cx="136" cy="22" r="5" />
      <circle cx="22" cy="92" r="5" />
      <circle cx="132" cy="98" r="5" />
      <circle cx="80" cy="8" r="4" />
    </g>
  </svg>
  );
};

/** Cursor spotlight plus a subtle 3D tilt toward the pointer. */
const handleCardMove = (event) => {
  const node = event.currentTarget;
  const rect = node.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  node.style.setProperty("--mx", `${x}px`);
  node.style.setProperty("--my", `${y}px`);
  if (prefersReducedMotion()) return;
  node.style.setProperty("--ry", `${((x / rect.width - 0.5) * 5).toFixed(2)}deg`);
  node.style.setProperty("--rx", `${((0.5 - y / rect.height) * 5).toFixed(2)}deg`);
};

const handleCardLeave = (event) => {
  event.currentTarget.style.setProperty("--rx", "0deg");
  event.currentTarget.style.setProperty("--ry", "0deg");
};

const ToolCard = ({ tool, wide, flash, order }) => {
  const stage = stageById(tool.stage);
  const depth = DEPTHS[tool.depth];
  return (
    <a
      id={`tool-${tool.id}`}
      href={tool.docsPath}
      className={`aa-card aa-card--${tool.depth} ${wide ? "aa-card--wide" : ""} ${flash ? "is-flash" : ""}`}
      style={{ "--tool": tool.accent, "--i": order }}
      onMouseMove={handleCardMove}
      onMouseLeave={handleCardLeave}
    >
      {tool.depth === "flagship" && <span className="aa-card-ring" aria-hidden="true" />}
      <span className="aa-card-spot" aria-hidden="true" />
      <span className="aa-card-corners" aria-hidden="true" />

      <div className="aa-card-top">
        <span className="aa-card-index">{gridIndex(tool.id)}</span>
        <span className={`aa-depth aa-depth--${tool.depth}`}>
          <i className={depth.icon} aria-hidden="true" /> {depth.label}
        </span>
      </div>

      <div className="aa-card-body">
        <div className="aa-card-copy">
          <div className="aa-card-id">
            <span className="aa-card-logo">
              <img src={tool.image} alt="" loading="lazy" />
            </span>
            <div>
              <span className="aa-card-cat">{tool.category}</span>
              <h3>{tool.name}</h3>
            </div>
          </div>
          <p className="aa-card-desc">{tool.description}</p>
          <ul className="aa-tags" aria-label="Capabilities">
            {tool.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </div>
        {wide && <SystemGlyph />}
      </div>

      <div className="aa-card-foot">
        <span className="aa-card-stage">
          <span className="aa-card-stage-dot" /> Stage {stage.index} · {stage.label}
        </span>
        <span className="aa-card-cta">
          {tool.depth === "notes" ? "Open field guide" : "Open case study"}
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </span>
      </div>
    </a>
  );
};

const Arsenal = ({ filter, setFilter, query, setQuery, flashId, searchRef }) => {
  const [sectionRef, inView] = useInView({ threshold: 0.08 });

  const ordered = useMemo(() => GRID_ORDER.map(toolById).filter(Boolean), []);
  const visible = ordered.filter((tool) => (filter === "all" || tool.stage === filter) && matches(tool, query));
  const bento = filter === "all" && !query;

  const chips = [{ id: "all", label: "All tools", count: automationTools.length }].concat(
    STAGES.map((stage) => ({ id: stage.id, label: stage.label, count: toolsInStage(stage.id).length }))
  );

  return (
    <section className={`aa-section aa-arsenal ${inView ? "is-in" : ""}`} id="arsenal" ref={sectionRef}>
      <header className="aa-section-head aa-section-head--split">
        <div>
          <span className="aa-kicker">
            <span className="aa-kicker-dot" /> The arsenal
          </span>
          <h2>Every tool, with a case study behind it</h2>
          <p>Each tile opens a hands-on page: how the tool works, how I use it, and working examples.</p>
        </div>
        <ul className="aa-legend" aria-label="Legend">
          {Object.keys(DEPTHS).map((key) => (
            <li key={key} className={`aa-depth aa-depth--${key}`}>
              <i className={DEPTHS[key].icon} aria-hidden="true" /> {DEPTHS[key].label}
            </li>
          ))}
        </ul>
      </header>

      <div className="aa-toolbar">
        <div className="aa-chips" role="group" aria-label="Filter by pipeline stage">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`aa-chip ${filter === chip.id ? "is-active" : ""}`}
              aria-pressed={filter === chip.id}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label}
              <span className="aa-chip-count">{chip.count}</span>
            </button>
          ))}
        </div>
        <label className="aa-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <span className="aa-visually-hidden">Search the arsenal</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search tools, skills, stages…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
            }}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
      </div>

      <p className="aa-result-line" aria-live="polite">
        Showing <strong>{visible.length}</strong> of {automationTools.length}
        {filter !== "all" && (
          <>
            {" "}
            in <strong>{stageById(filter).label}</strong>
          </>
        )}
        {query && (
          <>
            {" "}
            matching “<strong>{query}</strong>”
          </>
        )}
      </p>

      {visible.length ? (
        <div className={`aa-grid ${bento ? "aa-grid--bento" : ""}`}>
          {visible.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              order={index}
              wide={bento && tool.depth === "flagship"}
              flash={flashId === tool.id}
            />
          ))}
        </div>
      ) : (
        <div className="aa-empty">
          <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
          <p>No tools match that search.</p>
          <button
            type="button"
            className="aa-btn aa-btn--ghost"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Capability ticker                                                   */
/* ------------------------------------------------------------------ */

const CAPABILITIES = automationTools.reduce(
  (all, tool) => all.concat(tool.tags.filter((tag) => all.indexOf(tag) === -1)),
  []
);

const Ticker = () => {
  const row = CAPABILITIES.map((tag) => <li key={tag}>{tag}</li>);
  return (
    <div className="aa-ticker" role="region" aria-label="Capabilities">
      <ul className="aa-ticker-track">{row}</ul>
      <ul className="aa-ticker-track" aria-hidden="true">
        {row}
      </ul>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Which tool, when?                                                   */
/* ------------------------------------------------------------------ */

const Picker = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((item) => item.id === activeId);
  const tool = toolById(scenario.tool);
  const alt = toolById(scenario.instead.tool);

  const handleKeys = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = SCENARIOS.findIndex((item) => item.id === activeId);
    const next = (index + (event.key === "ArrowDown" ? 1 : -1) + SCENARIOS.length) % SCENARIOS.length;
    setActiveId(SCENARIOS[next].id);
    const buttons = event.currentTarget.querySelectorAll("button");
    if (buttons[next]) buttons[next].focus();
  };

  return (
    <section className={`aa-section aa-picker ${inView ? "is-in" : ""}`} id="picker" ref={sectionRef}>
      <header className="aa-section-head">
        <span className="aa-kicker">
          <span className="aa-kicker-dot" /> Judgement, not just tools
        </span>
        <h2>Which tool, when?</h2>
        <p>
          Knowing the tools is table stakes. Knowing which one fits the problem, and which tempting one
          doesn't, is the job. Pick a situation.
        </p>
      </header>

      <div className="aa-picker-body">
        <div className="aa-scenarios" role="group" aria-label="Situations" onKeyDown={handleKeys}>
          {SCENARIOS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`aa-scenario ${item.id === activeId ? "is-active" : ""}`}
              aria-pressed={item.id === activeId}
              tabIndex={item.id === activeId ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              style={{ "--i": index }}
            >
              <span className="aa-scenario-icon" aria-hidden="true">
                <i className={item.icon} />
              </span>
              <span className="aa-scenario-text">{item.prompt}</span>
              <i className="fa-solid fa-chevron-right aa-scenario-go" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="aa-answer" key={scenario.id} style={{ "--tool": tool.accent }} aria-live="polite">
          <span className="aa-answer-label">
            <span className="aa-answer-pulse" /> I'd reach for
          </span>
          <div className="aa-answer-tool">
            <img src={tool.image} alt="" />
            <div>
              <span className="aa-card-cat">{tool.category}</span>
              <h3>{tool.name}</h3>
            </div>
          </div>
          <ul className="aa-answer-why">
            {scenario.why.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="aa-answer-instead" style={{ "--tool": alt.accent }}>
            <img src={alt.image} alt="" />
            <div>
              <strong>Not {alt.name}, here</strong>
              <p>{scenario.instead.note}</p>
            </div>
          </div>
          <a className="aa-btn aa-btn--primary" href={tool.docsPath}>
            Open the {tool.name} case study <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Section rail                                                        */
/* ------------------------------------------------------------------ */

const RAIL = [
  { id: "top", label: "Overview" },
  { id: "pipeline", label: "Pipeline" },
  { id: "arsenal", label: "Arsenal" },
  { id: "picker", label: "Which tool, when?" },
  { id: "proof", label: "Proof" },
  { id: "hire", label: "Contact" },
];

const SectionRail = () => {
  const [active, setActive] = useState("top");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = null;
    const measure = () => {
      frame = null;
      const line = window.innerHeight * 0.4;
      let current = RAIL[0].id;
      RAIL.forEach((item) => {
        const node = document.getElementById(item.id);
        if (node && node.getBoundingClientRect().top <= line) current = item.id;
      });
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setActive(current);
      setProgress(max > 0 ? Math.min(1, window.pageYOffset / max) : 0);
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav className="aa-rail" aria-label="Page sections">
      <span className="aa-rail-track" aria-hidden="true">
        <span className="aa-rail-fill" style={{ transform: `scaleY(${progress})` }} />
      </span>
      <ol>
        {RAIL.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={active === item.id ? "is-active" : ""}
              aria-current={active === item.id ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                scrollToId(item.id);
              }}
            >
              <span className="aa-rail-label">{item.label}</span>
              <span className="aa-rail-dot" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/* Proof + CTA                                                         */
/* ------------------------------------------------------------------ */

const Proofs = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.15 });
  return (
    <section className={`aa-section aa-proofs ${inView ? "is-in" : ""}`} ref={sectionRef}>
      <header className="aa-section-head">
        <span className="aa-kicker">
          <span className="aa-kicker-dot" /> For hiring teams
        </span>
        <h2>What this arsenal proves</h2>
        <p>Four capabilities, each linked to the case studies that back it up.</p>
      </header>
      <div className="aa-proof-grid">
        {PROOFS.map((proof, index) => (
          <article className="aa-proof" key={proof.title} style={{ "--i": index }}>
            <span className="aa-proof-icon" aria-hidden="true">
              <i className={proof.icon} />
            </span>
            <h3>{proof.title}</h3>
            <p>{proof.body}</p>
            <ul className="aa-proof-evidence" aria-label="Evidence">
              {proof.tools.map(toolById).map((tool) => (
                <li key={tool.id} style={{ "--tool": tool.accent }}>
                  <a href={tool.docsPath} title={`Open the ${tool.name} case study`}>
                    <img src={tool.image} alt="" />
                    {tool.name}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

const HireBand = () => (
  <section className="aa-section aa-hire">
    <div className="aa-hire-panel">
      <span className="aa-hire-scan" aria-hidden="true" />
      <div className="aa-hire-copy">
        <span className="aa-kicker">
          <span className="aa-kicker-dot" /> Open to opportunities
        </span>
        <h2>Need this arsenal on your team?</h2>
        <p>
          I design automation that scales, bring AI agents into QA responsibly, and wire quality into every
          release. Let's talk about what your pipeline needs.
        </p>
      </div>
      <div className="aa-hire-actions">
        <Link to="/contact" className="aa-btn aa-btn--primary">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Get in touch
        </Link>
        <a href={greeting.resumeLink} target="_blank" rel="noopener noreferrer" className="aa-btn aa-btn--ghost">
          <i className="fa-regular fa-file-lines" aria-hidden="true" /> View resume
        </a>
        <Link to="/projects" className="aa-btn aa-btn--ghost">
          <i className="fa-solid fa-code" aria-hidden="true" /> See live projects
        </Link>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const AutomationArsenal = ({ theme }) => {
  const { dark, style } = themeVars(theme);
  const rootStyle = useMemo(() => ({ ...style, "--aa-accent-text": readableAccent(theme) }), [style, theme]);
  const [heroRef, heroIn] = useInView({ threshold: 0.2 });
  // the title shimmer repaints every frame: paused once it's scrolled away
  // (a class toggled on the DOM, so it doesn't re-render the whole page)
  const titleRef = useOffScreenClass();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [flashId, setFlashId] = useState(null);
  const searchRef = useRef(null);
  const flashTimer = useRef(null);

  const stats = useMemo(
    () => [
      { label: "Tools & agents", value: automationTools.length },
      { label: "Pipeline stages", value: STAGES.length },
      {
        label: "Interactive case studies",
        value: automationTools.filter((tool) => tool.depth !== "notes").length,
      },
      { label: "Flagship builds", value: automationTools.filter((tool) => tool.depth === "flagship").length },
    ],
    []
  );

  const pickTool = useCallback((id) => {
    setFilter("all");
    setQuery("");
    clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = setTimeout(() => setFlashId(null), 2200);
    // Wait a frame so a filtered-out card is back in the DOM before scrolling.
    setTimeout(() => {
      const node = document.getElementById(`tool-${id}`);
      if (node) {
        node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      }
    }, 60);
  }, []);

  const showStage = useCallback((stageId) => {
    setQuery("");
    setFilter(stageId);
    setTimeout(() => scrollToId("arsenal"), 30);
  }, []);

  // "/" focuses search from anywhere on the page.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" || (target && target.isContentEditable)) return;
      event.preventDefault();
      scrollToId("arsenal");
      if (searchRef.current) searchRef.current.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(flashTimer.current);
    };
  }, []);

  return (
    <div className={`aa-root ${dark ? "aa-dark" : ""}`} style={rootStyle}>
      <Header theme={theme} />

      <div className="aa-backdrop" aria-hidden="true">
        <span className="aa-backdrop-grid" />
        <span className="aa-backdrop-orb aa-backdrop-orb--a" />
        <span className="aa-backdrop-orb aa-backdrop-orb--b" />
        <span className="aa-backdrop-beam" />
      </div>

      <main className="aa-main">
        <section className={`aa-hero ${heroIn ? "is-in" : ""}`} ref={heroRef}>
          <div className="aa-hero-copy">
            <span className="aa-status">
              <span className="aa-status-dot" />
              Systems online · Automation + AI + QA engineering
            </span>
            <h1 className="aa-hero-title" ref={titleRef}>
              Automation
              <span className="aa-hero-title-accent">Arsenal</span>
            </h1>
            <p className="aa-hero-sub">
              The tools, AI agents and platforms I use to build test automation that scales, from the first
              scenario to the release gate. Every tile opens a hands-on case study.
            </p>
            <div className="aa-hero-actions">
              <button type="button" className="aa-btn aa-btn--primary" onClick={() => scrollToId("arsenal")}>
                Explore the arsenal <i className="fa-solid fa-arrow-down" aria-hidden="true" />
              </button>
              <button type="button" className="aa-btn aa-btn--ghost" onClick={() => scrollToId("pipeline")}>
                <i className="fa-solid fa-terminal" aria-hidden="true" /> Run the pipeline
              </button>
            </div>
            <dl className="aa-stats">
              {stats.map((stat) => (
                <Stat key={stat.label} {...stat} start={heroIn} />
              ))}
            </dl>
            <p className="aa-kbd-hint">
              Press <kbd>/</kbd> to search the arsenal
            </p>
          </div>

          <div className="aa-hero-visual">
            <Orbit onPick={pickTool} />
          </div>
        </section>

        <Pipeline onShowStage={showStage} />

        <Arsenal
          filter={filter}
          setFilter={setFilter}
          query={query}
          setQuery={setQuery}
          flashId={flashId}
          searchRef={searchRef}
        />

        <Proofs />
        <HireBand />
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
};

export default AutomationArsenal;
