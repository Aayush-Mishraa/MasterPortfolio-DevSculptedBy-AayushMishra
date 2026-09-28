import React, { useMemo, useState } from "react";
import { fetchDownloadHistory } from "../../../services/universe/sources";
import { Chips, FeedState, PageHead, SectionTitle, Skeletons, Sync, compact, copyText } from "../lib/kit";
import { useFeed } from "../lib/useFeed";
import { CATEGORIES, FIELDS, FLAKY } from "./testIdeas";
import "./TestingLab.css";

const GROUPS = {
  e2e: {
    label: "E2E frameworks",
    packages: [
      { name: "@playwright/test", label: "Playwright", color: "#22c55e" },
      { name: "cypress", label: "Cypress", color: "#06b6d4" },
      { name: "puppeteer", label: "Puppeteer", color: "#f59e0b" },
      { name: "selenium-webdriver", label: "Selenium", color: "#ef4444" },
      { name: "webdriverio", label: "WebdriverIO", color: "#8b5cf6" },
    ],
  },
  unit: {
    label: "Unit test runners",
    packages: [
      { name: "jest", label: "Jest", color: "#e11d48" },
      { name: "vitest", label: "Vitest", color: "#84cc16" },
      { name: "mocha", label: "Mocha", color: "#a16207" },
      { name: "jasmine-core", label: "Jasmine", color: "#8b5cf6" },
    ],
  },
};

const W = 760;
const H = 280;
const PAD = { l: 52, r: 16, t: 16, b: 28 };

const growth = (weeks) => {
  if (weeks.length < 12) return null;
  const avg = (list) => list.reduce((sum, week) => sum + week.count, 0) / list.length;
  const early = avg(weeks.slice(0, 4));
  const late = avg(weeks.slice(-4));
  return early ? ((late - early) / early) * 100 : null;
};

