import React from "react";
import { timeAgo } from "../../../services/github/githubData";

/* ------------------------------------------------------------------ */
/* GitHub public events → terminal lines                               */
/* ------------------------------------------------------------------ */

const short = (sha = "") => sha.slice(0, 7);
const repoUrl = (name) => `https://github.com/${name}`;

export const describeEvent = (event) => {
  const repo = event.repo?.name || "";
  const p = event.payload || {};
  const base = { id: event.id, date: event.created_at, repo, href: repoUrl(repo) };
  switch (event.type) {
    case "PushEvent": {
      const branch = (p.ref || "").replace("refs/heads/", "");
      const count = p.size || p.commits?.length;
      return {
        ...base,
        verb: "push",
        tone: "push",
        text: `${count ? `${count} commit${count > 1 ? "s" : ""} → ` : ""}${branch || "main"}`,
        detail: p.commits?.[p.commits.length - 1]?.message?.split("\n")[0] || (p.head ? short(p.head) : ""),
        href: p.before && p.head ? `${repoUrl(repo)}/compare/${short(p.before)}...${short(p.head)}` : base.href,
      };
    }
    case "PullRequestEvent":
      return {
        ...base,
        verb: p.pull_request?.merged ? "merge" : `pr:${p.action}`,
        tone: "pr",
        text: `#${p.number || p.pull_request?.number} ${p.pull_request?.title || ""}`,
        href: p.pull_request?.html_url || base.href,
      };
    case "IssuesEvent":
      return { ...base, verb: `issue:${p.action}`, tone: "issue", text: `#${p.issue?.number} ${p.issue?.title || ""}`, href: p.issue?.html_url || base.href };
    case "IssueCommentEvent":
      return { ...base, verb: "comment", tone: "issue", text: `on #${p.issue?.number} ${p.issue?.title || ""}`, href: p.comment?.html_url || base.href };
    case "PullRequestReviewEvent":
      return { ...base, verb: "review", tone: "pr", text: `#${p.pull_request?.number} ${p.pull_request?.title || ""}`, href: p.review?.html_url || base.href };
    case "CreateEvent":
      return { ...base, verb: "create", tone: "create", text: p.ref_type === "repository" ? "new repository" : `${p.ref_type} ${p.ref}` };
    case "DeleteEvent":
      return { ...base, verb: "delete", tone: "muted", text: `${p.ref_type} ${p.ref}` };
    case "WatchEvent":
      return { ...base, verb: "star", tone: "star", text: "starred" };
    case "ForkEvent":
      return { ...base, verb: "fork", tone: "create", text: `forked → ${p.forkee?.full_name || ""}`, href: p.forkee?.html_url || base.href };
    case "ReleaseEvent":
      return { ...base, verb: "release", tone: "create", text: p.release?.tag_name || "", href: p.release?.html_url || base.href };
    case "PublicEvent":
      return { ...base, verb: "open-source", tone: "star", text: "made public" };
    default:
      return { ...base, verb: event.type.replace("Event", "").toLowerCase(), tone: "muted", text: "" };
  }
};

const clock = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export function Terminal({ lines, now, source }) {
  return (
    <div className="os-terminal" role="log" aria-live="polite" aria-label="Live GitHub activity">
      <div className="os-terminal-bar">
        <span className="os-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="os-terminal-title">aayush@github:~/activity — {source}</span>
        <span className="os-live-dot" aria-hidden="true">
          <i />
        </span>
      </div>
      <div className="os-terminal-body">
        <p className="os-term-cmd">
          <span className="os-prompt">❯</span> gh api users/Aayush-Mishraa/events
        </p>
        {!lines ? (
          <div className="os-term-loading">
            <span>connecting</span>
            <span className="os-term-ellipsis" aria-hidden="true" />
          </div>
        ) : !lines.length ? (
          <p className="os-term-line os-term-line--muted">No public events in the last 90 days.</p>
        ) : (
          lines.map((line, index) => (
            <a
              key={line.id}
              className={`os-term-line os-term-line--${line.tone}`}
              href={line.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "--i": index }}
            >
              <time dateTime={line.date} title={new Date(line.date).toLocaleString()}>
                {clock(line.date)}
              </time>
              <span className="os-term-verb">{line.verb}</span>
              <span className="os-term-repo">{line.repo.split("/").pop()}</span>
              <span className="os-term-text">
                {line.text}
                {line.detail && <em> {line.detail}</em>}
              </span>
              <span className="os-term-ago">{timeAgo(line.date, now)}</span>
            </a>
          ))
        )}
        <p className="os-term-cmd os-term-cmd--idle">
          <span className="os-prompt">❯</span> <span className="os-caret" aria-hidden="true" />
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pull request ledger                                                 */
/* ------------------------------------------------------------------ */

export const normalizeSearchPR = (item) => {
  const repo = item.repository_url.split("/").slice(-2).join("/");
  const merged = Boolean(item.pull_request?.merged_at);
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    url: item.html_url,
    repo,
    state: merged ? "merged" : item.state === "open" ? (item.draft ? "draft" : "open") : "closed",
    date: item.created_at,
    closedAt: item.pull_request?.merged_at || item.closed_at,
    comments: item.comments || 0,
  };
};

