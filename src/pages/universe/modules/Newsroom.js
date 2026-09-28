import React, { useMemo, useState } from "react";
import { fetchDevArticles, fetchHNTopic, fetchRisingRepos } from "../../../services/universe/sources";
import { timeAgo } from "../../../services/github/githubData";
import { Chips, FeedState, PageHead, SectionTitle, Skeletons, Sync, compact } from "../lib/kit";
import { useFeed, useLocalState } from "../lib/useFeed";
import "./Newsroom.css";

const TOPICS = [
  { id: "all", label: "Everything", hn: "", dev: "", gh: "" },
  { id: "ai", label: "AI & Agents", hn: "AI", dev: "ai", gh: "ai" },
  { id: "testing", label: "Testing & QA", hn: "testing", dev: "testing", gh: "testing" },
  { id: "devops", label: "DevOps & Cloud", hn: "kubernetes", dev: "devops", gh: "devops" },
  { id: "security", label: "Security", hn: "security", dev: "security", gh: "security" },
  { id: "web", label: "Web & JS", hn: "javascript", dev: "javascript", gh: "javascript" },
  { id: "rust", label: "Rust & Go", hn: "rust", dev: "rust", gh: "rust" },
];

const SOURCES = [
  { id: "mix", label: "All sources", icon: "fa-solid fa-layer-group" },
  { id: "hn", label: "Hacker News", icon: "fa-brands fa-hacker-news" },
  { id: "devto", label: "DEV", icon: "fa-brands fa-dev" },
  { id: "github", label: "GitHub rising", icon: "fa-brands fa-github" },
  { id: "saved", label: "Read later", icon: "fa-solid fa-bookmark" },
];

const SOURCE_META = {
  hn: { label: "HN", icon: "fa-brands fa-hacker-news", score: "points" },
  devto: { label: "DEV", icon: "fa-brands fa-dev", score: "reactions" },
  github: { label: "GitHub", icon: "fa-brands fa-github", score: "stars" },
};

const STOP = new Set(
  "never ever always every everything nothing something anything thing things break breaks broke writing write writes wrote read reads post posts world local global different same other another real simple better good great bad worst free open part lesson lessons story stories hard easy small big large old long short high low right wrong fast slow need needs want wants know look looks like likes work works working worked people team teams company companies life today tomorrow yesterday again back next first last going doing done getting making taking finally actually really still without within between through across against around among during until since while where there here them then than those these whose what which your yours ours mine should could would might must shall may one two three four five ten hundred thousand million billion inside outside behind beyond under over above below into onto upon about after before because though although however instead rather almost quite enough such each both either neither most many much more less least few several own same way ways thoughts thinking think thought try trying tried says said say tell tells called call calls stop start started starting end ends ended guide tips tricks intro introduction introducing announcing launch launched release released update updated version versions review reviews case study how-to howto vs versus via using use uses used make makes made get gets got show shows ask asks the a an and or but of to in on for with from by at as is are was were be been it its this that these those your you we our i my me how why what when who which vs via into over under about after before new now just than then more most less can will not no yes all any use using used make makes made get gets show ask tell hn dev one two three first last best top way ways do does did out up off own own also only even still very really here there their them they his her he she has have had via year years day days week weeks time guide part learn learning build building built".split(
    " "
  )
);

const interleave = (lists) => {
  const out = [];
  const max = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < max; i += 1) lists.forEach((list) => list[i] && out.push(list[i]));
  return out;
};

