import React from "react";
import "./EvidenceLog.css";

/*
  The intro's test-log row as a component: check, name, dotted leader, value.
  Values are always shown in full; only the status animates, from a spinner
  to a pass, when `passed` flips (and it starts passed when motion is off).
*/

export const Check = () => (
  <svg className="hm-check" viewBox="0 0 12 12" focusable="false" aria-hidden="true">
    <path d="M2.5 6.4 5 8.8 9.6 3.6" />
  </svg>
);

export default function EvidenceLog({ file, rows, passed, footer, className = "", compact = false }) {
  const count = rows.length;
  return (
    <div className={`hm-elog ${passed ? "is-passed" : "is-running"} ${compact ? "hm-elog--compact" : ""} ${className}`}>
      {file && (
        <div className="hm-elog__head">
          <span className="hm-elog__file hm-mono">{file}</span>
          <span className="hm-elog__state hm-mono" aria-hidden="true">
            <span className="hm-elog__state-run">Running</span>
            <span className="hm-elog__state-pass">Passed</span>
          </span>
        </div>
      )}
      <ul className="hm-elog__rows">
        {rows.map((row, i) => (
          <li key={row.name} style={{ "--i": i }}>
            <span className="hm-elog__icon" aria-hidden="true">
              <span className="hm-elog__spin" />
              <Check />
            </span>
            <span className="hm-elog__name">
              {/* Receipts read value-first: "15+ browser and device configurations…" */}
              {compact && row.value && <b className="hm-elog__figure">{row.value} </b>}
              {row.href ? <a href={row.href}>{row.name}</a> : row.name}
            </span>
            {!compact && row.value && <span className="hm-elog__lead" aria-hidden="true" />}
            {!compact && row.value && <span className="hm-elog__value">{row.value}</span>}
            <span className="hm-sr">, passed</span>
          </li>
        ))}
      </ul>
      {footer !== false && (
        <div className="hm-elog__foot hm-mono">
          <span className="hm-elog__sum">
            <b>{count} passed</b> · 0 failed
          </span>
          {footer}
        </div>
      )}
    </div>
  );
}
