import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { greeting } from "../../portfolio.js";
import {
  CATEGORIES,
  GITHUB_USERNAME,
  aggregateStats,
  categoryById,
  formatDate,
  isInternalCommit,
  loadSnapshot,
  mergeRepos,
  searchScore,
  timeAgo,
} from "../../services/github/githubData";
import { snapshotIndex } from "../../services/github/snapshotStore";
import { AreaChart, BarList, Donut, Heatmap, PunchCard, Radar } from "./components/Charts";
import RepoCard from "./components/RepoCard";
import SyncPill from "./components/SyncPill";
import { themeVars, useCountUp, useInView, useNow, useOffScreenClass } from "./lib/ui";
import useReloadScroll from "./lib/useReloadScroll";
import "./ProjectsPage.css";

const SORTS = [
  { id: "recent", label: "Recently pushed" },
  { id: "signal", label: "Most notable" },
  { id: "commits", label: "Most commits" },
  { id: "stars", label: "Most stars" },
  { id: "created", label: "Newest" },
  { id: "name", label: "A → Z" },
];

/* ------------------------------------------------------------------ */
/* Data hook                                                           */
/* ------------------------------------------------------------------ */

// Everything comes from the build-time snapshot (F07). It is usually loaded
// before the first render (src/index.js), so the page renders complete.
const useGithubPortfolio = () => {
  const [snapshot, setSnapshot] = useState(snapshotIndex);

  useEffect(() => {
    if (snapshot) return undefined;
    let alive = true;
    loadSnapshot().then((data) => {
      if (alive) setSnapshot(data || null);
    });
    return () => {
      alive = false;
    };
  }, [snapshot]);

  const repos = useMemo(() => mergeRepos(snapshot ? snapshot.repos : []), [snapshot]);
  const contributionData = (snapshot && snapshot.contributions) || null;
  const stats = useMemo(() => aggregateStats(repos, contributionData), [repos, contributionData]);
  const allCommitDates = useMemo(() => repos.filter((repo) => !repo.fork).flatMap((repo) => repo.commitDates), [repos]);
  // The latest real work, housekeeping left out (older snapshots: each repo's last commit).
  const stream = useMemo(() => {
    if (!snapshot) return null;
    const commits = snapshot.recentCommits
      ? snapshot.recentCommits
      : snapshot.repos.filter((repo) => repo.snapshot && repo.snapshot.lastCommit).map((repo) => ({ ...repo.snapshot.lastCommit, repo: repo.name }));
    return commits
      .filter((commit) => !isInternalCommit(commit.message))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 12);
  }, [snapshot]);
  const status =
    snapshot === undefined
      ? { state: "loading", syncedAt: null }
      : snapshot === null
      ? { state: "error", syncedAt: null }
      : { state: "snapshot", syncedAt: new Date(snapshot.generatedAt).getTime() };

  return { repos, stats, contributionData, stream, status, snapshot, allCommitDates };
};

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const Kpi = ({ label, value, suffix = "", caption, icon, start, decimals = 0 }) => {
  const shown = useCountUp(value || 0, start);
  return (
    <div className="pj-kpi">
      <span className="pj-kpi-icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <strong className="pj-kpi-value">
        {/* null while the data loads: a dash, never a fake 0 */}
        {value == null ? "—" : shown.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        {value != null && <small>{suffix}</small>}
      </strong>
      <span className="pj-kpi-label">{label}</span>
      {caption && <span className="pj-kpi-caption">{caption}</span>}
    </div>
  );
};

const SectionHead = ({ kicker, title, children, aside }) => (
  <header className="pj-section-head">
    <div>
      <span className="pj-kicker">{kicker}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
    {aside}
  </header>
);

const Panel = ({ title, meta, children, className = "", inView }) => (
  <section className={`pj-panel ${inView ? "is-in" : ""} ${className}`}>
    <header className="pj-panel-head">
      <h3>{title}</h3>
      {meta && <span className="pj-panel-meta">{meta}</span>}
    </header>
    {children}
  </section>
);

const CommitStream = ({ commits, now }) => {
  if (!commits) return <div className="pj-skeleton-list" aria-busy="true">{[0, 1, 2, 3].map((i) => <span key={i} />)}</div>;
  if (!commits.length) return <p className="pj-empty-note">No recent commits found.</p>;
  return (
    <ol className="pj-stream">
      {commits.map((commit, index) => (
        <li key={commit.sha} style={{ "--i": index }}>
          <span className="pj-stream-node" aria-hidden="true" />
          <div className="pj-stream-body">
            <Link to={`/projects/${encodeURIComponent(commit.repo)}#commits`} className="pj-stream-msg">
              {commit.message.split("\n")[0]}
            </Link>
            <span className="pj-stream-meta">
              <code>{commit.sha.slice(0, 7)}</code>
              <span>{commit.repo}</span>
              <time dateTime={commit.date}>{timeAgo(commit.date, now)}</time>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const readQuery = (search) => {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") || "",
    cat: params.get("cat") || "all",
    lang: params.get("lang") || "all",
    sort: params.get("sort") || "recent",
    forks: params.get("forks") !== "0",
    view: params.get("view") || "grid",
  };
};

export default function ProjectsPage({ theme }) {
  const history = useHistory();
  const location = useLocation();
  const now = useNow(30000);
  const { dark, style } = useMemo(() => themeVars(theme), [theme]);
  const { repos, stats, contributionData, stream, status, allCommitDates } = useGithubPortfolio();
  const [filters, setFilters] = useState(() => readQuery(location.search));
  const [copied, setCopied] = useState(false);
  const searchRef = useRef(null);
  // pauses the hero's decorations while it's scrolled away, without
  // re-rendering this whole page each time it crosses the viewport
  const heroRef = useOffScreenClass();
  const [kpiRef, kpiIn] = useInView();
  const [featRef, featIn] = useInView();
  const [telRef, telIn] = useInView({ threshold: 0.05 });
  const [briefRef, briefIn] = useInView();


  // Keep filters shareable through the URL.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.cat !== "all") params.set("cat", filters.cat);
    if (filters.lang !== "all") params.set("lang", filters.lang);
    if (filters.sort !== "recent") params.set("sort", filters.sort);
    if (!filters.forks) params.set("forks", "0");
    if (filters.view !== "grid") params.set("view", filters.view);
    const search = params.toString();
    if (`?${search}` !== location.search && !(search === "" && location.search === "")) {
      history.replace({ pathname: location.pathname, search: search ? `?${search}` : "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // "/" focuses search, Esc clears it.
  useEffect(() => {
    const onKey = (event) => {
      const typing = /input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        if (searchRef.current) {
          searchRef.current.focus();
          searchRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const update = (patch) => setFilters((previous) => ({ ...previous, ...patch }));

  const languageOptions = useMemo(() => {
    const counts = {};
    repos.forEach((repo) => repo.language && (counts[repo.language] = (counts[repo.language] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [repos]);

  const results = useMemo(() => {
    const scored = repos
      .filter((repo) => filters.forks || !repo.fork)
      .filter((repo) => filters.cat === "all" || repo.category === filters.cat)
      .filter((repo) => filters.lang === "all" || repo.languages.some((language) => language.name === filters.lang))
      .map((repo) => ({ repo, score: searchScore(repo, filters.q) }))
      .filter(({ score }) => score > 0);
    const by = {
      recent: (a, b) => (a.repo.pushedAt < b.repo.pushedAt ? 1 : -1),
      signal: (a, b) => b.repo.signal - a.repo.signal,
      commits: (a, b) => b.repo.commitTotal - a.repo.commitTotal,
      stars: (a, b) => b.repo.stars - a.repo.stars || (a.repo.pushedAt < b.repo.pushedAt ? 1 : -1),
      created: (a, b) => (a.repo.createdAt < b.repo.createdAt ? 1 : -1),
      name: (a, b) => a.repo.title.localeCompare(b.repo.title),
    }[filters.sort];
    scored.sort((a, b) => (filters.q ? b.score - a.score || by(a, b) : by(a, b)));
    return scored.map(({ repo }) => repo);
  }, [repos, filters]);

  const featured = useMemo(() => [...repos].filter((repo) => !repo.fork).sort((a, b) => b.signal - a.signal).slice(0, 3), [repos]);
  const hottest = useMemo(
    () =>
      [...repos]
        .filter((repo) => !repo.fork && repo.commitTotal > 0)
        .sort((a, b) => b.commitTotal - a.commitTotal)
        .slice(0, 7)
        .map((repo) => ({ key: repo.name, label: repo.title, value: repo.commitTotal, color: repo.languages[0]?.color })),
    [repos]
  );
  const monthly = stats.monthly.slice(-12);
  const days = contributionData?.contributions || [];
  const loading = !repos.length;
  // A refresh returns to the old position once the repositories have rendered
  useReloadScroll(!loading && status.state !== "loading");

  const peakHour = useMemo(() => {
    const hours = new Array(24).fill(0);
    allCommitDates.forEach((iso) => (hours[new Date(iso).getHours()] += 1));
    const max = Math.max(...hours);
    if (!max) return null;
    const hour = hours.indexOf(max);
    const fmt = (h) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
    return `${fmt(hour)}–${fmt((hour + 1) % 24)}`;
  }, [allCommitDates]);

  const topSkills = stats.topics.slice(0, 10).map((topic) => topic.name);

  const copySummary = () => {
    const text = [
      `Aayush Mishra — ${greeting.nickname.replace(/[^\w\s&-]/g, "").trim()}`,
      `${stats.ownCount} public repositories · ${stats.commits.toLocaleString()} commits · ${stats.contributions.toLocaleString()} GitHub contributions in the last year · ${stats.streaks.current}-day active streak`,
      `Stack: ${stats.languages.slice(0, 5).map((language) => language.name).join(", ")}`,
      topSkills.length ? `Focus: ${topSkills.join(", ")}` : "",
      `Top projects: ${featured.map((repo) => `${repo.title} (${repo.url})`).join("; ")}`,
      `Portfolio: ${window.location.origin}/projects · GitHub: ${greeting.githubProfile}`,
    ]
      .filter(Boolean)
      .join("\n");
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {});
  };

  return (
    <div className={`pj-root ${dark ? "pj-dark" : ""}`} style={style}>
      <Header theme={theme} />
      <div className="pj-backdrop" aria-hidden="true">
        <div className="pj-backdrop-grid" />
        <div className="pj-backdrop-orb pj-backdrop-orb--a" />
        <div className="pj-backdrop-orb pj-backdrop-orb--b" />
      </div>

      <main className="pj-main">
        {/* ------------------------------- HERO ------------------------------- */}
        <section className="pj-hero" ref={heroRef}>
          <div className="pj-hero-copy">
            <SyncPill status={status} now={now} />
            <span className="pj-kicker pj-kicker--hero">Projects · Live engineering log</span>
            <h1 className="pj-hero-title">
              <span className="pj-reveal" style={{ "--d": "0ms" }}>Quality engineering,</span>
              <span className="pj-reveal pj-gradient-text" style={{ "--d": "120ms" }}>shipped in public.</span>
            </h1>
            <p className="pj-hero-sub pj-reveal" style={{ "--d": "240ms" }}>
              Test frameworks, API suites and AI-driven agents — {loading ? "every repository" : `${stats.ownCount} repositories`} synced
              from GitHub several times a day. No screenshots, no stale lists.
            </p>
            <div className="pj-hero-actions pj-reveal" style={{ "--d": "360ms" }}>
              <Link to="/contact" className="pj-btn pj-btn--primary">
                Start a conversation <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <a href="#explorer" className="pj-btn pj-btn--ghost">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Browse all projects
              </a>
              <a href={greeting.resumeLink} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn--link">
                Résumé <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
              </a>
            </div>
            <dl className="pj-hero-facts pj-reveal" style={{ "--d": "480ms" }}>
              <div>
                <dt>Last push</dt>
                <dd>{stats.lastPush ? timeAgo(stats.lastPush, now) : "—"}</dd>
              </div>
              <div>
                <dt>Active streak</dt>
                <dd>{stats.streaks.current} days</dd>
              </div>
              <div>
                <dt>Main stack</dt>
                <dd>{stats.languages.slice(0, 3).map((language) => language.name).join(" · ") || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="pj-hero-visual pj-reveal" style={{ "--d": "200ms" }}>
            <div className="pj-radar-frame">
              <span className="pj-radar-caption">
                <i className="fa-solid fa-satellite-dish" aria-hidden="true" /> Repo radar — closer to the centre = pushed more recently
              </span>
              {loading ? (
                <div className="pj-radar-skeleton" />
              ) : (
                <Radar repos={repos} categories={CATEGORIES} now={now} onSelect={(repo) => history.push(`/projects/${encodeURIComponent(repo.name)}`)} />
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------- KPIs ------------------------------- */}
        <section className="pj-kpis" ref={kpiRef} aria-label="GitHub metrics">
          <Kpi label="Repositories" value={loading ? null : stats.ownCount} start={kpiIn} icon="fa-solid fa-cubes" caption={`${stats.forkCount} forks not counted`} />
          <Kpi label="Commits" value={loading ? null : stats.commits} start={kpiIn} icon="fa-solid fa-code-commit" caption="across my own repos" />
          <Kpi label="Contributions" value={loading ? null : stats.contributions} start={kpiIn} icon="fa-solid fa-chart-simple" caption="last 12 months" />
          <Kpi label="Current streak" value={loading ? null : stats.streaks.current} suffix=" d" start={kpiIn} icon="fa-solid fa-fire" caption={`longest ${stats.streaks.longest} days`} />
          <Kpi label="Active days" value={loading ? null : stats.activeDays} start={kpiIn} icon="fa-solid fa-calendar-check" caption="of the last 365" />
          <Kpi label="Stars earned" value={loading ? null : stats.stars} start={kpiIn} icon="fa-solid fa-star" caption={`${stats.languages.length} languages in use`} />
        </section>

        {/* ----------------------------- FEATURED ----------------------------- */}
        <section className="pj-section" ref={featRef}>
          <SectionHead kicker="01 — Proof of work" title="Flagship projects">
            Picked automatically: well-documented, actively maintained, commit-heavy. The ranking changes as I ship.
          </SectionHead>
          <div className={`pj-featured ${featIn ? "is-in" : ""}`}>
            {loading
              ? [0, 1, 2].map((i) => <div key={i} className="pj-card pj-card--skeleton" />)
              : featured.map((repo, index) => <RepoCard key={repo.name} repo={repo} index={index} featured now={now} inView={featIn} />)}
          </div>
        </section>

        {/* ----------------------------- TELEMETRY ---------------------------- */}
        <section className="pj-section" ref={telRef}>
          <SectionHead kicker="02 — Telemetry" title="How I work, in numbers">
            Straight from GitHub, re-synced every six hours by a scheduled build.
          </SectionHead>
          <div className="pj-bento">
            <Panel
              className="pj-bento--heat"
              inView={telIn}
              title={`${stats.contributions.toLocaleString()} contributions in the last year`}
              meta={stats.busiestDay ? `Peak: ${stats.busiestDay.count} on ${formatDate(stats.busiestDay.date, { month: "short", day: "numeric" })}` : null}
            >
              {days.length ? <Heatmap days={days} inView={telIn} /> : <div className="pj-skeleton-block" />}
            </Panel>
            <Panel className="pj-bento--lang" inView={telIn} title="Language mix" meta="share of projects">
              {stats.languages.length ? (
                <Donut items={stats.languages} inView={telIn} valueFormat={(item) => `${item.percent.toFixed(0)}%`} />
              ) : (
                <div className="pj-skeleton-block" />
              )}
            </Panel>
            <Panel className="pj-bento--velocity" inView={telIn} title="Monthly velocity" meta="contributions / month">
              {monthly.length ? (
                <AreaChart
                  values={monthly.map((month) => month.count)}
                  labels={monthly.map((month) => formatDate(`${month.month}-01T00:00:00`, { month: "short", year: "2-digit" }))}
                  inView={telIn}
                  unit="contributions"
                  tickEvery={2}
                />
              ) : (
                <div className="pj-skeleton-block" />
              )}
            </Panel>
            <Panel
              className="pj-bento--stream"
              inView={telIn}
              title={
                <>
                  <span className="pj-live-dot">
                    <i />
                  </span>{" "}
                  Latest commits
                </>
              }
              meta="across all repos"
            >
              <CommitStream commits={stream} now={now} />
            </Panel>
            <Panel className="pj-bento--top" inView={telIn} title="Where the commits go" meta="all-time, per repo">
              <BarList items={hottest} inView={telIn} onSelect={(item) => history.push(`/projects/${encodeURIComponent(item.key)}`)} />
            </Panel>
            <Panel className="pj-bento--punch" inView={telIn} title="When I ship" meta={peakHour ? `peak hour ${peakHour}` : "commit times, your timezone"}>
              <PunchCard dates={allCommitDates} inView={telIn} />
            </Panel>
          </div>
        </section>

        {/* ----------------------------- EXPLORER ----------------------------- */}
        <section className="pj-section" id="explorer">
          <SectionHead
            kicker="03 — Every repository"
            title="Project explorer"
            aside={
              <div className="pj-view-toggle" role="group" aria-label="Layout">
                {[
                  ["grid", "fa-solid fa-grip"],
                  ["list", "fa-solid fa-list"],
                ].map(([id, icon]) => (
                  <button key={id} type="button" className={filters.view === id ? "is-active" : ""} onClick={() => update({ view: id })} aria-pressed={filters.view === id} aria-label={`${id} view`}>
                    <i className={icon} aria-hidden="true" />
                  </button>
                ))}
              </div>
            }
          >
            Search across names, descriptions, topics and languages. Filters are saved in the URL, so you can share a filtered view.
          </SectionHead>

          <div className="pj-toolbar">
            <label className="pj-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={filters.q}
                placeholder="Search projects — try “playwright”, “api”, “java”…"
                onChange={(event) => update({ q: event.target.value })}
                onKeyDown={(event) => event.key === "Escape" && update({ q: "" })}
                aria-label="Search projects"
              />
              {filters.q ? (
                <button type="button" className="pj-search-clear" onClick={() => update({ q: "" })} aria-label="Clear search">
                  <i className="fa-solid fa-xmark" />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </label>
            <div className="pj-selects">
              <label className="pj-select">
                <span>Language</span>
                <select value={filters.lang} onChange={(event) => update({ lang: event.target.value })}>
                  <option value="all">All languages</option>
                  {languageOptions.map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </label>
              <label className="pj-select">
                <span>Sort</span>
                <select value={filters.sort} onChange={(event) => update({ sort: event.target.value })}>
                  {SORTS.map((sort) => (
                    <option key={sort.id} value={sort.id}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pj-switch">
                <input type="checkbox" checked={filters.forks} onChange={(event) => update({ forks: event.target.checked })} />
                <span aria-hidden="true" />
                Forks
              </label>
            </div>
          </div>

          <div className="pj-chips" role="tablist" aria-label="Categories">
            <button type="button" role="tab" aria-selected={filters.cat === "all"} className={filters.cat === "all" ? "is-active" : ""} onClick={() => update({ cat: "all" })}>
              All <em>{repos.length}</em>
            </button>
            {CATEGORIES.filter((category) => stats.categoryCounts[category.id]).map((category) => (
              <button
                type="button"
                role="tab"
                key={category.id}
                aria-selected={filters.cat === category.id}
                className={filters.cat === category.id ? "is-active" : ""}
                onClick={() => update({ cat: category.id })}
              >
                <i className={category.icon} aria-hidden="true" /> {category.label} <em>{stats.categoryCounts[category.id]}</em>
              </button>
            ))}
          </div>

          <p className="pj-result-count" aria-live="polite">
            {loading
              ? "Loading repositories…"
              : `${results.length} of ${repos.length} projects${filters.q ? ` matching “${filters.q}”` : ""}${
                  filters.cat !== "all" ? ` in ${categoryById(filters.cat)?.label}` : ""
                }`}
          </p>

          {loading ? (
            <div className="pj-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="pj-card pj-card--skeleton" />
              ))}
            </div>
          ) : results.length ? (
            <div className={filters.view === "list" ? "pj-list" : "pj-grid"} key={`${filters.cat}-${filters.lang}-${filters.sort}-${filters.view}`}>
              {results.map((repo, index) => (
                <RepoCard key={repo.name} repo={repo} query={filters.q} view={filters.view} index={Math.min(index, 12)} now={now} />
              ))}
            </div>
          ) : (
            <div className="pj-empty">
              <i className="fa-solid fa-magnifying-glass-minus" aria-hidden="true" />
              <h3>Nothing matches that yet</h3>
              <p>Try a broader term, or reset the filters.</p>
              <button type="button" className="pj-btn pj-btn--ghost" onClick={() => setFilters(readQuery(""))}>
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------ BRIEF ------------------------------- */}
        <section className={`pj-brief ${briefIn ? "is-in" : ""}`} ref={briefRef}>
          <div className="pj-brief-copy">
            <span className="pj-kicker">For hiring teams</span>
            <h2>
              The 30-second version, <span className="pj-gradient-text">backed by data.</span>
            </h2>
            <ul className="pj-brief-points">
              <li>
                <i className="fa-solid fa-vial-circle-check" aria-hidden="true" />
                <div>
                  <strong>{stats.categoryCounts.e2e + stats.categoryCounts.api} automation projects</strong>
                  <span>UI, E2E and API suites across Playwright, Selenium, Postman/Newman and CI pipelines.</span>
                </div>
              </li>
              <li>
                <i className="fa-solid fa-fire" aria-hidden="true" />
                <div>
                  <strong>{stats.streaks.current}-day contribution streak</strong>
                  <span>
                    {stats.activeDays} active days in the last year — consistent output, not bursts.
                  </span>
                </div>
              </li>
              {stats.categoryCounts.ai > 0 && (
              <li>
                <i className="fa-solid fa-robot" aria-hidden="true" />
                <div>
                  <strong>Pushing into AI-driven testing</strong>
                  <span>Agentic test runs with Amazon Nova Act, Bedrock and Playwright.</span>
                </div>
              </li>
              )}
            </ul>
            {topSkills.length > 0 && (
              <ul className="pj-brief-skills" aria-label="Topics across repositories">
                {topSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="pj-brief-card">
            <span className="pj-brief-card-label">Ready when you are</span>
            <p>Hiring an SDET who builds the frameworks, not just the test cases? Let's talk.</p>
            <Link to="/contact" className="pj-btn pj-btn--primary pj-btn--block">
              Contact me <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <button type="button" className="pj-btn pj-btn--ghost pj-btn--block" onClick={copySummary}>
              <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
              {copied ? "Summary copied" : "Copy profile summary"}
            </button>
            <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn--link pj-btn--block">
              <i className="fa-brands fa-github" aria-hidden="true" /> github.com/{GITHUB_USERNAME}
            </a>
          </div>
        </section>
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
}
