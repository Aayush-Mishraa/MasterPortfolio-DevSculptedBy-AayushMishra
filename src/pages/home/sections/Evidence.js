import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ARSENAL_TOOLS, CAPABILITIES, HIGHLIGHTS } from "../homeData";
import { PROOFS } from "../../automationArsenal/arsenalData";
import { prefersReducedMotion, useOnScreen, useReveal } from "../lib/motion";
import { scrollToId } from "../lib/scroll";
import EvidenceLog from "../components/EvidenceLog";
import Icon from "../components/Icon";
import "./Evidence.css";

/*
  What I'm hired for, with receipts. Each card makes one claim, shows the
  proof as test-log rows that pass as the card comes into view, and runs a
  small sketch of the work once, ending green.
*/

const proof = (title) => PROOFS.find((item) => item.title === title) || { body: "" };

const skillTools = (names) =>
  CAPABILITIES.reduce((acc, group) => acc.concat(group.tools), []).filter((tool) => names.indexOf(tool.name) !== -1);

const arsenal = (id) => ARSENAL_TOOLS.find((tool) => tool.id === id) || {};

/* ---------- Sketches: each plays once, ending in its passed state ---------- */

const LANES = ["chromium", "firefox", "webkit", "android"];

function LanesSketch() {
  return (
    <div className="hm-sketch hm-lanes" aria-hidden="true">
      <div className="hm-sketch__bar hm-mono">npx playwright test --project=all</div>
      {LANES.map((lane, i) => (
        <div className="hm-lane" key={lane} style={{ "--i": i }}>
          <span className="hm-lane__name hm-mono">{lane}</span>
          <span className="hm-lane__track">
            <span className="hm-lane__fill" />
          </span>
          <span className="hm-lane__ok">
            <i className="fa-solid fa-check" />
          </span>
        </div>
      ))}
    </div>
  );
}

const GATE = ["build", "test", "report", "gate", "ship"];

