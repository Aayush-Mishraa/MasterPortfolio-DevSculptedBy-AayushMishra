import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PROFILE, TRAJECTORY, availabilityAt, formatSpan, utcLabel, workingHoursForVisitor } from "../homeData";
import { prefersReducedMotion, useIsomorphicLayoutEffect, useNow, useOnScreen, useReveal } from "../lib/motion";
import "./Trajectory.css";

/*
  The branch that merged: the career as `git log --graph`. The graph is
  measured from the rendered rows, so it stays aligned however the text wraps,
  and it draws from the root up the first time it's seen.
*/

const LANE_X = [14, 42];
const NODE_Y = 13; // centre of the first text line within a row

const pad2 = (n) => String(n).padStart(2, "0");
const hourLabel = (hours) => `${pad2(hours)}:00`;

// Vertical runs on each lane plus S-curves where the side lane leaves and rejoins.
const buildPaths = (rows, ys) => {
  const main = [];
  const side = [];
  let runStart = null;
  rows.forEach((row, i) => {
    if (row.lane === 1 && runStart === null) runStart = i;
    const runEnds = row.lane === 1 && (i === rows.length - 1 || rows[i + 1].lane !== 1);
    if (runEnds) {
      const top = ys[runStart];
      const bottom = ys[i];
      const above = runStart > 0 ? ys[runStart - 1] : null;
      const below = i < rows.length - 1 ? ys[i + 1] : null;
      let d = "";
      if (below !== null) {
        const mid = (below + bottom) / 2;
        d += `M${LANE_X[0]} ${below} C${LANE_X[0]} ${mid} ${LANE_X[1]} ${mid} ${LANE_X[1]} ${bottom} `;
      } else {
        d += `M${LANE_X[1]} ${bottom} `;
      }
      d += `L${LANE_X[1]} ${top} `;
      if (above !== null) {
        const mid = (above + top) / 2;
        d += `C${LANE_X[1]} ${mid} ${LANE_X[0]} ${mid} ${LANE_X[0]} ${above}`;
      }
      side.push(d.trim());
      runStart = null;
    }
  });
  const mainYs = rows.map((row, i) => (row.lane === 0 ? ys[i] : null)).filter((y) => y !== null);
  if (mainYs.length > 1) main.push(`M${LANE_X[0]} ${mainYs[mainYs.length - 1]} L${LANE_X[0]} ${mainYs[0]}`);
  return { main, side };
};

