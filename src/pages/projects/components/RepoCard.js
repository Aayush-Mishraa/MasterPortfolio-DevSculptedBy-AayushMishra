import React from "react";
import { Link } from "react-router-dom";
import { Sparkline } from "./Charts";
import { categoryById, timeAgo } from "../../../services/github/githubData";
import { useSpotlight } from "../lib/ui";

/** Wraps the parts of `text` that match any query token in <mark>. */
export const Highlight = ({ text = "", query = "" }) => {
  const tokens = query.trim().split(/\s+/).filter(Boolean).map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!tokens.length) return text;
  const parts = text.split(new RegExp(`(${tokens.join("|")})`, "ig"));
  return parts.map((part, index) => (index % 2 ? <mark key={index}>{part}</mark> : part));
};

export const LanguageBar = ({ languages = [], thin }) => (
  <div className={`pj-langbar ${thin ? "is-thin" : ""}`} aria-label={languages.map((l) => `${l.name} ${l.percent.toFixed(0)}%`).join(", ")}>
    {languages.map((language) => (
      <span key={language.name} style={{ width: `${language.percent}%`, background: language.color }} title={`${language.name} ${language.percent.toFixed(1)}%`} />
    ))}
  </div>
);

const RepoCard = ({ repo, query = "", view = "grid", index = 0, now, featured = false, inView = true }) => {
  const spotlight = useSpotlight();
  const category = categoryById(repo.category);
  const pushedRecently = repo.daysSincePush < 7;

  return (
    <Link
      to={`/projects/${encodeURIComponent(repo.name)}`}
      className={`pj-card pj-card--${view} ${featured ? "pj-card--featured" : ""}`}
      onMouseMove={spotlight}
      style={{ "--i": index }}
    >
      <span className="pj-card-glow" aria-hidden="true" />
      <div className="pj-card-top">
        {featured ? (
          <span className="pj-card-index">{String(index + 1).padStart(2, "0")}</span>
        ) : null}
        <span className="pj-chip pj-chip--category">
          <i className={category?.icon} aria-hidden="true" />
          {category?.label}
        </span>
        {repo.fork && <span className="pj-chip pj-chip--muted">Fork</span>}
        {repo.archived && <span className="pj-chip pj-chip--muted">Archived</span>}
        {pushedRecently && (
          <span className="pj-live-dot" title="Pushed this week">
            <i /> active
          </span>
        )}
      </div>

      <h3 className="pj-card-title">
        <Highlight text={repo.title} query={query} />
      </h3>
      <p className="pj-card-desc">
        {repo.description ? (
          <Highlight text={repo.description} query={query} />
        ) : (
          <span className="pj-card-desc--empty">No description yet. Open the case file for commits and code.</span>
        )}
      </p>

      {repo.topics.length > 0 && (
        <ul className="pj-card-topics">
          {repo.topics.slice(0, featured ? 6 : 4).map((topic) => (
            <li key={topic}>
              <Highlight text={topic} query={query} />
            </li>
          ))}
          {repo.topics.length > (featured ? 6 : 4) && <li className="is-more">+{repo.topics.length - (featured ? 6 : 4)}</li>}
        </ul>
      )}

      <div className="pj-card-activity">
        <Sparkline values={repo.activity} inView={inView} />
        <span className="pj-card-activity-label">{repo.activityLabel}</span>
      </div>

      <LanguageBar languages={repo.languages} thin />

      <div className="pj-card-meta">
        {repo.language && (
          <span className="pj-card-lang">
            <i style={{ background: repo.languages[0]?.color }} />
            {repo.language}
          </span>
        )}
        <span title="Commits">
          <i className="fa-solid fa-code-commit" aria-hidden="true" /> {repo.commitTotal}
        </span>
        <span title="Stars">
          <i className="fa-regular fa-star" aria-hidden="true" /> {repo.stars}
        </span>
        <span className="pj-card-updated" title={`Last push ${new Date(repo.pushedAt).toLocaleString()}`}>
          {timeAgo(repo.pushedAt, now)}
        </span>
      </div>

      <span className="pj-card-cta" aria-hidden="true">
        Open case file <i className="fa-solid fa-arrow-right" />
      </span>
    </Link>
  );
};

export default RepoCard;
