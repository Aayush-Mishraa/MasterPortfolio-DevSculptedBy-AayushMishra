import React, { createContext, useContext } from "react";
import { timeAgo } from "../../../services/github/githubData";
import { Glyph, Icon } from "../icons";

/* Shared building blocks for every Tech Universe page. */

/** The current channel and theme, provided by the app shell. */
export const UniverseContext = createContext({ module: null, theme: "dark" });
export const useUniverse = () => useContext(UniverseContext);

export const compact = (value = 0) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(value >= 1e7 ? 0 : 1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e4 ? 0 : 1)}k`;
  return String(Math.round(value));
};

/** "What the *tech world* says": words between asterisks set in the serif italic. */
export const Title = ({ text = "" }) =>
  text.split("*").map((part, index) =>
    index % 2 ? (
      <em key={index} className="uv-serif">
        {part}
      </em>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );

export const PageHead = ({ kicker, title, children, aside }) => {
  const { module } = useUniverse();
  return (
    <header className="uv-head" style={module ? { "--gh": module.hue } : undefined}>
      {module && (
        <div className="uv-head-mark" aria-hidden="true">
          <Glyph id={module.id} size={38} live />
        </div>
      )}
      <div className="uv-head-copy">
        <span className="uv-kicker">
          {module && <b>CH {module.channel}</b>}
          {kicker}
        </span>
        <h1>
          <Title text={title} />
        </h1>
        {children && <p>{children}</p>}
      </div>
      {aside && <div className="uv-head-aside">{aside}</div>}
    </header>
  );
};

export const SectionTitle = ({ title, meta, children }) => (
  <div className="uv-section-title">
    <h2>
      <Title text={title} />
    </h2>
    {meta && <span className="uv-section-meta">{meta}</span>}
    {children && <div className="uv-section-extra">{children}</div>}
  </div>
);

/** "synced 2m ago ⟳" with a spinning refresh while loading. */
export const Sync = ({ feed, now, label = "synced" }) => (
  <span className="uv-sync">
    <span className={`uv-sync-dot ${feed.error ? "is-error" : feed.loading ? "is-loading" : ""}`} aria-hidden="true" />
    <span>
      {feed.loading && !feed.syncedAt
        ? "syncing…"
        : feed.error && !feed.data
        ? "offline"
        : feed.syncedAt
        ? `${label} ${timeAgo(feed.syncedAt, now)}`
        : "—"}
    </span>
    <button type="button" onClick={feed.reload} aria-label="Refresh" className={feed.loading ? "is-spinning" : ""}>
      <Icon name="refresh" size={14} />
    </button>
  </span>
);

export const Chips = ({ items, value, onChange, label }) => (
  <div className="uv-chips" role="group" aria-label={label}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        aria-pressed={value === item.id}
        className={value === item.id ? "is-active" : ""}
        onClick={() => onChange(item.id)}
      >
        {item.icon && <i className={item.icon} aria-hidden="true" />}
        {item.label}
        {item.count != null && <em>{item.count}</em>}
      </button>
    ))}
  </div>
);

export const Skeletons = ({ count = 6, variant = "card" }) => (
  <div className={`uv-skeletons uv-skeletons--${variant}`} aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, index) => (
      <span key={index} style={{ "--i": index }} />
    ))}
  </div>
);

/** Error with a retry, or an empty note. Shown only when there is nothing cached to display. */
export const FeedState = ({ feed, empty = "Nothing here yet.", children }) => {
  if (feed.data && (!Array.isArray(feed.data) || feed.data.length)) return children;
  if (feed.error) {
    return (
      <div className="uv-state">
        <Icon name="radio" size={28} />
        <p>This feed didn't answer ({feed.error}).</p>
        <button type="button" className="uv-btn uv-btn--ghost" onClick={feed.reload}>
          Try again
        </button>
      </div>
    );
  }
  if (!feed.data) return null;
  return (
    <div className="uv-state">
      <Icon name="sparkle" size={28} />
      <p>{empty}</p>
    </div>
  );
};

export const Stat = ({ value, label }) => (
  <div className="uv-stat">
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);

/** Deterministic hue from a string, for avatars and tags without images. */
export const hueOf = (text = "") => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
};

export const Monogram = ({ text, size = 36 }) => (
  <span
    className="uv-monogram"
    aria-hidden="true"
    style={{ "--h": hueOf(text), width: size, height: size, fontSize: size * 0.36 }}
  >
    {(text || "?").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()}
  </span>
);

export const copyText = (text) =>
  navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error("Clipboard unavailable"));
