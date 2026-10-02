import React, { useMemo, useState } from "react";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import {
  degrees,
  certifications,
  competitiveSites,
  experience,
} from "../../portfolio";
import { useOnScreen } from "../projects/lib/ui";
import "./EducationComponent.css";
import "./EducationPage.css";

/* ------------------------------------------------------------------ */
/* Data shaping — everything below is derived from portfolio.js        */
/* ------------------------------------------------------------------ */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "April 2023 - April 2026" -> { year: 2023, month: 3 }
const parseStart = (duration) => {
  const start = (duration || "").split("-")[0].trim().toLowerCase();
  const year = parseInt((start.match(/\d{4}/) || ["0"])[0], 10);
  const month = MONTHS.findIndex((m) => start.indexOf(m) === 0);
  return { year, month: month < 0 ? 0 : month };
};

const parseEndYear = (duration) => {
  const end = (duration || "").split("-")[1] || "";
  const match = end.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
};

const shortHash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
};

const cleanLine = (line) => line.replace(/^[^A-Za-z0-9]+/, "").trim();

const logoFor = (path) => {
  try {
    return require(`../../assets/images/${path}`);
  } catch (e) {
    return null;
  }
};

const CATEGORIES = [
  { id: "testing", label: "Testing & QA", match: /selenium|playwright|rest assured|postman|cypress|appium/i },
  { id: "ai", label: "AI / ML & Data", match: /machine learning|data science|python|\bml\b|\bdl\b|tensorflow|\bai\b/i },
  { id: "mobile", label: "Mobile", match: /swift|ios|android/i },
];

const categorize = (cert) => {
  const found = CATEGORIES.find((c) => c.match.test(cert.title));
  return found ? found.id : "other";
};

const credentials = certifications.certifications.map((cert, i) => ({
  ...cert,
  id: `${cert.title}-${i}`,
  category: categorize(cert),
  logo: logoFor(cert.logo_path),
  instructor: cert.subtitle.replace(/^-\s*/, "").trim(),
  verifiable: /^https?:\/\//.test(cert.certificate_link || ""),
  serial: shortHash(cert.title + i).toUpperCase(),
}));

const buildTimeline = () => {
  const events = [];
  degrees.degrees.forEach((d) => {
    const start = parseStart(d.duration);
    const end = parseEndYear(d.duration);
    events.push({ type: "edu", year: start.year, month: start.month, verb: "enrol", title: d.subtitle, where: d.title });
    if (end) {
      events.push({ type: "edu", year: end, month: 5, verb: "graduate", title: d.subtitle, where: d.title });
    }
  });
  experience.sections.forEach((section, si) => {
    const type = si === 0 ? "work" : si === 1 ? "intern" : "community";
    section.experiences.forEach((e) => {
      const start = parseStart(e.duration);
      events.push({ type, year: start.year, month: start.month, verb: "join", title: e.title, where: e.company });
    });
  });
  return events
    .filter((e) => e.year > 0)
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((e) => ({ ...e, hash: shortHash(`${e.verb}${e.title}${e.where}${e.year}`) }));
};

const BRANCH = {
  edu: "edu",
  work: "career",
  intern: "internship",
  community: "community",
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const trackTilt = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
  el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
  el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
};

const resetTilt = (e) => {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
};

