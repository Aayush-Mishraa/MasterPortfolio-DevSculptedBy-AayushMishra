import React, { useMemo, useState } from "react";
import { fetchDailyPapers } from "../../../services/universe/sources";
import { FeedState, PageHead, Skeletons, Sync, compact } from "../lib/kit";
import { useFeed, useLocalState } from "../lib/useFeed";
import "./PaperRadar.css";

const iso = (date) => date.toISOString().slice(0, 10);
const shift = (day, delta) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return iso(date);
};
const pretty = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

const PaperCard = ({ paper, index, saved, onSave, open, onToggle }) => (
  <article className="uv-card pp-card" style={{ "--i": index }}>
    {paper.thumbnail && (
      <a href={paper.url} target="_blank" rel="noopener noreferrer" className="pp-thumb">
        <img src={paper.thumbnail} alt="" loading="lazy" />
      </a>
    )}
    <div className="pp-top">
      <span className="pp-votes" title="Upvotes on Hugging Face">
        <i className="fa-solid fa-caret-up" aria-hidden="true" />
        {paper.upvotes}
      </span>
      <div className="pp-titles">
        <a href={paper.url} target="_blank" rel="noopener noreferrer" className="pp-title">
          {paper.title}
        </a>
        <span className="pp-authors">
          {paper.org ? `${paper.org} · ` : ""}
          {paper.authors.slice(0, 3).join(", ")}
          {paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ""}
        </span>
      </div>
      <button type="button" className={`pp-save ${saved ? "is-saved" : ""}`} onClick={() => onSave(paper)} aria-pressed={saved} aria-label={saved ? "Remove from reading list" : "Add to reading list"}>
        <i className={saved ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"} aria-hidden="true" />
      </button>
    </div>
    <p className={open ? "pp-summary" : "pp-summary uv-clamp-3"}>{open && paper.abstract ? paper.abstract : paper.summary}</p>
    {paper.abstract && paper.abstract !== paper.summary && (
      <button type="button" className="pp-more" onClick={onToggle}>
        {open ? "Show short summary" : "Read the abstract"}
      </button>
    )}
    {paper.keywords.length > 0 && (
      <div className="pp-keywords">
        {paper.keywords.slice(0, 4).map((keyword) => (
          <span key={keyword} className="uv-tag uv-tag--muted">
            {keyword}
          </span>
        ))}
      </div>
    )}
    <div className="pp-links">
      <a href={paper.arxiv} target="_blank" rel="noopener noreferrer">
        <i className="fa-solid fa-building-columns" aria-hidden="true" /> arXiv
      </a>
      <a href={paper.pdf} target="_blank" rel="noopener noreferrer">
        <i className="fa-regular fa-file-pdf" aria-hidden="true" /> PDF
      </a>
      {paper.github && (
        <a href={paper.github} target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-github" aria-hidden="true" /> Code{paper.stars ? ` · ★ ${compact(paper.stars)}` : ""}
        </a>
      )}
      <a href={paper.url} target="_blank" rel="noopener noreferrer">
        <i className="fa-regular fa-comments" aria-hidden="true" /> {paper.comments} on HF
      </a>
    </div>
  </article>
);

export default function PaperRadar({ now }) {
  const today = iso(new Date());
  const [day, setDay] = useState(null); // null = latest batch
  const [query, setQuery] = useState("");
  const [view, setView] = useState("day");
  const [saved, setSaved] = useLocalState("papers:saved", []);
  const [open, setOpen] = useState(null);

  const feed = useFeed(`papers:${day || "latest"}`, () => fetchDailyPapers(day), { ttl: day ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000 });
  const shownDay = day || (feed.data && feed.data[0] && feed.data[0].date ? feed.data[0].date.slice(0, 10) : today);

  const papers = useMemo(() => {
    const source = view === "saved" ? saved : feed.data || [];
    const needle = query.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((paper) =>
      [paper.title, paper.summary, paper.keywords.join(" "), paper.authors.join(" ")].join(" ").toLowerCase().includes(needle)
    );
  }, [feed.data, saved, query, view]);

  const savedIds = new Set(saved.map((paper) => paper.id));
  const toggleSave = (paper) =>
    setSaved((list) => (list.some((item) => item.id === paper.id) ? list.filter((item) => item.id !== paper.id) : [paper, ...list].slice(0, 80)));

  const topics = useMemo(() => {
    const counts = {};
    (feed.data || []).forEach((paper) => paper.keywords.forEach((keyword) => (counts[keyword] = (counts[keyword] || 0) + 1)));
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [feed.data]);

  return (
    <div className="pp">
      <PageHead kicker="Paper Radar · daily" title="AI research, *ranked by the community*" aside={<Sync feed={feed} now={now} />}>
        Every day researchers upvote the most interesting new papers on Hugging Face. Browse any day, read the short
        summary, then go to the arXiv abstract, PDF or code.
      </PageHead>

      <div className="pp-bar">
        <div className="pp-days" role="group" aria-label="Day">
          <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => { setView("day"); setDay(shift(shownDay, -1)); }} aria-label="Previous day">
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>
          <span className="pp-day">
            <i className="fa-regular fa-calendar" aria-hidden="true" /> {view === "saved" ? "Reading list" : pretty(shownDay)}
          </span>
          <button
            type="button"
            className="uv-btn uv-btn--ghost uv-btn--sm"
            onClick={() => { setView("day"); setDay(shift(shownDay, 1)); }}
            disabled={shownDay >= today}
            aria-label="Next day"
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
          {(day || view === "saved") && (
            <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => { setView("day"); setDay(null); }}>
              Latest
            </button>
          )}
          <button type="button" className={`uv-btn uv-btn--sm ${view === "saved" ? "uv-btn--primary" : "uv-btn--ghost"}`} onClick={() => setView(view === "saved" ? "day" : "saved")}>
            <i className="fa-solid fa-bookmark" aria-hidden="true" /> Saved {saved.length ? `(${saved.length})` : ""}
          </button>
        </div>
        <label className="uv-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input className="uv-input" type="search" value={query} placeholder="Filter by keyword, author or topic…" onChange={(event) => setQuery(event.target.value)} aria-label="Filter papers" />
        </label>
      </div>

      {view === "day" && topics.length > 0 && (
        <div className="pp-topics">
          <span>Hot topics today:</span>
          {topics.map(([keyword, count]) => (
            <button key={keyword} type="button" onClick={() => setQuery(keyword)} className={query === keyword ? "is-active" : ""}>
              {keyword} <em>{count}</em>
            </button>
          ))}
        </div>
      )}

      {view === "saved" && !saved.length ? (
        <div className="uv-state">
          <i className="fa-regular fa-bookmark" aria-hidden="true" />
          <p>Your reading list is empty. Bookmark papers to read them later. They stay in this browser.</p>
        </div>
      ) : view === "day" && !feed.data && !feed.error ? (
        <Skeletons count={6} />
      ) : (
        <FeedState feed={view === "saved" ? { data: saved } : feed} empty="No papers were featured on this day. Weekends are usually quiet, so try a weekday.">
          {papers.length ? (
            <div className="pp-grid" key={`${view}-${day}`}>
              {papers.map((paper, index) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  index={index}
                  saved={savedIds.has(paper.id)}
                  onSave={toggleSave}
                  open={open === paper.id}
                  onToggle={() => setOpen(open === paper.id ? null : paper.id)}
                />
              ))}
            </div>
          ) : (
            <div className="uv-state">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <p>No papers match “{query}”.</p>
            </div>
          )}
        </FeedState>
      )}
      <p className="pp-credit">Data: Hugging Face Daily Papers API. Papers link to arXiv, the open-access preprint archive.</p>
    </div>
  );
}
