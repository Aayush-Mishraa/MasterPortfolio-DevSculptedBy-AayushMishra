import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  degrees,
  certifications,
  experience,
  skills,
} from "../../portfolio";
import "./MagicBento.css";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const CAREER_START = new Date(2022, 3, 1); // April 2022 — first full-time QA role

const workRoles = experience.sections[0].experiences;
const communityRoles = experience.sections[2].experiences.slice(0, 3);
const allTools = skills.data.reduce(
  (acc, group) => acc.concat(group.softwareSkills || []),
  []
);

const projects = [
  { metric: "80%", text: "less manual regression on an e-commerce automation suite" },
  { metric: "15+", text: "browser / device configs in one cross-browser framework" },
  { metric: "AI", text: "test-case generation from user stories with ML models" },
  { metric: "API", text: "contract, performance & security checks in a single pipeline" },
];

const terminalLines = [
  { t: "cmd", s: "npx playwright test --workers=8" },
  { t: "dim", s: "Running 248 tests using 8 workers" },
  { t: "ok", s: "auth › login with OTP", d: "1.2s" },
  { t: "ok", s: "checkout › UPI payment flow", d: "3.4s" },
  { t: "ok", s: "api › GET /orders → 200", d: "0.3s" },
  { t: "ok", s: "visual › dashboard snapshot", d: "2.1s" },
  { t: "ok", s: "a11y › checkout has no violations", d: "0.9s" },
  { t: "sum", s: "248 passed · 0 flaky · 1.8m" },
];

// NOTE: replace these with real recommendations (e.g. from LinkedIn) before
// publishing — names, roles and quotes below are placeholders.
const testimonials = [
  {
    name: "Ankit Verma",
    role: "Engineering Manager",
    company: "Keywords Studios",
    relation: "Managed Aayush directly",
    text:
      "When Aayush joined, our regression cycle took almost two days. He moved the suite to a parallel Selenium Grid on Jenkins and got it under three hours. More than the numbers — devs actually started trusting red builds again.",
  },
  {
    name: "Priya Nair",
    role: "Senior QA Engineer",
    company: "Keywords Studios",
    relation: "Worked on the same team",
    text:
      "He's the person you ping at 11 pm before a release and he's already looking at the logs. His REST Assured framework is still what we onboard new joiners with.",
  },
  {
    name: "Saurabh Kulkarni",
    role: "Tech Lead, Backend",
    company: "Keywords Studios",
    relation: "Worked with Aayush on the API platform",
    text:
      "Aayush reviews test code like production code. Half my API contract bugs got caught in his PR comments before QA even started. Rare mindset for an SDET.",
  },
  {
    name: "Neha Bansal",
    role: "Product Manager",
    company: "Webority Technology",
    relation: "Worked with Aayush on client releases",
    text:
      "I don't come from a testing background, but Aayush explains risk in plain language — what's covered, what isn't, what could break on Monday. It made my go/no-go calls much easier.",
  },
  {
    name: "Vikram Rathore",
    role: "Delivery Head",
    company: "Webority Technology",
    relation: "Aayush reports to Vikram",
    text:
      "Within his first few weeks he set up a proper QA rhythm — test plans, daily triage, automation on every PR. Our clients noticed the difference in UAT.",
  },
  {
    name: "Sneha Iyer",
    role: "QA Engineer",
    company: "Keywords Studios",
    relation: "Mentored by Aayush",
    text:
      "My first Playwright test was written sitting next to him. He never just gave the answer — he'd make me debug the locator myself, then show a cleaner way. Learnt more in six months than the whole year before.",
  },
  {
    name: "Arjun Menon",
    role: "DevOps Engineer",
    company: "Keywords Studios",
    relation: "Worked together on CI/CD",
    text:
      "Flaky tests were killing our pipeline. Aayush built a quarantine and retry report in Jenkins that showed exactly which tests were unstable and why. We went from 'rerun and pray' to green most days.",
  },
  {
    name: "Kavya Reddy",
    role: "Data Scientist",
    company: "Applied AI Root",
    relation: "Worked together on healthcare ML",
    text:
      "He brought a tester's discipline to our data pipelines — validation checks, edge cases, reproducible runs. Very sharp and genuinely humble.",
  },
  {
    name: "Deepak Choudhary",
    role: "Senior Manager, Analytics",
    company: "Delhivery",
    relation: "Mentored Aayush during his internship",
    text:
      "As an intern he owned the freight-rate forecasting work end to end and got it deployed on AWS. Asked the right questions and never needed hand-holding.",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers & hooks                                                     */
/* ------------------------------------------------------------------ */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const initials = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

const AVATAR_GRADIENTS = [
  ["#7c5cff", "#22d3ee"],
  ["#f472b6", "#fb923c"],
  ["#22d3ee", "#4ade80"],
  ["#facc15", "#f97316"],
  ["#a78bfa", "#f472b6"],
  ["#38bdf8", "#6366f1"],
];

const avatarStyle = (name) => {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const [a, b] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
};

const useInView = (options) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options || { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);
  return [ref, inView];
};

const CountUp = ({ to, suffix = "", duration = 1400 }) => {
  const [ref, inView] = useInView();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);
  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
};

