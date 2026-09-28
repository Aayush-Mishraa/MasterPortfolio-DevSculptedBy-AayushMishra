import React, { useMemo, useState } from "react";
import { PageHead, SectionTitle, copyText } from "../lib/kit";
import { FIELDS as CRON_FIELDS, describeCron, nextRuns, parseCron } from "./cron";
import "./Studio.css";

const CopyButton = ({ text, label = "Copy" }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="st-copy"
      onClick={() =>
        copyText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }, () => {})
      }
    >
      <i className={done ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" /> {done ? "Copied" : label}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Badge builder                                                       */
/* ------------------------------------------------------------------ */

const shieldText = (text) => encodeURIComponent(text.replace(/-/g, "--").replace(/_/g, "__")).replace(/%20/g, "_");

const BADGE_PRESETS = [
  { label: "tested with", message: "playwright", color: "2EAD33", logo: "playwright" },
  { label: "PRs", message: "welcome", color: "brightgreen", logo: "github" },
  { label: "role", message: "SDET", color: "0E6BA8", logo: "testinglibrary" },
  { label: "hacktoberfest", message: "friendly", color: "9C4668", logo: "hacktoberfest" },
  { label: "made with", message: "react", color: "61DAFB", logo: "react" },
];

const STYLES = ["flat", "flat-square", "for-the-badge", "plastic", "social"];

const BadgeBuilder = () => {
  const [mode, setMode] = useState("static");
  const [badge, setBadge] = useState(BADGE_PRESETS[0]);
  const [style, setStyle] = useState("for-the-badge");
  const [repo, setRepo] = useState("microsoft/playwright");

  const staticUrl = `https://img.shields.io/badge/${shieldText(badge.label)}-${shieldText(badge.message)}-${encodeURIComponent(badge.color.replace("#", ""))}?style=${style}${
    badge.logo ? `&logo=${encodeURIComponent(badge.logo)}` : ""
  }`;
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const validRepo = /^[\w.-]+\/[\w.-]+$/.test(cleanRepo);
  const repoBadges = validRepo
    ? [
        ["stars", `https://img.shields.io/github/stars/${cleanRepo}?style=${style}`],
        ["forks", `https://img.shields.io/github/forks/${cleanRepo}?style=${style}`],
        ["last commit", `https://img.shields.io/github/last-commit/${cleanRepo}?style=${style}`],
        ["license", `https://img.shields.io/github/license/${cleanRepo}?style=${style}`],
        ["open issues", `https://img.shields.io/github/issues/${cleanRepo}?style=${style}`],
        ["top language", `https://img.shields.io/github/languages/top/${cleanRepo}?style=${style}`],
      ]
    : [];

  const markdown =
    mode === "static"
      ? `![${badge.label} ${badge.message}](${staticUrl})`
      : repoBadges.map(([name, url]) => `![${name}](${url})`).join(" ");

  const set = (key) => (event) => setBadge((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="uv-panel st-tool">
      <div className="st-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "static"} className={mode === "static" ? "is-active" : ""} onClick={() => setMode("static")}>
          Custom badge
        </button>
        <button type="button" role="tab" aria-selected={mode === "repo"} className={mode === "repo" ? "is-active" : ""} onClick={() => setMode("repo")}>
          GitHub repo badges
        </button>
      </div>

      {mode === "static" ? (
        <>
          <div className="st-presets">
            {BADGE_PRESETS.map((preset) => (
              <button key={preset.message} type="button" onClick={() => setBadge(preset)} className={badge.message === preset.message ? "is-active" : ""}>
                {preset.label} · {preset.message}
              </button>
            ))}
          </div>
          <div className="st-fields">
            <label>
              <span>Label</span>
              <input className="uv-input" value={badge.label} onChange={set("label")} />
            </label>
            <label>
              <span>Message</span>
              <input className="uv-input" value={badge.message} onChange={set("message")} />
            </label>
            <label>
              <span>Color (name or hex)</span>
              <input className="uv-input uv-input--mono" value={badge.color} onChange={set("color")} />
            </label>
            <label>
              <span>Logo (simple-icons slug)</span>
              <input className="uv-input uv-input--mono" value={badge.logo} onChange={set("logo")} placeholder="e.g. github, docker" />
            </label>
          </div>
        </>
      ) : (
        <div className="st-fields st-fields--one">
          <label>
            <span>Repository (owner/name or URL)</span>
            <input className="uv-input uv-input--mono" value={repo} onChange={(event) => setRepo(event.target.value)} />
          </label>
        </div>
      )}

      <div className="st-styles" role="group" aria-label="Badge style">
        {STYLES.map((item) => (
          <button key={item} type="button" className={style === item ? "is-active" : ""} onClick={() => setStyle(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="st-preview" aria-live="polite">
        {mode === "static" ? (
          <img src={staticUrl} alt={`${badge.label}: ${badge.message}`} />
        ) : validRepo ? (
          repoBadges.map(([name, url]) => <img key={name} src={url} alt={name} loading="lazy" />)
        ) : (
          <span className="st-muted">Enter a repository like owner/name.</span>
        )}
      </div>
      <div className="st-output">
        <code>{markdown || "—"}</code>
        <CopyButton text={markdown} label="Copy Markdown" />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Conventional commit composer                                        */
/* ------------------------------------------------------------------ */

const TYPES = [
  { id: "feat", hint: "a new feature", impact: "minor" },
  { id: "fix", hint: "a bug fix", impact: "patch" },
  { id: "test", hint: "adding or fixing tests", impact: "none" },
  { id: "docs", hint: "documentation only", impact: "none" },
  { id: "refactor", hint: "code change, no behaviour change", impact: "none" },
  { id: "perf", hint: "performance improvement", impact: "patch" },
  { id: "ci", hint: "CI configuration", impact: "none" },
  { id: "build", hint: "build system or dependencies", impact: "none" },
  { id: "chore", hint: "maintenance", impact: "none" },
  { id: "style", hint: "formatting only", impact: "none" },
  { id: "revert", hint: "revert a previous commit", impact: "patch" },
];

const PAST_TENSE = /^(added|adds|fixed|fixes|updated|updates|changed|changes|removed|removes|created|creates|improved|improves)\b/i;

const CommitComposer = () => {
  const [type, setType] = useState("test");
  const [scope, setScope] = useState("login");
  const [subject, setSubject] = useState("wait for navigation after sign in");
  const [body, setBody] = useState("The test clicked before the redirect finished and failed about 1 run in 20 on CI.");
  const [breaking, setBreaking] = useState("");
  const [issue, setIssue] = useState("Closes #42");

  const header = `${type}${scope.trim() ? `(${scope.trim()})` : ""}${breaking.trim() ? "!" : ""}: ${subject.trim()}`;
  const footer = [breaking.trim() && `BREAKING CHANGE: ${breaking.trim()}`, issue.trim()].filter(Boolean).join("\n");
  const message = [header, body.trim(), footer].filter(Boolean).join("\n\n");
  const quote = (text) => `"${text.replace(/(["\\$`])/g, "\\$1")}"`;
  const command = ["git commit", `-m ${quote(header)}`, body.trim() && `-m ${quote(body.trim())}`, footer && `-m ${quote(footer)}`].filter(Boolean).join(" ");

  const issues = [];
  if (!subject.trim()) issues.push(["error", "Subject is required."]);
  if (header.length > 72) issues.push(["warn", `Header is ${header.length} characters. Keep it within 72.`]);
  if (/\.$/.test(subject.trim())) issues.push(["warn", "Drop the trailing period in the subject."]);
  if (/^[A-Z]/.test(subject.trim())) issues.push(["warn", "Conventional subjects usually start lowercase."]);
  if (PAST_TENSE.test(subject.trim())) issues.push(["warn", "Use the imperative mood: “add”, not “added”."]);
  if (scope && !/^[\w./-]+$/.test(scope.trim())) issues.push(["warn", "Scopes are usually one word, like auth or api."]);

  const impact = breaking.trim() ? "major" : TYPES.find((item) => item.id === type).impact;

  return (
    <div className="uv-panel st-tool">
      <div className="st-types" role="group" aria-label="Commit type">
        {TYPES.map((item) => (
          <button key={item.id} type="button" className={type === item.id ? "is-active" : ""} onClick={() => setType(item.id)} title={item.hint}>
            {item.id}
          </button>
        ))}
      </div>
      <div className="st-fields">
        <label>
          <span>Scope (optional)</span>
          <input className="uv-input uv-input--mono" value={scope} onChange={(event) => setScope(event.target.value)} />
        </label>
        <label className="st-span-3">
          <span>Subject</span>
          <input className="uv-input" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} />
        </label>
        <label className="st-span-4">
          <span>Body: why this change?</span>
          <textarea className="uv-input st-textarea" value={body} onChange={(event) => setBody(event.target.value)} rows={3} />
        </label>
        <label className="st-span-2">
          <span>Breaking change (optional)</span>
          <input className="uv-input" value={breaking} onChange={(event) => setBreaking(event.target.value)} placeholder="what breaks and how to migrate" />
        </label>
        <label className="st-span-2">
          <span>Issue reference</span>
          <input className="uv-input uv-input--mono" value={issue} onChange={(event) => setIssue(event.target.value)} />
        </label>
      </div>

      <div className="st-commit">
        <div className="st-commit-head">
          <span className={`st-impact st-impact--${impact}`}>
            Release impact: <b>{impact === "none" ? "no release" : `${impact} version`}</b>
          </span>
          <span className="st-muted">{header.length}/72</span>
        </div>
        <pre>
          <code>{message}</code>
        </pre>
        {issues.length > 0 && (
          <ul className="st-lint">
            {issues.map(([level, text]) => (
              <li key={text} className={`is-${level}`}>
                <i className={level === "error" ? "fa-solid fa-circle-xmark" : "fa-solid fa-triangle-exclamation"} aria-hidden="true" /> {text}
              </li>
            ))}
          </ul>
        )}
        <div className="st-output">
          <code>{command}</code>
          <CopyButton text={command} label="Copy command" />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Cron decoder                                                        */
/* ------------------------------------------------------------------ */

const until = (ms) => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

const CRON_PRESETS = [
  ["*/5 * * * *", "every 5 min"],
  ["0 9 * * 1-5", "weekday standup"],
  ["0 2 * * *", "nightly regression"],
  ["30 18 * * FRI", "Friday deploy freeze"],
  ["0 0 1 * *", "monthly report"],
  ["0 */6 * * *", "every 6 hours"],
];

const CronDecoder = ({ now }) => {
  const [expression, setExpression] = useState("0 2 * * *");
  const result = useMemo(() => {
    try {
      const cron = parseCron(expression);
      return { cron, text: describeCron(cron), runs: nextRuns(cron, 6, new Date(now)) };
    } catch (error) {
      return { error: error.message };
    }
  }, [expression, now]);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="uv-panel st-tool">
      <div className="st-presets">
        {CRON_PRESETS.map(([value, label]) => (
          <button key={value} type="button" className={expression === value ? "is-active" : ""} onClick={() => setExpression(value)}>
            <code>{value}</code> {label}
          </button>
        ))}
      </div>
      <input
        className={`uv-input uv-input--mono st-cron-input ${result.error ? "is-error" : ""}`}
        value={expression}
        onChange={(event) => setExpression(event.target.value)}
        aria-label="Cron expression"
        spellCheck="false"
      />
      {result.error ? (
        <p className="st-cron-error">
          <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {result.error}
        </p>
      ) : (
        <>
          <p className="st-cron-text">{result.text}</p>
          <div className="st-cron-grid">
            <ol className="st-cron-fields">
              {CRON_FIELDS.map((field) => (
                <li key={field.key}>
                  <code>{result.cron[field.key].raw}</code>
                  <span>{field.label}</span>
                  <small>{result.cron[field.key].any ? "any" : result.cron[field.key].values.slice(0, 12).join(", ") + (result.cron[field.key].values.length > 12 ? "…" : "")}</small>
                </li>
              ))}
            </ol>
            <div className="st-cron-runs">
              <span className="st-muted">Next runs ({zone})</span>
              <ol>
                {result.runs.map((run) => (
                  <li key={run.toISOString()}>
                    <b>{run.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</b>
                    <span>in {until(run - now)}</span>
                  </li>
                ))}
                {!result.runs.length && <li>No run in the next five years. Check the day and month fields.</li>}
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Studio({ now }) {
  return (
    <div className="st">
      <PageHead kicker="Dev Studio · create" title="Small tools for *everyday* dev work">
        Make README badges, write commit messages that release tools understand, and decode cron schedules before they wake
        you up at 3 a.m.
      </PageHead>
      <section>
        <SectionTitle icon="fa-solid fa-certificate" title="Badge builder" meta="powered by shields.io" />
        <BadgeBuilder />
      </section>
      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-code-commit" title="Conventional commit composer" meta="conventionalcommits.org" />
        <CommitComposer />
      </section>
      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-clock" title="Cron decoder" meta="5-field standard cron" />
        <CronDecoder now={now} />
      </section>
    </div>
  );
}
