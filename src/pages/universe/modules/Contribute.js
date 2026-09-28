import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStarterIssues } from "../../../services/universe/sources";
import { timeAgo } from "../../../services/github/githubData";
import { Chips, FeedState, PageHead, SectionTitle, Skeletons, Sync } from "../lib/kit";
import { useFeed, useLocalState } from "../lib/useFeed";
import { prefersReducedMotion } from "../../projects/lib/ui";
import "./Contribute.css";

const LANGUAGES = [
  { id: "", label: "Any language" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "csharp", label: "C#" },
];

const LABELS = [
  { id: "good first issue", label: "Good first issue", icon: "fa-solid fa-seedling" },
  { id: "help wanted", label: "Help wanted", icon: "fa-solid fa-hand" },
  { id: "documentation", label: "Docs", icon: "fa-solid fa-book" },
  { id: "hacktoberfest", label: "Hacktoberfest", icon: "fa-solid fa-leaf" },
];

const STEPS = [
  "Read CONTRIBUTING.md and the code of conduct",
  "Comment on the issue to ask if you can take it",
  "Fork the repo and create a branch (fix/issue-123)",
  "Run the existing tests before changing anything",
  "Make the smallest change that fixes the issue",
  "Add or update a test that proves the fix",
  "Write a conventional commit message",
  "Open a PR that links the issue and explains why",
];

const labelStyle = (color = "888888") => {
  const hex = /^[0-9a-f]{6}$/i.test(color) ? color : "888888";
  // GitHub label colour as the border, the same colour at ~16% alpha as the fill.
  return { borderColor: `#${hex}`, background: `#${hex}29` };
};

const hackStatus = (now) => {
  const date = new Date(now);
  const year = date.getFullYear();
  const start = new Date(year, 9, 1);
  const end = new Date(year, 10, 1);
  if (date >= start && date < end) return { live: true, target: end, title: `Hacktoberfest ${year} is live`, sub: "left to get your PRs merged" };
  const target = date < start ? start : new Date(year + 1, 9, 1);
  return { live: false, target, title: `Hacktoberfest ${target.getFullYear()}`, sub: "until kickoff on October 1" };
};

const Countdown = ({ now }) => {
  const status = hackStatus(now);
  const ms = Math.max(0, status.target - now);
  const parts = [
    [Math.floor(ms / 86400000), "days"],
    [Math.floor((ms % 86400000) / 3600000), "hours"],
    [Math.floor((ms % 3600000) / 60000), "min"],
  ];
  return (
    <div className={`cb-hack ${status.live ? "is-live" : ""}`}>
      <div>
        <span className="uv-kicker">{status.live ? "Happening now" : "Coming up"}</span>
        <strong>{status.title}</strong>
        <p>
          A month-long celebration of open source. Get pull requests merged in participating repos during October. Use the
          Hacktoberfest label below to find them.
        </p>
      </div>
      <div className="cb-clock" aria-label={`${parts[0][0]} days ${parts[1][0]} hours ${status.sub}`}>
        {parts.map(([value, unit]) => (
          <span key={unit}>
            <b>{String(value).padStart(2, "0")}</b>
            <small>{unit}</small>
          </span>
        ))}
        <em>{status.sub}</em>
      </div>
    </div>
  );
};

/** Slot-machine style picker: cycles through titles, then lands on one. */
const Roulette = ({ issues }) => {
  const [spinning, setSpinning] = useState(false);
  const [shown, setShown] = useState(null);
  const [landed, setLanded] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const spin = () => {
    if (!issues.length || spinning) return;
    const winner = issues[Math.floor(Math.random() * issues.length)];
    setLanded(null);
    if (prefersReducedMotion()) {
      setShown(winner);
      setLanded(winner);
      return;
    }
    setSpinning(true);
    let step = 0;
    const total = 18;
    const tick = () => {
      step += 1;
      if (step >= total) {
        setShown(winner);
        setLanded(winner);
        setSpinning(false);
        return;
      }
      setShown(issues[Math.floor(Math.random() * issues.length)]);
      timer.current = setTimeout(tick, 40 + step * step * 1.4);
    };
    tick();
  };

  return (
    <div className="uv-panel cb-roulette">
      <div className="cb-roulette-head">
        <div>
          <strong>
            <i className="fa-solid fa-dice" aria-hidden="true" /> Issue roulette
          </strong>
          <span>Can't choose? Let fate pick your first contribution.</span>
        </div>
        <button type="button" className="uv-btn uv-btn--primary" onClick={spin} disabled={!issues.length || spinning}>
          <i className={`fa-solid fa-rotate ${spinning ? "fa-spin" : ""}`} aria-hidden="true" /> {spinning ? "Spinning…" : landed ? "Spin again" : "Spin"}
        </button>
      </div>
      <div className={`cb-reel ${spinning ? "is-spinning" : ""} ${landed ? "is-landed" : ""}`} aria-live="polite">
        {shown ? (
          <>
            <span className="cb-reel-repo">{shown.repo}</span>
            <strong>{shown.title}</strong>
            {landed && (
              <a href={landed.url} target="_blank" rel="noopener noreferrer" className="uv-btn uv-btn--ghost uv-btn--sm">
                Open issue #{landed.number} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
              </a>
            )}
          </>
        ) : (
          <span className="cb-reel-idle">Press spin to pick a random open issue from the list below.</span>
        )}
      </div>
    </div>
  );
};

