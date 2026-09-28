import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { greeting, socialMediaLinks, contactPageData } from "../../portfolio.js";
import {
  mix,
  themeVars,
  prefersReducedMotion,
  useInView,
  useNow,
  useSpotlight,
  useDocumentTitle,
} from "../projects/lib/ui";
import "./ContactComponent.css";

/* ------------------------------------------------------------------ */
/* Data — everything is derived from portfolio.js                      */
/* ------------------------------------------------------------------ */

const info = contactPageData.contactSection;
const blog = contactPageData.blogSection;
const address = contactPageData.addressSection;
const EMAIL = info.email;
const OFFSET = info.utcOffsetMinutes;
const WORK = info.workingHours;
const TOPICS = info.topics || [];
const DRAFT_KEY = "contact-draft-v1";
// The visitor's "reasonable" hours used for overlap planning
const VISITOR_DAY = { start: 9, end: 21 };

const INTENTS = [
  { id: "full-time", label: "Full-time role", icon: "fa-solid fa-briefcase", hint: "Tell me about the team, the product, and what quality looks like there today." },
  { id: "freelance", label: "Freelance project", icon: "fa-solid fa-rocket", hint: "What are you building, and where does testing hurt the most right now?", scoped: true },
  { id: "audit", label: "Automation audit", icon: "fa-solid fa-magnifying-glass-chart", hint: "Share your stack, current coverage, and what keeps breaking in CI.", scoped: true },
  { id: "collab", label: "Collaboration", icon: "fa-solid fa-people-arrows", hint: "An open-source idea, a side project, a talk? I'm listening." },
  { id: "mentoring", label: "Mentoring", icon: "fa-solid fa-graduation-cap", hint: "Where are you in your QA / SDET journey, and where do you want to be?" },
  { id: "hello", label: "Just saying hi", icon: "fa-regular fa-hand", hint: "No agenda needed. Say hello." },
];
const TIMELINES = ["ASAP", "< 1 month", "1–3 months", "Flexible"];
const PROCESS = info.process || [];

// Starter structures offered while the message box is empty
const TEMPLATES = {
  "full-time": "Hi Aayush,\n\nRole: \nTeam / product: \nWhat the role owns: \nLocation / remote: \n\nThanks!",
  freelance: "Hi Aayush,\n\nProject: \nStack: \nWhat needs testing: \nBudget range: \n",
  audit: "Hi Aayush,\n\nStack: \nCurrent test coverage: \nWhat breaks most often: \nCI tool: \n",
  collab: "Hi Aayush,\n\nThe idea: \nWhat I'd love to build together: \n",
  mentoring: "Hi Aayush,\n\nWhere I am today: \nWhere I want to be: \nWhat I'd like help with: \n",
  hello: "Hi Aayush! ",
};

const BLURBS = {
  github: "Code, issues & open source",
  linkedin: "Roles, referrals & intros",
  instagram: "Life away from the keyboard",
  kaggle: "Datasets, notebooks & ML",
};

const iconClass = (icon) => (/fa-(brands|solid|regular)/.test(icon) ? icon : `fa-brands ${icon}`);

const handleOf = (url) => {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.length ? `@${parts[parts.length - 1].replace(/^@/, "")}` : new URL(url).hostname;
  } catch (e) {
    return url;
  }
};

const isDimColor = (hex) => {
  const v = parseInt(String(hex).replace("#", ""), 16);
  if (Number.isNaN(v)) return false;
  return 0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255) < 40;
};

const channels = [
  { id: "email", name: "Email", href: `mailto:${EMAIL}`, icon: "fa-solid fa-envelope", color: "#D14836", handle: EMAIL, blurb: "Detailed briefs & proposals" },
  ...socialMediaLinks
    .filter((s) => !s.link.startsWith("mailto") && !s.link.startsWith("tel"))
    .map((s) => ({
      id: s.name.toLowerCase(),
      name: s.name,
      href: s.link,
      icon: iconClass(s.fontAwesomeIcon),
      color: s.backgroundColor,
      handle: handleOf(s.link),
      blurb: BLURBS[s.name.toLowerCase()] || "Say hello",
    })),
  { id: "blog", name: "Blog", href: blog.link, icon: "fa-brands fa-medium", color: "#12100E", handle: handleOf(blog.link), blurb: "Long-form engineering notes" },
  { id: "resume", name: "Resume", href: greeting.resumeLink, icon: "fa-solid fa-file-lines", color: "#0E6BA8", handle: "Google Drive · PDF", blurb: "One-page career summary" },
];
const orbiters = channels.filter((c) => c.id !== "resume");

const profileImage = (() => {
  try {
    return require(`../../assets/images/${info.profile_image_path}`);
  } catch (e) {
    return null;
  }
})();

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, "0");
const mod = (n, m) => ((n % m) + m) % m;
const hhmm = (mins) => `${pad(Math.floor(mod(mins, 1440) / 60))}:${pad(mod(mins, 1440) % 60)}`;
const zoneMinutes = (date, offset) => mod(date.getUTCHours() * 60 + date.getUTCMinutes() + offset, 1440);

