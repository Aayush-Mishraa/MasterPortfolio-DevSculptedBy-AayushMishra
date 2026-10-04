import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { greeting } from "../../portfolio.js";
import {
  GITHUB_USERNAME,
  aggregateStats,
  isInternalCommit,
  loadSnapshot,
  mergeRepos,
  timeAgo,
} from "../../services/github/githubData";
import { snapshotIndex } from "../../services/github/snapshotStore";
import { prefersReducedMotion, themeVars, useCountUp, useInView, useNow } from "../projects/lib/ui";
import Skyline from "./components/Skyline";
import TechPulse from "./components/TechPulse";
import { PullRequestLedger, Terminal, describeEvent, normalizeLegacyPR, normalizeSearchPR } from "./components/Transmission";
import legacyPullRequests from "../../shared/opensource/pull_requests.json";
import ecosystem from "../../shared/opensource/contributed_organizations.json";
import { MODULES as UNIVERSE } from "../universe/modules";
import { Glyph } from "../universe/icons";
import "./Opensource.css";
import WorkTabs from "../work/WorkTabs";

const SECTIONS = [
  { id: "os-overview", label: "Overview" },
  { id: "os-skyline", label: "Skyline" },
  { id: "os-transmission", label: "Activity" },
  { id: "os-dna", label: "DNA" },
  { id: "os-pulse", label: "Tech Pulse" },
  { id: "os-universe", label: "Universe" },
  { id: "os-brief", label: "Hire" },
];

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