const Orbit = () => {
  // the rings and logos spin forever: paused while scrolled out of view
  const [orbitRef, onScreen] = useOnScreen();
  const inner = credentials.filter((c) => c.logo).slice(0, 5);
  const outer = credentials.filter((c) => c.logo).slice(5, 12);
  const ring = (items, cls) => (
    <div className={`edu-orbit__ring ${cls}`}>
      {items.map((c, i) => (
        <span
          key={c.id}
          className="edu-orbit__node"
          style={{ "--angle": `${(360 / items.length) * i}deg` }}
          title={c.title}
        >
          <img src={c.logo} alt="" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={`edu-orbit ${onScreen ? "" : "is-off"}`} aria-hidden="true" ref={orbitRef}>
      {ring(outer, "edu-orbit__ring--outer")}
      {ring(inner, "edu-orbit__ring--inner")}
      <div className="edu-orbit__core">
        <i className="fa-solid fa-graduation-cap" />
        <strong>{credentials.length + degrees.degrees.length}</strong>
        <span>credentials</span>
      </div>
    </div>
  );
};

const GitLog = ({ events }) => (
  <div className="edu-git" onMouseMove={trackTilt}>
    <div className="edu-git__bar">
      <span />
      <span />
      <span />
      <em>~/aayush $ git log --graph --oneline learning</em>
    </div>
    <ol className="edu-git__list">
      {events.map((e, i) => (
        <li key={e.hash} className={`edu-git__row is-${e.type}`}>
          <span className="edu-git__node" aria-hidden="true" />
          <code className="edu-git__hash">{e.hash}</code>
          <span className="edu-git__msg">
            {i === 0 && <span className="edu-git__head">HEAD → main</span>}
            <span className="edu-git__branch">{BRANCH[e.type]}</span>
            <span className="edu-git__verb">{e.verb}:</span> {e.title}
            <span className="edu-git__where"> @ {e.where}</span>
          </span>
          <time className="edu-git__year">{e.year}</time>
        </li>
      ))}
    </ol>
  </div>
);

const DegreeCard = ({ degree, index }) => {
  const logo = logoFor(degree.logo_path);
  const start = parseStart(degree.duration).year;
  const end = parseEndYear(degree.duration);
  const years = end ? end - start : null;
  const highlights = degree.descriptions.map(cleanLine);
  const level = /master/i.test(degree.subtitle) ? "Postgraduate" : "Undergraduate";

  return (
    <article className="edu-degree" onMouseMove={trackTilt}>
      <div className="edu-degree__top">
        <div className="edu-degree__seal">
          {logo ? <img src={logo} alt={degree.alt_name} /> : <i className="fa-solid fa-building-columns" />}
        </div>
        <div className="edu-degree__meta">
          <span className="edu-kicker">
            {String(index + 1).padStart(2, "0")} · {level}
          </span>
          <h3>{degree.subtitle}</h3>
          <p>{degree.title}</p>
        </div>
      </div>

      <div className="edu-degree__span">
        <span>{start}</span>
        <div className="edu-degree__track">
          <i style={{ width: "100%" }} />
        </div>
        <span>{end || "Now"}</span>
        {years ? <em>{years} yrs</em> : null}
      </div>

      <ul className="edu-degree__list">
        {highlights.map((h) => (
          <li key={h.slice(0, 40)}>{h}</li>
        ))}
      </ul>

      {degree.website_link && (
        <a className="edu-link" href={degree.website_link} target="_blank" rel="noopener noreferrer">
          Visit institution <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
        </a>
      )}
    </article>
  );
};

// Provider brand colours (matched on logo file / title), used to tint each card
const BRANDS = [
  [/aws|amazon/i, "#FF9900"],
  [/deeplearning/i, "#2F7BF6"],
  [/ibm/i, "#1F70C1"],
  [/selenium/i, "#43B02A"],
  [/playwright/i, "#2EAD33"],
  [/postman/i, "#FF6C37"],
  [/swift/i, "#FA7343"],
  [/google|gcp/i, "#4285F4"],
  [/rest-assured|rest assured/i, "#7CB342"],
  [/campusx/i, "#F59E0B"],
  [/applied_root/i, "#14B8A6"],
];
const FALLBACK_BRANDS = ["#6366F1", "#8B5CF6", "#EC4899", "#10B981"];

const brandFor = (cred, index) => {
  const key = `${cred.logo_path} ${cred.title}`;
  const hit = BRANDS.find(([re]) => re.test(key));
  const hex = hit ? hit[1] : FALLBACK_BRANDS[index % FALLBACK_BRANDS.length];
  const n = parseInt(hex.slice(1), 16);
  return { hex, rgb: `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}` };
};

const Credential = ({ cred, index }) => {
  const Tag = cred.verifiable ? "a" : "div";
  const linkProps = cred.verifiable
    ? { href: cred.certificate_link, target: "_blank", rel: "noopener noreferrer" }
    : {};
  const brand = brandFor(cred, index);
  const category = (CATEGORIES.find((c) => c.id === cred.category) || { label: "General" }).label;

  return (
    <Tag
      className={`edu-cred ${cred.verifiable ? "is-verified" : ""}`}
      style={{ "--brand": brand.hex, "--brand-rgb": brand.rgb, animationDelay: `${index * 40}ms` }}
      onMouseMove={trackTilt}
      onMouseLeave={resetTilt}
      {...linkProps}
    >
      <span className="edu-cred__holo" aria-hidden="true" />
      <span className="edu-cred__shine" aria-hidden="true" />

      <div className="edu-cred__media">
        <span className="edu-cred__cat">{category}</span>
        {cred.verifiable && (
          <span className="edu-cred__seal" title="Verifiable certificate">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <path id={`seal-${cred.serial}`} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
              </defs>
              <text>
                <textPath href={`#seal-${cred.serial}`}>VERIFIED · VERIFIED · VERIFIED ·</textPath>
              </text>
            </svg>
            <i className="fa-solid fa-check" aria-hidden="true" />
          </span>
        )}
        <div className="edu-cred__logo">
          {cred.logo ? <img src={cred.logo} alt={`${cred.alt_name} logo`} /> : <i className="fa-solid fa-certificate" />}
        </div>
      </div>

      <div className="edu-cred__body">
        <span className="edu-cred__kicker">
          Certificate <em>#{cred.serial}</em>
        </span>
        <h4>{cred.title}</h4>
        {cred.instructor && <p className="edu-cred__by">— {cred.instructor}</p>}
        <p className="edu-cred__issuer">{cred.alt_name}</p>
      </div>

      <span className="edu-cred__cta">
        {cred.verifiable ? (
          <>
            Click to view certificate <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </>
        ) : (
          <>
            <i className="fa-regular fa-clock" aria-hidden="true" /> Certificate link coming soon
          </>
        )}
      </span>
    </Tag>
  );
};

const CredentialWallet = () => {
  // the certificate seals spin forever: paused while the wallet is off-screen
  const [walletRef, walletOn] = useOnScreen();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const tabs = useMemo(() => {
    const present = CATEGORIES.filter((c) => credentials.some((x) => x.category === c.id));
    const other = credentials.some((x) => x.category === "other");
    return [
      { id: "all", label: "All" },
      ...present,
      ...(other ? [{ id: "other", label: "General" }] : []),
    ].map((t) => ({
      ...t,
      count: t.id === "all" ? credentials.length : credentials.filter((c) => c.category === t.id).length,
    }));
  }, []);

  const q = query.trim().toLowerCase();
  const visible = credentials.filter(
    (c) =>
      (filter === "all" || c.category === filter) &&
      (!q || `${c.title} ${c.instructor} ${c.alt_name}`.toLowerCase().indexOf(q) !== -1)
  );

  return (
    <section className={`edu-section ${walletOn ? "" : "is-off"}`} aria-labelledby="edu-creds-title" ref={walletRef}>
      <div className="edu-section__head edu-section__head--row">
        <div>
          <span className="edu-eyebrow">
            <i /> 03 · Credential wallet
          </span>
          <h2 id="edu-creds-title" className="edu-h2">
            Certifications, <span>verified.</span>
          </h2>
        </div>
        <label className="edu-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search credentials…"
            aria-label="Search certifications"
          />
        </label>
      </div>

      <div className="edu-tabs" role="tablist" aria-label="Filter certifications">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            className={`edu-tab ${filter === t.id ? "is-active" : ""}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
            <span>{t.count}</span>
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className="edu-wallet">
          {visible.map((c, i) => (
            <Credential key={c.id} cred={c} index={i} />
          ))}
        </div>
      ) : (
        <div className="edu-empty">
          <code>0 results</code> — no credential matches “{query}”.
          <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Education = ({ theme }) => {
  const timeline = useMemo(buildTimeline, []);
  const firstYear = timeline.length ? timeline[timeline.length - 1].year : 2013;
  const years = new Date().getFullYear() - firstYear;
  const verified = credentials.filter((c) => c.verifiable).length;
  const sites = competitiveSites.competitiveSites;

  const stats = [
    { value: degrees.degrees.length, label: "Degrees" },
    { value: credentials.length, label: "Certifications" },
    { value: verified, label: "Verifiable online" },
    { value: `${years}+`, label: `Years learning, since ${firstYear}` },
  ];

  return (
    <div className="education-main">
      <Header theme={theme} />

      <main className="edu">
        <div className="edu__bg" aria-hidden="true">
          <div className="edu__grid" />
          <div className="edu__glow edu__glow--a" />
          <div className="edu__glow edu__glow--b" />
        </div>

        <div className="edu__inner">
          {/* ---------- Hero ---------- */}
          <section className="edu-hero">
            <div className="edu-hero__copy">
              <span className="edu-eyebrow">
                <i /> Education &amp; certifications
              </span>
              <h1 className="edu-title">
                Always <span>in beta.</span>
              </h1>
              <p className="edu-lead">
                A Computer Engineering foundation, a Master's in Data Science &amp; AI, and
                a steady stream of certifications — because good testers never stop asking
                “what else could break?”
              </p>
              <div className="edu-stats">
                {stats.map((s) => (
                  <div className="edu-stat" key={s.label}>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <Orbit />
          </section>

          {/* ---------- Degrees ---------- */}
          <section className="edu-section" aria-labelledby="edu-degrees-title">
            <div className="edu-section__head">
              <span className="edu-eyebrow">
                <i /> 01 · Degrees
              </span>
              <h2 id="edu-degrees-title" className="edu-h2">
                The <span>foundation.</span>
              </h2>
            </div>
            <div className="edu-degrees">
              {degrees.degrees
                .slice()
                .reverse()
                .map((d, i) => (
                  <DegreeCard key={d.subtitle} degree={d} index={i} />
                ))}
            </div>
          </section>

          {/* ---------- Git log timeline ---------- */}
          <section className="edu-section" aria-labelledby="edu-log-title">
            <div className="edu-section__head edu-section__head--row">
              <div>
                <span className="edu-eyebrow">
                  <i /> 02 · Learning log
                </span>
                <h2 id="edu-log-title" className="edu-h2">
                  Every commit, <span>since {firstYear}.</span>
                </h2>
              </div>
              <div className="edu-legend">
                {Object.keys(BRANCH).map((k) => (
                  <span key={k} className={`is-${k}`}>
                    <i /> {BRANCH[k]}
                  </span>
                ))}
              </div>
            </div>
            <GitLog events={timeline} />
          </section>

          {/* ---------- Credentials ---------- */}
          <CredentialWallet />

          {/* ---------- Practice platforms ---------- */}
          <section className="edu-section" aria-labelledby="edu-practice-title">
            <div className="edu-section__head">
              <span className="edu-eyebrow">
                <i /> 04 · Practice arenas
              </span>
              <h2 id="edu-practice-title" className="edu-h2">
                Where I keep <span>sharp.</span>
              </h2>
            </div>
            <div className="edu-arenas">
              {sites.map((s) => {
                const Tag = s.profileLink ? "a" : "div";
                const props = s.profileLink
                  ? { href: s.profileLink, target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <Tag key={s.siteName} className="edu-arena" onMouseMove={trackTilt} {...props}>
                    <span className="edu-arena__icon" style={{ "--brand": s.style.color }}>
                      <span className="iconify" data-icon={s.iconifyClassname} data-inline="false" />
                    </span>
                    <strong>{s.siteName}</strong>
                  </Tag>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
};

export default Education;
