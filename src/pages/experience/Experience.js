import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { experience, greeting } from "../../portfolio.js";
import "./Experience.css";
import "./ExperiencePage.css";
import MusicCard from "./MusicCard";

/* ------------------------------------------------------------------ */
/* Data shaping — everything is derived from portfolio.js              */
/* ------------------------------------------------------------------ */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "April 2023" -> Date(2023, 3); "Present" -> null
const parsePoint = (text) => {
  const t = (text || "").trim().toLowerCase();
  if (!t || /present|now|current/.test(t)) return null;
  const year = parseInt((t.match(/\d{4}/) || ["0"])[0], 10);
  const month = MONTHS.findIndex((m) => t.indexOf(m) === 0);
  return new Date(year, month < 0 ? 0 : month, 1);
};

const TYPES = ["work", "intern", "community"];
const TYPE_LABEL = { work: "Full-time", intern: "Internship", community: "Community" };

const TECH = [
  "Selenium", "Playwright", "Cypress", "TestNG", "REST Assured", "JMeter", "Jenkins", "Docker",
  "CI/CD", "Java", "Python", "AWS", "EC2", "Kafka", "ElasticSearch", "PostgreSQL", "LSTM",
  "Azure", "Tensorflow", "Keras", "Scikit-learn", "Cloud Computing", "Machine Learning",
  "Deep Learning", "Time Series",
];

const PRACTICES = [
  [/\bleading\b|\bled\b|leadership|\blead (the )?(qa|team|project)/i, "Leadership"],
  [/mentor/i, "Mentoring"],
  [/test plan/i, "Test Planning"],
  [/code review/i, "Code Reviews"],
  [/performance/i, "Performance Testing"],
  [/automat/i, "Automation"],
  [/workshop|seminar/i, "Workshops"],
  [/open ?source/i, "Open Source"],
  [/forecast/i, "Forecasting"],
  [/cross-functional|partnering/i, "Collaboration"],
];

const extractStack = (text) => {
  const tools = TECH.filter((t) => text.toLowerCase().indexOf(t.toLowerCase()) !== -1);
  const practices = PRACTICES.filter(([re]) => re.test(text)).map(([, label]) => label);
  return { tools, practices };
};

const toBullets = (text) =>
  text
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length > 3)
    .slice(0, 5);

const logoFor = (path) => {
  try {
    return require(`../../assets/images/${path}`);
  } catch (e) {
    return null;
  }
};

