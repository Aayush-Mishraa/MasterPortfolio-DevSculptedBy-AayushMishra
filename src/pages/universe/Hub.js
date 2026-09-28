import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { BANDS, MODULES } from "./modules";
import { Glyph, Icon } from "./icons";
import { compact, Title } from "./lib/kit";
import { useFeed, useLocalState } from "./lib/useFeed";
import { useMusic } from "./music/MusicContext";
import BeatVisualizer from "./music/BeatVisualizer";
import ArtImage from "./music/ArtImage";
import { prefersReducedMotion } from "../projects/lib/ui";
import { timeAgo } from "../../services/github/githubData";
import {
  fetchAllStatus,
  fetchAudiusTrending,
  fetchDailyPapers,
  fetchHNFront,
  fetchOnThisDay,
  fetchShowHN,
  fetchTrendingModels,
  fetchWeeklyDownloads,
} from "../../services/universe/sources";
import "./Hub.css";

// Distinct live endpoints used across the channels (HN, DEV, GitHub repos and
// issues, HF models/spaces/papers, OpenRouter, npm, 13 status pages,
// Wikipedia x2, TVmaze, Open Library, SomaFM, Radio Browser, Audius, shields.io).
const LIVE_FEEDS = 32;
const WAR = ["@playwright/test", "cypress", "puppeteer", "selenium-webdriver", "webdriverio"];
const LOFI = { label: "Lo-Fi Focus", id: "lofi" };

const hacktoberfest = (now) => {
  const date = new Date(now);
  const year = date.getFullYear();
  const start = new Date(year, 9, 1);
  const end = new Date(year, 10, 1);
  if (date >= start && date < end) return { live: true, days: Math.ceil((end - date) / 86400000), year };
  const next = date < start ? start : new Date(year + 1, 9, 1);
  const ms = next - date;
  return { live: false, days: Math.floor(ms / 86400000), hours: Math.floor((ms % 86400000) / 3600000), year: next.getFullYear() };
};

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const useHubData = () => {
  const today = new Date();
  const news = useFeed("hn:front", fetchHNFront, { ttl: 10 * 60 * 1000, refreshMs: 10 * 60 * 1000 });
  const status = useFeed("status:all", fetchAllStatus, { ttl: 2 * 60 * 1000, refreshMs: 2 * 60 * 1000 });
  const papers = useFeed("papers:latest", () => fetchDailyPapers(), { ttl: 30 * 60 * 1000 });
  const models = useFeed("hf:models:all", () => fetchTrendingModels(""), { ttl: 30 * 60 * 1000 });
  const history = useFeed(`onthisday:${today.getMonth() + 1}-${today.getDate()}`, () => fetchOnThisDay(today), { ttl: 12 * 60 * 60 * 1000 });
  const war = useFeed("npm:war:week", () => fetchWeeklyDownloads(WAR), { ttl: 6 * 60 * 60 * 1000 });
  const launches = useFeed("launch:showhn", fetchShowHN, { ttl: 15 * 60 * 1000 });
  const lofi = useFeed("music:trending:Lo-Fi", () => fetchAudiusTrending("Lo-Fi"), { ttl: 30 * 60 * 1000 });
  return { news, status, papers, models, history, war, launches, lofi };
};

/* ------------------------------------------------------------------ */
/* Signal tuner                                                        */
/* ------------------------------------------------------------------ */

const SIZE = 520;
const C = SIZE / 2;
const RING = 196;
const PAD_X = 84;
const PAD_Y = 26;

const polar = (radius, degrees) => {
  const rad = (degrees * Math.PI) / 180;
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)];
};

