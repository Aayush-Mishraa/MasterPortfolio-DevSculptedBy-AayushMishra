import React, { useEffect, useState } from "react";
import { scrollToId } from "../lib/scroll";

/*
  The page as a test suite: each section is a spec that runs while you read
  it and passes once you've scrolled past. A QA engineer's version of the
  section dots the other pages use.
*/

export default function SpecRail({ sections }) {
  const [state, setState] = useState({ running: sections[0].id, passed: [] });

  useEffect(() => {
    let frame = null;
    const measure = () => {
      frame = null;
      const line = window.innerHeight * 0.45;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const passed = [];
      let running = null;
      sections.forEach((section) => {
        const node = document.getElementById(section.id);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.bottom < line || atBottom) passed.push(section.id);
        else if (!running && rect.top <= line) running = section.id;
      });
      setState((current) =>
        current.running === running && current.passed.join() === passed.join() ? current : { running, passed }
      );
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [sections]);

  const total = sections.length;
  const done = state.passed.length;

  return (
    <nav className={`hm-rail ${done === total ? "is-green" : ""}`} aria-label="Sections on this page">
      <ol>
        {sections.map((section) => {
          const passed = state.passed.indexOf(section.id) !== -1;
          const running = !passed && state.running === section.id;
          const status = passed ? "passed" : running ? "running" : "queued";
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={scrollToId(section.id)}
                className={`is-${status}`}
                aria-current={running ? "true" : undefined}
              >
                <i aria-hidden="true">
                  {passed && (
                    <svg viewBox="0 0 12 12" focusable="false">
                      <path d="M2.5 6.4 5 8.8 9.6 3.6" />
                    </svg>
                  )}
                </i>
                <span>
                  {section.label}
                  <em>{status}</em>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="hm-rail__count" aria-live="off">
        <b>{done}</b>/{total}
      </p>
    </nav>
  );
}
