import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chips, PageHead } from "../lib/kit";
import { useLocalState } from "../lib/useFeed";
import { BUG_ROUNDS, SNIPER_LEVELS, TYPER_SNIPPETS } from "./arcadeData";
import "./Arcade.css";

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/* ------------------------------------------------------------------ */
/* Selector Sniper                                                     */
/* ------------------------------------------------------------------ */

const grade = (selector, hinted) => {
  let points = 100;
  const notes = [];
  if (/data-testid|aria-label|\[name=|#[a-z][\w-]*/i.test(selector)) {
    points += 30;
    notes.push("+30 stable hook");
  }
  if (/nth-|:first|:last|:only/.test(selector)) {
    points -= 40;
    notes.push("−40 position-based, brittle");
  }
  if (selector.length > 28) {
    const cut = Math.min(40, Math.round((selector.length - 28) * 1.5));
    points -= cut;
    notes.push(`−${cut} long`);
  }
  if (hinted) {
    points = Math.round(points / 2);
    notes.push("½ hint used");
  }
  return { points: Math.max(10, points), notes };
};

const RESULT_TEXT = {
  idle: "Type a CSS selector. Matches light up as you type.",
  invalid: "That isn't a valid CSS selector yet.",
  none: "Nothing matches.",
  many: "Close. The target is in there, but so are other elements.",
  wrong: "That matches something else.",
  hit: "Locked on! Press Enter to fire.",
};

const SelectorSniper = () => {
  const [level, setLevel] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState({ state: "idle", count: 0 });
  const [hinted, setHinted] = useState(false);
  const [source, setSource] = useState(false);
  const [log, setLog] = useState([]);
  const [best, setBest] = useLocalState("arcade:sniper:best", 0);
  const sandbox = useRef(null);
  const done = level >= SNIPER_LEVELS.length;
  const current = SNIPER_LEVELS[Math.min(level, SNIPER_LEVELS.length - 1)];
  const score = log.reduce((sum, entry) => sum + entry.points, 0);

  useEffect(() => {
    if (done || !sandbox.current) return;
    const target = sandbox.current.querySelector(current.target);
    if (target) target.classList.add("is-target");
  }, [level, done, current]);

  useEffect(() => {
    if (done || !sandbox.current) return;
    const root = sandbox.current;
    root.querySelectorAll(".is-match").forEach((node) => node.classList.remove("is-match"));
    const value = input.trim();
    if (!value) {
      setResult({ state: "idle", count: 0 });
      return;
    }
    let matches;
    try {
      matches = Array.from(root.querySelectorAll(value));
    } catch (error) {
      setResult({ state: "invalid", count: 0 });
      return;
    }
    matches.forEach((node) => node.classList.add("is-match"));
    const target = root.querySelector(current.target);
    if (!matches.length) setResult({ state: "none", count: 0 });
    else if (matches.length === 1 && matches[0] === target) setResult({ state: "hit", count: 1 });
    else if (matches.includes(target)) setResult({ state: "many", count: matches.length });
    else setResult({ state: "wrong", count: matches.length });
  }, [input, level, done, current]);

  useEffect(() => {
    if (done && score > best) setBest(score);
  }, [done, score, best, setBest]);

  const advance = (entry) => {
    setLog((list) => [...list, entry]);
    setLevel((value) => value + 1);
    setInput("");
    setHinted(false);
    setResult({ state: "idle", count: 0 });
  };

  const fire = (event) => {
    event.preventDefault();
    if (result.state !== "hit") return;
    const { points, notes } = grade(input.trim(), hinted);
    advance({ level: current.title, selector: input.trim(), points, notes, tip: current.tip });
  };

  const restart = () => {
    setLog([]);
    setLevel(0);
    setInput("");
    setHinted(false);
  };

  if (done) {
    return (
      <div className="ar-summary">
        <div className="ar-summary-score">
          <span>Final score</span>
          <strong>{score}</strong>
          <em>{score >= best ? "New personal best!" : `Best: ${best}`}</em>
        </div>
        <ol className="ar-log">
          {log.map((entry) => (
            <li key={entry.level}>
              <code>{entry.selector || "skipped"}</code>
              <b>+{entry.points}</b>
              <span>{entry.notes.join(" · ") || "clean shot"}</span>
              <small>{entry.tip}</small>
            </li>
          ))}
        </ol>
        <button type="button" className="uv-btn uv-btn--primary" onClick={restart}>
          <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Play again
        </button>
      </div>
    );
  }

  return (
    <div className="ar-game">
      <div className="ar-hud">
        <span>
          Level {level + 1}/{SNIPER_LEVELS.length} · <b>{current.title}</b>
        </span>
        <span>
          Score <b>{score}</b> · Best <b>{best}</b>
        </span>
      </div>
      <p className="ar-brief">
        <i className="fa-solid fa-crosshairs" aria-hidden="true" /> {current.brief} The pulsing element is your target.
      </p>

      <div className="ar-sniper">
        <div className="ar-browser">
          <div className="ar-browser-bar">
            <span className="ar-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>localhost:3000/level-{level + 1}</span>
            <button type="button" onClick={() => setSource((value) => !value)} className={source ? "is-on" : ""}>
              <i className="fa-solid fa-code" aria-hidden="true" /> {source ? "Hide" : "View"} source
            </button>
          </div>
          {/* Static level markup from arcadeData.js; never user input. */}
          <div className="ar-sandbox" ref={sandbox} key={level} dangerouslySetInnerHTML={{ __html: current.html }} />
          {source && (
            <pre className="ar-source">
              <code>{current.html}</code>
            </pre>
          )}
        </div>

        <form className="ar-console" onSubmit={fire}>
          <label htmlFor="ar-selector">document.querySelector(</label>
          <div className={`ar-input ar-input--${result.state}`}>
            <span aria-hidden="true">"</span>
            <input
              id="ar-selector"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="#id, .class, [attr=value]…"
              autoComplete="off"
              spellCheck="false"
              autoFocus
            />
            <span aria-hidden="true">")</span>
          </div>
          <p className={`ar-feedback ar-feedback--${result.state}`} aria-live="polite">
            {RESULT_TEXT[result.state]}
            {(result.state === "many" || result.state === "wrong") && ` (${result.count} matches)`}
          </p>
          <div className="uv-row">
            <button type="submit" className="uv-btn uv-btn--primary" disabled={result.state !== "hit"}>
              <i className="fa-solid fa-bullseye" aria-hidden="true" /> Fire
            </button>
            <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => setHinted(true)} disabled={hinted}>
              {hinted ? (
                <>
                  Hint: <code>{current.target}</code>
                </>
              ) : (
                "Hint (−50%)"
              )}
            </button>
            <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => advance({ level: current.title, selector: "", points: 0, notes: ["skipped"], tip: current.tip })}>
              Skip
            </button>
          </div>
          <p className="ar-scoring">
            Scoring: +30 for stable hooks (id, data-testid, aria-label, name). −40 for position selectors like :nth-child. Shorter is better.
          </p>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Bug Hunt                                                            */
/* ------------------------------------------------------------------ */

const BugHunt = () => {
  const [order, setOrder] = useState(() => shuffle(BUG_ROUNDS.map((_, index) => index)));
  const [round, setRound] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gained, setGained] = useState(0);
  const [best, setBest] = useLocalState("arcade:bugs:best", 0);
  const done = round >= order.length;
  const current = BUG_ROUNDS[order[Math.min(round, order.length - 1)]];

  useEffect(() => {
    if (done && score > best) setBest(score);
  }, [done, score, best, setBest]);

  const pick = (index) => {
    if (solved) return;
    if (index === current.bug) {
      const firstTry = wrong.length === 0;
      const points = firstTry ? 100 + streak * 25 : 25;
      setScore((value) => value + points);
      setGained(points);
      setStreak((value) => (firstTry ? value + 1 : 0));
      setSolved(true);
    } else if (!wrong.includes(index)) {
      setWrong((list) => [...list, index]);
      setStreak(0);
    }
  };

  const next = () => {
    setRound((value) => value + 1);
    setSolved(false);
    setWrong([]);
  };

  const restart = () => {
    setOrder(shuffle(BUG_ROUNDS.map((_, index) => index)));
    setRound(0);
    setScore(0);
    setStreak(0);
    setSolved(false);
    setWrong([]);
  };

  if (done) {
    return (
      <div className="ar-summary">
        <div className="ar-summary-score">
          <span>Bugs squashed</span>
          <strong>{score}</strong>
          <em>{score >= best ? "New personal best!" : `Best: ${best}`}</em>
        </div>
        <button type="button" className="uv-btn uv-btn--primary" onClick={restart}>
          <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Hunt again
        </button>
      </div>
    );
  }

  return (
    <div className="ar-game">
      <div className="ar-hud">
        <span>
          Round {round + 1}/{order.length} · <b>{current.title}</b> <em className="uv-tag uv-tag--muted">{current.lang}</em>
        </span>
        <span>
          Score <b>{score}</b> · Streak <b>{streak}×</b> · Best <b>{best}</b>
        </span>
      </div>
      <p className="ar-brief">
        <i className="fa-solid fa-bug" aria-hidden="true" /> One line has a bug. Click it. First try scores 100 plus a streak bonus.
      </p>
      <div className="ar-code-hunt" role="list">
        {current.lines.map((line, index) => {
          const state = solved && index === current.bug ? "is-bug" : wrong.includes(index) ? "is-wrong" : "";
          return (
            <button key={index} type="button" role="listitem" className={`ar-line ${state}`} onClick={() => pick(index)} disabled={solved}>
              <span className="ar-ln">{index + 1}</span>
              <code>{line || " "}</code>
            </button>
          );
        })}
      </div>
      {solved && (
        <div className="ar-explain">
          <strong>
            <i className="fa-solid fa-check" aria-hidden="true" /> +{gained}. Found it!
          </strong>
          <p>{current.explain}</p>
          <button type="button" className="uv-btn uv-btn--primary uv-btn--sm" onClick={next} autoFocus>
            {round + 1 < order.length ? "Next bug" : "See score"} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Code Typer                                                          */
/* ------------------------------------------------------------------ */

const CodeTyper = () => {
  const [snippetId, setSnippetId] = useState(TYPER_SNIPPETS[0].id);
  const snippet = TYPER_SNIPPETS.find((item) => item.id === snippetId);
  const text = snippet.text;
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [best, setBest] = useLocalState("arcade:typer:best", 0);
  const area = useRef(null);

  const reset = (id = snippetId) => {
    setSnippetId(id);
    setTyped("");
    setStartedAt(null);
    setFinishedAt(null);
    setMistakes(0);
    setTimeout(() => area.current && area.current.focus(), 0);
  };

  useEffect(() => {
    if (!startedAt || finishedAt) return undefined;
    const id = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  const correct = useMemo(() => {
    let count = 0;
    for (let i = 0; i < typed.length; i += 1) if (typed[i] === text[i]) count += 1;
    return count;
  }, [typed, text]);

  const elapsed = startedAt ? Math.max(0, (finishedAt || clock) - startedAt) / 60000 : 0;
  const wpm = elapsed > 0.02 ? Math.round(correct / 5 / elapsed) : 0;
  const accuracy = Math.max(0, Math.round((1 - mistakes / Math.max(1, text.length)) * 100));

  useEffect(() => {
    if (finishedAt && wpm > best) setBest(wpm);
  }, [finishedAt, wpm, best, setBest]);

  const onChange = (event) => {
    if (finishedAt) return;
    let value = event.target.value.slice(0, text.length);
    if (!startedAt && value.length) setStartedAt(Date.now());
    if (value.length > typed.length) {
      let wrongNow = 0;
      for (let i = typed.length; i < value.length; i += 1) if (value[i] !== text[i]) wrongNow += 1;
      if (wrongNow) setMistakes((count) => count + wrongNow);
    }
    // After a correct newline, type the next line's indentation for the player.
    if (value.endsWith("\n") && text[value.length - 1] === "\n" && value === text.slice(0, value.length)) {
      value += text.slice(value.length).match(/^ */)[0];
    }
    setTyped(value);
    if (value === text) setFinishedAt(Date.now());
  };

  return (
    <div className="ar-game">
      <div className="ar-hud">
        <Chips items={TYPER_SNIPPETS.map((item) => ({ id: item.id, label: item.label }))} value={snippetId} onChange={(id) => reset(id)} label="Snippet" />
        <span>
          <b>{wpm}</b> wpm · <b>{accuracy}%</b> accuracy · Best <b>{best}</b>
        </span>
      </div>
      <div className={`ar-typer ${finishedAt ? "is-done" : ""}`} onClick={() => area.current && area.current.focus()}>
        <pre aria-hidden="true">
          {text.split("").map((char, index) => {
            const state = index < typed.length ? (typed[index] === char ? "ok" : "bad") : index === typed.length ? "cur" : "";
            return (
              <span key={index} className={state ? `is-${state}` : undefined}>
                {char === "\n" ? (
                  <>
                    <i className="ar-nl">↵</i>
                    {"\n"}
                  </>
                ) : (
                  char
                )}
              </span>
            );
          })}
        </pre>
        <textarea
          ref={area}
          className="ar-type-input"
          value={typed}
          onChange={onChange}
          onPaste={(event) => event.preventDefault()}
          onKeyDown={(event) => event.key === "Tab" && event.preventDefault()}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          aria-label={`Type the ${snippet.label} snippet`}
        />
        {!startedAt && <span className="ar-typer-hint">Click here and start typing. Indentation after a new line is typed for you.</span>}
      </div>
      {finishedAt && (
        <div className="ar-explain">
          <strong>
            <i className="fa-solid fa-flag-checkered" aria-hidden="true" /> {wpm} wpm at {accuracy}% accuracy
            {wpm >= best ? " (new personal best!)" : ""}
          </strong>
          <p>
            {snippet.text.length} characters in {(elapsed * 60).toFixed(1)}s with {mistakes} mistake{mistakes === 1 ? "" : "s"}.
          </p>
          <button type="button" className="uv-btn uv-btn--primary uv-btn--sm" onClick={() => reset()}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Again
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const GAMES = [
  { id: "sniper", label: "Selector Sniper", icon: "fa-solid fa-crosshairs", blurb: "Write the shortest robust CSS selector for the pulsing element." },
  { id: "bugs", label: "Bug Hunt", icon: "fa-solid fa-bug", blurb: "Spot the one buggy line in real-world snippets." },
  { id: "typer", label: "Code Typer", icon: "fa-solid fa-keyboard", blurb: "How fast can you type real test code?" },
];

export default function Arcade() {
  const [game, setGame] = useState("sniper");
  const meta = GAMES.find((item) => item.id === game);
  return (
    <div className="ar">
      <PageHead kicker="Dev Arcade" title="Games that make you a *better engineer*">
        Three quick games built around real QA and developer skills. No sign-up, and your high scores stay in this browser.
      </PageHead>
      <div className="ar-tabs" role="tablist" aria-label="Games">
        {GAMES.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={game === item.id} className={game === item.id ? "is-active" : ""} onClick={() => setGame(item.id)}>
            <i className={item.icon} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.blurb}</small>
            </span>
          </button>
        ))}
      </div>
      <section className="uv-panel ar-stage" aria-label={meta.label}>
        {game === "sniper" && <SelectorSniper />}
        {game === "bugs" && <BugHunt />}
        {game === "typer" && <CodeTyper />}
      </section>
    </div>
  );
}