/** Shape used by the legacy build-time JSON (GraphQL). */
export const normalizeLegacyPR = (item) => ({
  id: item.id,
  number: item.number,
  title: item.title,
  url: item.url,
  repo: `${item.baseRepository?.owner?.login}/${item.baseRepository?.name}`,
  state: item.state === "MERGED" ? "merged" : item.state === "OPEN" ? "open" : "closed",
  date: item.createdAt,
  closedAt: null,
  additions: item.additions,
  deletions: item.deletions,
  comments: 0,
});

const STATE_META = {
  merged: { icon: "fa-solid fa-code-merge", label: "Merged" },
  open: { icon: "fa-solid fa-code-pull-request", label: "Open" },
  draft: { icon: "fa-regular fa-file-lines", label: "Draft" },
  closed: { icon: "fa-solid fa-circle-xmark", label: "Closed" },
};

const Ring = ({ segments, total, inView }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className={`os-ring ${inView ? "is-in" : ""}`} aria-hidden="true">
      <circle cx="70" cy="70" r={r} className="os-ring-track" />
      {segments.map((segment) => {
        const length = total ? (segment.value / total) * c : 0;
        const node = (
          <circle
            key={segment.key}
            cx="70"
            cy="70"
            r={r}
            className={`os-ring-seg os-ring-seg--${segment.key}`}
            style={{ "--len": `${Math.max(0, length - 3)}px`, "--gap": `${c}px`, "--off": `${-offset}px` }}
          />
        );
        offset += length;
        return node;
      })}
    </svg>
  );
};

export function PullRequestLedger({ prs, inView, now }) {
  if (!prs) return <div className="os-skeleton-block os-skeleton-block--tall" aria-busy="true" />;
  const counts = prs.reduce((acc, pr) => ({ ...acc, [pr.state]: (acc[pr.state] || 0) + 1 }), {});
  const merged = counts.merged || 0;
  const rate = prs.length ? Math.round((merged / prs.length) * 100) : 0;
  const repos = new Set(prs.map((pr) => pr.repo)).size;
  const segments = ["merged", "open", "draft", "closed"].map((key) => ({ key, value: counts[key] || 0 }));

  return (
    <div className="os-ledger">
      <div className="os-ledger-summary">
        <div className="os-ring-wrap">
          <Ring segments={segments} total={prs.length} inView={inView} />
          <div className="os-ring-center">
            <strong>{rate}%</strong>
            <span>merged</span>
          </div>
        </div>
        <ul className="os-ledger-legend">
          {segments
            .filter((segment) => segment.value)
            .map((segment) => (
              <li key={segment.key}>
                <i className={`os-swatch os-swatch--${segment.key}`} /> {STATE_META[segment.key].label}
                <b>{segment.value}</b>
              </li>
            ))}
          <li className="os-ledger-legend-meta">
            {prs.length} PRs across {repos} repo{repos === 1 ? "" : "s"}
          </li>
        </ul>
      </div>
      <ol className="os-ledger-list">
        {prs.slice(0, 7).map((pr, index) => (
          <li key={pr.id} style={{ "--i": index }}>
            <a href={pr.url} target="_blank" rel="noopener noreferrer" className={`os-pr os-pr--${pr.state}`}>
              <i className={STATE_META[pr.state].icon} aria-label={STATE_META[pr.state].label} />
              <span className="os-pr-body">
                <span className="os-pr-title">{pr.title}</span>
                <span className="os-pr-meta">
                  <code>#{pr.number}</code>
                  <span>{pr.repo.split("/").pop()}</span>
                  <time dateTime={pr.date}>{timeAgo(pr.date, now)}</time>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