const Tuner = ({ readouts, onPlayMusic }) => {
  const history = useHistory();
  const n = MODULES.length;
  const step = 360 / n;
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [scanning, setScanning] = useState(!prefersReducedMotion());
  const indexRef = useRef(0);
  const wheelAt = useRef(0);

  const tune = useCallback(
    (target, manual = true) => {
      const next = ((target % n) + n) % n;
      let delta = next - indexRef.current;
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
      indexRef.current = next;
      setIndex(next);
      setRotation((value) => value + delta * step);
      if (manual) setScanning(false);
    },
    [n, step]
  );

  useEffect(() => {
    if (!scanning) return undefined;
    const id = setInterval(() => tune(indexRef.current + 1, false), 2800);
    return () => clearInterval(id);
  }, [scanning, tune]);

  const module = MODULES[index];
  const readout = readouts[module.id];

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      tune(indexRef.current + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      tune(indexRef.current - 1);
    } else if (event.key === "Enter" && event.target === event.currentTarget) history.push(`/universe/${module.id}`);
  };

  const onWheel = (event) => {
    const t = Date.now();
    if (t - wheelAt.current < 220) return;
    wheelAt.current = t;
    tune(indexRef.current + (event.deltaY > 0 ? 1 : -1));
  };

  const ticks = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => {
        const angle = i * 3 - 90;
        const major = i % 10 === 0;
        const [x1, y1] = polar(RING + (major ? 4 : 8), angle);
        const [x2, y2] = polar(RING + 16, angle);
        return { x1, y1, x2, y2, major, key: i };
      }),
    []
  );

  return (
    <div
      className="hb-tuner"
      style={{ "--gh": module.hue }}
      tabIndex={0}
      role="group"
      aria-label="Signal tuner. Use the arrow keys to change channel and Enter to open it."
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      data-lenis-prevent
    >
      <div className="hb-dial-wrap">
      {/* Extra room around the ring so station labels never clip. */}
      <svg viewBox={`${-PAD_X} ${-PAD_Y} ${SIZE + PAD_X * 2} ${SIZE + PAD_Y * 2}`} className="hb-dial" aria-hidden="true">
        <defs>
          <radialGradient id="hb-core" cx="50%" cy="42%" r="62%">
            <stop offset="0%" className="hb-core-stop-a" />
            <stop offset="100%" className="hb-core-stop-b" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={RING + 24} className="hb-ring hb-ring--outer" />
        <circle cx={C} cy={C} r={RING} className="hb-ring" />
        <circle cx={C} cy={C} r={RING - 46} className="hb-ring hb-ring--inner" />
        {ticks.map((tick) => (
          <line key={tick.key} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} className={tick.major ? "hb-tick hb-tick--major" : "hb-tick"} />
        ))}
        {MODULES.map((item, i) => {
          const angle = i * step - 90;
          const [x, y] = polar(RING - 22, angle);
          const [lx, ly] = polar(RING + 40, angle);
          const cos = Math.cos((angle * Math.PI) / 180);
          const anchor = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
          const active = i === index;
          return (
            <g key={item.id} className={`hb-station ${active ? "is-active" : ""}`} style={{ "--gh": item.hue }} onClick={() => tune(i)}>
              <circle cx={x} cy={y} r="16" className="hb-station-hit" />
              {active && <circle cx={x} cy={y} r="14" className="hb-station-halo" />}
              <circle cx={x} cy={y} r={active ? 6.5 : 3.5} className="hb-station-dot" />
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="hb-station-label">
                <tspan className="hb-station-ch">{item.channel}</tspan> {item.short.toUpperCase()}
              </text>
            </g>
          );
        })}
        <g className="hb-needle" style={{ transform: `rotate(${rotation}deg)` }}>
          <line x1={C} y1={C - 120} x2={C} y2={C - RING + 30} className="hb-needle-line" />
          <path d={`M${C - 6} ${C - RING + 34} L${C} ${C - RING + 18} L${C + 6} ${C - RING + 34} Z`} className="hb-needle-tip" />
        </g>
        <circle cx={C} cy={C} r="118" fill="url(#hb-core)" className="hb-core-disc" />
      </svg>

      <div className="hb-core" key={module.id}>
        <span className="hb-core-glyph">
          <Glyph id={module.id} size={38} live />
        </span>
        <span className="hb-core-ch">
          CH {module.channel} · {module.band}
        </span>
        <strong className="hb-core-title">{module.title}</strong>
        <span className="hb-core-readout">{readout || module.tagline}</span>
        <div className="hb-core-actions">
          <Link to={`/universe/${module.id}`} className="uv-btn uv-btn--primary uv-btn--sm">
            Tune in <Icon name="arrowRight" size={15} />
          </Link>
          {module.id === "music" && (
            <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={onPlayMusic}>
              <Icon name="play" size={12} /> Play
            </button>
          )}
        </div>
      </div>
      </div>

      <div className="hb-tuner-controls">
        <button type="button" className="uv-ghost-btn" onClick={() => tune(indexRef.current - 1)} aria-label="Previous channel">
          <Icon name="chevronLeft" size={18} />
        </button>
        <button type="button" className={`hb-scan ${scanning ? "is-on" : ""}`} onClick={() => setScanning((value) => !value)} aria-pressed={scanning}>
          <span className="hb-scan-dot" aria-hidden="true" /> {scanning ? "Scanning" : "Scan"}
        </button>
        <button type="button" className="uv-ghost-btn" onClick={() => tune(indexRef.current + 1)} aria-label="Next channel">
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Live board                                                          */
/* ------------------------------------------------------------------ */

