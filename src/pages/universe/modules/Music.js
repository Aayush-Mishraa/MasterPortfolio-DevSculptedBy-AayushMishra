import React, { useEffect, useRef, useState } from "react";
import { fetchAudiusTrending, fetchSomaChannels, liveStation, searchAudius } from "../../../services/universe/sources";
import { PageHead, SectionTitle, Skeletons, compact } from "../lib/kit";
import { useFeed, useLocalState } from "../lib/useFeed";
import { Glyph, Icon } from "../icons";
import { formatTime, useMusic } from "../music/MusicContext";
import BeatVisualizer from "../music/BeatVisualizer";
import { PlayButton, Scrubber } from "../music/Dock";
import ArtImage from "../music/ArtImage";
import "./Music.css";

const STATIONS = [
  { id: "lofi", label: "Lo-Fi Focus", note: "Warm beats for long sessions", kind: "genre", q: "Lo-Fi", hue: 74 },
  { id: "ambient", label: "Deep Ambient", note: "Wide, slow and weightless", kind: "genre", q: "Ambient", hue: 190 },
  { id: "electronic", label: "Electronic", note: "Clean, driving electronica", kind: "genre", q: "Electronic", hue: 262 },
  { id: "synthwave", label: "Synthwave Drive", note: "Neon night-drive energy", kind: "search", q: "synthwave", hue: 320 },
  { id: "chillhop", label: "Chillhop", note: "Jazzy, head-nodding loops", kind: "search", q: "chillhop", hue: 30 },
  { id: "techno", label: "Techno Engine", note: "Four-on-the-floor momentum", kind: "genre", q: "Techno", hue: 0 },
  { id: "house", label: "Deep House", note: "Groove for shipping days", kind: "genre", q: "House", hue: 150 },
  { id: "hiphop", label: "Beats & Bars", note: "Hip-hop for flow state", kind: "genre", q: "Hip-Hop/Rap", hue: 45 },
];

const loadStation = (station) => (station.kind === "search" ? searchAudius(station.q) : fetchAudiusTrending(station.q));

/* ------------------------------------------------------------------ */
/* Focus timer                                                         */
/* ------------------------------------------------------------------ */

const MODES = [
  { id: "focus", label: "Focus", minutes: 25 },
  { id: "short", label: "Break", minutes: 5 },
  { id: "long", label: "Long break", minutes: 15 },
];

const chime = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const context = new AudioContext();
    [660, 880, 990].forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = frequency;
      const at = context.currentTime + index * 0.18;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(at);
      osc.stop(at + 0.55);
    });
    setTimeout(() => context.close().catch(() => {}), 1500);
  } catch (error) {
    /* the visual timer is enough */
  }
};