const WarChart = ({ series, hidden }) => {
  const [hover, setHover] = useState(null);
  const visible = series.filter((item) => !hidden[item.name]);
  const length = Math.min(...series.map((item) => item.weeks.length));
  const max = Math.max(1, ...visible.flatMap((item) => item.weeks.slice(0, length).map((week) => week.count)));
  const x = (i) => PAD.l + (i / Math.max(1, length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const months = [];
  for (let i = 0; i < length; i += 1) {
    const date = new Date(series[0].weeks[i].start);
    if (date.getDate() <= 7) months.push({ i, label: date.toLocaleDateString("en-US", { month: "short" }) });
  }

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (length - 1));
    setHover(i >= 0 && i < length ? i : null);
  };

  const tip =
    hover != null
      ? visible
          .map((item) => ({ ...item, value: item.weeks[hover].count }))
          .sort((a, b) => b.value - a.value)
      : [];

  return (
    <div className="tl-chart">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Weekly npm downloads over the last year">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(tick)} y2={y(tick)} className="tl-grid" />
            <text x={PAD.l - 8} y={y(tick) + 4} className="tl-axis" textAnchor="end">
              {compact(tick)}
            </text>
          </g>
        ))}
        {months.map((month) => (
          <text key={month.i} x={x(month.i)} y={H - 8} className="tl-axis" textAnchor="middle">
            {month.label}
          </text>
        ))}
        {visible.map((item) => {
          const points = item.weeks.slice(0, length).map((week, i) => `${x(i).toFixed(1)},${y(week.count).toFixed(1)}`);
          return (
            <g key={item.name}>
              <path d={`M${points[0]} L${points.join(" L")} L${x(length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={item.color} opacity="0.07" />
              <polyline points={points.join(" ")} fill="none" stroke={item.color} strokeWidth="2.4" strokeLinejoin="round" className="tl-line" />
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="tl-cross" />
            {visible.map((item) => (
              <circle key={item.name} cx={x(hover)} cy={y(item.weeks[hover].count)} r="4" fill={item.color} stroke="var(--pj-bg)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tl-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>Week of {new Date(series[0].weeks[hover].start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</b>
          {tip.map((item) => (
            <span key={item.name}>
              <i style={{ background: item.color }} /> {item.label} <em>{compact(item.value)}</em>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const Generator = () => {
  const [fieldId, setFieldId] = useState(FIELDS[0].id);
  const [cats, setCats] = useState(() => Object.keys(CATEGORIES));
  const [format, setFormat] = useState("md");
  const [copied, setCopied] = useState(false);
  const [surprise, setSurprise] = useState(null);
  const field = FIELDS.find((item) => item.id === fieldId);
  const ideas = field.ideas.filter(([cat]) => cats.includes(cat));

  const exportText = useMemo(() => {
    if (format === "md") {
      return [`## Test ideas: ${field.label}`, "", ...ideas.map(([cat, idea, input, expect]) => `- [ ] **${CATEGORIES[cat].label}**: ${idea}${input ? ` (\`${input}\`)` : ""}. Expect ${expect}.`)].join("\n");
    }
    return [
      `Feature: ${field.label}`,
      "",
      ...ideas.flatMap(([cat, idea, input, expect]) => [
        `  @${CATEGORIES[cat].label.toLowerCase().replace(/\s+/g, "-")}`,
        `  Scenario: ${idea}`,
        `    Given the ${field.label.toLowerCase()} is on screen`,
        input ? `    When I enter "${input}"` : "    When I interact with it",
        `    Then ${expect}`,
        "",
      ]),
    ].join("\n");
  }, [field, ideas, format]);

  const copy = () =>
    copyText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }, () => {});

  const surpriseMe = () => {
    const pickField = FIELDS[Math.floor(Math.random() * FIELDS.length)];
    const idea = pickField.ideas[Math.floor(Math.random() * pickField.ideas.length)];
    setSurprise({ field: pickField.label, idea });
  };

  return (
    <div className="tl-gen">
      <div className="tl-gen-controls">
        <div className="tl-fields" role="group" aria-label="What are you testing?">
          {FIELDS.map((item) => (
            <button key={item.id} type="button" className={fieldId === item.id ? "is-active" : ""} onClick={() => setFieldId(item.id)}>
              <i className={item.icon} aria-hidden="true" /> {item.label}
            </button>
          ))}
        </div>
        <div className="tl-cats" role="group" aria-label="Categories">
          {Object.entries(CATEGORIES).map(([id, cat]) => (
            <label key={id} className={cats.includes(id) ? "is-on" : ""}>
              <input type="checkbox" checked={cats.includes(id)} onChange={() => setCats((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]))} />
              <i className={cat.icon} aria-hidden="true" /> {cat.label}
            </label>
          ))}
        </div>
      </div>

      <div className="tl-gen-body">
        <ol className="tl-ideas">
          {ideas.map(([cat, idea, input, expect], index) => (
            <li key={idea} style={{ "--i": index }} className={`tl-idea tl-idea--${cat}`}>
              <span className="tl-idea-cat">
                <i className={CATEGORIES[cat].icon} aria-hidden="true" /> {CATEGORIES[cat].label}
              </span>
              <strong>{idea}</strong>
              {input && <code>{input}</code>}
              <span className="tl-expect">→ {expect}</span>
            </li>
          ))}
          {!ideas.length && <li className="tl-empty">Pick at least one category.</li>}
        </ol>

        <div className="tl-export">
          <div className="tl-export-bar">
            <button type="button" className={format === "md" ? "is-active" : ""} onClick={() => setFormat("md")}>
              Markdown checklist
            </button>
            <button type="button" className={format === "gherkin" ? "is-active" : ""} onClick={() => setFormat("gherkin")}>
              Gherkin
            </button>
            <button type="button" className="tl-copy" onClick={copy}>
              <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre>
            <code>{exportText}</code>
          </pre>
        </div>
      </div>

      <div className="tl-surprise">
        <button type="button" className="uv-btn uv-btn--ghost" onClick={surpriseMe}>
          <i className="fa-solid fa-shuffle" aria-hidden="true" /> Surprise me with an edge case
        </button>
        {surprise && (
          <p key={surprise.idea[1]}>
            <b>{surprise.field}:</b> {surprise.idea[1]}
            {surprise.idea[2] ? (
              <>
                {" "}
                with <code>{surprise.idea[2]}</code>
              </>
            ) : null}
            . Expect {surprise.idea[3]}.
          </p>
        )}
      </div>
    </div>
  );
};

