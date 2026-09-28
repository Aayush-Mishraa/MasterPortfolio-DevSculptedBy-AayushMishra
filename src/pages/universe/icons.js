import React from "react";

/*
 * Tech Universe icon system.
 *
 * Channel glyphs are drawn on a 32px grid with a 1.6px stroke and one accent
 * layer (.g-acc / .g-acc-s), which takes the channel's colour. Each glyph has a
 * single meaningful motion (a sweep, a flicker, a spin) that plays on hover or
 * while the channel is active. Motion lives in Universe.css.
 */

const Svg = ({ size, view = 32, className = "", children, stroke = 1.6, title }) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${view} ${view}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={title ? undefined : "true"}
    role={title ? "img" : undefined}
  >
    {title && <title>{title}</title>}
    {children}
  </svg>
);

const GLYPHS = {
  hub: (
    <>
      <path className="g-dim" d="M3.95 20.87A13 4.6 -22 0 1 28.05 11.13" />
      <circle className="g-acc" cx="16" cy="16" r="6.2" stroke="none" />
      <path d="M28.05 11.13A13 4.6 -22 0 1 3.95 20.87" />
      <circle className="g-sat" cx="7.2" cy="19.9" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  news: (
    <>
      <circle className="g-acc" cx="16" cy="15" r="2.4" stroke="none" />
      <path d="M16 17.4V27M12 27h8" />
      <path className="g-wave g-w1" d="M12.4 11.4a5.1 5.1 0 0 0 0 7.2M19.6 11.4a5.1 5.1 0 0 1 0 7.2" />
      <path className="g-wave g-w2" d="M9.2 8.2a9.6 9.6 0 0 0 0 13.6M22.8 8.2a9.6 9.6 0 0 1 0 13.6" />
    </>
  ),
  models: (
    <>
      <circle cx="16" cy="16" r="11.5" />
      <circle className="g-dim" cx="16" cy="16" r="6.4" />
      <path className="g-dim" d="M16 4.5v23M4.5 16h23" />
      <g className="g-sweep">
        <path className="g-acc g-soft" d="M16 16V4.5a11.5 11.5 0 0 1 8.13 3.37z" stroke="none" />
        <path className="g-acc-s" d="M16 16l8.13-8.13" />
      </g>
      <circle className="g-acc g-blip g-b1" cx="21" cy="11.6" r="1.4" stroke="none" />
      <circle className="g-acc g-blip g-b2" cx="11.2" cy="20.4" r="1.1" stroke="none" />
    </>
  ),
  papers: (
    <>
      <path d="M9.5 4.5h9.2l6.3 6.3v15.7a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1v-21a1 1 0 0 1 1-1z" />
      <path d="M18.5 4.8V11h6.2" />
      <path className="g-dim" d="M12 16h8M12 19.5h6M12 23h4.5" />
      <path className="g-acc g-spark" stroke="none" d="M23.5 18.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </>
  ),
  "ai-engineer": (
    <>
      <rect x="8.5" y="8.5" width="15" height="15" rx="3" />
      <rect className="g-acc g-core" x="12.5" y="12.5" width="7" height="7" rx="1.5" stroke="none" />
      <path className="g-pin g-p1" d="M12.5 4.5v4M16 4.5v4M19.5 4.5v4" />
      <path className="g-pin g-p2" d="M23.5 12.5h4M23.5 16h4M23.5 19.5h4" />
      <path className="g-pin g-p3" d="M12.5 23.5v4M16 23.5v4M19.5 23.5v4" />
      <path className="g-pin g-p4" d="M4.5 12.5h4M4.5 16h4M4.5 19.5h4" />
    </>
  ),
  launches: (
    <g className="g-rocket">
      <path d="M16 3.8c3.9 2.9 5.9 7.3 5.9 12.2v5.4H10.1V16c0-4.9 2-9.3 5.9-12.2z" />
      <circle cx="16" cy="12.6" r="2.3" />
      <path d="M10.1 17.2l-3.6 3.5v4.1l3.6-1.6M21.9 17.2l3.6 3.5v4.1l-3.6-1.6" />
      <path className="g-acc g-flame" stroke="none" d="M13.2 22.6h5.6c0 2.9-1.2 4.9-2.8 6.6-1.6-1.7-2.8-3.7-2.8-6.6z" />
    </g>
  ),
  contribute: (
    <>
      <circle cx="10" cy="7.5" r="2.6" />
      <circle cx="10" cy="24.5" r="2.6" />
      <circle className="g-acc" cx="22.5" cy="12.5" r="2.8" stroke="none" />
      <path d="M10 10.1v11.8" />
      <path className="g-acc-s g-flow" d="M22.5 15.3V18c0 3.6-2.9 6.5-6.5 6.5h-3.4" />
    </>
  ),
  testing: (
    <>
      <path d="M12.6 4.5h6.8" />
      <path d="M13.8 4.5v7.9L7.7 24.3a2.1 2.1 0 0 0 1.9 3.2h12.8a2.1 2.1 0 0 0 1.9-3.2l-6.1-11.9V4.5" />
      <path className="g-acc" stroke="none" d="M10.2 19.5h11.6l2.3 4.6a1.5 1.5 0 0 1-1.3 2.2H9.2a1.5 1.5 0 0 1-1.3-2.2z" />
      <circle className="g-bubble g-u1" cx="14.6" cy="22.6" r="1" />
      <circle className="g-bubble g-u2" cx="18.2" cy="21.4" r=".8" />
    </>
  ),
  arcade: (
    <>
      <path d="M10.2 10.5h11.6c3 0 5.5 2.1 6 5l1.1 6.2c.4 2.3-1.3 4.3-3.6 4.3-1.1 0-2.1-.5-2.8-1.3L20.2 22h-8.4l-2.3 2.7c-.7.8-1.7 1.3-2.8 1.3-2.3 0-4-2-3.6-4.3l1.1-6.2c.5-2.9 3-5 6-5z" />
      <path d="M10.5 14.8v4.4M8.3 17h4.4" />
      <circle className="g-acc g-key g-k1" cx="21.2" cy="15.6" r="1.35" stroke="none" />
      <circle className="g-acc g-key g-k2" cx="23.8" cy="18.3" r="1.35" stroke="none" />
    </>
  ),
  studio: (
    <>
      <path d="M21.2 4.8l6 6-13.4 13.4-7.4 1.4 1.4-7.4z" />
      <path className="g-dim" d="M18.6 7.4l6 6" />
      <path className="g-acc-s g-draw" d="M4.5 28.2c2.4-1.6 4.3.2 6.4-.9 2.2-1.1 3.7-.3 5.8-.9" />
    </>
  ),
  music: (
    <>
      <g className="g-vinyl">
        <circle cx="14.5" cy="17.5" r="11" />
        <circle className="g-dim" cx="14.5" cy="17.5" r="7.6" />
        <circle className="g-acc" cx="14.5" cy="17.5" r="3.4" stroke="none" />
        <circle cx="14.5" cy="17.5" r=".9" fill="currentColor" stroke="none" />
        <path className="g-acc-s g-glint" d="M7.9 11.6a8.6 8.6 0 0 1 3.8-2.6" />
      </g>
      <path d="M27.5 4.5v9.8l-5.2 4.9" />
      <circle cx="27.5" cy="4.5" r="1.4" />
    </>
  ),
  screen: (
    <>
      <path d="M5.5 13.5h21v11.6a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2z" />
      <g className="g-clap">
        <path d="M5.3 12.9l-.7-3.6a1.3 1.3 0 0 1 1-1.5l18.9-3.8a1.3 1.3 0 0 1 1.5 1l.7 3.6z" />
        <path className="g-dim" d="M10.4 7.6l2.6 4.2M15.8 6.5l2.6 4.2M21.2 5.4l2.6 4.2" />
      </g>
      <path className="g-acc" stroke="none" d="M14 17.3v6.4a.6.6 0 0 0 .9.5l5.1-3.2a.6.6 0 0 0 0-1l-5.1-3.2a.6.6 0 0 0-.9.5z" />
    </>
  ),
  status: (
    <>
      <circle className="g-dim" cx="16" cy="16" r="12" />
      <path className="g-acc-s g-dim" d="M4 16.5h5.2l2.4-5.6 4.2 11.8 3.1-8.4 1.9 2.2H28" />
      <path className="g-acc-s g-pulse" d="M4 16.5h5.2l2.4-5.6 4.2 11.8 3.1-8.4 1.9 2.2H28" />
    </>
  ),
  history: (
    <>
      <path d="M5.6 11.2A11.5 11.5 0 1 1 4.7 18" />
      <path d="M5.2 5.8v5.6h5.6" />
      <g className="g-hands">
        <path className="g-acc-s" d="M16 10.2V16l4.2 2.6" />
      </g>
      <circle cx="16" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Channel glyph. `hue` tints the accent layer; `live` keeps its motion running. */
export const Glyph = ({ id, size = 28, hue, live = false, className = "" }) => (
  <span className={`uv-glyph ${live ? "is-live" : ""} ${className}`} style={hue != null ? { "--gh": hue } : undefined}>
    <Svg size={size} className={`g-${id}`}>
      {GLYPHS[id] || GLYPHS.hub}
    </Svg>
  </span>
);

export const BrandMark = ({ size = 30 }) => (
  <span className="uv-glyph uv-brandmark is-live">
    <Svg size={size} className="g-hub" stroke={1.8}>
      {GLYPHS.hub}
    </Svg>
  </span>
);

/* ------------------------------------------------------------------ */
/* Interface icons: 24px grid, 1.7px stroke                            */
/* ------------------------------------------------------------------ */

const UI = {
  search: <path d="M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6zM20 20l-4.4-4.4" />,
  command: <path d="M9 6.5A2.5 2.5 0 1 0 6.5 9H9V6.5zM9 9h6v6H9zM15 9V6.5A2.5 2.5 0 1 1 17.5 9H15zM15 15h2.5a2.5 2.5 0 1 1-2.5 2.5V15zM9 15v2.5A2.5 2.5 0 1 1 6.5 15H9z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8 7h9v9" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" fill="currentColor" stroke="none" />,
  next: <path d="M6 5.5v13l9-6.5zM18 5.5v13" />,
  prev: <path d="M18 5.5v13L9 12zM6 5.5v13" />,
  shuffle: <path d="M16 4h4v4M4 20L20 4M20 16v4h-4M15 15l5 5M4 4l5 5" />,
  repeat: <path d="M17 2.5l3.5 3.5L17 9.5M3.5 11.5V10A4 4 0 0 1 7.5 6h13M7 21.5L3.5 18 7 14.5M20.5 12.5V14a4 4 0 0 1-4 4h-13" />,
  volume: <path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />,
  mute: <path d="M11 5L6 9H3v6h3l5 4zM16 9l6 6M22 9l-6 6" />,
  expand: <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />,
  sidebar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  home: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />,
  queue: <path d="M4 6h12M4 11h12M4 16h7M17 14v6M14 17h6" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  radio: (
    <>
      <circle cx="12" cy="13" r="2" />
      <path d="M8.2 9.2a5.4 5.4 0 0 0 0 7.6M15.8 9.2a5.4 5.4 0 0 1 0 7.6M5.3 6.3a9.5 9.5 0 0 0 0 13.4M18.7 6.3a9.5 9.5 0 0 1 0 13.4" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 1.5M9.5 2.5h5" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
  github: <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
};

export const Icon = ({ name, size = 18, className = "", stroke = 1.7 }) => (
  <Svg size={size} view={24} className={`uv-icon ${className}`} stroke={stroke}>
    {UI[name]}
  </Svg>
);