const fmtOffset = (mins) => {
  const abs = Math.abs(mins);
  return `UTC${mins >= 0 ? "+" : "−"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

const fmtDuration = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
};

const availability = (now) => {
  const local = zoneMinutes(now, OFFSET);
  const start = WORK.start * 60;
  const end = WORK.end * 60;
  const online = local >= start && local < end;
  return { online, until: online ? end - local : mod(start - local, 1440) };
};

// Split the visitor's 24h day into runs where I'm working, they're awake, and both
const syncWindows = (visitorOffset) => {
  const step = 15;
  const rows = { me: [], you: [], both: [] };
  const push = (list, t) => {
    const last = list[list.length - 1];
    if (last && last[1] === t) last[1] = t + step;
    else list.push([t, t + step]);
  };
  for (let t = 0; t < 1440; t += step) {
    const mine = mod(t - visitorOffset + OFFSET, 1440);
    const me = mine >= WORK.start * 60 && mine < WORK.end * 60;
    const you = t >= VISITOR_DAY.start * 60 && t < VISITOR_DAY.end * 60;
    if (me) push(rows.me, t);
    if (you) push(rows.you, t);
    if (me && you) push(rows.both, t);
  }
  return { ...rows, total: rows.both.reduce((sum, [a, b]) => sum + b - a, 0) };
};

const visitorZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "your timezone";
  } catch (e) {
    return "your timezone";
  }
})();

/* ------------------------------------------------------------------ */
/* Small hooks                                                         */
/* ------------------------------------------------------------------ */

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }
};

// Tiny toast bus so any piece of the page can confirm an action
const toastListeners = new Set();
const notify = (message, icon = "fa-solid fa-check") => toastListeners.forEach((fn) => fn({ message, icon, id: Date.now() }));

const Toaster = () => {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    let timer;
    const show = (t) => {
      setToast(t);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 2400);
    };
    toastListeners.add(show);
    return () => {
      toastListeners.delete(show);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="ct-toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="ct-toast" key={toast.id}>
          <i className={toast.icon} aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </div>
  );
};

const useCopy = () => {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (text, key = "default", label = "Copied to clipboard") => {
    const ok = await copyText(text);
    setCopied(ok ? key : null);
    notify(ok ? label : "Couldn't copy. Please select it manually.", ok ? "fa-solid fa-check" : "fa-solid fa-triangle-exclamation");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }, []);
  return [copied, copy];
};

/* Contact card (.vcf) generated in the browser */
const downloadVCard = () => {
  const [first, ...rest] = greeting.title.split(" ");
  const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(rest.join(" "))};${esc(first)};;;`,
    `FN:${esc(greeting.title)}`,
    `TITLE:${esc((greeting.nickname || "").replace(/[^\w\s&/()-]/g, "").trim())}`,
    `EMAIL;TYPE=INTERNET,PREF:${EMAIL}`,
    `URL:${window.location.origin}`,
    `ADR;TYPE=WORK:;;;${esc(address.locality)};;;${esc(address.country)}`,
    ...socialMediaLinks
      .filter((s) => /^https?:/.test(s.link))
      .map((s) => `X-SOCIALPROFILE;TYPE=${s.name.toLowerCase()}:${s.link}`),
    `NOTE:${esc(`Replies within ${info.responseTime}. Working hours ${WORK.start}:00-${WORK.end}:00 IST.`)}`,
    "END:VCARD",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/vcard" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${greeting.title.toLowerCase().replace(/\s+/g, "-")}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("Contact card downloaded", "fa-solid fa-address-card");
};

/* Keep accent-coloured text and buttons legible on every theme */
const luminance = (hex) => {
  const [r, g, b] = hexRgb(hex)
    .split(",")
    .map((c) => {
      const v = Number(c) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Nudge `color` toward `toward` until it reaches `min` contrast against `bg`
const legible = (color, bg, toward, min) => {
  for (let t = 0; t <= 1.001; t += 0.1) {
    const c = mix(color, toward, t);
    if (contrast(c, bg) >= min) return c;
  }
  return toward;
};

const accentVars = (theme) => {
  const bg = theme.body || "#EDF9FE";
  const ink = theme.text || "#001C55";
  const accent = theme.imageHighlight || "#0E6BA8";
  const accentInk = legible(accent, bg, ink, 3.2);
  const button = contrast(accent, bg) >= 1.8 ? accent : accentInk;
  const onButton = contrast(button, "#ffffff") >= contrast(button, "#111111") ? "#ffffff" : "#111111";
  return { "--c-accent-ink": accentInk, "--c-btn": button, "--c-on-btn": onButton };
};

/* Sticky dot rail that tracks which section is on screen */
const SECTIONS = [
  { id: "ct-top", label: "Hello" },
  { id: "ct-help", label: "Services" },
  { id: "compose", label: "Compose" },
  { id: "ct-next", label: "What's next" },
  { id: "ct-channels", label: "Channels" },
  { id: "ct-base", label: "Timezones" },
];

const SectionRail = () => {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="ct-rail" aria-label="Page sections">
      {SECTIONS.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} onClick={scrollToId(s.id)} className={active === s.id ? "is-on" : ""} aria-current={active === s.id ? "true" : undefined}>
          <span className="ct-mono">
            {pad(i + 1)} · {s.label}
          </span>
          <i />
        </a>
      ))}
    </nav>
  );
};

