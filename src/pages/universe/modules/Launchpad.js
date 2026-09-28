import React, { useState } from "react";
import { fetchRisingRepos, fetchShowHN, fetchTrendingSpaces } from "../../../services/universe/sources";
import { languageColor, timeAgo } from "../../../services/github/githubData";
import { Chips, FeedState, PageHead, Skeletons, Sync, compact } from "../lib/kit";
import { useFeed } from "../lib/useFeed";
import "./Launchpad.css";

const HF_HUES = { red: 0, orange: 25, yellow: 45, green: 135, blue: 215, indigo: 240, purple: 275, pink: 330, gray: 220 };

const LANES = [
  { id: "hn", label: "Shown on HN", icon: "fa-brands fa-hacker-news" },
  { id: "spaces", label: "AI demos to try", icon: "fa-solid fa-face-smile-beam" },
  { id: "github", label: "New on GitHub", icon: "fa-brands fa-github" },
];

const ShowCard = ({ story, index, now }) => (
  <a className="uv-card lp-show" href={story.url} target="_blank" rel="noopener noreferrer" style={{ "--i": index }}>
    <span className="lp-points">
      <i className="fa-solid fa-caret-up" aria-hidden="true" />
      {story.points}
    </span>
    <div className="lp-show-body">
      <strong>{story.title}</strong>
      <div className="uv-meta">
        <span>{story.domain}</span>
        <span>
          <i className="fa-regular fa-comment" aria-hidden="true" /> {story.comments}
        </span>
        <span>by {story.author}</span>
        <time dateTime={story.date}>{timeAgo(story.date, now)}</time>
      </div>
    </div>
  </a>
);

const SpaceCard = ({ space, index }) => (
  <a className="uv-card lp-space" href={space.url} target="_blank" rel="noopener noreferrer" style={{ "--i": index }}>
    <span
      className="lp-space-art"
      style={{ "--a": HF_HUES[space.from] ?? 240, "--b": HF_HUES[space.to] ?? 330 }}
      aria-hidden="true"
    >
      {space.emoji}
    </span>
    <strong className="uv-clamp-2">{space.title}</strong>
    <span className="lp-space-author">{space.author}</span>
    <div className="lp-space-tags">
      {space.sdk && <span className="uv-tag uv-tag--muted">{space.sdk}</span>}
      {space.mcp && <span className="uv-tag">MCP server</span>}
      <span className="lp-likes">
        <i className="fa-solid fa-heart" aria-hidden="true" /> {compact(space.likes)}
      </span>
    </div>
  </a>
);

const RepoCard = ({ repo, index, now }) => (
  <a className="uv-card lp-repo" href={repo.url} target="_blank" rel="noopener noreferrer" style={{ "--i": index }}>
    <div className="lp-repo-head">
      {repo.avatar && <img src={repo.avatar} alt="" width="32" height="32" loading="lazy" />}
      <strong>{repo.name}</strong>
    </div>
    <p className="uv-clamp-3">{repo.description || "No description yet."}</p>
    <div className="uv-meta">
      {repo.language && (
        <span>
          <i className="lp-lang" style={{ background: languageColor(repo.language) }} /> {repo.language}
        </span>
      )}
      <span>
        <i className="fa-solid fa-star" aria-hidden="true" /> {compact(repo.stars)}
      </span>
      <span>
        <i className="fa-solid fa-code-fork" aria-hidden="true" /> {compact(repo.forks)}
      </span>
      <span>born {timeAgo(repo.createdAt, now)}</span>
    </div>
  </a>
);

export default function Launchpad({ now }) {
  const [lane, setLane] = useState("hn");
  const show = useFeed("launch:showhn", fetchShowHN, { ttl: 15 * 60 * 1000 });
  const spaces = useFeed("launch:spaces", fetchTrendingSpaces, { ttl: 30 * 60 * 1000 });
  const repos = useFeed("launch:github", () => fetchRisingRepos(), { ttl: 30 * 60 * 1000 });

  const hero = show.data && show.data[0];
  const feed = { hn: show, spaces, github: repos }[lane];
  const total = (show.data || []).length + (spaces.data || []).length + (repos.data || []).length;

  return (
    <div className="lp">
      <PageHead kicker="Launchpad · this week" title="Fresh *launches* from the dev world" aside={<Sync feed={feed} now={now} />}>
        Side projects posted to Show HN, AI demos you can try in the browser, and the fastest-growing brand-new repos on GitHub.
        {total > 0 && ` ${total} launches on the radar right now.`}
      </PageHead>

      {hero && (
        <a className="lp-hero" href={hero.url} target="_blank" rel="noopener noreferrer">
          <span className="lp-hero-badge">
            <i className="fa-solid fa-trophy" aria-hidden="true" /> Launch of the week
          </span>
          <strong>{hero.title}</strong>
          <span className="uv-meta">
            <span>
              <i className="fa-solid fa-caret-up" aria-hidden="true" /> {hero.points} points
            </span>
            <span>
              <i className="fa-regular fa-comment" aria-hidden="true" /> {hero.comments} comments
            </span>
            <span>{hero.domain}</span>
            <span>by {hero.author}</span>
          </span>
          <span className="lp-hero-rocket" aria-hidden="true">
            <i className="fa-solid fa-rocket" />
          </span>
        </a>
      )}

      <div className="uv-toolbar">
        <Chips
          items={LANES.map((item) => ({
            ...item,
            count: ({ hn: show, spaces, github: repos }[item.id].data || []).length || null,
          }))}
          value={lane}
          onChange={setLane}
          label="Launch source"
        />
      </div>

      {!feed.data && !feed.error ? (
        <Skeletons count={9} />
      ) : (
        <FeedState feed={feed}>
          <div className={`uv-grid lp-grid lp-grid--${lane}`} key={lane}>
            {lane === "hn" && (show.data || []).slice(1).map((story, index) => <ShowCard key={story.id} story={story} index={index} now={now} />)}
            {lane === "spaces" && (spaces.data || []).map((space, index) => <SpaceCard key={space.id} space={space} index={index} />)}
            {lane === "github" && (repos.data || []).map((repo, index) => <RepoCard key={repo.id} repo={repo} index={index} now={now} />)}
          </div>
        </FeedState>
      )}
      <p className="lp-credit">Data: Hacker News (Algolia), Hugging Face Spaces API, GitHub Search. Nothing is paid placement.</p>
    </div>
  );
}