const useISTClock = () => {
  const format = () =>
    new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

const ISTClock = () => <span>IST {useISTClock()}</span>;

// Pointer-follow spotlight, written to CSS vars so styling stays in CSS
const trackPointer = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
};

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const Tile = ({ to, className = "", tag, index, children }) => {
  const inner = (
    <>
      <div className="ov-tile__head">
        <span className="ov-tile__tag">{tag}</span>
        <span className="ov-tile__index">{index}</span>
      </div>
      {children}
      {to && (
        <span className="ov-tile__go" aria-hidden="true">
          ↗
        </span>
      )}
    </>
  );
  const cls = `ov-tile ${className}`;
  return to ? (
    <Link to={to} className={cls} onMouseMove={trackPointer}>
      {inner}
    </Link>
  ) : (
    <div className={cls} onMouseMove={trackPointer}>
      {inner}
    </div>
  );
};

const Terminal = () => {
  const [ref, inView] = useInView();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setShown(terminalLines.length);
      return;
    }
    const delay = shown === 0 ? 400 : shown >= terminalLines.length ? 4000 : 520;
    const id = setTimeout(
      () => setShown((n) => (n >= terminalLines.length ? 0 : n + 1)),
      delay
    );
    return () => clearTimeout(id);
  }, [inView, shown]);

  return (
    <div className="ov-term" ref={ref}>
      <div className="ov-term__bar">
        <span />
        <span />
        <span />
        <em>qa-pipeline — zsh</em>
      </div>
      <div className="ov-term__body" aria-label="Sample automated test run">
        {terminalLines.slice(0, shown).map((line, i) => (
          <div key={i} className={`ov-term__line is-${line.t}`}>
            {line.t === "cmd" && <b>❯ </b>}
            {line.t === "ok" && <b>✓ </b>}
            {line.s}
            {line.d && <i>{line.d}</i>}
          </div>
        ))}
        <span className="ov-term__cursor" />
      </div>
    </div>
  );
};

const TestimonialCard = ({ item }) => (
  <figure className="ov-quote">
    <blockquote>{item.text}</blockquote>
    <figcaption>
      <span className="ov-avatar" style={avatarStyle(item.name)}>
        {initials(item.name)}
      </span>
      <span className="ov-quote__who">
        <strong>{item.name}</strong>
        <span>
          {item.role} · {item.company}
        </span>
      </span>
    </figcaption>
  </figure>
);

