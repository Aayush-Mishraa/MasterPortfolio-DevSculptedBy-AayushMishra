import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./WorkTabs.css";

/*
  F10: Projects and Open Source are one "Work" area. This switch is the first
  thing in both pages' <main>, at the same spot on each, with the page's status
  pill (children) beside it. It's a segmented control with live counts, like
  GitHub's repo tabs: the count is what makes the other page worth a click.
  Styled with the Projects page tokens (--pj-*) both pages already set.
*/

export const WORK_TABS = [
  { to: "/work", label: "Projects", icon: "fa-solid fa-diagram-project", unit: "public repositories" },
  {
    to: "/work/open-source",
    label: "Open source",
    icon: "fa-solid fa-code-branch",
    unit: "GitHub contributions in the last year",
  },
];

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Rolls a number up from 0 the first time it arrives (once the GitHub data loads).
function useCountUp(target, ms = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return undefined;
    if (reducedMotion()) {
      setValue(target);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function Count({ count, unit }) {
  const shown = useCountUp(count);
  return (
    <span className="wk-tabs__count" title={`${count.toLocaleString("en-US")} ${unit}`}>
      <span aria-hidden="true">{compact(shown)}</span>
      <span className="wk-tabs__sr">
        , {count.toLocaleString("en-US")} {unit}
      </span>
    </span>
  );
}

// counts: { "/work": number, "/work/open-source": number }, either may be missing while loading
export default function WorkTabs({ counts = {}, children }) {
  return (
    <div className="wk-bar">
      <nav className="wk-tabs" aria-label="Work">
        <ul>
          {WORK_TABS.map((tab, index) => {
            const count = counts[tab.to];
            return (
              <li key={tab.to}>
                <NavLink
                  exact
                  to={tab.to}
                  className={`wk-tabs__link wk-tabs__link--${index ? "end" : "start"}`}
                  activeClassName="is-active"
                >
                  <i className={tab.icon} aria-hidden="true" />
                  {tab.label}
                  {count > 0 && <Count count={count} unit={tab.unit} />}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