function Graph() {
  const listRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  // With reduced motion there's nothing to wait for: show the finished graph.
  const seen = useOnScreen(listRef, { threshold: 0.2, once: true }) || prefersReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    let last = "";
    const measure = () => {
      const items = Array.from(list.children);
      const ys = items.map((item) => item.offsetTop + NODE_Y);
      const height = list.offsetHeight;
      // Only re-render when the rows actually moved (guards against observer loops)
      const signature = `${height}:${ys.join(",")}`;
      if (signature === last) return;
      last = signature;
      setGeometry({ ys, height, ...buildPaths(TRAJECTORY, ys) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  const total = TRAJECTORY.length;

  return (
    <div className={`hm-graph ${seen ? "is-drawn" : ""}`}>
      {geometry && (
        <svg className="hm-graph__lines" width="56" height={geometry.height} aria-hidden="true" focusable="false">
          {geometry.main.map((d) => (
            <path key={d} d={d} className="hm-graph__main" pathLength="1" />
          ))}
          {geometry.side.map((d) => (
            <path key={d} d={d} className="hm-graph__side" pathLength="1" />
          ))}
          {TRAJECTORY.map((row, i) => (
            <circle
              key={row.key}
              cx={LANE_X[row.lane]}
              cy={geometry.ys[i]}
              r={row.kind === "head" || row.kind === "merge" || row.kind === "root" ? 7 : 5.5}
              className={`hm-graph__node is-${row.kind} lane-${row.lane}`}
              style={{ "--r": total - 1 - i }}
            />
          ))}
        </svg>
      )}

      <ol className="hm-graph__rows" ref={listRef} reversed>
        {TRAJECTORY.map((row, i) => (
          <li
            key={row.key}
            className={`hm-graph__row lane-${row.lane} is-${row.kind}`}
            style={{ "--r": total - 1 - i }}
          >
            <span className="hm-graph__date hm-mono">
              {row.kind === "head" && <span className="hm-graph__head">HEAD</span>}
              {row.date}
            </span>
            <span className="hm-graph__title">{row.title}</span>
            {(row.org || row.kind === "merge" || row.kind === "root") && (
              <span className="hm-graph__org">
                {row.org}
                {row.kind === "merge" && <em className="hm-mono"> · merge</em>}
                {row.kind === "root" && <em className="hm-mono"> · root</em>}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Snapshot({ onOpenBrief }) {
  const now = useNow(30000);
  const status = availabilityAt(now);
  const overlap = workingHoursForVisitor(now);
  const hours = `${hourLabel(PROFILE.workingHours.start)}–${hourLabel(PROFILE.workingHours.end)} IST`;

  return (
    <aside className="hm-card hm-snapshot" aria-labelledby="hm-snapshot-title" data-reveal style={{ "--d": "120ms" }}>
      <div className="hm-bar">
        <span className="hm-bar__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="hm-bar__title" id="hm-snapshot-title">
          hiring-snapshot
        </span>
        <span className={`hm-snapshot__live ${status.online ? "" : "is-away"}`}>
          <span className={`hm-live ${status.online ? "" : "is-away"}`} aria-hidden="true" />
          {status.online ? "online now" : `back in ${formatSpan(status.until)}`}
        </span>
      </div>

      <dl className="hm-snapshot__facts">
        <div>
          <dt>Looking for</dt>
          <dd>
            {PROFILE.openTo.join(" · ")}
            <span>{PROFILE.workModes}</span>
          </dd>
        </div>
        <div>
          <dt>Now</dt>
          <dd>{PROFILE.role}</dd>
        </div>
        <div>
          <dt>Based in</dt>
          <dd>
            {PROFILE.country}
            <span>
              IST ({utcLabel()}) · works {hours}
            </span>
          </dd>
        </div>
        <div>
          <dt>Replies</dt>
          <dd>within 24 hours</dd>
        </div>
      </dl>

      <p className="hm-snapshot__overlap">
        <i className="fa-regular fa-clock" aria-hidden="true" />
        {overlap ? (
          <span>
            That&apos;s{" "}
            <b>
              {overlap.from}–{overlap.to}
            </b>{" "}
            your time{overlap.zone ? ` (${overlap.zone})` : ""}.
          </span>
        ) : (
          <span>We share a timezone, so the whole working day overlaps.</span>
        )}
      </p>

      <div className="hm-snapshot__actions">
        <a href={PROFILE.resume} target="_blank" rel="noopener noreferrer" className="hm-btn hm-btn--primary">
          Résumé <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
        </a>
        <button type="button" className="hm-btn hm-btn--ghost" onClick={onOpenBrief}>
          <i className="fa-solid fa-circle-play" aria-hidden="true" /> 30-second brief
        </button>
      </div>
      <Link to="/experience" className="hm-link hm-snapshot__more">
        Full experience <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </Link>
    </aside>
  );
}

export default function Trajectory({ onOpenBrief }) {
  const ref = useRef(null);
  useReveal(ref);

  return (
    <section className="hm-section hm-journey" id="hm-journey" aria-labelledby="hm-journey-title" ref={ref}>
      <div className="hm-shell">
        <header className="hm-head">
          <div data-reveal>
            <p className="hm-eyebrow">
              <b>04</b> Trajectory
            </p>
            <h2 className="hm-h2" id="hm-journey-title">
              The branch <span className="hm-grad">that merged.</span>
            </h2>
            <p className="hm-lead">
              I started in data science and machine learning, then merged it into quality engineering. That&apos;s why
              AI-assisted testing is home turf.
            </p>
          </div>
        </header>

        <div className="hm-journey__grid">
          <div className="hm-card hm-journey__graph" data-reveal>
            <div className="hm-bar">
              <span className="hm-bar__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="hm-bar__title">git log --graph --career</span>
            </div>
            <Graph />
          </div>
          <Snapshot onOpenBrief={onOpenBrief} />
        </div>
      </div>
    </section>
  );
}