const FeaturedTestimonials = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const featured = testimonials.slice(0, 5);

  // The progress bar's CSS animation drives rotation, so hover-pause stays in sync
  const advance = (e) => {
    if (e.animationName === "ov-progress") {
      setActive((a) => (a + 1) % featured.length);
    }
  };

  const item = featured[active];

  return (
    <div
      className="ov-featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="ov-featured__mark" aria-hidden="true">
        “
      </span>
      <blockquote key={active} className="ov-featured__text">
        {item.text}
      </blockquote>
      <div className="ov-featured__foot">
        <div className="ov-featured__who" key={`who-${active}`}>
          <span className="ov-avatar ov-avatar--lg" style={avatarStyle(item.name)}>
            {initials(item.name)}
          </span>
          <span>
            <strong>{item.name}</strong>
            <span>
              {item.role} · {item.company}
            </span>
            <em>{item.relation}</em>
          </span>
        </div>
        <div className="ov-featured__nav" role="tablist" aria-label="Testimonials">
          {featured.map((t, i) => (
            <button
              key={t.name}
              role="tab"
              aria-selected={i === active}
              aria-label={`Testimonial from ${t.name}`}
              className={`ov-featured__pip ${i === active ? "is-active" : ""} ${
                paused ? "is-paused" : ""
              }`}
              onClick={() => setActive(i)}
            >
              <span onAnimationEnd={i === active ? advance : undefined} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

const MagicBento = () => {
  const years = Math.floor(
    (Date.now() - CAREER_START.getTime()) / (365.25 * 24 * 3600 * 1000)
  );
  const current = workRoles[0];
  const marqueeRowA = testimonials.slice(4);
  const marqueeRowB = testimonials.slice(0, 5).reverse();

  const stats = [
    { value: years, suffix: "+", label: "Years shipping quality" },
    { value: allTools.length, suffix: "", label: "Tools in the stack" },
    { value: certifications.certifications.length, suffix: "", label: "Certifications" },
    { value: degrees.degrees.length, suffix: "", label: "Degrees, CS & AI" },
  ];

  return (
    <section className="ov" aria-labelledby="ov-title">
      <div className="ov__bg" aria-hidden="true">
        <div className="ov__grid" />
        <div className="ov__aurora ov__aurora--a" />
        <div className="ov__aurora ov__aurora--b" />
      </div>

      <div className="ov__inner">
        {/* ---------- Header ---------- */}
        <header className="ov-head">
          <div>
            <span className="ov-eyebrow">
              <i /> Portfolio overview
            </span>
            <h2 id="ov-title" className="ov-title">
              Quality, <span>engineered.</span>
            </h2>
            <p className="ov-sub">
              Frameworks, pipelines and people — a live snapshot of how I build
              software that doesn't break on release day.
            </p>
          </div>

          <div className="ov-status">
            <div className="ov-status__row">
              <span className="ov-pulse" />
              <span>Open to Senior SDET &amp; QA Lead roles</span>
            </div>
            <div className="ov-status__meta">
              <ISTClock />
              <span>India · Remote / Hybrid</span>
            </div>
          </div>
        </header>

        {/* ---------- Stats ---------- */}
        <div className="ov-stats">
          {stats.map((s) => (
            <div className="ov-stat" key={s.label}>
              <span className="ov-stat__num">
                <CountUp to={s.value} suffix={s.suffix} />
              </span>
              <span className="ov-stat__label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ---------- Bento ---------- */}
        <div className="ov-bento">
          <Tile to="/experience" className="ov-span-7" tag="Experience" index="01">
            <h3 className="ov-tile__title">Career log</h3>
            <p className="ov-tile__lead">
              Currently <strong>{current.title}</strong> at{" "}
              <strong>{current.company}</strong>, leading QA strategy and
              automation.
            </p>
            <ol className="ov-timeline">
              {workRoles.map((role, i) => (
                <li key={role.title} className={i === 0 ? "is-current" : ""}>
                  <span className="ov-timeline__dot" />
                  <div>
                    <strong>{role.title}</strong>
                    <span>{role.company}</span>
                  </div>
                  <time>{role.duration}</time>
                </li>
              ))}
            </ol>
          </Tile>

          <Tile to="/automation-arsenal" className="ov-span-5 ov-tile--flush" tag="Live run" index="02">
            <Terminal />
          </Tile>

          <Tile to="/education" className="ov-span-4" tag="Education" index="03">
            <h3 className="ov-tile__title">Academics</h3>
            <ul className="ov-list">
              {degrees.degrees.map((d) => (
                <li key={d.subtitle}>
                  <strong>{d.subtitle}</strong>
                  <span>
                    {d.title} · {d.duration}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile to="/education" className="ov-span-4" tag="Certificates" index="04">
            <h3 className="ov-tile__title">Verified skills</h3>
            <div className="ov-chips">
              {certifications.certifications.slice(0, 7).map((c, i) => (
                <span className="ov-chip" key={`${c.title}-${i}`}>
                  {c.title}
                </span>
              ))}
              {certifications.certifications.length > 7 && (
                <span className="ov-chip ov-chip--more">
                  +{certifications.certifications.length - 7} more
                </span>
              )}
            </div>
          </Tile>

          <Tile to="/automation-arsenal" className="ov-span-4" tag="Skills" index="05">
            <h3 className="ov-tile__title">Technical depth</h3>
            <ul className="ov-domains">
              {skills.data.map((group) => (
                <li key={group.title}>
                  <span>{group.title}</span>
                  <span className="ov-domains__icons">
                    {group.softwareSkills.slice(0, 4).map((s) => (
                      <span
                        key={s.skillName}
                        className="iconify"
                        data-icon={s.fontAwesomeClassname}
                        data-inline="false"
                        title={s.skillName}
                        style={{ color: (s.style && s.style.color) || "#e8ecf5" }}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile to="/projects" className="ov-span-7" tag="Projects" index="06">
            <h3 className="ov-tile__title">Solutions built</h3>
            <div className="ov-metrics">
              {projects.map((p) => (
                <div className="ov-metric" key={p.text}>
                  <span className="ov-metric__num">{p.metric}</span>
                  <span className="ov-metric__text">{p.text}</span>
                </div>
              ))}
            </div>
          </Tile>

          <Tile to="/experience" className="ov-span-5" tag="Community" index="07">
            <h3 className="ov-tile__title">Beyond the job</h3>
            <ul className="ov-list">
              {communityRoles.map((r) => (
                <li key={r.title}>
                  <strong>{r.title}</strong>
                  <span>
                    {r.company} · {r.duration}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>
        </div>

        {/* ---------- Tool marquee ---------- */}
        <div className="ov-marquee ov-marquee--tools" aria-label="Tools I work with">
          <div className="ov-marquee__track">
            {allTools.concat(allTools).map((s, i) => (
              <span className="ov-tool" key={`${s.skillName}-${i}`} aria-hidden={i >= allTools.length}>
                <span
                  className="iconify"
                  data-icon={s.fontAwesomeClassname}
                  data-inline="false"
                  style={{ color: (s.style && s.style.color) || "#e8ecf5" }}
                />
                {s.skillName}
              </span>
            ))}
          </div>
        </div>

        {/* ---------- Testimonials ---------- */}
        <div className="ov-testimonials">
          <div className="ov-testimonials__head">
            <span className="ov-eyebrow">
              <i /> Testimonials
            </span>
            <h3 className="ov-h3">
              From the people I've <span>shipped with.</span>
            </h3>
          </div>

          <FeaturedTestimonials />

          <div className="ov-marquee" aria-label="More testimonials">
            <div className="ov-marquee__track ov-marquee__track--slow">
              {marqueeRowA.concat(marqueeRowA).map((t, i) => (
                <TestimonialCard item={t} key={`a-${i}`} />
              ))}
            </div>
          </div>
          <div className="ov-marquee">
            <div className="ov-marquee__track ov-marquee__track--slow ov-marquee__track--reverse">
              {marqueeRowB.concat(marqueeRowB).map((t, i) => (
                <TestimonialCard item={t} key={`b-${i}`} />
              ))}
            </div>
          </div>
        </div>

        {/* ---------- CTA ---------- */}
        <div className="ov-cta" onMouseMove={trackPointer}>
          <div>
            <h3>Flaky suite? Slow releases?</h3>
            <p>Let's build a pipeline your team actually trusts.</p>
          </div>
          <Link to="/contact" className="ov-btn">
            Start a conversation <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MagicBento;
