import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Redirect, useHistory } from "react-router-dom";
import { BANDS, MODULES, aliasOf, moduleById } from "./modules";
import { BrandMark, Glyph, Icon } from "./icons";
import { Skeletons, Title, UniverseContext } from "./lib/kit";
import { useLocalState } from "./lib/useFeed";
import { MusicProvider, useMusic } from "./music/MusicContext";
import MusicDock from "./music/Dock";
import { prefersReducedMotion } from "../projects/lib/ui";
import Hub from "./Hub";
import SeoHeader from "../../components/seoHeader/SeoHeader";
import "./Universe.css";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap";

/* ------------------------------------------------------------------ */
/* Sky: layered starfield with pointer parallax and rare shooting stars */
/* ------------------------------------------------------------------ */

const Sky = ({ theme }) => {
  const canvas = useRef(null);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return undefined;
    const ctx = node.getContext("2d");
    const still = prefersReducedMotion();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    let stars = [];
    let frame;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let shooting = null;
    let nextShot = performance.now() + 6000;
    const ink = theme === "light" ? "13,14,17" : "236,240,255";

    const seed = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      node.width = width * ratio;
      node.height = height * ratio;
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const density = Math.min(1, (width * height) / (1440 * 900));
      const layer = (count, depth, size, alpha) =>
        Array.from({ length: Math.round(count * density) }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: size * (0.6 + Math.random() * 0.8),
          a: alpha * (0.5 + Math.random() * 0.5),
          depth,
          tw: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
        }));
      stars = [...layer(220, 0.2, 0.55, theme === "light" ? 0.28 : 0.55), ...layer(90, 0.5, 0.8, theme === "light" ? 0.35 : 0.75), ...layer(26, 1, 1.15, theme === "light" ? 0.4 : 0.95)];
    };

    const draw = (now) => {
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const drift = still ? 0 : (now * 0.004 * s.depth) % height;
        let y = s.y - drift - pointer.y * 22 * s.depth;
        if (y < -4) y += height + 8;
        const x = (s.x - pointer.x * 22 * s.depth + width) % width;
        const twinkle = still ? 1 : 0.65 + 0.35 * Math.sin(now * 0.0012 * s.speed + s.tw);
        ctx.globalAlpha = s.a * twinkle;
        ctx.fillStyle = `rgb(${ink})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still && theme !== "light") {
        if (!shooting && now > nextShot) {
          shooting = { x: Math.random() * width * 0.7 + width * 0.2, y: Math.random() * height * 0.35, born: now };
        }
        if (shooting) {
          const age = (now - shooting.born) / 900;
          if (age >= 1) {
            shooting = null;
            nextShot = now + 9000 + Math.random() * 12000;
          } else {
            const len = 140;
            const x = shooting.x - age * 420;
            const y = shooting.y + age * 180;
            const gradient = ctx.createLinearGradient(x, y, x + len, y - len * 0.43);
            gradient.addColorStop(0, `rgba(${ink},${0.9 * (1 - age)})`);
            gradient.addColorStop(1, `rgba(${ink},0)`);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + len, y - len * 0.43);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const onMove = (event) => {
      pointer.tx = event.clientX / width - 0.5;
      pointer.ty = event.clientY / height - 0.5;
    };
    const onResize = () => seed();

    seed();
    if (still) draw(0);
    else frame = requestAnimationFrame(draw);
    if (still) cancelAnimationFrame(frame);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [theme]);

  return <canvas ref={canvas} className="uv-sky" aria-hidden="true" />;
};

/* ------------------------------------------------------------------ */
/* Clock                                                               */
/* ------------------------------------------------------------------ */

const useClock = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const fmtClock = (date, timeZone) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone }).format(date);

/* ------------------------------------------------------------------ */
/* Command palette                                                     */
/* ------------------------------------------------------------------ */

const Palette = ({ open, onClose, actions }) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => input.current && input.current.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) => `${action.label} ${action.group} ${action.keywords || ""}`.toLowerCase().includes(needle));
  }, [actions, query]);

  if (!open) return null;

  const run = (action) => {
    onClose();
    action.run();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      run(results[active]);
    } else if (event.key === "Escape") onClose();
  };

  let lastGroup = null;
  return (
    <div className="uv-palette-backdrop" onMouseDown={onClose} role="presentation">
      <div className="uv-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <label className="uv-palette-input">
          <Icon name="search" size={18} />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a channel or run an action…"
            aria-label="Search channels and actions"
          />
          <kbd>esc</kbd>
        </label>
        <ul className="uv-palette-list" data-lenis-prevent>
          {results.map((action, index) => {
            const heading = action.group !== lastGroup ? action.group : null;
            lastGroup = action.group;
            return (
              <React.Fragment key={action.id}>
                {heading && <li className="uv-palette-group">{heading}</li>}
                <li>
                  <button
                    type="button"
                    className={index === active ? "is-active" : ""}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(action)}
                  >
                    <span className="uv-palette-icon" style={action.hue != null ? { "--gh": action.hue } : undefined}>
                      {action.glyph ? <Glyph id={action.glyph} size={20} /> : <Icon name={action.icon || "arrowRight"} size={16} />}
                    </span>
                    <span className="uv-palette-label">{action.label}</span>
                    {action.hint && <span className="uv-palette-hint">{action.hint}</span>}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
          {!results.length && <li className="uv-palette-empty">No matches for “{query}”.</li>}
        </ul>
        <div className="uv-palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>[</kbd>
            <kbd>]</kbd> switch channel
          </span>
          <span>
            <kbd>space</kbd> play / pause
          </span>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const ChannelLink = ({ module, onNavigate, compact }) => (
  <NavLink
    to={`/universe/${module.id}`}
    className="uv-nav-item"
    activeClassName="is-active"
    onClick={onNavigate}
    style={{ "--gh": module.hue }}
    title={compact ? `${module.channel} · ${module.title}` : undefined}
  >
    <Glyph id={module.id} size={22} />
    <span className="uv-nav-label">{module.title}</span>
    <span className="uv-nav-channel">{module.channel}</span>
  </NavLink>
);

const NavGroups = ({ onNavigate, compact }) => (
  <>
    <NavLink exact to="/universe" className="uv-nav-item uv-nav-item--hub" activeClassName="is-active" onClick={onNavigate} title={compact ? "Hub" : undefined}>
      <Glyph id="hub" size={22} />
      <span className="uv-nav-label">Hub</span>
      <span className="uv-nav-channel">00</span>
    </NavLink>
    {BANDS.map((band) => (
      <div key={band.id} className="uv-nav-band">
        <span className="uv-nav-band-label">{band.label}</span>
        {MODULES.filter((module) => module.band === band.id).map((module) => (
          <ChannelLink key={module.id} module={module} onNavigate={onNavigate} compact={compact} />
        ))}
      </div>
    ))}
  </>
);

const NowPlayingChip = () => {
  const music = useMusic();
  if (!music.track) return null;
  return (
    <Link to="/universe/music" className="uv-np-chip" title={`${music.track.title} · ${music.track.artist}`}>
      <span className={`uv-eq ${music.status === "playing" ? "is-on" : ""}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="uv-np-text">{music.track.title}</span>
    </Link>
  );
};

