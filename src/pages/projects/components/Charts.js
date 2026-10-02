import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, timeAgo } from "../../../services/github/githubData";
import { useOnScreen } from "../lib/ui";

let uid = 0;
const useUid = (prefix) => {
  const ref = useRef(null);
  if (ref.current === null) {
    uid += 1;
    ref.current = `${prefix}-${uid}`;
  }
  return ref.current;
};

/* Monotone cubic interpolation: smooth, but never overshoots the data. */
const smoothPath = (points) => {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0][0]},${points[0][1]}`;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = (points[i + 1][1] - points[i][1]) / (dx[i] || 1);
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  tangent[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
    } else {
      const a = tangent[i] / slope[i];
      const b = tangent[i + 1] / slope[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangent[i] = tau * a * slope[i];
        tangent[i + 1] = tau * b * slope[i];
      }
    }
  }
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += `C${x0 + h},${y0 + tangent[i] * h} ${x1 - h},${y1 - tangent[i + 1] * h} ${x1},${y1}`;
  }
  return d;
};

const Tooltip = ({ tip }) =>
  tip ? (
    <div className="pj-tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.title && <strong>{tip.title}</strong>}
      <span>{tip.body}</span>
    </div>
  ) : null;

/* ------------------------------------------------------------------ */
/* Area chart                                                          */
/* ------------------------------------------------------------------ */

export const AreaChart = ({ values = [], labels = [], height = 180, inView = true, unit = "commits", tickEvery }) => {
  const id = useUid("area");
  const [hover, setHover] = useState(null);
  const boxRef = useRef(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setBoxW(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const width = 640;
  const pad = { top: 16, right: 8, bottom: 26, left: 8 };
  const max = Math.max(1, ...values);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const points = values.map((value, index) => [
    pad.left + (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW),
    pad.top + innerH - (value / max) * innerH,
  ]);
  const line = smoothPath(points);
  const area = points.length
    ? `${line}L${points[points.length - 1][0]},${pad.top + innerH}L${points[0][0]},${pad.top + innerH}Z`
    : "";
  // Axis labels: as many as fit the rendered width. The first and last labels
  // hang off one side of their point (not centred), so a neighbour needs about
  // one and a half label widths of room; on phones "Sep 26" printed over "Oct 26".
  const base = tickEvery || Math.max(1, Math.ceil(values.length / 6));
  const labelPx = Math.max(0, ...labels.map((label) => String(label).length)) * 6.4; // 10.5px mono
  const stepPx = boxW && values.length > 1 ? (boxW * innerW) / width / (values.length - 1) : 0;
  const room = stepPx ? Math.ceil((labelPx * 1.5 + 10) / stepPx) : 0;
  const every = Math.max(base, room);
  const gapToLast = stepPx ? every : Math.ceil(every / 2);

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(point[0] - x) < Math.abs(points[nearest][0] - x)) nearest = index;
    });
    setHover(nearest);
  };

  const hovered = hover !== null && points[hover];

  return (
    <div className={`pj-chart pj-area ${inView ? "is-in" : ""}`} ref={boxRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Trend of ${unit}, peak ${max}`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pj-accent)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--pj-accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--pj-accent-2)" />
            <stop offset="100%" stopColor="var(--pj-accent)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH * (1 - f)}
            y2={pad.top + innerH * (1 - f)}
            className="pj-gridline"
          />
        ))}
        <path d={area} fill={`url(#${id}-fill)`} className="pj-area-fill" />
        <path d={line} pathLength="1" fill="none" stroke={`url(#${id}-stroke)`} className="pj-area-line" />
        {hovered && (
          <g className="pj-crosshair">
            <line x1={hovered[0]} x2={hovered[0]} y1={pad.top} y2={pad.top + innerH} />
            <circle cx={hovered[0]} cy={hovered[1]} r="4.5" />
          </g>
        )}
      </svg>
      <div className="pj-axis" aria-hidden="true">
        {labels.map((label, index) =>
          (index % every === 0 && labels.length - 1 - index >= gapToLast) || index === labels.length - 1 ? (
            <span key={index} style={{ left: `${(points[index]?.[0] / width) * 100}%` }}>
              {label}
            </span>
          ) : null
        )}
      </div>
      {hovered && (
        <Tooltip
          tip={{
            x: `${(hovered[0] / width) * 100}%`,
            y: `${(hovered[1] / height) * 100}%`,
            title: `${values[hover]} ${unit}`,
            body: labels[hover],
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

export const Sparkline = ({ values = [], width = 120, height = 32, inView = true }) => {
  const id = useUid("spark");
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => [
    (index / Math.max(1, values.length - 1)) * width,
    height - 2 - (value / max) * (height - 4),
  ]);
  const line = smoothPath(points);
  const empty = values.every((value) => value === 0);
  return (
    <svg
      className={`pj-spark ${inView ? "is-in" : ""} ${empty ? "is-empty" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pj-accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--pj-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {!empty && <path d={`${line}L${width},${height}L0,${height}Z`} fill={`url(#${id}-f)`} className="pj-spark-fill" />}
      <path d={line} pathLength="1" className="pj-spark-line" />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Contribution heatmap                                                */
/* ------------------------------------------------------------------ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const Heatmap = ({ days = [], inView = true }) => {
  const [tip, setTip] = useState(null);
  const cell = 11;
  const gap = 3;
  const step = cell + gap;
  const top = 18;
  const left = 26;

  const { columns, monthLabels } = useMemo(() => {
    if (!days.length) return { columns: [], monthLabels: [] };
    const pad = new Date(`${days[0].date}T00:00:00`).getDay();
    const slots = [...new Array(pad).fill(null), ...days];
    const cols = [];
    for (let i = 0; i < slots.length; i += 7) cols.push(slots.slice(i, i + 7));
    const labels = [];
    let lastMonth = -1;
    cols.forEach((col, index) => {
      const first = col.find(Boolean);
      if (!first) return;
      const month = Number(first.date.slice(5, 7)) - 1;
      if (month !== lastMonth && index < cols.length - 2) {
        // a partial first month would collide with the next label
        if (labels.length && index - labels[labels.length - 1].index < 3) labels.pop();
        labels.push({ index, label: MONTHS[month] });
        lastMonth = month;
      }
    });
    return { columns: cols, monthLabels: labels };
  }, [days]);

  const width = left + columns.length * step;
  const height = top + 7 * step;

  return (
    <div className={`pj-chart pj-heatmap ${inView ? "is-in" : ""}`}>
      <div className="pj-heatmap-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 620 }} role="img" aria-label="Contribution calendar for the last year">
          {monthLabels.map(({ index, label }) => (
            <text key={`${label}-${index}`} x={left + index * step} y={11} className="pj-heat-label">
              {label}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((label, i) => (
            <text key={label} x={0} y={top + (i * 2 + 1) * step + cell - 2} className="pj-heat-label">
              {label}
            </text>
          ))}
          {columns.map((col, x) =>
            col.map((day, y) =>
              day ? (
                <rect
                  key={day.date}
                  x={left + x * step}
                  y={top + y * step}
                  width={cell}
                  height={cell}
                  rx="2.5"
                  className={`pj-heat-cell l${day.level}`}
                  style={{ animationDelay: `${x * 14 + y * 6}ms` }}
                  onMouseEnter={() =>
                    setTip({
                      x: `${((left + x * step + cell / 2) / width) * 100}%`,
                      y: `${((top + y * step) / height) * 100}%`,
                      title: `${day.count} contribution${day.count === 1 ? "" : "s"}`,
                      body: formatDate(day.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                />
              ) : null
            )
          )}
        </svg>
        <Tooltip tip={tip} />
      </div>
      <div className="pj-heat-legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`pj-heat-swatch l${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export const Donut = ({ items = [], inView = true, centerLabel = "languages", valueFormat }) => {
  const [active, setActive] = useState(null);
  const size = 200;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const top = items.slice(0, 6);
  const rest = items.slice(6).reduce((sum, item) => sum + item.percent, 0);
  const segments = rest > 0.5 ? [...top, { name: "Other", percent: rest, color: "var(--pj-line-strong)" }] : top;
  let offset = 0;
  const focus = active !== null ? segments[active] : segments[0];

  return (
    <div className={`pj-donut ${inView ? "is-in" : ""}`}>
      <div className="pj-donut-ring">
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Language distribution">
          <circle cx={size / 2} cy={size / 2} r={radius} className="pj-donut-track" strokeWidth={stroke} />
          {segments.map((segment, index) => {
            const length = (segment.percent / 100) * circumference;
            const gapLength = Math.min(3, length * 0.3);
            const node = (
              <circle
                key={segment.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={active === index ? stroke + 6 : stroke}
                strokeDasharray={inView ? `${Math.max(0, length - gapLength)} ${circumference}` : `0 ${circumference}`}
                strokeDashoffset={-offset}
                className="pj-donut-seg"
                style={{ transitionDelay: `${index * 90}ms` }}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            );
            offset += length;
            return node;
          })}
        </svg>
        <div className="pj-donut-center">
          {focus ? (
            <>
              <strong>{valueFormat ? valueFormat(focus) : `${focus.percent.toFixed(1)}%`}</strong>
              <span>{focus.name}</span>
            </>
          ) : (
            <span>{centerLabel}</span>
          )}
        </div>
      </div>
      <ul className="pj-legend">
        {segments.map((segment, index) => (
          <li
            key={segment.name}
            className={active === index ? "is-active" : ""}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <i style={{ background: segment.color }} />
            <span>{segment.name}</span>
            <em>{segment.percent.toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Horizontal bar list                                                 */
/* ------------------------------------------------------------------ */

export const BarList = ({ items = [], inView = true, onSelect, unit = "" }) => {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol className={`pj-bars ${inView ? "is-in" : ""}`}>
      {items.map((item, index) => (
        <li key={item.key || item.label}>
          <button type="button" onClick={onSelect ? () => onSelect(item) : undefined} disabled={!onSelect}>
            <span className="pj-bars-label">{item.label}</span>
            <span className="pj-bars-value">
              {item.value}
              {typeof unit === "function" ? unit(item.value) : unit}
            </span>
            <span className="pj-bars-track">
              <span
                className="pj-bars-fill"
                style={{
                  width: inView ? `${(item.value / max) * 100}%` : 0,
                  transitionDelay: `${index * 70}ms`,
                  background: item.color,
                }}
              />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* Punch card: when commits happen                                     */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PunchCard = ({ dates = [], inView = true }) => {
  const [tip, setTip] = useState(null);
  const grid = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => new Array(24).fill(0));
    dates.forEach((iso) => {
      const date = new Date(iso);
      counts[date.getDay()][date.getHours()] += 1;
    });
    return counts;
  }, [dates]);
  const max = Math.max(1, ...grid.flat());
  const cell = 22;
  const left = 34;
  const top = 6;
  const width = left + 24 * cell;
  const height = top + 7 * cell + 20;

  return (
    <div className={`pj-chart pj-punch ${inView ? "is-in" : ""}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Commits by weekday and hour (local time)">
        {WEEKDAYS.map((day, y) => (
          <text key={day} x={0} y={top + y * cell + cell / 2 + 4} className="pj-heat-label">
            {day}
          </text>
        ))}
        {[0, 6, 12, 18, 23].map((hour) => (
          <text key={hour} x={left + hour * cell + cell / 2} y={height - 4} className="pj-heat-label" textAnchor="middle">
            {hour === 0 ? "12a" : hour === 12 ? "12p" : hour > 12 ? `${hour - 12}p` : `${hour}a`}
          </text>
        ))}
        {grid.map((row, y) =>
          row.map((count, x) => (
            <g key={`${x}-${y}`}>
              <circle cx={left + x * cell + cell / 2} cy={top + y * cell + cell / 2} r="1.4" className="pj-punch-dot" />
              {count > 0 && (
                <circle
                  cx={left + x * cell + cell / 2}
                  cy={top + y * cell + cell / 2}
                  r={2.5 + Math.sqrt(count / max) * 7.5}
                  className="pj-punch-bubble"
                  style={{ animationDelay: `${(x + y) * 18}ms` }}
                  onMouseEnter={() =>
                    setTip({
                      x: `${((left + x * cell + cell / 2) / width) * 100}%`,
                      y: `${((top + y * cell) / height) * 100}%`,
                      title: `${count} commit${count === 1 ? "" : "s"}`,
                      body: `${WEEKDAYS[y]}s around ${x}:00`,
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                />
              )}
            </g>
          ))
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Radar: every repo plotted by how recently it was pushed             */
/* ------------------------------------------------------------------ */

const RADAR_PERIOD = 6; // seconds per sweep

export const Radar = ({ repos = [], categories = [], onSelect, now = Date.now() }) => {
  const [hover, setHover] = useState(null);
  // pauses the sweep and pings while the chart is scrolled out of view
  const [boxRef, onScreen] = useOnScreen();
  const size = 440;
  const c = size / 2;
  const inner = 34;
  const outer = 196;
  // log scale: today → inner ring, ~3 years → outer ring
  const radiusFor = (days) => inner + (Math.log1p(Math.max(0, days)) / Math.log1p(1100)) * (outer - inner);
  const rings = [
    { days: 7, label: "1 week" },
    { days: 30, label: "1 month" },
    { days: 182, label: "6 months" },
    { days: 1100, label: "3 years" },
  ];

  const active = categories.filter((category) => repos.some((repo) => repo.category === category.id));
  const sector = 360 / Math.max(1, active.length);

  const dots = active.flatMap((category, sectorIndex) => {
    const members = repos.filter((repo) => repo.category === category.id);
    return members.map((repo, i) => {
      const angle = sectorIndex * sector + ((i + 0.5) / members.length) * sector * 0.84 + sector * 0.08;
      const days = (now - new Date(repo.pushedAt).getTime()) / 86400000;
      const r = Math.min(outer, radiusFor(days));
      const rad = ((angle - 90) * Math.PI) / 180;
      return {
        repo,
        angle,
        days,
        x: c + r * Math.cos(rad),
        y: c + r * Math.sin(rad),
        size: 3.2 + Math.min(5, Math.log2(1 + repo.commitTotal) * 0.9),
      };
    });
  });

  const hovered = hover !== null ? dots[hover] : null;
  const pct = (value) => `${(value / size) * 100}%`;

  return (
    <div className={`pj-radar ${onScreen ? "" : "is-paused"}`} ref={boxRef}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar of repositories by recency of last push">
        <defs>
          <radialGradient id="pj-radar-bg">
            <stop offset="0%" stopColor="var(--pj-accent)" stopOpacity="0.16" />
            <stop offset="70%" stopColor="var(--pj-accent)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--pj-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={outer + 14} fill="url(#pj-radar-bg)" />
        {rings.map((ring) => (
          <g key={ring.label}>
            <circle cx={c} cy={c} r={radiusFor(ring.days)} className="pj-radar-ring" />
            <text x={c + 4} y={c - radiusFor(ring.days) - 4} className="pj-radar-ring-label">
              {ring.label}
            </text>
          </g>
        ))}
        {active.map((category, index) => {
          const rad = ((index * sector - 90) * Math.PI) / 180;
          const mid = ((index * sector + sector / 2 - 90) * Math.PI) / 180;
          return (
            <g key={category.id}>
              <line x1={c} y1={c} x2={c + (outer + 10) * Math.cos(rad)} y2={c + (outer + 10) * Math.sin(rad)} className="pj-radar-spoke" />
              <text
                x={c + (outer + 26) * Math.cos(mid)}
                y={c + (outer + 26) * Math.sin(mid) + 3}
                textAnchor="middle"
                className="pj-radar-sector"
              >
                {category.label.split(" ")[0]}
              </text>
            </g>
          );
        })}
        {dots.map((dot, index) => (
          <g
            key={dot.repo.name}
            className={`pj-radar-dot ${dot.days < 14 ? "is-hot" : ""} ${hover === index ? "is-hover" : ""}`}
            transform={`translate(${dot.x} ${dot.y})`}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(index)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect && onSelect(dot.repo)}
            onKeyDown={(event) => event.key === "Enter" && onSelect && onSelect(dot.repo)}
            tabIndex={0}
            role="link"
            aria-label={`${dot.repo.title}, pushed ${timeAgo(dot.repo.pushedAt, now)}`}
          >
            <circle r={dot.size} fill={dot.repo.languages[0]?.color || "var(--pj-accent)"} className="pj-radar-core" />
          </g>
        ))}
        <circle cx={c} cy={c} r="7" className="pj-radar-origin" />
      </svg>
      {/* Sweep, pings and origin pulse live outside the SVG and animate only
          transform and opacity, so the compositor runs them and the chart
          isn't repainted every frame (the old SVG versions were). */}
      <div className="pj-radar-motion" aria-hidden="true">
        <div
          className="pj-radar-sweep"
          style={{ left: pct(c - outer), top: pct(c - outer), width: pct(outer * 2), height: pct(outer * 2), animationDuration: `${RADAR_PERIOD}s` }}
        />
        {dots.map((dot) => {
          const r = dot.size + 6;
          return (
            <i
              key={dot.repo.name}
              className="pj-radar-ping"
              style={{
                left: pct(dot.x - r),
                top: pct(dot.y - r),
                width: pct(r * 2),
                animationDuration: `${RADAR_PERIOD}s`,
                animationDelay: `${(dot.angle / 360) * RADAR_PERIOD}s`,
              }}
            />
          );
        })}
        <i className="pj-radar-origin-pulse" style={{ left: pct(c - 7), top: pct(c - 7), width: pct(14) }} />
      </div>
      {hovered && (
        <div className="pj-tip" style={{ left: `${(hovered.x / size) * 100}%`, top: `${(hovered.y / size) * 100}%` }}>
          <strong>{hovered.repo.title}</strong>
          <span>
            pushed {timeAgo(hovered.repo.pushedAt, now)} · {hovered.repo.commitTotal} commits
          </span>
        </div>
      )}
    </div>
  );
};