export default function TestingLab({ now }) {
  const [group, setGroup] = useState("e2e");
  const [hidden, setHidden] = useState({});
  const [openFlaky, setOpenFlaky] = useState(0);
  const packages = GROUPS[group].packages;
  const feed = useFeed(`npm:history:${group}`, () => fetchDownloadHistory(packages.map((item) => item.name)), { ttl: 12 * 60 * 60 * 1000 });

  const series = useMemo(
    () =>
      (feed.data || []).map((item) => {
        const meta = packages.find((pkg) => pkg.name === item.name) || { label: item.name, color: "#888" };
        const weeks = item.weeks;
        return { ...item, ...meta, latest: weeks.length ? weeks[weeks.length - 1].count : 0, growth: growth(weeks) };
      }),
    [feed.data, packages]
  );
  const totalLatest = series.reduce((sum, item) => sum + item.latest, 0) || 1;
  const ranked = [...series].sort((a, b) => b.latest - a.latest);

  return (
    <div className="tl">
      <PageHead kicker="Testing Lab" title="Tools for people who *break things* for a living" aside={<Sync feed={feed} now={now} />}>
        Live download trends for the major test frameworks, a generator that turns any input into a test plan, and a
        field guide to flaky tests.
      </PageHead>

      <section>
        <SectionTitle icon="fa-solid fa-chart-line" title="Framework wars" meta="npm weekly downloads · last 12 months">
          <Chips items={Object.entries(GROUPS).map(([id, item]) => ({ id, label: item.label }))} value={group} onChange={(id) => { setGroup(id); setHidden({}); }} label="Group" />
        </SectionTitle>
        {!feed.data && !feed.error ? (
          <Skeletons count={1} />
        ) : (
          <FeedState feed={feed}>
            <div className="uv-panel tl-war">
              <div className="tl-legend">
                {ranked.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    className={hidden[item.name] ? "is-off" : ""}
                    onClick={() => setHidden((map) => ({ ...map, [item.name]: !map[item.name] }))}
                    aria-pressed={!hidden[item.name]}
                    style={{ "--c": item.color }}
                  >
                    <span className="tl-legend-rank">#{index + 1}</span>
                    <span className="tl-legend-name">
                      <i /> {item.label} {item.version && <small>v{item.version}</small>}
                    </span>
                    <strong>{compact(item.latest)}/wk</strong>
                    {item.growth != null && (
                      <em className={item.growth >= 0 ? "is-up" : "is-down"}>
                        {item.growth >= 0 ? "▲" : "▼"} {Math.abs(item.growth).toFixed(0)}% YoY
                      </em>
                    )}
                  </button>
                ))}
              </div>
              {series.length > 0 && <WarChart series={series} hidden={hidden} />}
              <div className="tl-share" aria-label="Share of last week's downloads">
                {ranked.map((item) => (
                  <span key={item.name} style={{ "--w": `${(item.latest / totalLatest) * 100}%`, background: item.color }} title={`${item.label}: ${((item.latest / totalLatest) * 100).toFixed(1)}%`} />
                ))}
              </div>
              <p className="tl-note">
                Share of the latest full week's downloads. Downloads include CI installs, so read them as momentum, not user counts.
              </p>
            </div>
          </FeedState>
        )}
      </section>

      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-lightbulb" title="Test idea generator" meta="export to Markdown or Gherkin" />
        <Generator />
      </section>

      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-stethoscope" title="Flaky test doctor" meta="symptom → cause → fix" />
        <div className="tl-flaky">
          {FLAKY.map((item, index) => (
            <div key={item.symptom} className={`tl-flaky-item ${openFlaky === index ? "is-open" : ""}`}>
              <button type="button" onClick={() => setOpenFlaky(openFlaky === index ? -1 : index)} aria-expanded={openFlaky === index}>
                <i className="fa-solid fa-bug" aria-hidden="true" /> {item.symptom}
                <i className="fa-solid fa-chevron-down tl-chev" aria-hidden="true" />
              </button>
              {openFlaky === index && (
                <div className="tl-flaky-body">
                  <p>
                    <b>Likely cause:</b> {item.cause}
                  </p>
                  <p>
                    <b>Fix:</b> {item.fix}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