const FocusTimer = () => {
  const [mode, setMode] = useState("focus");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [log, setLog] = useLocalState("music:focus", {});
  const endAt = useRef(null);
  const total = MODES.find((item) => item.id === mode).minutes * 60;

  useEffect(() => {
    if (!running) return undefined;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        setRunning(false);
        chime();
        if (mode === "focus") setLog((map) => ({ ...map, [today]: (map[today] || 0) + 1 }));
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const choose = (id) => {
    setMode(id);
    setRunning(false);
    setLeft(MODES.find((item) => item.id === id).minutes * 60);
  };

  const sessions = log[today] || 0;
  const progress = 1 - left / total;
  const r = 70;
  const c = 2 * Math.PI * r;

  return (
    <div className="uv-panel mu-timer">
      <div className="mu-timer-head">
        <span className="uv-kicker">Focus session</span>
        <span className="mu-timer-count">
          {sessions} today
        </span>
      </div>
      <div className="mu-timer-modes" role="group" aria-label="Timer mode">
        {MODES.map((item) => (
          <button key={item.id} type="button" className={mode === item.id ? "is-active" : ""} onClick={() => choose(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className={`mu-timer-dial ${running ? "is-running" : ""}`}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r={r} className="mu-timer-track" />
          <circle cx="80" cy="80" r={r} className="mu-timer-fill" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - progress) }} />
        </svg>
        <div>
          <strong>
            {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
          </strong>
          <span>{running ? (mode === "focus" ? "in the zone" : "breathe") : left === 0 ? "done" : "ready"}</span>
        </div>
      </div>
      <div className="mu-timer-actions">
        <button type="button" className="uv-btn uv-btn--primary uv-btn--sm" onClick={() => (left === 0 ? choose(mode) : setRunning((value) => !value))}>
          <Icon name={running ? "pause" : "play"} size={13} /> {running ? "Pause" : left === 0 ? "Restart" : "Start"}
        </button>
        <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => choose(mode)}>
          Reset
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const StationCard = ({ station, index }) => {
  const music = useMusic();
  const feed = useFeed(`music:station:${station.id}`, () => loadStation(station), { ttl: 30 * 60 * 1000 });
  const tracks = feed.data || [];
  const active = music.meta && music.meta.id === station.id;
  const playing = active && music.status === "playing";

  const play = () => {
    if (active) music.toggle();
    else if (tracks.length) music.start(tracks, 0, { id: station.id, label: station.label });
  };

  return (
    <button
      type="button"
      className={`mu-station ${active ? "is-active" : ""}`}
      style={{ "--gh": station.hue, "--i": index }}
      onClick={play}
      disabled={!tracks.length && !active}
      data-spot
    >
      <span className="mu-mosaic" aria-hidden="true">
        {tracks.slice(0, 4).map((track) => (
          <ArtImage key={track.id} track={track} className="mu-mosaic-img" />
        ))}
        {!tracks.length && <span className="mu-mosaic-empty" />}
        <span className="mu-station-play">
          <Icon name={playing ? "pause" : "play"} size={18} />
        </span>
      </span>
      <span className="mu-station-meta">
        <strong>{station.label}</strong>
        <span>{station.note}</span>
        <em>{feed.error && !tracks.length ? "offline right now" : tracks.length ? `${tracks.length} tracks` : "tuning…"}</em>
      </span>
      {playing && (
        <span className="uv-eq is-on mu-station-eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
};

const TrackRow = ({ track, index, active, playing, onPlay }) => (
  <li className={`mu-row ${active ? "is-active" : ""}`} style={{ "--i": Math.min(index, 14) }}>
    <button type="button" onClick={onPlay}>
      <span className="mu-row-index">
        {active ? (
          <span className={`uv-eq ${playing ? "is-on" : ""}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          String(index + 1).padStart(2, "0")
        )}
      </span>
      <span className="mu-row-art">
        <ArtImage track={track} />
      </span>
      <span className="mu-row-meta">
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </span>
      <span className="mu-row-bpm">{track.kind === "live" ? (track.listeners ? `${compact(track.listeners)} listening` : "live") : track.bpm ? `${track.bpm} BPM` : ""}</span>
      <span className="mu-row-time">{track.kind === "live" ? "LIVE" : formatTime(track.duration)}</span>
    </button>
  </li>
);

const Search = () => {
  const music = useMusic();
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: false, results: null, error: null });
  const request = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setState({ loading: false, results: null, error: null });
      return undefined;
    }
    const id = ++request.current;
    setState((previous) => ({ ...previous, loading: true }));
    const timer = setTimeout(() => {
      searchAudius(term)
        .then((results) => id === request.current && setState({ loading: false, results, error: null }))
        .catch((error) => id === request.current && setState({ loading: false, results: null, error: error.message }));
    }, 420);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mu-search">
      <label className="uv-search">
        <Icon name="search" size={16} />
        <input className="uv-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Audius: “lofi rain”, “synthwave”, “piano”…" aria-label="Search tracks" />
      </label>
      {state.loading && <Skeletons count={4} variant="row" />}
      {state.error && <p className="mu-note">Search is unavailable right now ({state.error}).</p>}
      {state.results && !state.loading && (
        <ol className="mu-list">
          {state.results.length ? (
            state.results.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                active={music.track && music.track.id === track.id}
                playing={music.status === "playing"}
                onPlay={() => music.start(state.results, index, { id: `search:${query}`, label: `Search · ${query}` })}
              />
            ))
          ) : (
            <p className="mu-note">No playable tracks for “{query}”.</p>
          )}
        </ol>
      )}
      {!state.results && !state.loading && <p className="mu-note">Search millions of independent tracks. Results play right here.</p>}
    </div>
  );
};

const LiveRadio = () => {
  const music = useMusic();
  const feed = useFeed("soma:channels", fetchSomaChannels, { ttl: 10 * 60 * 1000 });
  const stations = (feed.data || []).slice().sort((a, b) => b.listeners - a.listeners).map(liveStation);
  if (!feed.data) return <Skeletons count={5} variant="row" />;
  return (
    <ol className="mu-list">
      {stations.map((station, index) => (
        <TrackRow
          key={station.id}
          track={station}
          index={index}
          active={music.track && music.track.id === station.id}
          playing={music.status === "playing"}
          onPlay={() => music.start(stations, index, { id: "live", label: "Live radio" })}
        />
      ))}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Music() {
  const music = useMusic();
  const [tab, setTab] = useState("queue");
  const lofi = useFeed("music:station:lofi", () => loadStation(STATIONS[0]), { ttl: 30 * 60 * 1000 });
  const track = music.track;
  const live = track && track.kind === "live";
  const art = track && (track.artworkLarge || track.artwork);

  const startLofi = () => {
    if (lofi.data && lofi.data.length) music.start(lofi.data, 0, { id: "lofi", label: "Lo-Fi Focus" });
  };

  const statusLabel = !track
    ? "Nothing playing"
    : music.status === "loading"
    ? "Tuning in"
    : music.status === "playing"
    ? "Now playing"
    : music.status === "error"
    ? "Signal lost"
    : "Paused";

  return (
    <div className="mu">
      <PageHead kicker="Music · on air" title="Music for *deep work.*">
        Real tracks from independent artists on Audius and live radio from SomaFM, with visuals locked to each song's tempo.
        Playback keeps going while you explore the other channels.
      </PageHead>

      <section className={`mu-stage ${music.status === "playing" ? "is-playing" : ""} ${track ? "" : "is-empty"}`} style={{ "--art": art ? `url("${art}")` : "none" }}>
        <div className="mu-backdrop" aria-hidden="true" />
        <div className="mu-deck">
          <div className="mu-record">
            <div className="mu-vinyl" aria-hidden="true">
              <div className="mu-vinyl-label">{track && <ArtImage track={track} />}</div>
            </div>
            <div className="mu-sleeve">
              {track ? (
                <ArtImage track={track} large alt={`${track.title} artwork`} />
              ) : (
                <span className="mu-sleeve-empty">
                  <Glyph id="music" size={64} live />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mu-now">
          <span className="mu-status">
            <span className={`mu-status-dot is-${music.status}`} aria-hidden="true" />
            {statusLabel}
            {music.meta && music.meta.label ? <em> · {music.meta.label}</em> : null}
          </span>
          {track ? (
            <>
              <h2 className="mu-title" key={track.id}>
                {track.title}
              </h2>
              <p className="mu-artist">{track.artist}</p>
              <div className="mu-tags">
                {track.bpm && <span>{track.bpm} BPM</span>}
                {track.key && <span>{track.key}</span>}
                {track.mood && <span>{track.mood}</span>}
                {track.genre && <span>{track.genre}</span>}
                {track.favorites > 0 && <span>♥ {compact(track.favorites)}</span>}
                {track.plays > 0 && <span>▶ {compact(track.plays)} plays</span>}
                {live && track.listeners > 0 && <span>{compact(track.listeners)} listening</span>}
              </div>
              <div className="mu-timeline">
                <span>{live ? "LIVE" : formatTime(music.time)}</span>
                <Scrubber />
                <span>{live ? "∞" : formatTime(music.duration || track.duration)}</span>
              </div>
              <div className="mu-controls">
                <button type="button" className={`uv-ghost-btn ${music.shuffle ? "is-on" : ""}`} onClick={music.toggleShuffle} aria-pressed={music.shuffle} aria-label="Shuffle">
                  <Icon name="shuffle" size={18} />
                </button>
                <button type="button" className="uv-ghost-btn mu-skip" onClick={music.prev} aria-label="Previous">
                  <Icon name="prev" size={22} />
                </button>
                <PlayButton size="lg" />
                <button type="button" className="uv-ghost-btn mu-skip" onClick={music.next} aria-label="Next">
                  <Icon name="next" size={22} />
                </button>
                <button
                  type="button"
                  className={`uv-ghost-btn mu-repeat ${music.repeat !== "off" ? "is-on" : ""}`}
                  onClick={music.cycleRepeat}
                  aria-label={`Repeat: ${music.repeat}`}
                  title={`Repeat: ${music.repeat}`}
                >
                  <Icon name="repeat" size={18} />
                  {music.repeat === "one" && <b>1</b>}
                </button>
              </div>
              <div className="mu-sub">
                <label className="mu-volume">
                  <button type="button" className="uv-ghost-btn" onClick={music.toggleMute} aria-label={music.muted ? "Unmute" : "Mute"}>
                    <Icon name={music.muted || music.volume === 0 ? "mute" : "volume"} size={17} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={music.muted ? 0 : music.volume}
                    onChange={(event) => music.setVolume(Number(event.target.value))}
                    aria-label="Volume"
                    style={{ "--v": `${(music.muted ? 0 : music.volume) * 100}%` }}
                  />
                </label>
                <a href={track.url} target="_blank" rel="noopener noreferrer" className="mu-source">
                  {live ? "SomaFM" : "Open on Audius"} <Icon name="arrowUpRight" size={14} />
                </a>
              </div>
            </>
          ) : (
            <>
              <h2 className="mu-title">Pick a station and press play.</h2>
              <p className="mu-artist">Start with this week's trending lo-fi, or choose a mood below.</p>
              <div className="mu-controls">
                <button type="button" className="uv-btn uv-btn--primary" onClick={startLofi} disabled={!(lofi.data && lofi.data.length)}>
                  <Icon name="play" size={14} /> Play Lo-Fi Focus
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mu-viz-wrap">
          <BeatVisualizer variant="bars" count={72} className="mu-viz" />
          <span className="mu-viz-note">
            {track ? (live ? "Visuals follow a steady 88 BPM pulse" : `Visuals locked to ${track.bpm || 104} BPM`) : "Visuals wake up when the music starts"}
          </span>
        </div>
      </section>

      <section className="uv-block">
        <SectionTitle title="*Stations*" meta="curated from this week's Audius charts" />
        <div className="mu-stations">
          {STATIONS.map((station, index) => (
            <StationCard key={station.id} station={station} index={index} />
          ))}
        </div>
      </section>

      <section className="uv-block mu-lower">
        <div className="uv-panel mu-browser">
          <div className="mu-tabs" role="tablist" aria-label="Music browser">
            {[
              { id: "queue", label: "Up next", icon: "queue" },
              { id: "search", label: "Search", icon: "search" },
              { id: "live", label: "Live radio", icon: "radio" },
            ].map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>
                <Icon name={item.icon} size={15} /> {item.label}
              </button>
            ))}
          </div>
          <div className="mu-browser-body" data-lenis-prevent>
            {tab === "queue" &&
              (music.queue.length ? (
                <ol className="mu-list">
                  {music.queue.map((item, index) => (
                    <TrackRow
                      key={`${item.id}-${index}`}
                      track={item}
                      index={index}
                      active={index === music.index}
                      playing={music.status === "playing"}
                      onPlay={() => music.start(music.queue, index)}
                    />
                  ))}
                </ol>
              ) : (
                <p className="mu-note">The queue is empty. Pick a station above, search, or tune into live radio.</p>
              ))}
            {tab === "search" && <Search />}
            {tab === "live" && <LiveRadio />}
          </div>
        </div>
        <aside className="mu-side">
          <FocusTimer />
          <div className="uv-panel mu-credits">
            <span className="uv-kicker">Credits</span>
            <p>
              Tracks stream from{" "}
              <a href="https://audius.co" target="_blank" rel="noopener noreferrer" className="uv-link">
                Audius
              </a>
              , an open, artist-owned music platform. Live radio comes from{" "}
              <a href="https://somafm.com/support/" target="_blank" rel="noopener noreferrer" className="uv-link">
                SomaFM
              </a>
              , listener-supported since 2000.
            </p>
            <p className="mu-keys">
              <kbd>space</kbd> play / pause · media keys work too
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