const tenure = (start, end) => {
  const until = end || new Date();
  const months = Math.max(1, (until.getFullYear() - start.getFullYear()) * 12 + until.getMonth() - start.getMonth() + (end ? 1 : 0));
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ");
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const fmt = (d) => (d ? `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}` : "Present");

const roles = experience.sections
  .reduce(
    (acc, section, si) =>
      acc.concat(
        section.experiences.map((e) => {
          const [a, b] = e.duration.split(/\s+-\s+/);
          const start = parsePoint(a);
          const end = parsePoint(b);
          return {
            ...e,
            type: TYPES[si] || "community",
            section: section.title,
            start,
            end,
            logo: logoFor(e.logo_path),
            slug: slugify(`${e.title} ${e.company}`),
            bullets: toBullets(e.description),
            stack: extractStack(e.description),
          };
        })
      ),
    []
  )
  .filter((r) => r.start && r.start.getFullYear() > 0);

const workRoles = roles.filter((r) => r.type === "work");
const companyLogos = roles.reduce((acc, r) => {
  if (r.logo && !acc.some((c) => c.name === r.company)) acc.push({ name: r.company, logo: r.logo, url: r.company_url });
  return acc;
}, []);
const careerStart = workRoles.reduce((min, r) => (r.start < min ? r.start : min), workRoles[0] ? workRoles[0].start : new Date());
const currentRole = workRoles.find((r) => !r.end) || workRoles[0];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const trackPointer = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

const pad = (n) => String(n).padStart(2, "0");

const Uptime = ({ since }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let y = now.getFullYear() - since.getFullYear();
  let m = now.getMonth() - since.getMonth();
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  const anchor = new Date(since.getFullYear() + y, since.getMonth() + m, 1);
  const days = Math.floor((now - anchor) / 86400000);
  const units = [
    [y, "yrs"],
    [m, "mos"],
    [days, "days"],
  ];

  return (
    <div className="xp-uptime" role="timer" aria-label="Time spent in QA">
      <div className="xp-uptime__units">
        {units.map(([v, l]) => (
          <div key={l}>
            <strong>{pad(v)}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="xp-uptime__clock">
        {pad(now.getHours())}
        <b>:</b>
        {pad(now.getMinutes())}
        <b>:</b>
        {pad(now.getSeconds())}
      </div>
    </div>
  );
};

const Trajectory = ({ selected, onSelect }) => {
  const scrollRef = useRef(null);
  const now = new Date();

  // On narrow screens the chart scrolls sideways — start at "today", not 2018
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  const minYear = Math.min(...roles.map((r) => r.start.getFullYear()));
  const maxYear = now.getFullYear() + 1;
  const span = maxYear - minYear;
  const pos = (d) => ((d.getFullYear() + d.getMonth() / 12 - minYear) / span) * 100;
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  return (
    <div className="xp-gantt" onMouseMove={trackPointer}>
      <div className="xp-gantt__scroll" ref={scrollRef}>
        <div className="xp-gantt__canvas">
          <div className="xp-gantt__axis" aria-hidden="true">
            {years.map((y) => (
              <span key={y} style={{ left: `${((y - minYear) / span) * 100}%` }}>
                {y}
              </span>
            ))}
          </div>

          <div className="xp-gantt__rows">
            {years.map((y) => (
              <i key={y} className="xp-gantt__grid" style={{ left: `${((y - minYear) / span) * 100}%` }} aria-hidden="true" />
            ))}
            <div className="xp-gantt__today" style={{ left: `${pos(now)}%` }} aria-hidden="true">
              <span>today</span>
            </div>

            {roles.map((r, i) => {
              const left = pos(r.start);
              const width = Math.max(pos(r.end || now) - left, 1.2);
              // label goes after the bar, before it, or inside a long bar that reaches the edge
              const placement = left > 55 ? "before" : left + width > 72 && width > 30 ? "inside" : "after";
              return (
                <button
                  type="button"
                  key={`${r.title}-${r.company}`}
                  className={`xp-gantt__row is-${r.type} ${selected === i ? "is-active" : ""}`}
                  onClick={() => onSelect(i)}
                  aria-label={`${r.title} at ${r.company}, ${r.duration}`}
                >
                  <span className="xp-gantt__bar" style={{ left: `${left}%`, width: `${width}%` }}>
                    {!r.end && <em className="xp-gantt__live" />}
                  </span>
                  <span
                    className={`xp-gantt__label ${placement === "inside" ? "is-inside" : ""}`}
                    style={
                      placement === "before"
                        ? { right: `${100 - left + 0.8}%` }
                        : placement === "inside"
                        ? { left: `${left + 0.8}%` }
                        : { left: `${left + width + 0.8}%` }
                    }
                  >
                    <strong>{r.title}</strong> · {r.company}
                  </span>
                </button>
              );
            })}

            <Link to="/contact" className="xp-gantt__row xp-gantt__row--next">
              <span className="xp-gantt__bar" style={{ left: `${pos(now)}%`, width: `${100 - pos(now)}%` }} />
              <span className="xp-gantt__label is-left" style={{ right: `${100 - pos(now) + 0.8}%` }}>
                <strong>next()</strong> · your team? →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dossier = ({ role, index, total, onPrev, onNext, playing, onDone }) => {
  const [open, setOpen] = useState(false);
  const bullets = open ? role.bullets : role.bullets.slice(0, 3);

  return (
    <article className={`xp-dossier is-${role.type}`} onMouseMove={trackPointer}>
      <span className="xp-dossier__corner xp-dossier__corner--tl" aria-hidden="true" />
      <span className="xp-dossier__corner xp-dossier__corner--tr" aria-hidden="true" />
      <span className="xp-dossier__corner xp-dossier__corner--bl" aria-hidden="true" />
      <span className="xp-dossier__corner xp-dossier__corner--br" aria-hidden="true" />
      <span className="xp-dossier__scan" aria-hidden="true" />
      {playing && (
        <span className="xp-dossier__progress" aria-hidden="true">
          <i onAnimationEnd={onDone} />
        </span>
      )}

      <header className="xp-dossier__head">
        <div className="xp-dossier__logo">
          {role.logo ? <img src={role.logo} alt={`${role.company} logo`} /> : <i className="fa-solid fa-briefcase" />}
        </div>
        <div className="xp-dossier__id">
          <span className="xp-mono">
            FILE {pad(index + 1)}/{pad(total)} · {TYPE_LABEL[role.type]}
            {!role.end && <b className="xp-live-chip">● active</b>}
          </span>
          <h3>{role.title}</h3>
          <a href={role.company_url} target="_blank" rel="noopener noreferrer" className="xp-dossier__company">
            {role.company} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </a>
        </div>
        <div className="xp-dossier__nav">
          <button type="button" onClick={onPrev} aria-label="Previous role">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          </button>
          <button type="button" onClick={onNext} aria-label="Next role">
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </header>

      <dl className="xp-dossier__meta">
        <div>
          <dt>Period</dt>
          <dd>
            {fmt(role.start)} → {fmt(role.end)}
          </dd>
        </div>
        <div>
          <dt>Tenure</dt>
          <dd>{tenure(role.start, role.end)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{role.location}</dd>
        </div>
      </dl>

      <div className="xp-dossier__body">
        <div>
          <span className="xp-mono xp-dossier__label">{"// mission log"}</span>
          <ul className="xp-dossier__log">
            {bullets.map((b, i) => (
              <li key={b} style={{ animationDelay: `${120 + i * 80}ms` }}>
                <span className="xp-mono">{pad(i + 1)}</span>
                {b}.
              </li>
            ))}
          </ul>
          {role.bullets.length > 3 && (
            <button type="button" className="xp-more" onClick={() => setOpen(!open)}>
              {open ? "Show less" : `+${role.bullets.length - 3} more entries`}
            </button>
          )}
        </div>

        {(role.stack.tools.length > 0 || role.stack.practices.length > 0) && (
          <aside className="xp-dossier__stack">
            {role.stack.tools.length > 0 && (
              <>
                <span className="xp-mono xp-dossier__label">{"// stack detected"}</span>
                <div className="xp-chips">
                  {role.stack.tools.map((t) => (
                    <span key={t} className="xp-chip">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
            {role.stack.practices.length > 0 && (
              <>
                <span className="xp-mono xp-dossier__label">{"// practices"}</span>
                <div className="xp-chips">
                  {role.stack.practices.map((t) => (
                    <span key={t} className="xp-chip xp-chip--ghost">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </article>
  );
};

/* ---------- Stack evolution heatmap ---------- */

const HEAT_ROWS = 14;
const TYPE_WEIGHT = { work: 3, intern: 2, community: 1 };

const StackHeatmap = () => {
  const [showAll, setShowAll] = useState(false);
  const now = new Date();
  const minYear = Math.min(...roles.map((r) => r.start.getFullYear()));
  const years = [];
  for (let y = minYear; y <= now.getFullYear(); y++) years.push(y);

  const activeIn = (r, y) => r.start.getFullYear() <= y && (r.end || now).getFullYear() >= y;

  const rows = useMemo(() => {
    const names = {};
    roles.forEach((r) => {
      r.stack.tools.forEach((t) => (names[t] = "tool"));
      r.stack.practices.forEach((t) => (names[t] = names[t] || "practice"));
    });
    return Object.keys(names)
      .map((name) => {
        const cells = years.map((y) => {
          const using = roles.filter(
            (r) => activeIn(r, y) && (r.stack.tools.indexOf(name) !== -1 || r.stack.practices.indexOf(name) !== -1)
          );
          return { y, using };
        });
        const last = cells.map((c) => c.using.length > 0).lastIndexOf(true);
        const active = cells.filter((c) => c.using.length).length;
        // recent full-time work counts most, community programs least
        const recent = cells
          .slice(-4)
          .reduce((sum, c) => sum + c.using.reduce((w, r) => w + (TYPE_WEIGHT[r.type] || 1), 0), 0);
        return { name, kind: names[name], cells, last, active, recent };
      })
      .filter((r) => r.active)
      .sort((a, b) => b.last - a.last || b.recent - a.recent || b.active - a.active || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="xp-heat" onMouseMove={trackPointer}>
      <div className="xp-heat__scroll">
        <table className="xp-heat__table">
          <thead>
            <tr>
              <th scope="col" className="xp-mono">signal</th>
              {years.map((y) => (
                <th scope="col" key={y} className="xp-mono">
                  {String(y).slice(2)}
                  <span className="xp-heat__full">{y}</span>
                </th>
              ))}
              <th scope="col" className="xp-mono">yrs</th>
            </tr>
          </thead>
          <tbody>
            {(showAll ? rows : rows.slice(0, HEAT_ROWS)).map((row, ri) => (
              <tr key={row.name} className={`is-${row.kind}`}>
                <th scope="row">
                  <span className={`xp-heat__kind is-${row.kind}`} aria-hidden="true" />
                  {row.name}
                </th>
                {row.cells.map((c) => (
                  <td key={c.y}>
                    <span
                      className="xp-heat__cell"
                      data-level={Math.min(c.using.length, 3)}
                      style={{ animationDelay: `${ri * 25 + (c.y - minYear) * 30}ms` }}
                      title={
                        c.using.length
                          ? `${row.name} · ${c.y}\n${c.using.map((r) => `${r.title} @ ${r.company}`).join("\n")}`
                          : `${row.name} · ${c.y}: —`
                      }
                    />
                  </td>
                ))}
                <td className="xp-mono xp-heat__count">{row.active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="xp-heat__foot xp-mono">
        {rows.length > HEAT_ROWS && (
          <button type="button" className="xp-heat__toggle" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show fewer" : `Show all ${rows.length} signals`}
            <i className={`fa-solid fa-chevron-${showAll ? "up" : "down"}`} aria-hidden="true" />
          </button>
        )}
        <span>
          <span className="xp-heat__kind is-tool" /> tool
        </span>
        <span>
          <span className="xp-heat__kind is-practice" /> practice
        </span>
        <span className="xp-heat__scale">
          less
          <span className="xp-heat__cell" data-level="0" />
          <span className="xp-heat__cell" data-level="1" />
          <span className="xp-heat__cell" data-level="2" />
          <span className="xp-heat__cell" data-level="3" />
          more roles
        </span>
      </div>
    </div>
  );
};

/* ---------- Interactive CV terminal ---------- */

const TERM_SUGGESTIONS = ["help", "whoami", "roles", "stack", "open 1", "uptime", "sudo hire aayush"];

const topTools = () => {
  const count = {};
  roles.forEach((r) => r.stack.tools.forEach((t) => (count[t] = (count[t] || 0) + 1)));
  return Object.keys(count)
    .sort((a, b) => count[b] - count[a])
    .slice(0, 10)
    .map((t) => `${t} ×${count[t]}`);
};

const CvTerminal = ({ onOpenRole }) => {
  const history = useHistory();
  const intro = [
    { t: "dim", s: `Aayush OS — career shell v${new Date().getFullYear() - careerStart.getFullYear()}.${roles.length}` },
    { t: "dim", s: "Type a command, or tap one below. Try 'help'." },
  ];
  const [lines, setLines] = useState(intro);
  const [value, setValue] = useState("");
  const [past, setPast] = useState([]);
  const [cursor, setCursor] = useState(-1);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  const run = (raw) => {
    const cmd = raw.trim();
    if (!cmd) return;
    const [name, ...args] = cmd.toLowerCase().split(/\s+/);
    let out;
    switch (name) {
      case "help":
        out = [
          "whoami          who is this?",
          "roles | ls      list every role",
          "open <n>        open role n in the dossier viewer",
          "stack           most-used tools across roles",
          "uptime          time spent in QA",
          "contact         go to the contact page",
          "clear           wipe the screen",
        ].map((s) => ({ t: "out", s }));
        break;
      case "whoami":
        out = [
          { t: "ok", s: `${greeting.title}` },
          { t: "out", s: `${currentRole.title} @ ${currentRole.company}` },
          { t: "out", s: greeting.nickname.replace(/[^\x20-\x7E]/g, "").trim() },
        ];
        break;
      case "roles":
      case "ls":
        out = roles.map((r, i) => ({
          t: "out",
          s: `${pad(i + 1)}  ${r.start.getFullYear()}  ${r.title} @ ${r.company}${r.end ? "" : "  [active]"}`,
        }));
        out.push({ t: "dim", s: "tip: 'open 3' shows role 03 in the dossier viewer" });
        break;
      case "open": {
        const n = parseInt(args[0], 10);
        if (n >= 1 && n <= roles.length) {
          onOpenRole(n - 1);
          out = [{ t: "ok", s: `opening file ${pad(n)} → ${roles[n - 1].title}` }];
        } else {
          out = [{ t: "err", s: `usage: open <1-${roles.length}>` }];
        }
        break;
      }
      case "stack":
        out = topTools().map((s) => ({ t: "out", s }));
        break;
      case "uptime":
        out = [{ t: "ok", s: `up ${tenure(careerStart, null)} since ${fmt(careerStart)} — 0 regrets` }];
        break;
      case "contact":
        out = [{ t: "ok", s: "routing to /contact …" }];
        setTimeout(() => history.push("/contact"), 700);
        break;
      case "sudo":
      case "hire":
        out = [
          { t: "dim", s: "[sudo] verifying recruiter privileges… ok" },
          { t: "ok", s: "permission granted. opening a line to Aayush →" },
        ];
        setTimeout(() => history.push("/contact"), 1400);
        break;
      case "clear":
        setLines([]);
        return;
      default:
        out = [{ t: "err", s: `command not found: ${name}. try 'help'` }];
    }
    setLines((prev) => prev.concat([{ t: "cmd", s: cmd }], out));
  };

  const submit = (e) => {
    e.preventDefault();
    run(value);
    if (value.trim()) setPast((p) => [value.trim()].concat(p).slice(0, 20));
    setValue("");
    setCursor(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowUp" && past.length) {
      e.preventDefault();
      const next = Math.min(cursor + 1, past.length - 1);
      setCursor(next);
      setValue(past[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = cursor - 1;
      setCursor(next);
      setValue(next >= 0 ? past[next] : "");
    }
  };

  return (
    <div className="xp-term">
      <div className="xp-term__bar">
        <span />
        <span />
        <span />
        <em className="xp-mono">guest@aayush: ~/career</em>
      </div>
      <div className="xp-term__body xp-mono" ref={bodyRef} onClick={() => inputRef.current && inputRef.current.focus()} data-lenis-prevent>
        {lines.map((l, i) => (
          <div key={i} className={`xp-term__line is-${l.t}`}>
            {l.t === "cmd" && <b>❯ </b>}
            {l.s}
          </div>
        ))}
        <form className="xp-term__prompt" onSubmit={submit}>
          <b>❯</b>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Terminal command"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder="type 'help'"
          />
        </form>
      </div>
      <div className="xp-term__chips">
        {TERM_SUGGESTIONS.map((s) => (
          <button type="button" key={s} className="xp-mono" onClick={() => run(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------- Floating section navigator ---------- */

const HUD_SECTIONS = [
  ["xp-hero", "Uptime"],
  ["xp-traj", "Trajectory"],
  ["xp-explore", "Dossiers"],
  ["xp-stack", "Stack"],
  ["xp-shell", "Shell"],
];

const SectionHud = () => {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const visible = {};
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (visible[e.target.id] = e.isIntersecting));
        const current = HUD_SECTIONS.map(([id]) => id).filter((id) => visible[id]);
        setActive(current.length ? current[current.length - 1] : null);
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    HUD_SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={`xp-hud ${active ? "is-visible" : ""}`} aria-label="Page sections">
      {HUD_SECTIONS.map(([id, label], i) => (
        <a
          key={id}
          href={`#${id}`}
          className={active === id ? "is-active" : ""}
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <span className="xp-mono">{pad(i)}</span>
          <em>{label}</em>
          <i aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Experience = ({ theme }) => {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const dossierRef = useRef(null);
  const railRefs = useRef([]);
  const total = roles.length;

  const select = (i, scroll) => {
    const next = (i + total) % total;
    setSelected(next);
    // shareable link: /experience#<role-slug>
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", `#${roles[next].slug}`);
    }
    if (scroll && dossierRef.current) {
      const top = dossierRef.current.getBoundingClientRect().top;
      if (window.innerWidth < 1100 || top < 0 || top > window.innerHeight * 0.6) {
        dossierRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    return next;
  };

  // open the role named in the URL hash, e.g. shared from "Copy link"
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace("#", ""));
    const i = roles.findIndex((r) => r.slug === hash);
    if (i > 0) {
      setSelected(i);
      setTimeout(() => dossierRef.current && dossierRef.current.scrollIntoView({ block: "start" }), 400);
    }
  }, []);

  // Arrow keys step through roles and move focus along with the selection
  const onKeyDown = (e) => {
    let next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = selected + 1;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = selected - 1;
    if (next === null) return;
    e.preventDefault();
    setPlaying(false);
    const idx = select(next);
    if (railRefs.current[idx]) railRefs.current[idx].focus();
  };

  const manual = (i, scroll) => {
    setPlaying(false);
    select(i, scroll);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/experience#${roles[selected].slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setCopied(false);
    }
  };

  const nextRole = roles[(selected + 1) % total];

  const companies = useMemo(() => new Set(roles.map((r) => r.company)).size, []);
  const years = Math.floor((Date.now() - careerStart.getTime()) / (365.25 * 86400000));

  const stats = [
    { value: `${years}+`, label: "Years in QA" },
    { value: workRoles.length, label: "Full-time roles" },
    { value: companies, label: "Organisations" },
    { value: roles.filter((r) => r.type === "community").length, label: "Community programs" },
  ];

  return (
    <div className="experience-main">
      <Header theme={theme} />

      <main className="xp">
        <SectionHud />
        <div className="xp__bg" aria-hidden="true">
          <div className="xp__grid" />
          <div className="xp__beam" />
          <div className="xp__glow xp__glow--a" />
          <div className="xp__glow xp__glow--b" />
        </div>

        <div className="xp__inner">
          {/* ---------- Hero ---------- */}
          <section className="xp-hero" id="xp-hero">
            <div>
              <span className="xp-eyebrow">
                <i /> Experience · career log
              </span>
              <h1 className="xp-title">
                Shipping quality <span>since {careerStart.getFullYear()}.</span>
              </h1>
              <p className="xp-lead">{experience.description}</p>
              <div className="xp-stats">
                {stats.map((s) => (
                  <div className="xp-stat" key={s.label}>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="xp-logos">
                <span className="xp-mono">Teams &amp; programs</span>
                <div className="xp-logos__row">
                  {companyLogos.map((c) => (
                    <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer" title={c.name}>
                      <img src={c.logo} alt={c.name} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="xp-console" onMouseMove={trackPointer}>
              <div className="xp-console__bar">
                <span className="xp-mono">qa_uptime.sh</span>
                <span className="xp-live-chip">● live</span>
              </div>
              <span className="xp-mono xp-console__label">
                uptime since {fmt(careerStart)}
              </span>
              <Uptime since={careerStart} />
              <MusicCard role={currentRole} />
            </div>
          </section>

          {/* ---------- Trajectory ---------- */}
          <section className="xp-section" id="xp-traj" aria-labelledby="xp-traj-title">
            <div className="xp-section__head">
              <div>
                <span className="xp-eyebrow">
                  <i /> 01 · Trajectory
                </span>
                <h2 id="xp-traj-title" className="xp-h2">
                  The whole <span>flight path.</span>
                </h2>
              </div>
              <div className="xp-legend">
                {TYPES.map((t) => (
                  <span key={t} className={`is-${t}`}>
                    <i /> {TYPE_LABEL[t]}
                  </span>
                ))}
              </div>
            </div>
            <Trajectory selected={selected} onSelect={(i) => manual(i, true)} />
          </section>

          {/* ---------- Explorer ---------- */}
          <section className="xp-section" id="xp-explore" aria-labelledby="xp-explore-title">
            <div className="xp-section__head">
              <div>
                <span className="xp-eyebrow">
                  <i /> 02 · Mission dossiers
                </span>
                <h2 id="xp-explore-title" className="xp-h2">
                  Every role, <span>declassified.</span>
                </h2>
              </div>
              <div className="xp-tools">
                <span className="xp-hint xp-mono">
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> to navigate
                </span>
                <button type="button" className={`xp-tool ${playing ? "is-on" : ""}`} onClick={() => setPlaying(!playing)}>
                  <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
                  {playing ? "Pause tour" : "Auto tour"}
                </button>
                <button type="button" className={`xp-tool ${copied ? "is-on" : ""}`} onClick={copyLink}>
                  <i className={`fa-solid ${copied ? "fa-check" : "fa-link"}`} aria-hidden="true" />
                  {copied ? "Link copied" : "Copy link"}
                </button>
              </div>
            </div>

            <div className="xp-explorer">
              <nav className="xp-rail" aria-label="Roles" onKeyDown={onKeyDown}>
                {TYPES.map((type) => {
                  const group = roles.map((r, i) => ({ r, i })).filter(({ r }) => r.type === type);
                  if (!group.length) return null;
                  return (
                    <div className="xp-rail__group" key={type}>
                      <span className="xp-mono xp-rail__title">
                        {group[0].r.section} <em>{group.length}</em>
                      </span>
                      {group.map(({ r, i }) => (
                        <button
                          type="button"
                          key={`${r.title}-${r.company}`}
                          className={`xp-rail__item is-${r.type} ${selected === i ? "is-active" : ""}`}
                          ref={(el) => (railRefs.current[i] = el)}
                          onClick={() => manual(i, true)}
                          aria-current={selected === i ? "true" : undefined}
                        >
                          <span className="xp-rail__logo">{r.logo ? <img src={r.logo} alt="" /> : null}</span>
                          <span className="xp-rail__text">
                            <strong>{r.title}</strong>
                            <span>
                              {r.company} · {r.start.getFullYear()}
                            </span>
                          </span>
                          {!r.end && <span className="xp-rail__live" aria-label="current" />}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>

              <div ref={dossierRef} className="xp-explorer__view">
                <Dossier
                  key={selected}
                  role={roles[selected]}
                  index={selected}
                  total={total}
                  onPrev={() => manual(selected - 1)}
                  onNext={() => manual(selected + 1)}
                  playing={playing}
                  onDone={() => select(selected + 1)}
                />
                <button type="button" className={`xp-upnext is-${nextRole.type}`} onClick={() => manual(selected + 1)}>
                  <span className="xp-mono">up next · {pad(((selected + 1) % total) + 1)}</span>
                  <span className="xp-upnext__logo">{nextRole.logo ? <img src={nextRole.logo} alt="" /> : null}</span>
                  <span className="xp-upnext__text">
                    <strong>{nextRole.title}</strong>
                    <span>
                      {nextRole.company} · {fmt(nextRole.start)}
                    </span>
                  </span>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* ---------- Stack evolution ---------- */}
          <section className="xp-section" id="xp-stack" aria-labelledby="xp-stack-title">
            <div className="xp-section__head">
              <div>
                <span className="xp-eyebrow">
                  <i /> 03 · Stack evolution
                </span>
                <h2 id="xp-stack-title" className="xp-h2">
                  What I ran, <span>year by year.</span>
                </h2>
              </div>
              <p className="xp-note">
                Every tool and practice mentioned across my roles, plotted against the years those roles were active.
                <span className="xp-hint-pointer"> Hover a cell to see which roles it came from.</span>
              </p>
            </div>
            <StackHeatmap />
          </section>

          {/* ---------- Shell ---------- */}
          <section className="xp-section" id="xp-shell" aria-labelledby="xp-shell-title">
            <div className="xp-shell">
              <div className="xp-shell__copy">
                <span className="xp-eyebrow">
                  <i /> 04 · Career shell
                </span>
                <h2 id="xp-shell-title" className="xp-h2">
                  Query the log <span>yourself.</span>
                </h2>
                <p className="xp-lead">
                  Prefer a terminal to a timeline? This shell reads the same data as the rest of the page. List roles,
                  open a dossier, check the stack — or try the command recruiters like best.
                </p>
              </div>
              <CvTerminal onOpenRole={(i) => manual(i, true)} />
            </div>
          </section>
        </div>
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
};

export default Experience;