function GateSketch() {
  return (
    <div className="hm-sketch hm-gate" aria-hidden="true">
      <div className="hm-gate__line">
        <span className="hm-gate__fill" />
      </div>
      <ol className="hm-gate__nodes">
        {GATE.map((step, i) => (
          <li key={step} style={{ "--i": i }}>
            <span className="hm-gate__dot">
              <i className="fa-solid fa-check" />
            </span>
            <span className="hm-mono">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const AGENT_STEPS = [
  "open the store",
  "search for “laptop”",
  "sort by price, low to high",
  "add the first result to the cart",
];

function AgentSketch() {
  return (
    <div className="hm-sketch hm-agent" aria-hidden="true">
      <div className="hm-agent__prompt hm-mono">
        <span className="hm-agent__caret">❯</span> act(<b>&quot;Add the cheapest laptop to the cart&quot;</b>)
      </div>
      <ol className="hm-agent__steps">
        {AGENT_STEPS.map((step, i) => (
          <li key={step} style={{ "--i": i }} className="hm-mono">
            <i className="fa-solid fa-check" />
            {step}
          </li>
        ))}
        <li style={{ "--i": AGENT_STEPS.length }} className="hm-agent__review hm-mono">
          <i className="fa-solid fa-user-check" />
          reviewed and approved by a person
        </li>
      </ol>
    </div>
  );
}

const LEAD_ITEMS = ["Quality strategy", "Test planning and execution", "Mentoring QA engineers", "Release sign-off"];

function LeadSketch() {
  return (
    <ul className="hm-sketch hm-leadlist" aria-hidden="true">
      {LEAD_ITEMS.map((item, i) => (
        <li key={item} style={{ "--i": i }}>
          <span className="hm-leadlist__box">
            <i className="fa-solid fa-check" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ---------- The four claims ---------- */

const CLAIMS = [
  {
    id: "frameworks",
    index: "01",
    icon: "fa-solid fa-cubes",
    title: "Builds frameworks from zero.",
    body: proof("Builds frameworks from zero").body,
    receipts: [
      { name: HIGHLIGHTS.configs.label, value: HIGHLIGHTS.configs.value },
      { name: HIGHLIGHTS.suites.label, value: HIGHLIGHTS.suites.value },
    ],
    tools: skillTools(["Playwright", "Selenium", "Cypress", "TestNG", "Cucumber", "Appium"]),
    Sketch: LanesSketch,
    span: "wide",
    link: { to: "/automation-arsenal", label: "Framework case studies" },
  },
  {
    id: "pipeline",
    index: "02",
    icon: "fa-solid fa-code-branch",
    title: "Makes quality a pipeline, not a phase.",
    body: proof("Makes quality a pipeline, not a phase").body,
    receipts: [{ name: HIGHLIGHTS.regression.label, value: HIGHLIGHTS.regression.value }],
    tools: skillTools(["GitHub Actions", "Jenkins", "Postman", "JMeter"]).concat(skillTools(["Docker"])),
    Sketch: GateSketch,
    span: "narrow",
    link: { hash: "hm-pipeline", label: "See the pipeline" },
  },
  {
    id: "ai",
    index: "03",
    icon: "fa-solid fa-robot",
    title: "Puts AI agents to work in QA.",
    body: proof("Puts AI agents to work in QA").body,
    principle: "AI drafts, humans approve.",
    receipts: [
      { name: `${arsenal("nova-act").name} interactive deep-dive`, href: arsenal("nova-act").docsPath },
      { name: `${arsenal("browser-use").name} field guide`, href: arsenal("browser-use").docsPath },
      { name: `${arsenal("kane-ai").name} field guide`, href: arsenal("kane-ai").docsPath },
      { name: "Open-source agent tests with Nova Act", href: "/projects/AI-Agent-Test-Using-Amazon-Nova-Act" },
    ],
    arsenal: ["nova-act", "browser-use", "kane-ai"].map(arsenal),
    Sketch: AgentSketch,
    span: "narrow",
    link: { to: "/automation-arsenal", label: "Explore the AI tools" },
  },
  {
    id: "lead",
    index: "04",
    icon: "fa-solid fa-people-group",
    title: "Owns quality end to end, and leads the team.",
    body:
      "Leading the QA team: quality strategy, test planning and execution, and mentoring QA engineers, side by side with product and development.",
    receipts: [
      { name: HIGHLIGHTS.testCases.label, value: HIGHLIGHTS.testCases.value },
      { name: HIGHLIGHTS.bugs.label, value: HIGHLIGHTS.bugs.value },
    ],
    Sketch: LeadSketch,
    span: "wide",
    link: { to: "/experience", label: "Career log" },
  },
];

function Claim({ claim, index }) {
  const ref = useRef(null);
  // With reduced motion, receipts and sketches start in their finished state.
  const seen = useOnScreen(ref, { threshold: 0.35, once: true }) || prefersReducedMotion();
  const { Sketch } = claim;

  return (
    <article
      className={`hm-card hm-claim hm-claim--${claim.span} ${seen ? "is-live" : ""}`}
      ref={ref}
      data-reveal
      style={{ "--d": `${(index % 2) * 90}ms` }}
      aria-labelledby={`hm-claim-${claim.id}`}
    >
      <div className="hm-claim__head">
        <span className="hm-claim__icon" aria-hidden="true">
          <i className={claim.icon} />
        </span>
        <span className="hm-claim__index hm-mono">{claim.index}</span>
      </div>

      <h3 id={`hm-claim-${claim.id}`}>{claim.title}</h3>
      <p className="hm-claim__body">{claim.body}</p>

      <div className="hm-claim__split">
        <div className="hm-claim__receipts">
          <p className="hm-claim__label hm-mono">Receipts</p>
          <EvidenceLog rows={claim.receipts} passed={seen} footer={false} compact />
          {claim.principle && (
            <p className="hm-claim__principle">
              <i className="fa-solid fa-user-check" aria-hidden="true" /> {claim.principle}
            </p>
          )}
        </div>
        <Sketch />
      </div>

      <div className="hm-claim__foot">
        {(claim.tools || claim.arsenal) && (
          <ul className="hm-claim__tools" aria-label="Tools">
            {(claim.tools || []).map((tool) => (
              <li className="hm-chip" key={tool.name}>
                <Icon name={tool.icon} color={tool.color} />
                {tool.name}
              </li>
            ))}
            {(claim.arsenal || []).map((tool) => (
              <li className="hm-chip" key={tool.id}>
                <img src={tool.image} alt="" width="15" height="15" loading="lazy" />
                {tool.name}
              </li>
            ))}
          </ul>
        )}
        {claim.link.to ? (
          <Link to={claim.link.to} className="hm-link">
            {claim.link.label} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        ) : (
          <a href={`#${claim.link.hash}`} onClick={scrollToId(claim.link.hash)} className="hm-link">
            {claim.link.label} <i className="fa-solid fa-arrow-down" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

export default function Evidence() {
  const ref = useRef(null);
  useReveal(ref);

  return (
    <section className="hm-section hm-evidence" id="hm-evidence" aria-labelledby="hm-evidence-title" ref={ref}>
      <div className="hm-shell">
        <header className="hm-head">
          <div data-reveal>
            <p className="hm-eyebrow">
              <b>01</b> Evidence
            </p>
            <h2 className="hm-h2" id="hm-evidence-title">
              What I&apos;m hired for. <span className="hm-grad">With receipts.</span>
            </h2>
            <p className="hm-lead">Four things teams bring me in to own, and the proof behind each one.</p>
          </div>
          <Link to="/automation-arsenal" className="hm-btn hm-btn--ghost" data-reveal style={{ "--d": "120ms" }}>
            <i className="fa-solid fa-toolbox" aria-hidden="true" /> Open the Automation Arsenal
          </Link>
        </header>

        <div className="hm-claims">
          {CLAIMS.map((claim, index) => (
            <Claim claim={claim} index={index} key={claim.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
