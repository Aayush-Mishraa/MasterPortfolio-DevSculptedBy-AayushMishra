import React from "react";
import { Link } from "react-router-dom";
import { DEPTHS, STAGES, automationTools } from "../../pages/automationArsenal/arsenalData";
import { themeVars, useInView, useSpotlight } from "../../pages/projects/lib/ui";
import "./AutomationArsenalPreview.css";

const toolsInStage = (stageId) => automationTools.filter((tool) => tool.stage === stageId);
const flagships = automationTools.filter((tool) => tool.depth === "flagship");

export default function AutomationArsenalPreview({ theme }) {
  const { dark, style } = themeVars(theme);
  const [ref, inView] = useInView({ threshold: 0.15 });
  const spotlight = useSpotlight();

  return (
    <section
      className={`hap-root ${dark ? "hap-dark" : ""} ${inView ? "is-in" : ""}`}
      id="automation-arsenal-preview"
      style={style}
      ref={ref}
    >
      <div className="hap-shell">
        <header className="hap-head">
          <div>
            <span className="hap-kicker">
              <span className="hap-kicker-dot" /> Automation Arsenal
            </span>
            <h2>
              {automationTools.length} tools. <span>One quality pipeline.</span>
            </h2>
            <p>
              The frameworks, AI agents and platforms I use, from the first scenario to a gated release. Every
              tool opens a hands-on case study.
            </p>
          </div>
          <div className="hap-actions">
            <Link to="/automation-arsenal" className="hap-btn hap-btn--primary">
              Explore the arsenal <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link to="/automation-arsenal#pipeline" className="hap-btn hap-btn--ghost">
              <i className="fa-solid fa-terminal" aria-hidden="true" /> Run the pipeline
            </Link>
          </div>
        </header>

        <ol className="hap-board" aria-label="Quality pipeline">
          <span className="hap-board-line" aria-hidden="true" />
          {STAGES.map((stage, index) => (
            <li className="hap-stage" key={stage.id} style={{ "--i": index }}>
              <div className="hap-stage-head">
                <span className="hap-stage-icon" aria-hidden="true">
                  <i className={stage.icon} />
                </span>
                <span className="hap-stage-index">{stage.index}</span>
                <strong>{stage.label}</strong>
              </div>
              <ul className="hap-tools">
                {toolsInStage(stage.id).map((tool) => (
                  <li key={tool.id} style={{ "--tool": tool.accent }}>
                    <a href={tool.docsPath} className="hap-tool">
                      <img src={tool.image} alt="" loading="lazy" />
                      <span>{tool.name}</span>
                      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="hap-flagships">
          {flagships.map((tool, index) => (
            <a
              key={tool.id}
              href={tool.docsPath}
              className="hap-flagship"
              style={{ "--tool": tool.accent, "--i": index }}
              onMouseMove={spotlight}
            >
              <span className="hap-flagship-spot" aria-hidden="true" />
              <img src={tool.image} alt="" loading="lazy" />
              <div>
                <span className="hap-badge">
                  <i className={DEPTHS.flagship.icon} aria-hidden="true" /> {DEPTHS.flagship.label} ·{" "}
                  {tool.category}
                </span>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </div>
              <span className="hap-flagship-cta">
                Open <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
