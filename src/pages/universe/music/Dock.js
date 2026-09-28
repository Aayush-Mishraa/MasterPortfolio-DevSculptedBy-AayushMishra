import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../icons";
import { formatTime, useMusic } from "./MusicContext";
import BeatVisualizer from "./BeatVisualizer";
import ArtImage from "./ArtImage";

/** Scrubbable progress bar shared by the dock and the full player. */
export const Scrubber = ({ className = "" }) => {
  const music = useMusic();
  const bar = useRef(null);
  const live = music.track && music.track.kind === "live";
  const total = music.duration || (music.track && music.track.duration) || 0;
  const pct = !live && total ? Math.min(100, (music.time / total) * 100) : 0;

  const seekTo = (clientX) => {
    if (live || !total || !bar.current) return;
    const rect = bar.current.getBoundingClientRect();
    music.seek(((clientX - rect.left) / rect.width) * total);
  };

  const onPointerDown = (event) => {
    if (live) return;
    seekTo(event.clientX);
    const move = (e) => seekTo(e.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKeyDown = (event) => {
    if (live || !total) return;
    if (event.key === "ArrowRight") music.seek(music.time + 5);
    if (event.key === "ArrowLeft") music.seek(music.time - 5);
  };

  return (
    <div
      ref={bar}
      className={`uv-scrub ${live ? "is-live" : ""} ${className}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      role="slider"
      tabIndex={live ? -1 : 0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(music.time)}
      aria-valuetext={live ? "Live" : `${formatTime(music.time)} of ${formatTime(total)}`}
    >
      <span className="uv-scrub-track">
        <i className="uv-scrub-fill" style={{ width: `${pct}%` }} />
        {!live && <i className="uv-scrub-knob" style={{ left: `${pct}%` }} />}
      </span>
    </div>
  );
};

export const PlayButton = ({ size = "md" }) => {
  const music = useMusic();
  const loading = music.status === "loading";
  return (
    <button
      type="button"
      className={`uv-play uv-play--${size} ${music.playing ? "is-playing" : ""} ${loading ? "is-loading" : ""}`}
      onClick={music.toggle}
      aria-label={music.playing ? "Pause" : "Play"}
    >
      {loading && <span className="uv-play-ring" aria-hidden="true" />}
      <Icon name={music.status === "playing" ? "pause" : "play"} size={size === "lg" ? 26 : 18} />
    </button>
  );
};

export default function MusicDock() {
  const music = useMusic();
  if (!music.track) return null;
  const { track } = music;
  const live = track.kind === "live";

  return (
    <aside className="uv-dock" aria-label="Music player">
      <Scrubber className="uv-dock-scrub" />
      <Link to="/universe/music" className="uv-dock-art" title="Open the player">
        <ArtImage track={track} />
      </Link>
      <div className="uv-dock-meta">
        <strong>{track.title}</strong>
        <span>
          {track.artist}
          {music.meta && music.meta.label ? ` · ${music.meta.label}` : ""}
        </span>
      </div>
      <div className="uv-dock-controls">
        <button type="button" className="uv-ghost-btn" onClick={music.prev} aria-label="Previous">
          <Icon name="prev" size={18} />
        </button>
        <PlayButton />
        <button type="button" className="uv-ghost-btn" onClick={music.next} aria-label="Next">
          <Icon name="next" size={18} />
        </button>
      </div>
      <BeatVisualizer variant="mini" className="uv-dock-viz" />
      <span className="uv-dock-time">
        {live ? (
          <>
            <i className="uv-live-dot" aria-hidden="true" /> LIVE
          </>
        ) : (
          `${formatTime(music.time)} / ${formatTime(music.duration || track.duration)}`
        )}
      </span>
      <div className="uv-dock-volume">
        <button type="button" className="uv-ghost-btn" onClick={music.toggleMute} aria-label={music.muted ? "Unmute" : "Mute"}>
          <Icon name={music.muted || music.volume === 0 ? "mute" : "volume"} size={18} />
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
      </div>
      <Link to="/universe/music" className="uv-ghost-btn uv-dock-expand" aria-label="Open full player">
        <Icon name="expand" size={17} />
      </Link>
      <button type="button" className="uv-ghost-btn uv-dock-close" onClick={music.stop} aria-label="Stop and close player">
        <Icon name="close" size={17} />
      </button>
    </aside>
  );
}