// From the build-time snapshot only (F07): repositories, contributions, the
// public activity feed and authored pull requests, refreshed by the scheduled build.
const useOpenSourceData = () => {
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

  const events = useMemo(() => {
    if (snapshot === undefined) return null;
    if (!snapshot) return [];
    if (Array.isArray(snapshot.events)) return snapshot.events.map(describeEvent).slice(0, 14);
    // Older snapshots: each repository's last commit, housekeeping left out.
    return snapshot.repos
      .filter((repo) => repo.snapshot && repo.snapshot.lastCommit && !isInternalCommit(repo.snapshot.lastCommit.message))
      .map((repo) => ({
        id: repo.snapshot.lastCommit.sha,
        date: repo.snapshot.lastCommit.date,
        repo: repo.full_name || `${GITHUB_USERNAME}/${repo.name}`,
        verb: "commit",
        tone: "push",
        text: repo.snapshot.lastCommit.message.split("\n")[0],
        href: repo.snapshot.lastCommit.url || repo.html_url,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 14);
  }, [snapshot]);

  const prs = useMemo(() => {
    if (snapshot === undefined) return null;
    if (snapshot && Array.isArray(snapshot.pullRequests) && snapshot.pullRequests.length) {
      return snapshot.pullRequests.map(normalizeSearchPR);
    }
    return (legacyPullRequests.data || []).map(normalizeLegacyPR);
  }, [snapshot]);

  return {
    repos,
    stats,
    days: (contributionData && contributionData.contributions) || [],
    events,
    eventSource: "snapshot",
    prs,
    user: snapshot ? snapshot.user : undefined,
    loading: snapshot === undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

/** Types `text` once `start` is true. Reduced-motion users get it instantly. */
const useTypewriter = (text, start, speed = 38) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    if (prefersReducedMotion()) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    const id = setInterval(() => {
      setCount((value) => {
        if (value >= text.length) {
          clearInterval(id);
          return value;
        }
        return value + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, start, speed]);
  return { typed: text.slice(0, count), done: count >= text.length };
};

const Hud = ({ label, value, suffix = "", caption, icon, start }) => {
  const shown = useCountUp(value || 0, start);
  return (
    <div className="os-hud">
      <span className="os-hud-label">
        <i className={icon} aria-hidden="true" /> {label}
      </span>
      <strong className="os-hud-value">
        {/* undefined while the data loads: a dash, never a fake 0 */}
        {value == null ? "—" : Math.round(shown).toLocaleString("en-US")}
        {suffix && value != null && <small>{suffix}</small>}
      </strong>
      {caption && <span className="os-hud-caption">{caption}</span>}
    </div>
  );
};

const SectionHead = ({ index, kicker, title, children }) => (
  <header className="os-section-head">
    <span className="os-kicker">
      <b>{index}</b> {kicker}
    </span>
    <h2>{title}</h2>
    {children && <p>{children}</p>}
  </header>
);

const Gauge = ({ label, value, detail, how, icon, inView, index }) => {
  const r = 38;
  const c = 2 * Math.PI * r;
  const shown = useCountUp(value, inView, 1600);
  return (
    <article className={`os-gauge ${inView ? "is-in" : ""}`} style={{ "--i": index }}>
      <div className="os-gauge-dial">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={r} className="os-gauge-track" />
          <circle
            cx="50"
            cy="50"
            r={r}
            className="os-gauge-fill"
            style={{ strokeDasharray: c, strokeDashoffset: inView ? c * (1 - value / 100) : c }}
          />
        </svg>
        <span className="os-gauge-value">
          {Math.round(shown)}
          <small>%</small>
        </span>
      </div>
      <h3>
        <i className={icon} aria-hidden="true" /> {label}
      </h3>
      <p>{detail}</p>
      <details>
        <summary>How it's measured</summary>
        <span>{how}</span>
      </details>
    </article>
  );
};

const PRINCIPLES = [
  {
    icon: "fa-solid fa-vial-circle-check",
    title: "Tests ship with the code",
    body: "Every framework I publish comes with its own suites, fixtures and reports, so reviewers can run it, not just read it.",
  },
  {
    icon: "fa-solid fa-gears",
    title: "CI from commit one",
    body: "GitHub Actions pipelines, Newman runs and HTML reports wired in early, so quality is visible on every push.",
  },
  {
    icon: "fa-solid fa-book-open-reader",
    title: "Readable by strangers",
    body: "Page-object models, clear folder structure and READMEs that let someone new get a run going in minutes.",
  },
  {
    icon: "fa-solid fa-robot",
    title: "Exploring AI-driven QA",
    body: "Agentic test runs with Amazon Nova Act and LLM tooling: using AI to help write and run tests.",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Opensource({ theme }) {
  const now = useNow(30000);
  const { dark, style } = useMemo(() => themeVars(theme), [theme]);
  const { repos, stats, days, events, eventSource, prs, user } = useOpenSourceData();
  const [active, setActive] = useState(SECTIONS[0].id);
  const [copied, setCopied] = useState(false);
  const [hudRef, hudIn] = useInView();
  const [skyRef, skyIn] = useInView({ threshold: 0.1 });
  const [txRef, txIn] = useInView({ threshold: 0.1 });
  const [dnaRef, dnaIn] = useInView({ threshold: 0.1 });
  const [pulseRef, pulseIn] = useInView({ threshold: 0.01, rootMargin: "0px 0px 300px 0px" });
  const [briefRef, briefIn] = useInView({ threshold: 0.2 });


  // Scroll-spy for the section rail.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  // Flag regions that are off screen so their looping decoration pauses (see "Motion" in
  // Opensource.css). An attribute, not a class, so React re-renders never clear it.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting)),
      { rootMargin: "100px 0px" }
    );
    document.querySelectorAll(".os-backdrop, .os-hero, .os-section, .os-brief").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const loading = !repos.length;
  const own = repos.filter((repo) => !repo.fork);
  const mergedPrs = prs ? prs.filter((pr) => pr.state === "merged").length : 0;

  const command = `git log --author="${GITHUB_USERNAME}" --since=1.year | count`;
  const { typed, done } = useTypewriter(command, !loading);

  const orbit = useMemo(() => {
    const names = [...stats.languages.slice(0, 4).map((language) => language.name), ...stats.topics.slice(0, 4).map((topic) => topic.name)];
    const seen = new Set();
    return names.filter((name) => !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase())).slice(0, 7);
  }, [stats]);

  const weekly = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7).reduce((sum, day) => sum + day.count, 0));
    return weeks;
  }, [days]);

  const rhythm = useMemo(() => {
    const totals = new Array(7).fill(0);
    days.forEach((day) => (totals[new Date(`${day.date}T00:00:00`).getDay()] += day.count));
    const max = Math.max(1, ...totals);
    return totals.map((value, index) => ({ label: "SMTWTFS"[index], value, percent: (value / max) * 100 }));
  }, [days]);

  const dna = useMemo(() => {
    const ownCount = Math.max(1, own.length);
    const activeWeeks = weekly.filter((count) => count > 0).length;
    const documented = own.filter((repo) => repo.description && repo.description !== "No description available").length;
    const automation = (stats.categoryCounts.e2e || 0) + (stats.categoryCounts.api || 0) + (stats.categoryCounts.ai || 0);
    return [
      {
        label: "Consistency",
        icon: "fa-solid fa-wave-square",
        value: Math.min(100, Math.round((stats.activeDays / 365) * 100)),
        detail: `${stats.activeDays} active days in the last year, longest streak ${stats.streaks.longest} days.`,
        how: "Days with at least one public contribution, divided by 365.",
      },
      {
        label: "Automation focus",
        icon: "fa-solid fa-vial-circle-check",
        value: Math.round((automation / ownCount) * 100),
        detail: `${automation} of ${own.length} repos are test frameworks, API suites or AI test agents.`,
        how: "Repos auto-classified by name, topics and description into UI/E2E, API or AI-testing categories.",
      },
      {
        label: "Documentation",
        icon: "fa-solid fa-file-lines",
        value: Math.round((documented / ownCount) * 100),
        detail: `${documented} repos come with a written description.`,
        how: "Share of my own public repositories with a written description.",
      },
      {
        label: "Active weeks",
        icon: "fa-solid fa-calendar-week",
        value: weekly.length ? Math.round((activeWeeks / weekly.length) * 100) : 0,
        detail: `Shipped something in ${activeWeeks} of the last ${weekly.length} weeks.`,
        how: "Weeks with at least one public contribution, divided by the number of weeks in the last year.",
      },
    ];
  }, [own, stats, weekly]);

  const brief = useMemo(
    () => ({
      name: "Aayush Mishra",
      role: greeting.nickname.replace(/[^\w\s&-]/g, "").trim(),
      open_to: ["SDET", "QA Automation Engineer", "Test Architect"],
      stack: stats.languages.slice(0, 5).map((language) => language.name),
      focus: stats.topics.slice(0, 6).map((topic) => topic.name),
      public_repos: own.length,
      contributions_last_year: stats.contributions,
      pull_requests: prs ? `${prs.length} opened · ${mergedPrs} merged` : "…",
      github: `github.com/${GITHUB_USERNAME}`,
    }),
    [stats, own.length, prs, mergedPrs]
  );

  const copyBrief = () => {
    const text = JSON.stringify(brief, null, 2);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {});
  };

  const bestWeek = weekly.length ? Math.max(...weekly) : 0;
  const avgWeek = weekly.length ? stats.contributions / weekly.length : 0;

  return (
    <div className={`os-root ${dark ? "os-dark" : ""}`} style={style}>
      <Header theme={theme} />

      <div className="os-backdrop" aria-hidden="true">
        <div className="os-backdrop-floor" />
        <div className="os-backdrop-orb os-backdrop-orb--a" />
        <div className="os-backdrop-orb os-backdrop-orb--b" />
        <div className="os-backdrop-scan" />
      </div>

      <nav className="os-rail" aria-label="Sections on this page">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className={active === section.id ? "is-active" : ""} aria-current={active === section.id ? "true" : undefined}>
            <i aria-hidden="true" />
            <span>{section.label}</span>
          </a>
        ))}
      </nav>

      <main className="os-main">
        <WorkTabs counts={loading ? {} : { "/work": stats.ownCount, "/work/open-source": stats.contributions }}>
          <span className="os-status-pill os-reveal" style={{ "--d": "0ms" }}>
            <span className="os-live-dot">
              <i />
            </span>
            {stats.lastPush ? `Last commit ${timeAgo(stats.lastPush, now)}` : "Connecting to GitHub…"}
            <em>Open to SDET roles</em>
          </span>
        </WorkTabs>
        {/* ------------------------------ HERO ------------------------------ */}
        <section className="os-hero" id="os-overview">
          <div className="os-hero-copy">
            <h1 className="os-hero-title">
              <span className="os-reveal" style={{ "--d": "80ms" }}>
                Open source,
              </span>
              <span className="os-reveal os-glitch" data-text="engineered in public." style={{ "--d": "180ms" }}>
                engineered in public.
              </span>
            </h1>
            <p className="os-hero-sub os-reveal" style={{ "--d": "280ms" }}>
              Test frameworks, API suites and AI test agents, all built in the open and synced from GitHub several times a
              day. This page is a view of my public work: what I shipped, when I shipped it, and how.
            </p>

            <div className="os-cli os-reveal" style={{ "--d": "380ms" }} aria-label={`${stats.contributions} contributions in the last year`}>
              <span className="os-prompt">❯</span>
              <code>
                {typed}
                {!done && <span className="os-caret" aria-hidden="true" />}
              </code>
              {done && (
                <span className="os-cli-out">
                  → <b>{stats.contributions.toLocaleString("en-US")}</b> contributions
                </span>
              )}
            </div>

            <div className="os-hero-actions os-reveal" style={{ "--d": "460ms" }}>
              <a href="#os-brief" className="os-btn os-btn--primary">
                <i className="fa-solid fa-user-astronaut" aria-hidden="true" /> Recruiter brief
              </a>
              <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noopener noreferrer" className="os-btn os-btn--ghost">
                <i className="fa-brands fa-github" aria-hidden="true" /> Follow on GitHub
              </a>
              <Link to="/work" className="os-btn os-btn--link">
                All projects <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="os-core os-reveal" style={{ "--d": "220ms" }} aria-hidden="true">
            <div className="os-core-ring os-core-ring--1" />
            <div className="os-core-ring os-core-ring--2" />
            <div className="os-core-ring os-core-ring--3" />
            <div className="os-core-orbit" style={{ "--n": orbit.length || 1 }}>
              {orbit.map((name, index) => (
                <span key={name} className="os-core-chip" style={{ "--k": index }}>
                  <span>
                    <b>{name}</b>
                  </span>
                </span>
              ))}
            </div>
            <div className="os-core-avatar">
              <img src={user?.avatar || `https://github.com/${GITHUB_USERNAME}.png`} alt="" width="160" height="160" />
              <span className="os-core-scan" />
            </div>
            <div className="os-core-readout os-core-readout--tl">
              <b>{own.length || "—"}</b> repos
            </div>
            <div className="os-core-readout os-core-readout--br">
              <b>{stats.streaks.current}</b> day streak
            </div>
          </div>
        </section>

        {/* ------------------------------ HUD ------------------------------- */}
        <section className="os-huds" ref={hudRef} aria-label="Open source metrics">
          <Hud label="Contributions" value={loading ? null : stats.contributions} start={hudIn} icon="fa-solid fa-chart-simple" caption="last 12 months" />
          <Hud label="Public repos" value={loading ? null : stats.ownCount} start={hudIn} icon="fa-solid fa-cubes" caption={`${stats.forkCount} forks excluded`} />
          <Hud label="Commits" value={loading ? null : stats.commits} start={hudIn} icon="fa-solid fa-code-commit" caption="across my repos" />
          <Hud label="Pull requests" value={prs ? prs.length : null} start={hudIn && Boolean(prs)} icon="fa-solid fa-code-pull-request" caption={`${mergedPrs} merged`} />
          <Hud label="Active streak" value={loading ? null : stats.streaks.current} suffix="d" start={hudIn} icon="fa-solid fa-fire" caption={`best ${stats.streaks.longest} days`} />
        </section>

        {/* ---------------------------- SKYLINE ----------------------------- */}
        <section className="os-section" id="os-skyline" ref={skyRef}>
          <SectionHead index="01" kicker="Contribution skyline" title="A year of work, one tower per day">
            The same data as the GitHub contribution graph, shown in 3D. Taller towers mean busier days. Hover a tower to see
            the date.
          </SectionHead>
          <div className={`os-panel os-skyline-panel ${skyIn ? "is-in" : ""}`}>
            <Skyline days={days} accent={style["--pj-accent"]} bg={style["--pj-bg"]} dark={dark} inView={skyIn} />
            <aside className="os-skyline-stats">
              <dl>
                <div>
                  <dt>Best week</dt>
                  <dd>{bestWeek}</dd>
                </div>
                <div>
                  <dt>Weekly average</dt>
                  <dd>{avgWeek.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Busiest day</dt>
                  <dd>{stats.busiestDay ? stats.busiestDay.count : "—"}</dd>
                </div>
                <div>
                  <dt>Active days</dt>
                  <dd>{stats.activeDays}</dd>
                </div>
              </dl>
              <div className="os-rhythm" aria-label="Contributions by weekday">
                <span className="os-rhythm-title">Weekly rhythm</span>
                <div className="os-rhythm-bars">
                  {rhythm.map((day, index) => (
                    <span key={index} title={`${day.value} contributions`}>
                      <i style={{ "--h": `${Math.max(4, day.percent)}%`, "--i": index }} />
                      <b>{day.label}</b>
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* -------------------------- TRANSMISSION -------------------------- */}
        <section className="os-section" id="os-transmission" ref={txRef}>
          <SectionHead index="02" kicker="Activity log" title="What I'm shipping right now">
            My recent public GitHub activity (housekeeping commits left out), next to every pull request I've opened.
            Re-synced every six hours.
          </SectionHead>
          <div className={`os-tx ${txIn ? "is-in" : ""}`}>
            <Terminal lines={events} now={now} source={eventSource} />
            <div className="os-panel os-ledger-panel">
              <header className="os-panel-head">
                <h3>
                  <i className="fa-solid fa-code-pull-request" aria-hidden="true" /> Pull request ledger
                </h3>
                <a href={`https://github.com/pulls?q=is%3Apr+author%3A${GITHUB_USERNAME}`} target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </a>
              </header>
              <PullRequestLedger prs={prs} inView={txIn} now={now} />
            </div>
          </div>
        </section>

        {/* ------------------------------- DNA ------------------------------ */}
        <section className="os-section" id="os-dna" ref={dnaRef}>
          <SectionHead index="03" kicker="Open source DNA" title="What these numbers say about how I work">
            Four scores worked out from my public GitHub data. Open "How it's measured" on any card to see the formula.
          </SectionHead>
          <div className="os-gauges">
            {dna.map((item, index) => (
              <Gauge key={item.label} {...item} index={index} inView={dnaIn && !loading} />
            ))}
          </div>
          <div className={`os-principles ${dnaIn ? "is-in" : ""}`}>
            {PRINCIPLES.map((principle, index) => (
              <article key={principle.title} style={{ "--i": index }}>
                <i className={principle.icon} aria-hidden="true" />
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>

          {ecosystem.data && ecosystem.data.length > 0 && (
            <div className="os-eco" aria-label="Ecosystems and platforms I build on">
              <span className="os-eco-label">Ecosystems I build on</span>
              <div className="os-eco-track">
                <div className="os-eco-run">
                  {[...ecosystem.data, ...ecosystem.data].map((org, index) => (
                    <a
                      key={`${org.id}-${index}`}
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={index >= ecosystem.data.length ? -1 : undefined}
                      aria-hidden={index >= ecosystem.data.length ? "true" : undefined}
                    >
                      <img src={org.logoUrl} alt="" loading="lazy" width="26" height="26" />
                      <span>{org.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ----------------------------- PULSE ------------------------------ */}
        <section className="os-section" id="os-pulse" ref={pulseRef}>
          <SectionHead index="04" kicker="Tech pulse" title="What the engineering world is reading today">
            Live headlines from Hacker News, DEV Community and GitHub's fastest-rising new repositories. Filter by topic.
          </SectionHead>
          <TechPulse now={now} inView={pulseIn} />
        </section>

        {/* ---------------------------- UNIVERSE ---------------------------- */}
        <section className="os-section os-portal" id="os-universe">
          <div className="os-portal-copy">
            <span className="os-kicker">
              <b>05</b> Tech Universe
            </span>
            <h2>
              Open source means <span className="os-gradient-text">everyone gets to play.</span>
            </h2>
            <p>
              So I built a free tech playground for everyone: live AI models and research papers, launches, beginner-friendly
              issues, coding radio, dev games, creator tools and the internet's status, all on free and open APIs.
            </p>
            <a href="/universe" target="_blank" rel="noopener noreferrer" className="os-btn os-btn--primary">
              Enter the Tech Universe <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
            </a>
            <span className="os-portal-note">Opens in a new tab as its own app.</span>
          </div>
          <div className="os-portal-grid">
            {UNIVERSE.map((world, index) => (
              <a
                key={world.id}
                href={`/universe/${world.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="os-portal-tile"
                style={{ "--gh": world.hue, "--i": index }}
              >
                <span className="os-portal-glyph">
                  <Glyph id={world.id} size={24} />
                </span>
                <span>{world.title}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ----------------------------- BRIEF ------------------------------ */}
        <section className={`os-brief ${briefIn ? "is-in" : ""}`} id="os-brief" ref={briefRef}>
          <div className="os-brief-copy">
            <span className="os-kicker">
              <b>06</b> For hiring teams
            </span>
            <h2>
              The short version, <span className="os-gradient-text">generated from the data.</span>
            </h2>
            <p>
              This brief is built from the same GitHub data as the rest of the page. Copy it into your ATS notes or send it to a
              hiring manager.
            </p>
            <div className="os-brief-actions">
              <Link to="/contact" className="os-btn os-btn--primary">
                Contact me <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <a href={greeting.resumeLink} target="_blank" rel="noopener noreferrer" className="os-btn os-btn--ghost">
                <i className="fa-regular fa-file-lines" aria-hidden="true" /> Résumé
              </a>
            </div>
          </div>
          <div className="os-json">
            <div className="os-terminal-bar">
              <span className="os-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="os-terminal-title">recruiter-brief.json</span>
              <button type="button" className="os-copy" onClick={copyBrief}>
                <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>
              <code>
                <span className="os-json-line" style={{ "--i": 0 }}>{"{"}</span>
                {Object.entries(brief).map(([key, value], index, all) => (
                  <span className="os-json-line" key={key} style={{ "--i": index + 1 }}>
                    {"  "}
                    <span className="os-json-key">"{key}"</span>:{" "}
                    {Array.isArray(value) ? (
                      <>
                        [
                        {value.map((item, itemIndex) => (
                          <React.Fragment key={item}>
                            <span className="os-json-str">"{item}"</span>
                            {itemIndex < value.length - 1 ? ", " : ""}
                          </React.Fragment>
                        ))}
                        ]
                      </>
                    ) : typeof value === "number" ? (
                      <span className="os-json-num">{value}</span>
                    ) : (
                      <span className="os-json-str">"{value}"</span>
                    )}
                    {index < all.length - 1 ? "," : ""}
                  </span>
                ))}
                <span className="os-json-line" style={{ "--i": Object.keys(brief).length + 1 }}>{"}"}</span>
              </code>
            </pre>
          </div>
        </section>
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
}