const Toast = () => {
  const music = useMusic();
  if (!music.notice) return null;
  return (
    <div className={`uv-toast uv-toast--${music.notice.tone}`} role="status">
      <Icon name={music.notice.tone === "error" ? "close" : "sparkle"} size={16} />
      <span>{music.notice.text}</span>
      <button type="button" onClick={music.dismissNotice} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Error boundary                                                      */
/* ------------------------------------------------------------------ */

class ChannelBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous) {
    if (previous.id !== this.props.id && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="uv-state uv-state--page">
        <Icon name="radio" size={30} />
        <p>We lost the signal on this channel. Reload to try again.</p>
        <div className="uv-row">
          <button type="button" className="uv-btn uv-btn--primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <Link to="/universe" className="uv-btn uv-btn--ghost">
            Back to the hub
          </Link>
        </div>
      </div>
    );
  }
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function Shell({ id }) {
  const current = id ? moduleById(id) : null;
  const history = useHistory();
  const music = useMusic();
  const now = useClock();
  const [theme, setTheme] = useLocalState("theme", "dark");
  const [railOpen, setRailOpen] = useLocalState("rail-open", true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const root = useRef(null);

  // Fonts only load when someone opens the Tech Universe.
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Paint the page itself in the Universe theme (no portfolio colours on overscroll).
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("uv-standalone");
    html.setAttribute("data-uv-theme", theme);
    return () => {
      html.classList.remove("uv-standalone");
      html.removeAttribute("data-uv-theme");
    };
  }, [theme]);


  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    setSheetOpen(false);
  }, [id]);

  const go = useCallback((to) => history.push(to), [history]);
  const toggleTheme = useCallback(() => setTheme((value) => (value === "dark" ? "light" : "dark")), [setTheme]);

  const actions = useMemo(
    () => [
      { id: "hub", group: "Channels", label: "Hub", glyph: "hub", hint: "00", run: () => go("/universe") },
      ...MODULES.map((module) => ({
        id: module.id,
        group: "Channels",
        label: module.title,
        keywords: `${module.short} ${module.tagline} ${module.band}`,
        glyph: module.id,
        hue: module.hue,
        hint: module.channel,
        run: () => go(`/universe/${module.id}`),
      })),
      { id: "play", group: "Actions", label: music.playing ? "Pause music" : "Play music", icon: music.playing ? "pause" : "play", keywords: "music audio", run: () => (music.track ? music.toggle() : go("/universe/music")) },
      ...(music.track ? [{ id: "next", group: "Actions", label: "Next track", icon: "next", keywords: "skip music", run: music.next }] : []),
      { id: "theme", group: "Actions", label: theme === "dark" ? "Switch to Daylight theme" : "Switch to Deep Space theme", icon: theme === "dark" ? "sun" : "moon", keywords: "theme light dark", run: toggleTheme },
      { id: "rail", group: "Actions", label: railOpen ? "Collapse sidebar" : "Expand sidebar", icon: "sidebar", run: () => setRailOpen((value) => !value) },
      { id: "portfolio", group: "Actions", label: "Back to Aayush's portfolio", icon: "arrowLeft", keywords: "home portfolio", run: () => go("/work/open-source") },
    ],
    [go, music, theme, toggleTheme, railOpen, setRailOpen]
  );

  // Keyboard: ⌘K / Ctrl+K palette, "[" "]" channels, space play/pause.
  useEffect(() => {
    const onKey = (event) => {
      const typing = /input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey || paletteOpen) return;
      if (event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === "[" || event.key === "]") {
        const index = current ? MODULES.indexOf(current) : -1;
        const step = event.key === "]" ? 1 : -1;
        const next = MODULES[(index + step + MODULES.length) % MODULES.length];
        go(`/universe/${next.id}`);
      } else if (event.key === " " && music.track && !/^(button|a|summary)$/i.test(event.target.tagName)) {
        event.preventDefault();
        music.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, music, paletteOpen]);

  // One pointer listener feeds the spotlight effect on every [data-spot] card.
  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    const onMove = (event) => {
      const card = event.target.closest && event.target.closest("[data-spot], .uv-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    node.addEventListener("pointermove", onMove, { passive: true });
    return () => node.removeEventListener("pointermove", onMove);
  }, []);

  const index = current ? MODULES.indexOf(current) : -1;
  const nextChannel = current ? MODULES[(index + 1) % MODULES.length] : null;
  const Page = current ? current.Component : null;
  const date = new Date(now);

  return (
    <UniverseContext.Provider value={{ module: current, theme }}>
      <div
        ref={root}
        className={`uv-app ${railOpen ? "is-rail-open" : ""} ${music.track ? "has-dock" : ""}`}
        data-theme={theme}
        style={{ "--gh": current ? current.hue : 74 }}
      >
        {/* The rest of the site gets this from its Header: title, description, canonical, share image */}
        <SeoHeader />
        <Sky theme={theme} />
        <div className="uv-aurora" key={current ? current.id : "hub"} aria-hidden="true" />
        <div className="uv-grain" aria-hidden="true" />

        <aside className="uv-rail" aria-label="Channels">
          <Link to="/universe" className="uv-brand" aria-label="Tech Universe hub">
            <BrandMark size={30} />
            <span className="uv-brand-text">
              <span className="uv-brand-word">
                Tech <em className="uv-serif">Universe</em>
              </span>
              <span className="uv-brand-by">
                <em className="uv-serif">by</em> Aayush Mishra
              </span>
            </span>
          </Link>
          <nav className="uv-nav" data-lenis-prevent>
            <NavGroups compact={!railOpen} />
          </nav>
          <div className="uv-rail-foot">
            <button type="button" className="uv-ghost-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
            <button type="button" className="uv-ghost-btn" onClick={() => setRailOpen((value) => !value)} aria-label={railOpen ? "Collapse sidebar" : "Expand sidebar"}>
              <Icon name="sidebar" size={18} />
            </button>
            <Link to="/work/open-source" className="uv-ghost-btn uv-rail-exit" title="Back to the portfolio">
              <Icon name="arrowLeft" size={18} />
              <span>Portfolio</span>
            </Link>
          </div>
        </aside>

        <header className="uv-top">
          <button type="button" className="uv-ghost-btn uv-top-menu" onClick={() => setSheetOpen(true)} aria-label="Open channels">
            <Icon name="menu" size={20} />
          </button>
          <Link to="/universe" className="uv-top-brand" aria-label="Tech Universe hub">
            <BrandMark size={26} />
          </Link>
          <div className="uv-top-crumb">
            {current ? (
              <>
                <span className="uv-top-ch">CH {current.channel}</span>
                <span className="uv-top-title">{current.title}</span>
              </>
            ) : (
              <>
                <span className="uv-top-ch">CH 00</span>
                <span className="uv-top-title">Hub</span>
              </>
            )}
          </div>
          <button type="button" className="uv-search-trigger" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={16} />
            <span>Search channels, actions…</span>
            <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <NowPlayingChip />
          <div className="uv-clock" title="Coordinated Universal Time and your local time">
            <span>
              <b>UTC</b> {fmtClock(date, "UTC")}
            </span>
            <span className="uv-clock-local">
              <b>LOCAL</b> {fmtClock(date)}
            </span>
          </div>
          <button type="button" className="uv-ghost-btn uv-top-theme" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
        </header>

        <main className="uv-stage">
          <div className="uv-page" key={current ? current.id : "hub"}>
            <ChannelBoundary id={id}>
              <Suspense fallback={<Skeletons count={6} />}>
                {Page ? <Page now={now} module={current} /> : <Hub now={now} theme={theme} />}
              </Suspense>
            </ChannelBoundary>

            {nextChannel && (
              <Link to={`/universe/${nextChannel.id}`} className="uv-next" data-spot style={{ "--gh": nextChannel.hue }}>
                <span className="uv-next-label">Next channel · CH {nextChannel.channel}</span>
                <span className="uv-next-title">
                  <Glyph id={nextChannel.id} size={30} />
                  <Title text={nextChannel.title} />
                </span>
                <span className="uv-next-tag">{nextChannel.tagline}</span>
                <span className="uv-next-arrow" aria-hidden="true">
                  <Icon name="arrowRight" size={22} />
                </span>
              </Link>
            )}

            <footer className="uv-footer">
              <span>
                Tech Universe is part of{" "}
                <Link to="/work/open-source" className="uv-link">
                  Aayush Mishra's open-source work
                </Link>
                . Built in the open on free, public APIs.
              </span>
              <span className="uv-footer-keys">
                <kbd>/</kbd> search <kbd>[</kbd> <kbd>]</kbd> channels <kbd>space</kbd> music
              </span>
            </footer>
          </div>
        </main>

        <MusicDock />
        <Toast />

        {sheetOpen && (
          <div className="uv-sheet" role="dialog" aria-modal="true" aria-label="Channels">
            <div className="uv-sheet-head">
              <span className="uv-brand-text">
                <span className="uv-brand-word">
                  Tech <em className="uv-serif">Universe</em>
                </span>
                <span className="uv-brand-by">
                  <em className="uv-serif">by</em> Aayush Mishra
                </span>
              </span>
              <button type="button" className="uv-ghost-btn" onClick={() => setSheetOpen(false)} aria-label="Close channels">
                <Icon name="close" size={20} />
              </button>
            </div>
            <nav className="uv-nav uv-sheet-nav" data-lenis-prevent>
              <NavGroups onNavigate={() => setSheetOpen(false)} />
            </nav>
            <div className="uv-sheet-foot">
              <button type="button" className="uv-btn uv-btn--ghost" onClick={toggleTheme}>
                <Icon name={theme === "dark" ? "sun" : "moon"} size={16} /> {theme === "dark" ? "Daylight" : "Deep Space"}
              </button>
              <Link to="/work/open-source" className="uv-btn uv-btn--ghost">
                <Icon name="arrowLeft" size={16} /> Portfolio
              </Link>
            </div>
          </div>
        )}

        <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={actions} />
      </div>
    </UniverseContext.Provider>
  );
}

export default function Universe({ match }) {
  const id = match.params.module;
  const alias = id ? aliasOf(id) : null;
  if (alias) return <Redirect to={`/universe/${alias}`} />;
  if (id && !moduleById(id)) return <Redirect to="/universe" />;
  return (
    <MusicProvider>
      <Shell id={id} />
    </MusicProvider>
  );
}
