import React from "react";
import portraitWebp from "../../../../assets/images/ProfileImage.webp";
import portraitPng from "../../../../assets/images/ProfileImage.png";
import { LOG, PROFILE, REPORT, SHOTS, STATS, TOOLS, YEARS, pad } from "./script";

/*
  The film's scenes as markup. Everything starts hidden; the timeline in
  timeline.js reveals and moves it. All of it is aria-hidden: the player
  narrates each scene in a live region instead.
*/

const Words = ({ text }) =>
  text.split(" ").map((word, i) => (
    <React.Fragment key={`${word}-${i}`}>
      {i ? " " : null}
      <span className="sf-word">{word}</span>
    </React.Fragment>
  ));

const today = () => {
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
};

// The inspector's frame around a real element of a shot, in percent.
export const Box = ({ box, className = "" }) => (
  <span
    className={`sf-box ${box.below || box.y < 14 ? "sf-box--below " : ""}${className}`}
    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
  >
    <i />
    <i />
    <i />
    <i />
    <em>{box.label}</em>
  </span>
);

const ICONS = { pass: "fa-check", info: "fa-circle-info", warn: "fa-triangle-exclamation", fail: "fa-xmark" };

export function Slate() {
  return (
    <div className="sf-scene sf-slate" aria-hidden="true">
      <div className="sf-slate__board">
        <div className="sf-slate__sticks">
          <span className="sf-slate__stick" />
          <span className="sf-slate__stick sf-slate__stick--base" />
        </div>
        <dl className="sf-slate__grid">
          <div className="sf-slate__cell sf-slate__cell--wide">
            <dt>Prod.</dt>
            <dd>Signed Off</dd>
          </div>
          <div className="sf-slate__cell">
            <dt>Roll</dt>
            <dd>QA-01</dd>
          </div>
          <div className="sf-slate__cell">
            <dt>Scene</dt>
            <dd>01</dd>
          </div>
          <div className="sf-slate__cell">
            <dt>Take</dt>
            <dd>1</dd>
          </div>
          <div className="sf-slate__cell">
            <dt>Director</dt>
            <dd>A. Mishra</dd>
          </div>
          <div className="sf-slate__cell">
            <dt>Camera</dt>
            <dd>Headless</dd>
          </div>
          <div className="sf-slate__cell">
            <dt>Date</dt>
            <dd>{today()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function Night() {
  return (
    <div className="sf-scene sf-night" aria-hidden="true">
      <div className="sf-lower">
        <p className="sf-kicker">23:59 · release night</p>
        <div className="sf-stack">
          <p className="sf-big sf-night__line--1">
            <Words text="The release ships at midnight." />
          </p>
          <p className="sf-big sf-night__line--2">
            <Words text={`${STATS[0].value} tests stand between it and your users.`} />
          </p>
        </div>
      </div>
    </div>
  );
}

export function Bug() {
  return (
    <div className="sf-scene sf-bug" aria-hidden="true">
      <div className="sf-lower">
        <p className="sf-kicker sf-kicker--red">
          <i className="fa-solid fa-xmark" /> 1 failing
        </p>
        <p className="sf-big sf-bug__line sf-glitch" data-text="One bug is still hiding.">
          One bug is still hiding.
        </p>
        <p className="sf-bug__sub">Midnight is 60 seconds away.</p>
      </div>
      <span className="sf-redout" />
    </div>
  );
}

export function Hunter() {
  return (
    <div className="sf-scene sf-hunter" aria-hidden="true">
      <div className="sf-hunter__portrait">
        <picture>
          <source srcSet={portraitWebp} type="image/webp" />
          <img src={portraitPng} alt="" width="760" height="653" />
        </picture>
        <span className="sf-hunter__scan" />
        <span className="sf-hunter__lock">
          <i />
          <i />
          <i />
          <i />
        </span>
        <code className="sf-hunter__tag">
          await expect(engineer).toBeVisible() <b>✓</b>
        </code>
      </div>
      <div className="sf-hunter__copy">
        <p className="sf-kicker">Starring</p>
        <h3 className="sf-hunter__name">
          {PROFILE.name
            .toUpperCase()
            .split(" ")
            .map((line) => (
              <span className="sf-hunter__name-line" key={line}>
                {line.split("").map((char, i) => (
                  <span className="sf-char" key={`${char}-${i}`}>
                    {char}
                  </span>
                ))}
              </span>
            ))}
        </h3>
        <p className="sf-hunter__role">
          {PROFILE.role} · {PROFILE.company}
        </p>
        <p className="sf-hunter__line">{YEARS}+ years finding what others miss.</p>
      </div>
    </div>
  );
}

export function Log() {
  return (
    <div className="sf-scene sf-log" aria-hidden="true">
      <div className="sf-log__frame">
        <img className="sf-log__report" src={REPORT.image} alt="" />
        <div className="sf-log__boxes">
          {REPORT.boxes.map((box, i) => (
            <Box key={box.label} box={box} className={`sf-log__box--${i}`} />
          ))}
        </div>
      </div>
      <p className="sf-kicker sf-log__kicker">A real run · Newman · Phoenix API suite</p>

      <div className="sf-term">
        <div className="sf-term__bar">
          <span className="sf-term__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="sf-term__title">bug-log · github.com/{PROFILE.github.split("/").pop()}</span>
          <b>real commits</b>
        </div>
        <p className="sf-term__cmd">
          <span className="sf-term__prompt">$</span>{" "}
          <span className="sf-term__typed">git log --author=&quot;{PROFILE.name}&quot; --grep=&quot;^fix&quot;</span>
        </p>
        <ol className="sf-term__rows">
          {LOG.rows.map((row) => (
            <li className="sf-term__row" key={row.key}>
              <b>FIXED</b>
              <time>{row.date}</time>
              <span className="sf-term__repo">{row.repo}</span>
              <span className="sf-term__msg">{row.message}</span>
              <code>{row.sha}</code>
            </li>
          ))}
        </ol>
      </div>

      <p className="sf-log__headline">
        <strong>{LOG.total} fixes</strong> in {LOG.repos} repos. <span>On the public record.</span>
      </p>
    </div>
  );
}

export function Site({ audit, host }) {
  const passed = audit.filter((item) => item.status === "pass" || item.status === "info").length;
  const warnings = audit.filter((item) => item.status === "warn").length;
  const failures = audit.filter((item) => item.status === "fail").length;
  return (
    <div className="sf-scene sf-site" aria-hidden="true">
      <p className="sf-kicker sf-site__kicker">Tonight&apos;s release: this website</p>
      <div className="sf-site__stage">
        <div className="sf-browser">
          <div className="sf-browser__bar">
            <span className="sf-browser__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="sf-browser__url">
              <i className="fa-solid fa-lock" />
              <span className="sf-browser__host">{host}</span>
              <span className="sf-browser__paths">
                {SHOTS.map((shot) => (
                  <span className={`sf-browser__path sf-browser__path--${shot.id}`} key={shot.id}>
                    {shot.path}
                  </span>
                ))}
              </span>
            </span>
            <span className="sf-browser__live">live</span>
          </div>
          <div className="sf-browser__view">
            {SHOTS.map((shot) => (
              <div className={`sf-shot sf-shot--${shot.id}`} key={shot.id}>
                {shot.video ? (
                  <video
                    className="sf-shot__media"
                    poster={shot.poster}
                    muted
                    playsInline
                    preload="auto"
                    data-shot={shot.id}
                  >
                    {/* H.264 first: every mainstream browser decodes it in hardware. */}
                    <source src={shot.video.mp4} type="video/mp4" />
                    <source src={shot.video.webm} type='video/webm; codecs="vp9"' />
                  </video>
                ) : (
                  <img className="sf-shot__media" src={shot.image} alt="" />
                )}
                {shot.boxes.map((box, i) => (
                  <Box key={box.label} box={box} className={`sf-shot__box--${i}`} />
                ))}
              </div>
            ))}
            <span className="sf-browser__glare" />
          </div>
        </div>
      </div>

      <div className="sf-audit">
        <div className="sf-audit__bar">
          <span>live-audit</span>
          <em>this page · your browser</em>
        </div>
        <div className="sf-audit__window">
          <ol className="sf-audit__rows">
            {audit.map((check) => (
              <li className={`sf-audit__row is-${check.status}`} key={check.id}>
                <i className={`fa-solid ${ICONS[check.status] || ICONS.info}`} />
                <span>{check.label}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className={`sf-audit__sum${failures ? " is-fail" : warnings ? " is-warn" : ""}`}>
          {passed} passing{warnings ? ` · ${warnings} warning${warnings > 1 ? "s" : ""}` : ""} · {failures} failing
        </p>
      </div>
    </div>
  );
}

export function Arsenal() {
  const names = TOOLS.map((tool) => tool.name);
  return (
    <div className="sf-scene sf-arsenal" aria-hidden="true">
      <div className="sf-arsenal__track sf-arsenal__track--a">{names.concat(names).join("  ·  ")}</div>
      <div className="sf-arsenal__track sf-arsenal__track--b">
        {names.slice().reverse().concat(names).join("  ·  ")}
      </div>
      <p className="sf-kicker">Loading the arsenal</p>
      <div className="sf-arsenal__stage">
        {TOOLS.map((tool, i) => (
          <div className={`sf-tool${tool.ai ? " sf-tool--ai" : ""}`} key={tool.name}>
            <span className="sf-tool__meta">
              {pad(i + 1)} / {pad(TOOLS.length)}
              {tool.ai ? " · AI agent" : ""}
            </span>
            <span className="sf-tool__name">{tool.name}</span>
          </div>
        ))}
      </div>
      <div className="sf-arsenal__meter">
        <i />
      </div>
    </div>
  );
}

export function Proof() {
  return (
    <div className="sf-scene sf-proof" aria-hidden="true">
      {STATS.map((stat, i) => (
        <div className="sf-stat" key={stat.label}>
          <p className="sf-kicker">Receipt {pad(i + 1)} / 03</p>
          <span className="sf-stat__num">{stat.value}</span>
          <span className="sf-stat__label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Verdict() {
  return (
    <div className="sf-scene sf-verdict" aria-hidden="true">
      <p className="sf-kicker">00:00 · go / no-go</p>
      <div className="sf-verdict__stamp">
        <span>
          <i className="fa-solid fa-check" /> Ship it
        </span>
        <small>0 failing · signed at 00:00</small>
      </div>
      <div className="sf-verdict__foot">
        <p className="sf-verdict__line">The release ships on time.</p>
        <p className="sf-verdict__credit">
          <b>{PROFILE.name}</b> · open to {PROFILE.openTo.join(" · ")}
        </p>
      </div>
    </div>
  );
}