const moduleOf = (id) => MODULES.find((module) => module.id === id);

const Card = ({ id, span, title, children, className = "" }) => {
  const module = moduleOf(id);
  return (
    <section className={`hb-card hb-span-${span} ${className}`} data-spot style={{ "--gh": module.hue }}>
      <header className="hb-card-head">
        <Glyph id={id} size={20} />
        <span className="hb-card-ch">
          <b>CH {module.channel}</b> {title || module.title}
        </span>
        <Link to={`/universe/${id}`} className="hb-card-go" aria-label={`Open ${module.title}`}>
          <Icon name="arrowUpRight" size={16} />
        </Link>
      </header>
      <div className="hb-card-body">{children}</div>
    </section>
  );
};

const Lines = ({ count = 3 }) => (
  <div className="uv-lines" aria-busy="true">
    {Array.from({ length: count }, (_, i) => (
      <span key={i} />
    ))}
  </div>
);

const MusicCard = ({ lofi, onPlay }) => {
  const music = useMusic();
  const track = music.track;
  const cover = track || (lofi.data && lofi.data[0]);
  return (
    <Card id="music" span={4} className="hb-card--music">
      <div className="hb-music">
        <div className={`hb-music-disc ${music.status === "playing" ? "is-spinning" : ""}`}>
          {cover && <ArtImage track={cover} />}
          <span className="hb-music-hole" aria-hidden="true" />
        </div>
        <div className="hb-music-meta">
          <span className="hb-music-kicker">{track ? (music.status === "playing" ? "Now playing" : "Paused") : "Focus station"}</span>
          <strong>{track ? track.title : "Lo-Fi Focus"}</strong>
          <span>{track ? track.artist : "This week's trending lo-fi on Audius"}</span>
        </div>
        <button
          type="button"
          className={`uv-play ${music.playing ? "is-playing" : ""}`}
          onClick={() => (track ? music.toggle() : onPlay())}
          aria-label={music.status === "playing" ? "Pause" : "Play focus music"}
          disabled={!track && !(lofi.data && lofi.data.length)}
        >
          <Icon name={music.status === "playing" ? "pause" : "play"} size={18} />
        </button>
      </div>
      <BeatVisualizer variant="bars" count={40} className="hb-music-viz" />
    </Card>
  );
};

