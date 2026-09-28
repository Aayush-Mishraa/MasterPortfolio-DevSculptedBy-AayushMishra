import React, { useEffect, useMemo, useRef, useState } from "react";
import { mix } from "../../projects/lib/ui";

/*
 * A year of contributions as a 3D city: one tower per day, weeks run left to
 * right and weekdays recede into the page (Sunday at the back). Oblique
 * projection keeps it wide and readable instead of a diagonal isometric strip.
 */

const W = 10; // tower width along the week axis
const DEPTH = { x: 4.6, y: -3.6 }; // one weekday step into the page
const MAX_H = 96;
const PAD = { left: 8, right: 16, top: 12, bottom: 26 };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const levelMix = [0.1, 0.38, 0.58, 0.78, 1];

export default function Skyline({ days = [], accent = "#0E6BA8", bg = "#0b1020", dark = true, inView = true }) {
  const [hover, setHover] = useState(null);
  const frame = useRef(null);

  const model = useMemo(() => {
    if (!days.length) return null;
    const first = new Date(`${days[0].date}T00:00:00`);
    const lead = first.getDay();
    const cells = days.map((day, index) => {
      const slot = index + lead;
      return { ...day, week: Math.floor(slot / 7), weekday: slot % 7 };
    });
    const weeks = cells[cells.length - 1].week + 1;
    const max = Math.max(1, ...cells.map((cell) => cell.count));
    const width = PAD.left + weeks * W + 6 * DEPTH.x + W * 0.2 + PAD.right;
    const groundY = PAD.top + MAX_H + 6 * -DEPTH.y + 4;
    const height = groundY + PAD.bottom;

    const colors = levelMix.map((amount) => {
      const face = mix(bg, accent, amount);
      return {
        front: face,
        top: mix(face, "#ffffff", dark ? 0.22 : 0.35),
        side: mix(face, "#000000", dark ? 0.35 : 0.22),
      };
    });

    // Paint back rows first, then left to right, so nearer towers overlap farther ones.
    const ordered = [...cells].sort((a, b) => a.weekday - b.weekday || a.week - b.week);
    const towers = ordered.map((cell) => {
      const back = 6 - cell.weekday;
      const x0 = PAD.left + cell.week * W + back * DEPTH.x;
      const y0 = groundY + back * DEPTH.y;
      const h = cell.count ? 3 + Math.sqrt(cell.count / max) * (MAX_H - 3) : 1.2;
      const w = W * 0.82;
      const dx = DEPTH.x * 0.8;
      const dy = DEPTH.y * 0.8;
      const level = cell.count ? Math.max(1, Math.min(4, cell.level || Math.ceil((cell.count / max) * 4))) : 0;
      return {
        key: cell.date,
        cell,
        level,
        delay: cell.week * 14 + back * 22,
        front: `${x0},${y0 - h} ${x0 + w},${y0 - h} ${x0 + w},${y0} ${x0},${y0}`,
        top: `${x0},${y0 - h} ${x0 + w},${y0 - h} ${x0 + w + dx},${y0 - h + dy} ${x0 + dx},${y0 - h + dy}`,
        side: `${x0 + w},${y0} ${x0 + w},${y0 - h} ${x0 + w + dx},${y0 - h + dy} ${x0 + w + dx},${y0 + dy}`,
        tipX: x0 + w / 2 + dx / 2,
        tipY: y0 - h + dy,
      };
    });

    const months = [];
    cells.forEach((cell) => {
      if (cell.weekday === 0 && Number(cell.date.slice(8, 10)) <= 7) {
        months.push({ x: PAD.left + cell.week * W + 6 * DEPTH.x, label: MONTHS[Number(cell.date.slice(5, 7)) - 1] });
      }
    });

    const groundPath = [
      [PAD.left - 4, groundY + 3],
      [PAD.left + weeks * W + 2, groundY + 3],
      [PAD.left + weeks * W + 2 + 7 * DEPTH.x, groundY + 3 + 7 * DEPTH.y],
      [PAD.left - 4 + 7 * DEPTH.x, groundY + 3 + 7 * DEPTH.y],
    ]
      .map((point) => point.join(","))
      .join(" ");

    return { towers, colors, width, height, months, groundY, groundPath };
  }, [days, accent, bg, dark]);

  // On narrow screens the chart scrolls sideways; start at the most recent weeks.
  useEffect(() => {
    if (frame.current) frame.current.scrollLeft = frame.current.scrollWidth;
  }, [model]);

  if (!model) return <div className="os-skeleton-block os-skeleton-block--tall" aria-busy="true" />;

  const hovered = hover != null ? model.towers[hover] : null;

  const onMove = (event) => {
    const index = event.target.closest && event.target.closest("[data-i]");
    setHover(index ? Number(index.getAttribute("data-i")) : null);
  };

  return (
    <div className={`os-skyline ${inView ? "is-in" : ""}`} ref={frame}>
      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-label="3D chart of daily GitHub contributions over the last year"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="os-ground" x1="0" x2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.02" />
            <stop offset="0.5" stopColor={accent} stopOpacity="0.14" />
            <stop offset="1" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={model.groundPath} fill="url(#os-ground)" className="os-skyline-ground" />
        {model.towers.map((tower, index) => {
          const color = model.colors[tower.level];
          return (
            <g
              key={tower.key}
              data-i={index}
              className={`os-tower ${hover === index ? "is-hover" : ""}`}
              style={{ "--d": `${tower.delay}ms` }}
            >
              <polygon points={tower.side} fill={color.side} />
              <polygon points={tower.front} fill={color.front} />
              <polygon points={tower.top} fill={color.top} />
            </g>
          );
        })}
        {model.months.map((month) => (
          <text key={`${month.label}-${month.x}`} x={month.x} y={model.groundY + 18} className="os-skyline-month">
            {month.label}
          </text>
        ))}
        {hovered && (
          <g className="os-skyline-tip" transform={`translate(${hovered.tipX}, ${hovered.tipY - 8})`} pointerEvents="none">
            <line y1="0" y2="8" />
            <rect x="-58" y="-30" width="116" height="26" rx="6" />
            <text y="-13" textAnchor="middle">
              {hovered.cell.count} on {WEEKDAYS[hovered.cell.weekday]}{" "}
              {new Date(`${hovered.cell.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </text>
          </g>
        )}
      </svg>
      <div className="os-skyline-legend" aria-hidden="true">
        <span>Less</span>
        {model.colors.map((color, index) => (
          <i key={index} style={{ background: color.front, boxShadow: `inset 0 3px 0 ${color.top}` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
