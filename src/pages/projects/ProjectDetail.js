import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import {
  GITHUB_USERNAME,
  categoryById,
  commitKind,
  enrichRepo,
  formatBytes,
  formatDate,
  loadRepoSnapshot,
  loadSnapshot,
  mergeRepos,
  timeAgo,
} from "../../services/github/githubData";
import { snapshotIndex, snapshotRepo } from "../../services/github/snapshotStore";
import { AreaChart, BarList, Donut, PunchCard } from "./components/Charts";
import RepoCard, { LanguageBar } from "./components/RepoCard";
import SyncPill from "./components/SyncPill";
import { prefersReducedMotion, themeVars, useCountUp, useDocumentTitle, useInView, useNow } from "./lib/ui";
import useReloadScroll from "./lib/useReloadScroll";
import "./ProjectsPage.css";
import "./ProjectDetail.css";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* README sanitising                                                   */
/* ------------------------------------------------------------------ */

const DROP_TAGS = "script,style,iframe,object,embed,form,link,meta,base,frame,frameset";

const sanitizeReadme = (html, repo, branch) => {
  if (!html || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(DROP_TAGS).forEach((node) => node.remove());
  doc.querySelectorAll("a.anchor").forEach((node) => node.remove());
  const blob = `https://github.com/${GITHUB_USERNAME}/${repo}/blob/${branch}/`;
  const raw = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${repo}/${branch}/`;
  const isRelative = (value) => value && !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);

  doc.body.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "style" || name === "srcdoc") node.removeAttribute(attribute.name);
      if ((name === "href" || name === "src" || name === "xlink:href") && /^\s*(javascript|vbscript|data):/i.test(value)) {
        if (!(name === "src" && /^data:image\//i.test(value))) node.removeAttribute(attribute.name);
      }
    });
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src");
      if (isRelative(src)) node.setAttribute("src", raw + src.replace(/^\.?\//, ""));
      node.setAttribute("loading", "lazy");
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (href.startsWith("#") && !href.startsWith("#user-content-")) node.setAttribute("href", `#user-content-${href.slice(1)}`);
      else if (isRelative(href)) node.setAttribute("href", blob + href.replace(/^\.?\//, ""));
      if (!href.startsWith("#")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
  return doc.body.innerHTML;
};

/* ------------------------------------------------------------------ */
/* Data hook                                                           */
/* ------------------------------------------------------------------ */

// The repository's page, from the build-time snapshot only (F07): its entry in
// the index plus its own file (commits, languages, README, file tree).
const useRepoDetail = (name) => {
  const [index, setIndex] = useState(snapshotIndex); // undefined = loading, null = unavailable
  const [snap, setSnap] = useState(() => snapshotRepo(name)); // undefined = loading, null = none

  useEffect(() => {
    let alive = true;
    setSnap(snapshotRepo(name));
    if (snapshotIndex() === undefined) {
      loadSnapshot().then((data) => {
        if (alive) setIndex(data || null);
      });
    }
    if (snapshotRepo(name) === undefined) {
      loadRepoSnapshot(name).then((data) => {
        if (alive) setSnap(data || null);
      });
    }
    return () => {
      alive = false;
    };
  }, [name]);

  const baseRepo = index ? index.repos.find((item) => item.name === name) : null;

  const model = useMemo(() => {
    if (!baseRepo) return null;
    const commits = (snap && snap.commits) || [];
    const repo = enrichRepo(baseRepo, {
      languages: (snap && snap.languages) || (baseRepo.snapshot && baseRepo.snapshot.languages) || {},
      commitDates: commits.map((commit) => commit.date),
      commitTotal: (snap && snap.commitTotal) || commits.length,
      lastCommit: commits[0] || null,
    });
    return {
      repo,
      commits,
      commitsCapped: !(snap && snap.commitTotal) && commits.length >= 100,
      readme: sanitizeReadme(snap && snap.readmeHtml, name, repo.defaultBranch),
      tree: (snap && snap.tree) || null,
    };
  }, [snap, baseRepo, name]);

  const siblings = useMemo(() => (index ? mergeRepos(index.repos) : []), [index]);
  const status =
    index === undefined
      ? { state: "loading", syncedAt: null }
      : { state: index ? "snapshot" : "error", syncedAt: index ? new Date((snap && snap.generatedAt) || index.generatedAt).getTime() : null };

  return {
    model,
    siblings,
    status,
    // Not in the snapshot: renamed, private or deleted (the server answers 404 for a direct visit).
    missing: index !== undefined && !baseRepo,
    loading: snap === undefined || index === undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const Stat = ({ icon, label, value, display, start }) => {
  const animated = useCountUp(typeof value === "number" ? value : 0, start);
  return (
    <div className="pd-stat">
      <i className={icon} aria-hidden="true" />
      <strong>{display !== undefined ? display : Math.round(animated).toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  );
};

const CopyButton = ({ text, label = "Copy", className = "" }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`pd-copy ${className}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
      aria-label={done ? "Copied" : label}
      title={done ? "Copied" : label}
    >
      <i className={done ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
    </button>
  );
};

const KIND_LABEL = {
  feat: "feature",
  fix: "fix",
  docs: "docs",
  test: "test",
  ci: "ci",
  build: "build",
  refactor: "refactor",
  perf: "perf",
  chore: "chore",
  style: "style",
  revert: "revert",
  merge: "merge",
  update: "update",
  commit: "commit",
};

const CommitTimeline = ({ commits, repo, now, capped }) => {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [shown, setShown] = useState(25);
  const railRef = useRef(null);

  const kinds = useMemo(() => {
    const counts = {};
    commits.forEach((commit) => {
      const k = commitKind(commit.message);
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [commits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commits.filter(
      (commit) =>
        (kind === "all" || commitKind(commit.message) === kind) &&
        (!q || commit.message.toLowerCase().includes(q) || commit.sha.startsWith(q) || commit.author.toLowerCase().includes(q))
    );
  }, [commits, query, kind]);

  const groups = useMemo(() => {
    const byDay = [];
    filtered.slice(0, shown).forEach((commit, index) => {
      const day = new Date(commit.date).toDateString();
      const last = byDay[byDay.length - 1];
      if (last && last.day === day) last.items.push({ commit, index });
      else byDay.push({ day, date: commit.date, items: [{ commit, index }] });
    });
    return byDay;
  }, [filtered, shown]);

  // Rail fills as you scroll; commits light up as they enter the viewport.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    let frame = null;
    const update = () => {
      frame = null;
      const rect = rail.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.65 - rect.top) / Math.max(1, rect.height)));
      rail.style.setProperty("--progress", progress.toFixed(4));
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    let observer = null;
    const items = rail.querySelectorAll(".pd-commit:not(.is-in)");
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-in"));
    } else {
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              observer.unobserve(entry.target);
            }
          }),
        { rootMargin: "0px 0px -10% 0px", threshold: 0.2 }
      );
      items.forEach((item) => observer.observe(item));
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
    };
  }, [groups]);

  if (!commits.length) {
    return <p className="pj-empty-note">This repository has no commits on its default branch yet.</p>;
  }

  return (
    <div className="pd-timeline-wrap">
      <div className="pd-timeline-tools">
        <label className="pj-search pj-search--compact">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(25);
            }}
            placeholder="Filter commits by message, SHA or author"
            aria-label="Filter commits"
          />
        </label>
        <div className="pj-chips pj-chips--compact">
          <button type="button" className={kind === "all" ? "is-active" : ""} onClick={() => setKind("all")}>
            All <em>{commits.length}</em>
          </button>
          {kinds.map(([k, count]) => (
            <button key={k} type="button" className={`${kind === k ? "is-active" : ""}`} onClick={() => setKind(k)}>
              <i className={`pd-kind-dot pd-kind--${k}`} aria-hidden="true" /> {KIND_LABEL[k] || k} <em>{count}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="pd-timeline" ref={railRef}>
        <div className="pd-rail" aria-hidden="true">
          <span className="pd-rail-fill" />
        </div>
        {groups.map((group) => (
          <section key={group.day} className="pd-day">
            <h4 className="pd-day-label">
              <time dateTime={group.date}>{formatDate(group.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</time>
              <span>
                {group.items.length} commit{group.items.length === 1 ? "" : "s"}
              </span>
            </h4>
            <ol>
              {group.items.map(({ commit, index }) => {
                const [title, ...body] = commit.message.split("\n");
                const details = body.join("\n").trim();
                const k = commitKind(commit.message);
                return (
                  <li key={commit.sha} className={`pd-commit ${index === 0 && !query && kind === "all" ? "is-head" : ""}`} style={{ "--k": index % 6 }}>
                    <span className={`pd-commit-node pd-kind--${k}`} aria-hidden="true" />
                    <article className="pd-commit-card">
                      <header>
                        <span className={`pd-kind pd-kind--${k}`}>{KIND_LABEL[k] || k}</span>
                        {index === 0 && !query && kind === "all" && <span className="pd-head-badge">HEAD → {repo.defaultBranch}</span>}
                        {commit.verified && (
                          <span className="pd-verified" title="Signature verified by GitHub">
                            <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Verified
                          </span>
                        )}
                        <time dateTime={commit.date} title={new Date(commit.date).toLocaleString()}>
                          {timeAgo(commit.date, now)}
                        </time>
                      </header>
                      <a className="pd-commit-title" href={commit.url} target="_blank" rel="noopener noreferrer">
                        {title}
                      </a>
                      {details && (
                        <details className="pd-commit-body">
                          <summary>Details</summary>
                          <pre>{details}</pre>
                        </details>
                      )}
                      <footer>
                        {commit.avatar ? <img src={`${commit.avatar}${commit.avatar.includes("?") ? "&" : "?"}s=48`} alt="" width="20" height="20" loading="lazy" /> : <i className="fa-solid fa-user" aria-hidden="true" />}
                        <span>{commit.login || commit.author}</span>
                        <code className="pd-sha">
                          {commit.sha.slice(0, 7)}
                          <CopyButton text={commit.sha} label="Copy full SHA" />
                        </code>
                      </footer>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {!groups.length && <p className="pj-empty-note">No commits match that filter.</p>}
      </div>

      <div className="pd-timeline-foot">
        {shown < filtered.length ? (
          <button type="button" className="pj-btn pj-btn--ghost" onClick={() => setShown((value) => value + 25)}>
            Show {Math.min(25, filtered.length - shown)} more commits
          </button>
        ) : (
          <span className="pd-origin">
            <i className="fa-solid fa-seedling" aria-hidden="true" />
            {capped || commits.length < repo.commitTotal
              ? `Showing the latest ${commits.length} of ${repo.commitTotal} commits.`
              : "That's the first commit — where it all started."}
          </span>
        )}
        <a href={`${repo.url}/commits/${repo.defaultBranch}`} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn--link">
          Full history on GitHub <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProjectDetail({ theme }) {
  const params = useParams();
  const name = decodeURIComponent(params.name || "");
  const now = useNow(30000);
  const { dark, style } = useMemo(() => themeVars(theme), [theme]);
  const { model, siblings, status, missing, loading } = useRepoDetail(name);
  const [statsRef, statsIn] = useInView();
  const [chartsRef, chartsIn] = useInView({ threshold: 0.05 });

  useDocumentTitle(`${model?.repo.title || name} · Projects · Aayush Mishra`);

  // No scroll-to-top here: ScrollToTop (Main.js) already starts each new
  // project at the top. A refresh returns to the old position once the
  // repository data (or the snapshot fallback) has rendered.
  useReloadScroll(Boolean(model) && status.state !== "loading");

  // Honour #commits deep links once the timeline exists.
  useEffect(() => {
    if (model && window.location.hash === "#commits") {
      const target = document.getElementById("commits");
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
  }, [model]);

  const ordered = useMemo(() => siblings.filter((repo) => !repo.fork).sort((a, b) => (a.pushedAt < b.pushedAt ? 1 : -1)), [siblings]);
  const position = ordered.findIndex((repo) => repo.name === name);
  const previous = position > 0 ? ordered[position - 1] : null;
  const next = position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : null;
  const related = useMemo(
    () => (model ? siblings.filter((repo) => repo.category === model.repo.category && repo.name !== name && !repo.fork).sort((a, b) => b.signal - a.signal).slice(0, 3) : []),
    [siblings, model, name]
  );

  const activity = useMemo(() => {
    if (!model || !model.commits.length) return null;
    const times = model.commits.map((commit) => new Date(commit.date).getTime());
    const latest = Math.max(...times);
    const earliest = Math.min(...times);
    const end = Date.now() - latest < 52 * WEEK ? Date.now() : latest;
    const weeks = Math.min(52, Math.max(8, Math.ceil((end - earliest) / WEEK) + 1));
    const values = new Array(weeks).fill(0);
    times.forEach((time) => {
      const bucket = weeks - 1 - Math.floor((end - time) / WEEK);
      if (bucket >= 0) values[bucket] += 1;
    });
    const labels = values.map((_, i) => formatDate(new Date(end - (weeks - 1 - i) * WEEK).toISOString(), { month: "short", day: "numeric" }));
    return { values, labels };
  }, [model]);

  if (missing) {
    return (
      <div className={`pj-root ${dark ? "pj-dark" : ""}`} style={style}>
        <Header theme={theme} />
        {/* a soft 404: keep search engines from indexing /projects/<anything> */}
        <Helmet>
          <title>Repository not found · Aayush Mishra</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <main className="pj-main pd-missing">
          <span className="pj-kicker">404 — repository not found</span>
          <h1 className="pj-hero-title">“{name}” isn't on GitHub.</h1>
          <p className="pj-hero-sub">It may have been renamed, made private or deleted.</p>
          <Link to="/projects" className="pj-btn pj-btn--primary">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to all projects
          </Link>
        </main>
        <CreativeFooter theme={theme} />
      </div>
    );
  }

  const repo = model?.repo;
  const category = repo ? categoryById(repo.category) : null;
  const words = (repo?.title || name).split(" ");

  return (
    <div className={`pj-root ${dark ? "pj-dark" : ""}`} style={style}>
      <Header theme={theme} />
      <div className="pj-backdrop" aria-hidden="true">
        <div className="pj-backdrop-grid" />
        <div className="pj-backdrop-orb pj-backdrop-orb--a" />
        <div className="pj-backdrop-orb pj-backdrop-orb--b" />
      </div>

      <main className="pj-main pd-main">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/projects">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> All projects
          </Link>
          <span aria-hidden="true">/</span>
          <code>{name}</code>
        </nav>

        {/* ------------------------------- HERO ------------------------------- */}
        {/* is-loading reserves the hero's usual height, so the stats below don't jump when the data arrives */}
        <section className={`pd-hero${loading ? " is-loading" : ""}`}>
          <div className="pd-hero-top pj-reveal" style={{ "--d": "0ms" }}>
            {category && (
              <span className="pj-chip pj-chip--category">
                <i className={category.icon} aria-hidden="true" /> {category.label}
              </span>
            )}
            {repo?.fork && <span className="pj-chip pj-chip--muted">Fork</span>}
            {repo?.archived && <span className="pj-chip pj-chip--muted">Archived</span>}
            <SyncPill status={status} now={now} />
          </div>
          <h1 className="pd-title" aria-label={repo?.title || name}>
            {words.map((word, index) => (
              <span key={`${word}-${index}`} className="pd-title-word" style={{ "--d": `${80 + index * 70}ms` }} aria-hidden="true">
                {word}
              </span>
            ))}
          </h1>
          <p className="pd-desc pj-reveal" style={{ "--d": "300ms" }}>
            {loading ? <span className="pj-skeleton-line" /> : repo?.description || "No description on GitHub yet — the commits and code below tell the story."}
          </p>
          {repo && repo.topics.length > 0 && (
            <ul className="pj-card-topics pd-topics pj-reveal" style={{ "--d": "380ms" }}>
              {repo.topics.map((topic) => (
                <li key={topic}>
                  <Link to={`/projects?q=${encodeURIComponent(topic)}`}>{topic}</Link>
                </li>
              ))}
            </ul>
          )}
          {repo && (
            <div className="pd-actions pj-reveal" style={{ "--d": "460ms" }}>
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn--primary">
                <i className="fa-brands fa-github" aria-hidden="true" /> View source
              </a>
              {repo.homepage && (
                <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn--ghost">
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Live site
                </a>
              )}
              <div className="pd-clone">
                <span aria-hidden="true">$</span>
                <code>git clone {repo.url}.git</code>
                <CopyButton text={`git clone ${repo.url}.git`} label="Copy clone command" />
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------- STATS ------------------------------ */}
        <section className="pd-stats" ref={statsRef} aria-label="Repository statistics">
          <Stat icon="fa-solid fa-code-commit" label="Commits" value={repo?.commitTotal || 0} start={statsIn && !!repo} />
          <Stat icon="fa-solid fa-clock-rotate-left" label="Last push" display={repo ? timeAgo(repo.pushedAt, now) : "—"} />
          <Stat icon="fa-solid fa-seedling" label="Created" display={repo ? formatDate(repo.createdAt, { month: "short", year: "numeric" }) : "—"} />
          <Stat icon="fa-regular fa-file-code" label="Files" value={model?.tree?.fileCount || 0} start={statsIn && !!model?.tree} display={model && !model.tree ? "—" : undefined} />
          <Stat icon="fa-solid fa-star" label="Stars" value={repo?.stars || 0} start={statsIn && !!repo} />
          <Stat icon="fa-solid fa-database" label="Size" display={repo ? formatBytes(repo.sizeKb * 1024) : "—"} />
        </section>

        {/* ------------------------------- CHARTS ----------------------------- */}
        {repo && (
          <section className="pd-grid" ref={chartsRef}>
            <section className={`pj-panel pd-panel--activity ${chartsIn ? "is-in" : ""}`}>
              <header className="pj-panel-head">
                <h3>Commit activity</h3>
                <span className="pj-panel-meta">{activity ? `${activity.values.length} weeks · ${model.commits.length} commits` : "no commits"}</span>
              </header>
              {activity ? <AreaChart values={activity.values} labels={activity.labels} inView={chartsIn} unit="commits" /> : <p className="pj-empty-note">No commit history yet.</p>}
            </section>
            <section className={`pj-panel pd-panel--langs ${chartsIn ? "is-in" : ""}`}>
              <header className="pj-panel-head">
                <h3>Languages</h3>
                <span className="pj-panel-meta">by bytes of code</span>
              </header>
              {repo.languages.length ? (
                <>
                  <Donut items={repo.languages} inView={chartsIn} />
                  <LanguageBar languages={repo.languages} />
                </>
              ) : (
                <p className="pj-empty-note">GitHub hasn't detected any languages.</p>
              )}
            </section>
            <section className={`pj-panel pd-panel--punch ${chartsIn ? "is-in" : ""}`}>
              <header className="pj-panel-head">
                <h3>Commit rhythm</h3>
                <span className="pj-panel-meta">weekday × hour, your timezone</span>
              </header>
              <PunchCard dates={model.commits.map((commit) => commit.date)} inView={chartsIn} />
            </section>
            <section className={`pj-panel pd-panel--anatomy ${chartsIn ? "is-in" : ""}`}>
              <header className="pj-panel-head">
                <h3>Project anatomy</h3>
                <span className="pj-panel-meta">
                  {model.tree ? `${model.tree.fileCount} files · ${model.tree.dirCount} folders` : "tree unavailable"}
                </span>
              </header>
              {model.tree ? (
                <div className="pd-anatomy">
                  <BarList items={model.tree.extensions.slice(0, 7).map((item) => ({ label: `.${item.ext}`, value: item.count }))} inView={chartsIn} unit={(count) => (count === 1 ? " file" : " files")} />
                  <ul className="pd-tree" aria-label="Top-level files and folders">
                    {model.tree.topLevel.slice(0, 14).map((node) => (
                      <li key={node.name} className={`is-${node.type}`}>
                        <i className={node.type === "dir" ? "fa-solid fa-folder" : "fa-regular fa-file"} aria-hidden="true" />
                        <a href={`${repo.url}/${node.type === "dir" ? "tree" : "blob"}/${repo.defaultBranch}/${node.name}`} target="_blank" rel="noopener noreferrer">
                          {node.name}
                        </a>
                      </li>
                    ))}
                    {model.tree.topLevel.length > 14 && <li className="is-more">+{model.tree.topLevel.length - 14} more</li>}
                  </ul>
                </div>
              ) : (
                <p className="pj-empty-note">File tree couldn't be loaded.</p>
              )}
            </section>
          </section>
        )}

        {/* ------------------------------ TIMELINE ---------------------------- */}
        <section className="pj-section" id="commits">
          <header className="pj-section-head">
            <div>
              <span className="pj-kicker">Commit log</span>
              <h2>Every change, as it happened</h2>
              <p>Straight from the default branch. Newest first — scroll to travel back in time.</p>
            </div>
          </header>
          {model ? (
            <CommitTimeline commits={model.commits} repo={repo} now={now} capped={model.commitsCapped} />
          ) : (
            <div className="pj-skeleton-list" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} />
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------- README ----------------------------- */}
        {model?.readme && (
          <section className="pj-section">
            <header className="pj-section-head">
              <div>
                <span className="pj-kicker">README.md</span>
                <h2>Documentation</h2>
              </div>
            </header>
            <article className="pd-readme" dangerouslySetInnerHTML={{ __html: model.readme }} />
          </section>
        )}

        {/* ------------------------------- RELATED ---------------------------- */}
        {related.length > 0 && (
          <section className="pj-section">
            <header className="pj-section-head">
              <div>
                <span className="pj-kicker">More in {category?.label}</span>
                <h2>Related projects</h2>
              </div>
            </header>
            <div className="pj-grid">
              {related.map((item, index) => (
                <RepoCard key={item.name} repo={item} index={index} now={now} />
              ))}
            </div>
          </section>
        )}

        <nav className="pd-pager" aria-label="Project navigation">
          {previous ? (
            <Link to={`/projects/${encodeURIComponent(previous.name)}`} className="pd-pager-link">
              <span>
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Newer
              </span>
              <strong>{previous.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/projects/${encodeURIComponent(next.name)}`} className="pd-pager-link is-next">
              <span>
                Older <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </span>
              <strong>{next.title}</strong>
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <section className="pd-cta">
          <div>
            <span className="pj-kicker">Like what you see?</span>
            <h2>Let's build something reliable together.</h2>
          </div>
          <Link to="/contact" className="pj-btn pj-btn--primary">
            Get in touch <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </section>
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
}