export default function Hub({ now }) {
  const data = useHubData();
  const music = useMusic();
  const [sniper] = useLocalState("arcade:sniper:best", 0);

  const playLofi = useCallback(() => {
    if (data.lofi.data && data.lofi.data.length) music.start(data.lofi.data, 0, LOFI);
  }, [data.lofi.data, music]);

  const statusList = data.status.data || [];
  const issues = statusList.filter((service) => service.indicator !== "none" && service.indicator !== "unknown");
  const healthy = statusList.filter((service) => service.indicator === "none").length;
  const hack = hacktoberfest(now);
  const events = data.history.data ? (data.history.data.tech.length ? data.history.data.tech : data.history.data.selected) : [];
  const warMax = data.war.data && data.war.data[0] ? data.war.data[0].downloads || 1 : 1;
  const topPaper = data.papers.data && data.papers.data[0];

  const readouts = {
    news: data.news.data && data.news.data[0] ? `Top story: ${data.news.data[0].title}` : null,
    launches: data.launches.data && data.launches.data[0] ? `Launch of the week: ${data.launches.data[0].title}` : null,
    status: statusList.length ? `${healthy} of ${statusList.length} services fully operational right now` : null,
    history: events[0] ? `${events[0].year}: ${events[0].text}` : null,
    models: data.models.data && data.models.data[0] ? `#1 trending: ${data.models.data[0].name}` : null,
    papers: topPaper ? `Paper of the day: ${topPaper.title}` : null,
    "ai-engineer": "Which LLMs are free today, and what yours would cost.",
    testing:
      data.war.data && data.war.data[0]
        ? `${data.war.data[0].name.replace("@playwright/test", "Playwright")} leads with ${compact(data.war.data[0].downloads)} installs a week`
        : null,
    studio: "Badges, conventional commits and cron schedules, made in seconds.",
    contribute: hack.live ? `Hacktoberfest is live · ${hack.days} days left` : `${hack.days} days until Hacktoberfest ${hack.year}`,
    music: music.track ? `Now playing: ${music.track.title}` : "Real tracks for deep work, with visuals locked to the beat.",
    arcade: sniper ? `Your Selector Sniper best: ${sniper}` : "Selector Sniper, Bug Hunt and Code Typer.",
    screen: "Films, series and books about the people who built tech.",
  };

  const wire = useMemo(() => {
    const items = [];
    (data.news.data || []).slice(0, 6).forEach((story) => items.push({ id: story.id, tag: "News", text: story.title, href: story.url }));
    (data.models.data || []).slice(0, 3).forEach((model) => items.push({ id: model.id, tag: "Model", text: `${model.name} is trending`, href: model.url }));
    (data.papers.data || []).slice(0, 3).forEach((paper) => items.push({ id: paper.id, tag: "Paper", text: paper.title, href: paper.url }));
    (data.launches.data || []).slice(0, 3).forEach((story) => items.push({ id: `l-${story.id}`, tag: "Launch", text: story.title, href: story.url }));
    return items;
  }, [data.news.data, data.models.data, data.papers.data, data.launches.data]);

  return (
    <div className="hb">
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="hb-hero">
        <div className="hb-hero-copy">
          <span className="hb-eyebrow">
            <span className="uv-live-dot" aria-hidden="true" />
            On air · {new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <h1 className="hb-title">
            <Title text="Tune into the *tech universe.*" />
          </h1>
          <p className="hb-lede">
            Thirteen live channels for the tech world: news, AI models and research, launches, open-source issues, music for
            deep work and games for engineers. All of it streams from open, public data. No sign-up and no keys.
          </p>
          <div className="uv-row hb-cta">
            <a href="#board" className="uv-btn uv-btn--primary">
              Explore the channels <Icon name="arrowRight" size={16} />
            </a>
            <button
              type="button"
              className="uv-btn uv-btn--ghost"
              onClick={music.track ? music.toggle : playLofi}
              disabled={!music.track && !(data.lofi.data && data.lofi.data.length)}
            >
              <Icon name={music.status === "playing" ? "pause" : "play"} size={13} /> {music.status === "playing" ? "Pause music" : "Play focus music"}
            </button>
          </div>
          <dl className="hb-facts">
            <div>
              <dt>Channels</dt>
              <dd>{MODULES.length}</dd>
            </div>
            <div>
              <dt>Live feeds</dt>
              <dd>{LIVE_FEEDS}</dd>
            </div>
            <div>
              <dt>API keys</dt>
              <dd>0</dd>
            </div>
          </dl>
        </div>
        <Tuner readouts={readouts} onPlayMusic={playLofi} />
      </section>

      {/* ---------------------------- LIVE WIRE --------------------------- */}
      {wire.length > 0 && (
        <div className="hb-wire" aria-label="Live wire">
          <span className="hb-wire-label">
            <span className="uv-live-dot" aria-hidden="true" /> Live wire
          </span>
          <div className="hb-wire-track">
            <div className="hb-wire-run">
              {[...wire, ...wire].map((item, i) => (
                <a key={`${item.id}-${i}`} href={item.href} target="_blank" rel="noopener noreferrer" tabIndex={i >= wire.length ? -1 : 0}>
                  <b>{item.tag}</b>
                  {item.text}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------- LIVE BOARD -------------------------- */}
      <section className="hb-board" id="board">
        <div className="hb-board-head">
          <h2>
            <Title text="Right now, *on air.*" />
          </h2>
          <p>Every card is live and refreshes on its own. Open one for the full channel.</p>
        </div>

        <div className="hb-grid">
          <Card id="news" span={7} className="hb-card--news">
            {!data.news.data ? (
              <Lines count={6} />
            ) : (
              <ol className="hb-headlines">
                {data.news.data.slice(0, 5).map((story, i) => (
                  <li key={story.id} style={{ "--i": i }}>
                    <span className="hb-rank">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <a href={story.url} target="_blank" rel="noopener noreferrer">
                        {story.title}
                      </a>
                      <span className="hb-headline-meta">
                        {story.points} points · {story.comments} comments · {timeAgo(story.date, now)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card id="status" span={5} title="Internet weather" className={issues.length ? "is-cloudy" : "is-clear"}>
            {!statusList.length ? (
              <Lines count={4} />
            ) : (
              <>
                <div className="hb-weather">
                  <strong>
                    {healthy}
                    <small>/{statusList.length}</small>
                  </strong>
                  <span>services fully operational</span>
                </div>
                <p className="hb-weather-note">
                  {issues.length ? `${issues.map((service) => service.name).join(", ")} reporting issues.` : "Clear skies. Everything is up."}
                </p>
                <ul className="hb-status-grid">
                  {statusList.map((service) => (
                    <li key={service.id} className={`is-${service.indicator}`} title={`${service.name}: ${service.description}`}>
                      <i />
                      {service.name}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card id="papers" span={4} title="Paper of the day">
            {!data.papers.data ? (
              <Lines count={4} />
            ) : (
              topPaper && (
                <a href={topPaper.url} target="_blank" rel="noopener noreferrer" className="hb-paper">
                  {topPaper.thumbnail && <img src={topPaper.thumbnail} alt="" loading="lazy" />}
                  <strong className="uv-clamp-2">{topPaper.title}</strong>
                  <span>
                    ▲ {topPaper.upvotes} · {topPaper.authors.slice(0, 2).join(", ")}
                    {topPaper.authors.length > 2 ? " et al." : ""}
                  </span>
                </a>
              )
            )}
          </Card>

          <Card id="models" span={4} title="Trending models">
            {!data.models.data ? (
              <Lines count={5} />
            ) : (
              <ol className="hb-models">
                {data.models.data.slice(0, 5).map((model, i) => (
                  <li key={model.id}>
                    <span className="hb-rank">{i + 1}</span>
                    <a href={model.url} target="_blank" rel="noopener noreferrer">
                      <strong>{model.name}</strong>
                      <span>
                        {model.org} · ♥ {compact(model.likes)}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <MusicCard lofi={data.lofi} onPlay={playLofi} />

          <Card id="testing" span={5} title="E2E framework race">
            {!data.war.data ? (
              <Lines count={5} />
            ) : (
              <ul className="hb-race">
                {data.war.data.map((item, i) => (
                  <li key={item.name} style={{ "--w": `${(item.downloads / warMax) * 100}%`, "--i": i }}>
                    <span>{item.name.replace("@playwright/test", "playwright")}</span>
                    <i />
                    <b>{compact(item.downloads)}</b>
                  </li>
                ))}
              </ul>
            )}
            <p className="hb-foot">npm installs · last 7 days</p>
          </Card>

          <Card id="history" span={4} title="On this day">
            {!events.length ? (
              <Lines count={3} />
            ) : (
              <div className="hb-history">
                <b>{events[0].year}</b>
                <p className="uv-clamp-3">{events[0].text}</p>
              </div>
            )}
          </Card>

          <Card id="contribute" span={3} title="Hacktoberfest">
            <div className="hb-count">
              <strong>{hack.days}</strong>
              <span>{hack.live ? `days left in Hacktoberfest ${hack.year}` : `days${hack.hours != null ? ` ${hack.hours}h` : ""} to Hacktoberfest ${hack.year}`}</span>
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------------------- DIRECTORY --------------------------- */}
      <section className="hb-directory">
        <div className="hb-board-head">
          <h2>
            <Title text="The *channel guide.*" />
          </h2>
          <p>Thirteen channels in four bands. Each one is a full page you can bookmark and share.</p>
        </div>
        {BANDS.map((band) => (
          <div key={band.id} className="hb-band">
            <span className="hb-band-label">{band.label}</span>
            <div className="hb-band-grid">
              {MODULES.filter((module) => module.band === band.id).map((module, i) => (
                <Link key={module.id} to={`/universe/${module.id}`} className="hb-channel" data-spot style={{ "--gh": module.hue, "--i": i }}>
                  <span className="hb-channel-glyph">
                    <Glyph id={module.id} size={30} />
                  </span>
                  <span className="hb-channel-ch">CH {module.channel}</span>
                  <strong>{module.title}</strong>
                  <span className="hb-channel-tag">{module.tagline}</span>
                  <span className="hb-channel-src">{module.source}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