/** Word frequency across the current headlines: what the industry is talking about right now. */
const buzzwords = (stories) => {
  const counts = {};
  stories.forEach((story) => {
    const seen = new Set();
    (story.title || "")
      .replace(/[“”"'’()[\]:,.!?|/]/g, " ")
      .split(/\s+/)
      .forEach((raw) => {
        const word = raw.trim();
        const key = word.toLowerCase();
        if (key.length < 3 || STOP.has(key) || /^\d+$/.test(key) || seen.has(key)) return;
        seen.add(key);
        if (!counts[key]) counts[key] = { word, count: 0 };
        counts[key].count += 1;
        // Prefer the capitalised spelling (e.g. "OpenAI" over "openai").
        if (/[A-Z]/.test(word) && !/[A-Z]/.test(counts[key].word)) counts[key].word = word;
      });
  });
  return Object.values(counts)
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 28);
};

const StoryCard = ({ story, rank, now, saved, onSave, lead }) => {
  const meta = SOURCE_META[story.source];
  return (
    <article className={`nw-story ${lead ? "nw-story--lead" : ""}`} style={{ "--i": Math.min(rank, 12) }}>
      {lead && (
        <div className={`nw-lead-art ${story.cover ? "" : "nw-lead-art--mesh"}`} style={story.cover ? { backgroundImage: `url(${story.cover})` } : undefined}>
          {!story.cover && <i className={meta.icon} aria-hidden="true" />}
        </div>
      )}
      <div className="nw-story-body">
        <span className="nw-rank">{String(rank + 1).padStart(2, "0")}</span>
        <div className="nw-story-main">
          <a href={story.url} target="_blank" rel="noopener noreferrer" className="nw-title">
            {story.title}
          </a>
          {story.summary && (lead || story.source === "github") && <p className="nw-summary uv-clamp-2">{story.summary}</p>}
          <div className="uv-meta">
            <span className={`nw-src nw-src--${story.source}`}>
              <i className={meta.icon} aria-hidden="true" /> {meta.label}
            </span>
            <span>{story.domain}</span>
            <span title={meta.score}>
              <i className={story.source === "github" ? "fa-solid fa-star" : "fa-solid fa-arrow-up"} aria-hidden="true" />{" "}
              {compact(story.points)}
            </span>
            {story.source !== "github" && (
              <a href={story.discussion} target="_blank" rel="noopener noreferrer" title="Discussion">
                <i className="fa-regular fa-comment" aria-hidden="true" /> {compact(story.comments)}
              </a>
            )}
            {story.readMinutes && <span>{story.readMinutes} min read</span>}
            <time dateTime={story.date}>{timeAgo(story.date, now)}</time>
          </div>
        </div>
        <button
          type="button"
          className={`nw-save ${saved ? "is-saved" : ""}`}
          onClick={() => onSave(story)}
          aria-label={saved ? "Remove from read later" : "Save for later"}
          aria-pressed={saved}
        >
          <i className={saved ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};

export default function Newsroom({ now }) {
  const [source, setSource] = useState("mix");
  const [topicId, setTopicId] = useState("all");
  const [word, setWord] = useState(null);
  const [saved, setSaved] = useLocalState("news:saved", []);
  const topic = TOPICS.find((item) => item.id === topicId);

  const wantHN = source === "mix" || source === "hn";
  const wantDev = source === "mix" || source === "devto";
  const wantGh = source === "github";

  const hn = useFeed(wantHN ? `news:hn:${topic.hn}` : null, () => fetchHNTopic(topic.hn), { ttl: 10 * 60 * 1000, refreshMs: 10 * 60 * 1000 });
  const dev = useFeed(wantDev ? `news:dev:${topic.dev}` : null, () => fetchDevArticles(topic.dev), { ttl: 15 * 60 * 1000 });
  const gh = useFeed(wantGh ? `news:gh:${topic.gh}` : null, () => fetchRisingRepos(topic.gh), { ttl: 30 * 60 * 1000 });

  const feeds = [wantHN && hn, wantDev && dev, wantGh && gh].filter(Boolean);
  const primary = feeds[0] || hn;
  const combined = {
    data: source === "saved" ? saved : feeds.some((feed) => feed.data) ? interleave(feeds.map((feed) => feed.data || [])) : null,
    error: feeds.every((feed) => feed.error) ? feeds[0] && feeds[0].error : null,
    loading: feeds.some((feed) => feed.loading),
    syncedAt: Math.max(0, ...feeds.map((feed) => feed.syncedAt || 0)) || null,
    reload: () => feeds.forEach((feed) => feed.reload()),
  };

  const stories = useMemo(() => {
    const list = combined.data || [];
    if (!word) return list;
    const needle = word.toLowerCase();
    return list.filter((story) => story.title.toLowerCase().includes(needle));
  }, [combined.data, word]);

  const cloud = useMemo(() => buzzwords(combined.data || []), [combined.data]);
  const discussed = useMemo(
    () => [...(combined.data || [])].filter((story) => story.source !== "github").sort((a, b) => b.comments - a.comments).slice(0, 5),
    [combined.data]
  );
  const savedIds = new Set(saved.map((story) => story.id));
  const toggleSave = (story) =>
    setSaved((list) => (list.some((item) => item.id === story.id) ? list.filter((item) => item.id !== story.id) : [story, ...list].slice(0, 60)));

  const maxCount = cloud[0] ? cloud[0].count : 1;

  return (
    <div className="nw">
      <PageHead
        kicker="Newsroom · live"
        title="What the tech world is *talking about*"
        aside={source !== "saved" && <Sync feed={combined} now={now} />}
      >
        Headlines from Hacker News, DEV Community and GitHub's fastest-rising new repositories, merged into one feed.
        Click a word in the buzzword radar to filter the stories.
      </PageHead>

      <div className="nw-controls">
        <Chips items={SOURCES.map((item) => (item.id === "saved" ? { ...item, count: saved.length } : item))} value={source} onChange={(id) => { setSource(id); setWord(null); }} label="Source" />
        {source !== "saved" && <Chips items={TOPICS} value={topicId} onChange={(id) => { setTopicId(id); setWord(null); }} label="Topic" />}
      </div>

      <div className="nw-layout">
        <div className="nw-feed">
          {word && (
            <div className="nw-filter">
              Showing stories mentioning <b>{word}</b>
              <button type="button" onClick={() => setWord(null)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" /> clear
              </button>
            </div>
          )}
          {source === "saved" && !saved.length ? (
            <div className="uv-state">
              <i className="fa-regular fa-bookmark" aria-hidden="true" />
              <p>Nothing saved yet. Tap the bookmark on any story to keep it here. It stays in this browser.</p>
            </div>
          ) : !combined.data && !combined.error ? (
            <Skeletons count={6} variant="row" />
          ) : (
            <FeedState feed={combined} empty="No stories for this topic right now. Try another one.">
              <div className="nw-list">
                {stories.map((story, index) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    rank={index}
                    now={now}
                    lead={index === 0 && !word && source !== "saved"}
                    saved={savedIds.has(story.id)}
                    onSave={toggleSave}
                  />
                ))}
              </div>
            </FeedState>
          )}
        </div>

        <aside className="nw-side">
          <section className="uv-panel">
            <SectionTitle icon="fa-solid fa-crosshairs" title="Buzzword radar" meta={`${cloud.length} terms`} />
            {cloud.length ? (
              <div className="nw-cloud">
                {cloud.map((item, index) => (
                  <button
                    key={item.word}
                    type="button"
                    className={word === item.word ? "is-active" : ""}
                    style={{ "--s": 0.78 + (item.count / maxCount) * 0.9, "--i": index }}
                    onClick={() => setWord(word === item.word ? null : item.word)}
                    title={`${item.count} headlines`}
                  >
                    {item.word}
                  </button>
                ))}
              </div>
            ) : (
              <p className="nw-side-note">Terms appear once headlines load.</p>
            )}
          </section>

          {discussed.length > 0 && (
            <section className="uv-panel">
              <SectionTitle icon="fa-solid fa-comments" title="Most discussed" />
              <ol className="nw-discussed">
                {discussed.map((story) => (
                  <li key={story.id}>
                    <a href={story.discussion} target="_blank" rel="noopener noreferrer">
                      {story.title}
                    </a>
                    <span>{compact(story.comments)} comments</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="nw-credit">
            Data: Hacker News via Algolia, DEV Community API and GitHub Search. Stories refresh every 10 minutes while this tab is open.
            {primary && primary.error ? ` Last error: ${primary.error}.` : ""}
          </p>
        </aside>
      </div>
    </div>
  );
}