export default function Contribute({ now }) {
  const [language, setLanguage] = useState("");
  const [label, setLabel] = useState("good first issue");
  const [steps, setSteps] = useLocalState("contribute:steps", {});
  const feed = useFeed(`issues:${label}:${language || "any"}`, () => fetchStarterIssues({ language, label }), { ttl: 10 * 60 * 1000 });
  const issues = feed.data || [];

  return (
    <div className="cb">
      <PageHead kicker="Contribute · open source" title="Your first pull request *starts here*" aside={<Sync feed={feed} now={now} />}>
        Fresh, unassigned issues that maintainers have marked as beginner-friendly, searched live across all of GitHub. Pick a
        language, pick a label, and ship something real.
      </PageHead>

      <Countdown now={now} />

      <div className="cb-filters">
        <Chips items={LABELS} value={label} onChange={setLabel} label="Label" />
        <Chips items={LANGUAGES} value={language} onChange={setLanguage} label="Language" />
      </div>

      <Roulette issues={issues} />

      <div className="cb-layout">
        <section>
          <SectionTitle icon="fa-solid fa-list-check" title="Open issues" meta={issues.length ? `${issues.length} newest · unassigned` : null} />
          {!feed.data && !feed.error ? (
            <Skeletons count={6} variant="row" />
          ) : (
            <FeedState feed={feed} empty="No open issues match. Try another language or label.">
              <ol className="cb-issues" key={`${label}-${language}`}>
                {issues.map((issue, index) => (
                  <li key={issue.id} style={{ "--i": Math.min(index, 12) }}>
                    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="cb-issue">
                      <i className="fa-regular fa-circle-dot cb-issue-icon" aria-hidden="true" />
                      <div className="cb-issue-body">
                        <span className="cb-issue-repo">
                          {issue.repo} <em>#{issue.number}</em>
                        </span>
                        <strong>{issue.title}</strong>
                        {issue.body && <p className="uv-clamp-2">{issue.body}</p>}
                        <div className="cb-labels">
                          {issue.labels.map((item) => (
                            <span key={item.name} style={labelStyle(item.color)}>
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="cb-issue-side">
                        <span>
                          <i className="fa-regular fa-comment" aria-hidden="true" /> {issue.comments}
                        </span>
                        <time dateTime={issue.createdAt}>{timeAgo(issue.createdAt, now)}</time>
                      </div>
                    </a>
                  </li>
                ))}
              </ol>
            </FeedState>
          )}
          {feed.error && /403|429/.test(feed.error) && (
            <p className="cb-note">GitHub limits searches to 10 per minute per visitor. Wait a minute, then refresh.</p>
          )}
        </section>

        <aside className="cb-side">
          <div className="uv-panel">
            <SectionTitle icon="fa-solid fa-flag-checkered" title="First-PR checklist" />
            <ol className="cb-steps">
              {STEPS.map((step, index) => (
                <li key={step}>
                  <label>
                    <input type="checkbox" checked={Boolean(steps[index])} onChange={() => setSteps((map) => ({ ...map, [index]: !map[index] }))} />
                    <span>
                      <b>{index + 1}</b> {step}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
            <Link to="/universe/studio" className="uv-btn uv-btn--ghost uv-btn--sm cb-studio">
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Write the commit message in Dev Studio
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
