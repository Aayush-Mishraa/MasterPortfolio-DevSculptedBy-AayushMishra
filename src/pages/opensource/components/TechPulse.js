import React, { useCallback, useEffect, useRef, useState } from "react";
import { NEWS_SOURCES, NEWS_TOPICS, fetchNews } from "../../../services/news/newsData";
import { timeAgo } from "../../../services/github/githubData";

const REFRESH_MS = 10 * 60 * 1000;

const compact = (value) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);

const Favicon = ({ domain }) => (
  <img
    className="os-news-favicon"
    src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
    alt=""
    width="16"
    height="16"
    loading="lazy"
    onError={(event) => {
      event.currentTarget.style.visibility = "hidden";
    }}
  />
);

const scoreLabel = (story) =>
  story.source === "github"
    ? { icon: "fa-solid fa-star", value: compact(story.score), hint: "stars" }
    : story.source === "devto"
    ? { icon: "fa-solid fa-heart", value: compact(story.score), hint: "reactions" }
    : { icon: "fa-solid fa-arrow-up", value: compact(story.score), hint: "points" };

const Lead = ({ story, now }) => {
  const score = scoreLabel(story);
  return (
    <a className="os-news-lead" href={story.url} target="_blank" rel="noopener noreferrer">
      {story.cover ? (
        <span className="os-news-lead-media" style={{ backgroundImage: `url(${story.cover})` }} aria-hidden="true" />
      ) : (
        <span className="os-news-lead-media os-news-lead-media--mesh" aria-hidden="true">
          <i className={NEWS_SOURCES.find((source) => source.id === story.source)?.icon} />
        </span>
      )}
      <span className="os-news-lead-body">
        <span className="os-news-badge">
          <i className="fa-solid fa-bolt" aria-hidden="true" /> Top story
        </span>
        <span className="os-news-lead-title">{story.title}</span>
        {story.summary && <span className="os-news-lead-summary">{story.summary}</span>}
        <span className="os-news-meta">
          <Favicon domain={story.domain} />
          <span>{story.domain}</span>
          <span>
            <i className={score.icon} aria-hidden="true" /> {score.value} {score.hint}
          </span>
          <span>
            <i className="fa-regular fa-comment" aria-hidden="true" /> {compact(story.comments)}
          </span>
          <time dateTime={story.date}>{timeAgo(story.date, now)}</time>
        </span>
      </span>
    </a>
  );
};

const Row = ({ story, rank, now }) => {
  const score = scoreLabel(story);
  return (
    <li style={{ "--i": rank }}>
      <a className="os-news-row" href={story.url} target="_blank" rel="noopener noreferrer">
        <span className="os-news-rank">{String(rank + 2).padStart(2, "0")}</span>
        <span className="os-news-row-body">
          <span className="os-news-row-title">{story.title}</span>
          {story.source === "github" && story.summary && <span className="os-news-row-summary">{story.summary}</span>}
          <span className="os-news-meta">
            <Favicon domain={story.domain} />
            <span>{story.source === "github" ? story.language || "repo" : story.domain}</span>
            <span title={score.hint}>
              <i className={score.icon} aria-hidden="true" /> {score.value}
            </span>
            <span title={story.source === "github" ? "forks" : "comments"}>
              <i className={story.source === "github" ? "fa-solid fa-code-fork" : "fa-regular fa-comment"} aria-hidden="true" />{" "}
              {compact(story.comments)}
            </span>
            <time dateTime={story.date}>{timeAgo(story.date, now)}</time>
          </span>
        </span>
        <i className="fa-solid fa-arrow-up-right-from-square os-news-go" aria-hidden="true" />
      </a>
    </li>
  );
};

export default function TechPulse({ now, inView }) {
  const [source, setSource] = useState("hn");
  const [topicId, setTopicId] = useState("all");
  const [state, setState] = useState({ stories: null, error: null, syncedAt: null, loading: true });
  const request = useRef(0);

  const topic = NEWS_TOPICS.find((item) => item.id === topicId);

  const load = useCallback(() => {
    const id = ++request.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    fetchNews(source, topic)
      .then((stories) => {
        if (id !== request.current) return;
        setState({ stories, error: null, syncedAt: Date.now(), loading: false });
      })
      .catch(() => {
        if (id !== request.current) return;
        setState((previous) => ({ ...previous, loading: false, error: "This feed is not responding right now." }));
      });
  }, [source, topic]);

  useEffect(() => {
    if (!inView) return undefined;
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, inView]);

  const stories = state.stories || [];
  const headlines = stories.slice(0, 8);

  return (
    <div className="os-pulse">
      {headlines.length > 0 && (
        <div className="os-ticker" aria-hidden="true">
          <span className="os-ticker-label">
            <span className="os-live-dot">
              <i />
            </span>
            LIVE
          </span>
          <div className="os-ticker-track">
            <div className="os-ticker-run">
              {[...headlines, ...headlines].map((story, index) => (
                <span key={`${story.id}-${index}`}>
                  {story.title}
                  <b>◆</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="os-pulse-controls">
        <div className="os-segment" role="tablist" aria-label="News source">
          {NEWS_SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={source === item.id}
              className={source === item.id ? "is-active" : ""}
              onClick={() => setSource(item.id)}
            >
              <i className={item.icon} aria-hidden="true" /> <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="os-pulse-sync">
          <span>{state.syncedAt ? `synced ${timeAgo(state.syncedAt, now)}` : "syncing…"}</span>
          <button type="button" onClick={load} aria-label="Refresh news" className={state.loading ? "is-spinning" : ""}>
            <i className="fa-solid fa-rotate" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="os-topics" role="group" aria-label="Topic">
        {NEWS_TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={topicId === item.id}
            className={topicId === item.id ? "is-active" : ""}
            onClick={() => setTopicId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {state.error && !stories.length ? (
        <div className="os-empty">
          <i className="fa-solid fa-satellite" aria-hidden="true" />
          <p>{state.error}</p>
          <button type="button" className="os-btn os-btn--ghost" onClick={load}>
            Try again
          </button>
        </div>
      ) : !state.stories ? (
        <div className="os-news-grid">
          <div className="os-skeleton-block os-skeleton-block--lead" />
          <div className="os-skeleton-list">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      ) : !stories.length ? (
        <div className="os-empty">
          <i className="fa-regular fa-newspaper" aria-hidden="true" />
          <p>Nothing trending for this topic yet. Try another one.</p>
        </div>
      ) : (
        <div className={`os-news-grid ${state.loading ? "is-loading" : ""}`} key={`${source}-${topicId}`}>
          <Lead story={stories[0]} now={now} />
          <ol className="os-news-list">
            {stories.slice(1, 9).map((story, index) => (
              <Row key={story.id} story={story} rank={index} now={now} />
            ))}
          </ol>
        </div>
      )}
      <p className="os-pulse-credit">
        Sources: Hacker News (Algolia API), DEV Community API, GitHub Search. Refreshes every 10 minutes.
      </p>
    </div>
  );
}