const scrollToId = (id) => (event) => {
  const el = document.getElementById(id);
  if (!el) return;
  event.preventDefault();
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
};

const Reveal = ({ as: Tag = "section", className = "", children, ...rest }) => {
  const [ref, inView] = useInView();
  return (
    <Tag ref={ref} className={`${className} ct-reveal${inView ? " is-in" : ""}`} {...rest}>
      {children}
    </Tag>
  );
};

/* ------------------------------------------------------------------ */
/* Signal field — a pointer-reactive constellation behind the hero     */
/* ------------------------------------------------------------------ */

const hexRgb = (hex) => {
  const clean = String(hex || "").replace("#", "");
  const v = parseInt(clean.length === 3 ? clean.replace(/./g, "$&$&") : clean.slice(0, 6), 16);
  return Number.isNaN(v) ? "14,107,168" : `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
};

const SignalField = memo(({ color }) => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return undefined;
    const rgb = hexRgb(color);
    const still = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999 };
    let w = 0;
    let h = 0;
    let nodes = [];
    let frame = null;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 15000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.5 + 0.6,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      nodes.forEach((n) => {
        if (!still) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < 170 && d > 1) {
            n.vx += (dx / d) * 0.012;
            n.vy += (dy / d) * 0.012;
          }
          n.vx *= 0.992;
          n.vy *= 0.992;
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      });
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < 120) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / 120) * 0.28})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
        const p = Math.hypot(nodes[i].x - pointer.x, nodes[i].y - pointer.y);
        if (p < 170) {
          ctx.strokeStyle = `rgba(${rgb},${(1 - p / 170) * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(${rgb},0.75)`;
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, nodes[i].r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = !still && visible ? requestAnimationFrame(draw) : null;
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onResize = () => {
      resize();
      if (!frame) draw();
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && !frame && !still) frame = requestAnimationFrame(draw);
          })
        : null;

    resize();
    draw();
    if (observer) observer.observe(canvas);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [color]);

  return <canvas className="ct-field" ref={ref} aria-hidden="true" />;
});

/* ------------------------------------------------------------------ */
/* Hero beacon card                                                    */
/* ------------------------------------------------------------------ */

const role = (greeting.nickname || "").replace(/[^\w\s&/()-]/g, "").trim();

const Beacon = ({ clock, status }) => {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 10}deg`);
    el.style.setProperty("--rx", `${-y * 8}deg`);
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--rx", "0deg");
    ref.current.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="ct-beacon" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="ct-beacon__card">
        <div className="ct-beacon__bar ct-mono">
          <span>beacon://{greeting.logo_name ? greeting.logo_name.toLowerCase() : "me"}</span>
          <span className={`ct-chip${status.online ? " is-on" : ""}`}>
            <i /> {status.online ? "online" : "away"}
          </span>
        </div>

        <div className="ct-orbit">
          <div className="ct-orbit__ring ct-orbit__ring--outer" />
          <div className="ct-orbit__ring ct-orbit__ring--inner" />
          <div className="ct-orbit__spin">
            {orbiters.map((c, i) => (
              <a
                key={c.id}
                className="ct-orbit__node"
                style={{ "--a": `${(360 / orbiters.length) * i}deg`, "--brand": c.color }}
                href={c.href}
                target={c.id === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={`${c.name}: ${c.handle}`}
                title={c.name}
              >
                <span>
                  <i className={c.icon} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
          <div className="ct-avatar">
            {profileImage && <img src={profileImage} alt={greeting.title} />}
            <span className="ct-avatar__scan" />
          </div>
        </div>

        <div className="ct-beacon__id">
          <strong>{greeting.title}</strong>
          <span>{role}</span>
        </div>

        <dl className="ct-beacon__meta">
          <div>
            <dt>Mumbai</dt>
            <dd className="ct-mono">{clock}</dd>
          </div>
          <div>
            <dt>Reply ETA</dt>
            <dd className="ct-mono">{info.responseTime}</dd>
          </div>
          <div>
            <dt>Signal</dt>
            <dd className={`ct-bars${status.online ? " is-on" : ""}`} aria-label={status.online ? "strong" : "low"}>
              <i />
              <i />
              <i />
              <i />
            </dd>
          </div>
        </dl>

        <button type="button" className="ct-beacon__save" onClick={downloadVCard}>
          <i className="fa-solid fa-address-card" aria-hidden="true" /> Save contact card
          <span className="ct-mono">.vcf</span>
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Composer + live packet inspector                                    */
/* ------------------------------------------------------------------ */

const EMPTY = { intent: "freelance", topics: [], name: "", email: "", company: "", timeline: "", message: "" };

const loadDraft = () => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch (e) {
    return EMPTY;
  }
};

const MIN_MESSAGE = 20;

const validate = (f) => {
  const errors = {};
  const len = f.message.trim().length;
  if (!f.name.trim()) errors.name = "Tell me who's calling.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) errors.email = "I'll need a valid email to reply to.";
  if (len < MIN_MESSAGE) errors.message = `A little more detail, please (${MIN_MESSAGE - len} more characters).`;
  return errors;
};

const intentOf = (id) => INTENTS.find((i) => i.id === id) || INTENTS[0];

const buildMail = (f) => {
  const intent = intentOf(f.intent);
  const company = f.company.trim();
  const subject = `[${intent.label}] ${f.name.trim()}${company ? ` · ${company}` : ""}`;
  const lines = [f.message.trim(), "", "—", `Name: ${f.name.trim()}`, `Email: ${f.email.trim()}`];
  if (company) lines.push(`Company: ${company}`);
  if (f.topics.length) lines.push(`Topics: ${TOPICS.filter((t) => f.topics.includes(t.id)).map((t) => t.label).join(", ")}`);
  if (intent.scoped && f.timeline) lines.push(`Timeline: ${f.timeline}`);
  lines.push("", "Sent from the contact page on aayushmishra.engineer");
  return { subject, body: lines.join("\n") };
};

// Turns a value into syntax-highlighted JSON lines: [[{t, v}, ...], ...]
const jsonLines = (value, indent = 0, key, last = true) => {
  const lead = [{ t: "pad", v: "  ".repeat(indent) }];
  const label = key !== undefined ? [{ t: "key", v: `"${key}"` }, { t: "punct", v: ": " }] : [];
  const comma = last ? "" : ",";
  if (value && typeof value === "object") {
    const isArray = Array.isArray(value);
    const entries = isArray ? value.map((v) => [undefined, v]) : Object.entries(value);
    const [open, close] = isArray ? ["[", "]"] : ["{", "}"];
    if (!entries.length) return [lead.concat(label, [{ t: "punct", v: `${open}${close}${comma}` }])];
    return [lead.concat(label, [{ t: "punct", v: open }])]
      .concat(entries.reduce((acc, [k, v], i) => acc.concat(jsonLines(v, indent + 1, k, i === entries.length - 1)), []))
      .concat([lead.concat([{ t: "punct", v: `${close}${comma}` }])]);
  }
  const type = typeof value === "string" ? "str" : value === null ? "null" : "num";
  return [lead.concat(label, [{ t: type, v: JSON.stringify(value) }, { t: "punct", v: comma }])];
};

const STEPS = ["validating payload", "compressing signal", `routing → ${EMAIL}`, "handing off to your mail client"];

const Field = ({ id, label, optional, error, hideLabel, children }) => (
  <div className={`ct-field-row${error ? " has-error" : ""}`}>
    <label htmlFor={id} className={hideLabel ? "ct-sr" : undefined}>
      {label}
      {optional && <em>optional</em>}
    </label>
    {children}
    {error && (
      <span className="ct-error" id={`${id}-error`}>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {error}
      </span>
    )}
  </div>
);

const Composer = memo(({ pendingTopic }) => {
  const [form, setForm] = useState(loadDraft);
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [log, setLog] = useState([]);
  const [saved, setSaved] = useState(false);
  const [copied, copy] = useCopy();
  const timers = useRef([]);
  const refs = { name: useRef(null), email: useRef(null), message: useRef(null) };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Topics picked elsewhere on the page land here
  useEffect(() => {
    if (!pendingTopic) return;
    setForm((f) => (f.topics.includes(pendingTopic.id) ? f : { ...f, topics: f.topics.concat(pendingTopic.id) }));
  }, [pendingTopic]);

  // Autosave the draft so a refresh never loses a half-written message
  useEffect(() => {
    const dirty = form.name || form.email || form.company || form.message;
    try {
      if (dirty) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      else window.localStorage.removeItem(DRAFT_KEY);
      setSaved(Boolean(dirty));
    } catch (e) {
      setSaved(false);
    }
  }, [form]);

  const errors = submitted ? validate(form) : {};
  const intent = intentOf(form.intent);
  const mail = buildMail(form);
  const bytes = new Blob([mail.subject, mail.body]).size;
  const message = form.message.trim();

  const packet = {
    to: EMAIL,
    intent: intent.id,
    from: { name: form.name.trim() || null, email: form.email.trim() || null, company: form.company.trim() || null },
    topics: form.topics,
  };
  if (intent.scoped) packet.timeline = form.timeline || null;
  packet.message = message ? (message.length > 72 ? `${message.slice(0, 72)}…` : message) : null;
  packet.meta = { bytes, eta: info.responseTime };
  const lines = jsonLines(packet);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggleTopic = (id) =>
    setForm({ ...form, topics: form.topics.includes(id) ? form.topics.filter((t) => t !== id) : form.topics.concat(id) });

  const transmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form);
    const first = ["name", "email", "message"].find((k) => errs[k]);
    if (first) {
      if (refs[first].current) refs[first].current.focus();
      return;
    }
    setPhase("sending");
    setLog([]);
    const delay = prefersReducedMotion() ? 0 : 420;
    STEPS.forEach((step, i) => {
      timers.current.push(setTimeout(() => setLog((l) => l.concat(step)), delay * (i + 1)));
    });
    timers.current.push(
      setTimeout(() => {
        window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
        setPhase("sent");
      }, delay * (STEPS.length + 1))
    );
  };

  const reset = () => {
    setForm(EMPTY);
    setSubmitted(false);
    setPhase("idle");
    setLog([]);
  };

  // Ctrl / Cmd + Enter sends from anywhere in the form
  const onKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && phase !== "sending") transmit(e);
  };

  const insertTemplate = () => {
    setForm({ ...form, message: TEMPLATES[form.intent] || TEMPLATES.hello });
    if (refs.message.current) refs.message.current.focus();
  };

  const describedBy = (key) => (errors[key] ? `ct-${key}-error` : undefined);

  return (
    <div className="ct-composer">
      <form className="ct-form" onSubmit={transmit} onKeyDown={onKeyDown} noValidate aria-busy={phase === "sending"}>
        <div className="ct-form__head">
          <span className="ct-mono">new_transmission.msg</span>
          <span className={`ct-saved ct-mono${saved ? " is-on" : ""}`} aria-live="polite">
            {saved ? "● draft autosaved" : "○ nothing to save yet"}
          </span>
        </div>

        <fieldset className="ct-step">
          <legend>
            <b className="ct-mono">01</b> What's the signal about?
          </legend>
          <div className="ct-intents">
            {INTENTS.map((it) => (
              <label key={it.id} className={`ct-intent${form.intent === it.id ? " is-on" : ""}`}>
                <input type="radio" name="intent" value={it.id} checked={form.intent === it.id} onChange={set("intent")} />
                <i className={it.icon} aria-hidden="true" />
                <span>{it.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="ct-step">
          <legend>
            <b className="ct-mono">02</b> Topics <em>optional · pick any</em>
          </legend>
          <div className="ct-topics">
            {TOPICS.map((t) => (
              <label key={t.id} className={`ct-topic${form.topics.includes(t.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={form.topics.includes(t.id)} onChange={() => toggleTopic(t.id)} />
                <i className={t.icon} aria-hidden="true" />
                {t.label}
              </label>
            ))}
          </div>
          {intent.scoped && (
            <div className="ct-timeline" role="radiogroup" aria-label="Timeline">
              <span className="ct-mono">timeline →</span>
              {TIMELINES.map((t) => (
                <label key={t} className={`ct-pill${form.timeline === t ? " is-on" : ""}`}>
                  <input type="radio" name="timeline" value={t} checked={form.timeline === t} onChange={set("timeline")} />
                  {t}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="ct-step">
          <legend>
            <b className="ct-mono">03</b> Who's transmitting?
          </legend>
          <div className="ct-fields">
            <Field id="ct-name" label="Name" error={errors.name}>
              <input
                id="ct-name"
                ref={refs.name}
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
                placeholder="Ada Lovelace"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy("name")}
              />
            </Field>
            <Field id="ct-email" label="Email" error={errors.email}>
              <input
                id="ct-email"
                ref={refs.email}
                type="email"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                placeholder="ada@company.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email")}
              />
            </Field>
            <Field id="ct-company" label="Company" optional>
              <input id="ct-company" value={form.company} onChange={set("company")} autoComplete="organization" placeholder="Analytical Engines Ltd." />
            </Field>
          </div>
        </fieldset>

        <fieldset className="ct-step">
          <legend>
            <b className="ct-mono">04</b> The message
          </legend>
          <Field id="ct-message" label="Message" error={errors.message} hideLabel>
            <textarea
              id="ct-message"
              ref={refs.message}
              rows={6}
              value={form.message}
              onChange={set("message")}
              placeholder={intent.hint}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={describedBy("message")}
            />
          </Field>
          <div className="ct-meter-row">
            {!message ? (
              <button type="button" className="ct-template" onClick={insertTemplate}>
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Use a starter template
              </button>
            ) : (
              <span className="ct-mono ct-meter-row__hint">
                {message.length < MIN_MESSAGE ? `${MIN_MESSAGE - message.length} more to go` : "looking good ✓"}
              </span>
            )}
            <em className="ct-mono">{message.length} chars</em>
          </div>
          <div className="ct-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (message.length / 400) * 100)}%` }} />
          </div>
        </fieldset>

        <div className="ct-form__foot">
          <p>
            Opens your mail app with everything pre-filled. Nothing is stored on a server.
            <span className="ct-kbd-hint">
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send
            </span>
          </p>
          <button type="submit" className="ct-btn ct-btn--primary ct-transmit" disabled={phase === "sending"}>
            {phase === "sending" ? "Transmitting…" : "Transmit"}
            <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          </button>
        </div>

        {phase === "sent" && (
          <div className="ct-sent" role="status">
            <div className="ct-sent__ring">
              <i className="fa-solid fa-check" aria-hidden="true" />
              <span className="ct-burst" aria-hidden="true">
                {Array.from({ length: 14 }, (_, i) => (
                  <b key={i} style={{ "--a": `${(360 / 14) * i}deg`, "--d": `${70 + (i % 3) * 22}px` }} />
                ))}
              </span>
            </div>
            <h3>Transmission handed off.</h3>
            <p>Your mail app should be open with everything filled in. Just hit send. Didn't open? Copy it and paste it anywhere.</p>
            <div className="ct-sent__actions">
              <button type="button" className="ct-btn ct-btn--primary" onClick={() => copy(`To: ${EMAIL}\nSubject: ${mail.subject}\n\n${mail.body}`, "msg", "Message copied")}>
                <i className={copied === "msg" ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
                {copied === "msg" ? "Copied" : "Copy full message"}
              </button>
              <button type="button" className="ct-btn ct-btn--ghost" onClick={reset}>
                New transmission
              </button>
              <button type="button" className="ct-btn ct-btn--ghost" onClick={() => setPhase("idle")}>
                Edit message
              </button>
            </div>
          </div>
        )}
      </form>

      <aside className="ct-inspector" aria-label="Live message preview">
        <div className="ct-inspector__bar">
          <span className="ct-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="ct-mono">packet_inspector</span>
          <span className="ct-chip is-on ct-mono">
            <i /> live
          </span>
        </div>
        <div className="ct-code ct-mono">
          {lines.map((line, i) => (
            <div key={i} className="ct-code__line">
              <span className="ct-code__no">{pad(i + 1)}</span>
              <span>
                {line.map((tok, j) => (
                  <span key={j} className={`tk-${tok.t}`}>
                    {tok.v}
                  </span>
                ))}
                {i === lines.length - 1 && phase === "idle" && <span className="ct-caret" />}
              </span>
            </div>
          ))}
        </div>
        <div className="ct-inspector__log ct-mono" aria-live="polite">
          {phase === "idle" && <span className="is-dim">$ awaiting transmit…</span>}
          {log.map((l, i) => (
            <span key={l} className={i === STEPS.length - 1 && phase === "sent" ? "is-done" : ""}>
              <b>✓</b> {l}
            </span>
          ))}
          {phase === "sending" && <span className="is-dim ct-blink">…</span>}
        </div>
        <div className="ct-inspector__stats ct-mono">
          <span>
            subject <b>{mail.subject.length > 34 ? `${mail.subject.slice(0, 34)}…` : mail.subject}</b>
          </span>
          <span>
            size <b>{bytes} B</b>
          </span>
        </div>
      </aside>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Base station: radar + timezone overlap planner                      */
/* ------------------------------------------------------------------ */

const Track = ({ runs, kind }) =>
  runs.map(([a, b]) => (
    <span key={`${kind}-${a}`} className={`ct-track__run is-${kind}`} style={{ left: `${(a / 1440) * 100}%`, width: `${((b - a) / 1440) * 100}%` }} />
  ));

const BaseStation = ({ now }) => {
  const visitorOffset = -now.getTimezoneOffset();
  const diff = visitorOffset - OFFSET;
  const sync = useMemo(() => syncWindows(visitorOffset), [visitorOffset]);
  const youNow = zoneMinutes(now, visitorOffset);
  const meNow = zoneMinutes(now, OFFSET);
  const best = sync.both.length ? sync.both.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a)) : null;
  // put the visitor's blip left/right of Mumbai by timezone distance
  const blipX = Math.max(-1, Math.min(1, diff / 720)) * 38;

  const relation =
    diff === 0
      ? "You're in the same timezone as me. Any working hour is a good hour."
      : `You're ${fmtDuration(Math.abs(diff))} ${diff < 0 ? "behind" : "ahead of"} Mumbai.`;

  return (
    <div className="ct-base__grid">
      <div className="ct-radar-card">
        <div className="ct-radar" aria-hidden="true">
          <span className="ct-radar__ring" />
          <span className="ct-radar__ring" />
          <span className="ct-radar__ring" />
          <span className="ct-radar__cross" />
          <span className="ct-radar__sweep" />
          <span className="ct-radar__blip is-me">
            <b>MUM</b>
          </span>
          <span className="ct-radar__blip is-you" style={{ "--x": `${blipX}%`, "--y": diff === 0 ? "14%" : "-16%" }}>
            <b>YOU</b>
          </span>
        </div>
        <div className="ct-radar-card__info">
          <span className="ct-mono ct-kicker">base station</span>
          <strong>
            {address.locality}, {address.country}
          </strong>
          <span className="ct-mono">
            {info.coordinates.lat.toFixed(4)}° N · {info.coordinates.lng.toFixed(4)}° E
          </span>
          <a className="ct-link" href={address.location_map_link} target="_blank" rel="noopener noreferrer">
            Open in Google Maps <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="ct-sync">
        <div className="ct-clocks">
          <div>
            <span className="ct-kicker ct-mono">Mumbai · {fmtOffset(OFFSET)}</span>
            <strong className="ct-mono">{hhmm(meNow)}</strong>
          </div>
          <span className="ct-clocks__link" aria-hidden="true">
            <i />
          </span>
          <div>
            <span className="ct-kicker ct-mono">
              You · {fmtOffset(visitorOffset)}
            </span>
            <strong className="ct-mono">{hhmm(youNow)}</strong>
          </div>
        </div>

        <p className="ct-sync__lead">
          {relation} <span className="ct-mono ct-zone">{visitorZone}</span>
        </p>

        <div className="ct-tracks" role="img" aria-label={`Timeline of your day. Overlap with my working hours: ${fmtDuration(sync.total)}.`}>
          <div className="ct-track">
            <span className="ct-track__label ct-mono">I'm working</span>
            <div className="ct-track__bar">
              <Track runs={sync.me} kind="me" />
            </div>
          </div>
          <div className="ct-track">
            <span className="ct-track__label ct-mono">You're awake</span>
            <div className="ct-track__bar">
              <Track runs={sync.you} kind="you" />
            </div>
          </div>
          <div className="ct-track">
            <span className="ct-track__label ct-mono">Overlap</span>
            <div className="ct-track__bar">
              <Track runs={sync.both} kind="both" />
            </div>
          </div>
          <div className="ct-track ct-track--axis">
            <span className="ct-track__label" />
            <div className="ct-track__bar">
              {[0, 6, 12, 18, 24].map((h) => (
                <span key={h} className="ct-mono" style={{ left: `${(h / 24) * 100}%` }}>
                  {pad(h)}
                </span>
              ))}
              <span className="ct-track__now" style={{ left: `${(youNow / 1440) * 100}%` }}>
                <em className="ct-mono">now</em>
              </span>
            </div>
          </div>
        </div>

        <div className={`ct-verdict${best ? " is-good" : ""}`}>
          <i className={best ? "fa-solid fa-satellite-dish" : "fa-solid fa-moon"} aria-hidden="true" />
          {best ? (
            <p>
              Best window to talk: <b className="ct-mono">{hhmm(best[0])}–{hhmm(best[1])}</b> your time,{" "}
              {fmtDuration(sync.total)} of overlap a day.
            </p>
          ) : (
            <p>
              Our days barely touch. Send it async and I'll still reply within <b>{info.responseTime}</b>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Contact = ({ theme }) => {
  useDocumentTitle(`Contact · ${greeting.title}`);
  const vars = useMemo(() => {
    const base = themeVars(theme);
    return { dark: base.dark, style: { ...base.style, ...accentVars(theme) } };
  }, [theme]);
  const now = new Date(useNow(1000));
  const status = availability(now);
  const meNow = zoneMinutes(now, OFFSET);
  const clock = `${hhmm(meNow)}:${pad(now.getUTCSeconds())}`;
  const [copied, copy] = useCopy();
  const [pendingTopic, setPendingTopic] = useState(null);
  const spotlight = useSpotlight();

  const pickTopic = (topic) => (e) => {
    setPendingTopic({ id: topic.id, at: Date.now() });
    scrollToId("compose")(e);
  };

  return (
    <div className="contact-main">
      <Header theme={theme} />

      <main className={`ct${vars.dark ? " is-dark" : ""}`} style={vars.style}>
        <div className="ct__bg" aria-hidden="true">
          <div className="ct__grid" />
          <div className="ct__glow ct__glow--a" />
          <div className="ct__glow ct__glow--b" />
        </div>

        <SectionRail />
        <Toaster />

        {/* ---------- Hero ---------- */}
        <section className="ct-hero" id="ct-top">
          <SignalField color={theme.imageHighlight} />
          <div className="ct__inner ct-hero__grid">
            <div className="ct-hero__copy">
              <span className="ct-eyebrow">
                <i /> Contact · open channel
              </span>
              <div className={`ct-status${status.online ? " is-on" : ""}`}>
                <span className="ct-status__dot" />
                {status.online ? "Online now" : `Away · back in ${fmtDuration(status.until)}`}
                <span className="ct-status__sep" />
                <span className="ct-mono">Mumbai {clock}</span>
              </div>
              <h1 className="ct-title">
                <span className="ct-title__line">Let's build software</span>{" "}
                <span className="ct-title__line is-grad">that refuses to break.</span>
              </h1>
              <p className="ct-lead">{info.lead}</p>

              <div className="ct-actions">
                <a className="ct-btn ct-btn--primary" href="#compose" onClick={scrollToId("compose")}>
                  Start a transmission <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </a>
                <button type="button" className="ct-btn ct-btn--ghost" onClick={() => copy(EMAIL, "hero", "Email address copied")}>
                  <i className={copied === "hero" ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
                  <span aria-live="polite">{copied === "hero" ? "Email copied!" : EMAIL}</span>
                </button>
              </div>

              <div className="ct-stats">
                <div>
                  <strong>{info.responseTime}</strong>
                  <span>reply time</span>
                </div>
                <div>
                  <strong>
                    {pad(WORK.start)}–{pad(WORK.end)}
                  </strong>
                  <span>working hours, IST</span>
                </div>
                <div>
                  <strong>{channels.length}</strong>
                  <span>open channels</span>
                </div>
              </div>
            </div>

            <Beacon clock={clock} status={status} />
          </div>
        </section>

        <div className="ct__inner">
          {/* ---------- Topics ---------- */}
          <Reveal className="ct-section ct-help" id="ct-help">
            <header className="ct-head">
              <span className="ct-eyebrow">
                <i /> Frequencies
              </span>
              <h2 className="ct-h2">
                What I can <span>help you ship.</span>
              </h2>
              <p className="ct-sub">Tap a frequency to tune your message to it.</p>
            </header>
            <div className="ct-help__grid">
              {TOPICS.map((t, i) => (
                <a key={t.id} href="#compose" className="ct-help__card" onClick={pickTopic(t)} onMouseMove={spotlight} style={{ "--i": i }}>
                  <span className="ct-mono ct-help__no">{pad(i + 1)}</span>
                  <i className={t.icon} aria-hidden="true" />
                  <strong>{t.label}</strong>
                  <span className="ct-help__add ct-mono">
                    + add to message
                  </span>
                </a>
              ))}
            </div>
          </Reveal>

          {/* ---------- Composer ---------- */}
          <Reveal className="ct-section" id="compose">
            <header className="ct-head">
              <span className="ct-eyebrow">
                <i /> Transmit
              </span>
              <h2 className="ct-h2">
                Compose a <span>transmission.</span>
              </h2>
              <p className="ct-sub">Four quick steps. Watch the packet build itself on the right.</p>
            </header>
            <Composer pendingTopic={pendingTopic} />
          </Reveal>

          {/* ---------- What happens next ---------- */}
          {PROCESS.length > 0 && (
            <Reveal className="ct-section ct-next" id="ct-next">
              <header className="ct-head">
                <span className="ct-eyebrow">
                  <i /> After you hit transmit
                </span>
                <h2 className="ct-h2">
                  What happens <span>next.</span>
                </h2>
                <p className="ct-sub">No black hole. Here's exactly how a conversation moves.</p>
              </header>
              <ol className="ct-steps">
                {PROCESS.map((step, i) => (
                  <li key={step.title} className="ct-steps__item" style={{ "--i": i }}>
                    <span className="ct-steps__node">
                      <i className={step.icon} aria-hidden="true" />
                    </span>
                    <span className="ct-mono ct-steps__no">step {pad(i + 1)}</span>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}

          {/* ---------- Channels ---------- */}
          <Reveal className="ct-section" id="ct-channels">
            <header className="ct-head">
              <span className="ct-eyebrow">
                <i /> Channels
              </span>
              <h2 className="ct-h2">
                Pick a <span>frequency.</span>
              </h2>
              <p className="ct-sub">Prefer your own app? Every channel below reaches me directly.</p>
            </header>
            <div className="ct-chans">
              {channels.map((c, i) => (
                <a
                  key={c.id}
                  className="ct-chan"
                  data-dim={isDimColor(c.color) ? "" : undefined}
                  style={{ "--brand": c.color, "--i": i }}
                  href={c.href}
                  target={c.id === "email" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  onMouseMove={spotlight}
                >
                  <span className="ct-chan__top">
                    <span className="ct-chan__icon">
                      <i className={c.icon} aria-hidden="true" />
                    </span>
                    <span className="ct-mono ct-chan__freq">CH-{pad(i + 1)}</span>
                  </span>
                  <strong>{c.name}</strong>
                  <span className="ct-chan__handle ct-mono">{c.handle}</span>
                  <p>{c.blurb}</p>
                  <span className="ct-chan__go" aria-hidden="true">
                    <i className="fa-solid fa-arrow-right" />
                  </span>
                </a>
              ))}
            </div>
          </Reveal>

          {/* ---------- Base station ---------- */}
          <Reveal className="ct-section ct-base" id="ct-base">
            <header className="ct-head">
              <span className="ct-eyebrow">
                <i /> Base station
              </span>
              <h2 className="ct-h2">
                Different timezone? <span>Let's find the overlap.</span>
              </h2>
              <p className="ct-sub">Worked out live from your browser's clock. Nothing leaves your device.</p>
            </header>
            <BaseStation now={now} />
          </Reveal>
        </div>

        {/* ---------- Outro ---------- */}
        <section className="ct-outro">
          <div className="ct-marquee" aria-hidden="true">
            <div className="ct-marquee__track">
              {[0, 1].map((k) => (
                <span key={k}>
                  Let's talk <i>✦</i> Let's build <i>✦</i> Let's ship <i>✦</i> Let's test <i>✦</i>
                </span>
              ))}
            </div>
          </div>
          <div className="ct__inner">
            <div className="ct-outro__card" onMouseMove={spotlight}>
              <span className="ct-mono ct-kicker">rather skip the form?</span>
              <a className="ct-outro__mail" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
              <div className="ct-actions">
                <button type="button" className="ct-btn ct-btn--ghost" onClick={() => copy(EMAIL, "outro", "Email address copied")}>
                  <i className={copied === "outro" ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
                  {copied === "outro" ? "Copied!" : "Copy address"}
                </button>
                <button type="button" className="ct-btn ct-btn--ghost" onClick={downloadVCard}>
                  <i className="fa-solid fa-address-card" aria-hidden="true" /> Save contact
                </button>
                <a className="ct-btn ct-btn--ghost" href={greeting.resumeLink} target="_blank" rel="noopener noreferrer">
                  <i className="fa-solid fa-file-lines" aria-hidden="true" /> Resume
                </a>
                <a className="ct-btn ct-btn--ghost" href={blog.link} target="_blank" rel="noopener noreferrer">
                  <i className="fa-brands fa-medium" aria-hidden="true" /> Read the blog
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
};

export default Contact;
