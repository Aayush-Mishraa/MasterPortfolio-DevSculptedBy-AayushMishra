import { RUNTIME, SHOTS, STATS, formatStat, shotEnd } from "./script";

/*
  Every scene of "Signed Off" on one GSAP timeline, in film seconds. The
  canvas state `s` is tweened here like any element (see filmCanvas.js).

  Start states that are visible use set() + to() rather than fromTo():
  rewinding a fromTo() re-applies its start state, which would leave a flare
  or a zoom on screen after a seek back.
*/
export function buildTimeline(tl, { root, s, reduced, narrow, host }) {
  const blur = (px) => (reduced ? "blur(0px)" : `blur(${px}px)`);
  const all = (selector) => Array.from(root.querySelectorAll(selector));
  const pulse = (at, props, back) => {
    if (reduced) return;
    tl.to(".sf-frame", { ...props, duration: 0.05, ease: "power2.out" }, at).to(
      ".sf-frame",
      { ...back, duration: 0.45, ease: "power2.out" },
      at + 0.05
    );
  };

  /* 1 · Slate, 0-1.5 ---------------------------------------------------- */
  tl.fromTo(
    ".sf-frame",
    { clipPath: "inset(50% 0% 50% 0%)" },
    { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.inOut" },
    0
  )
    .set(".sf-slate", { autoAlpha: 1 }, 0)
    .fromTo(
      ".sf-slate__board",
      { y: 40, autoAlpha: 0, rotation: -3 },
      { y: 0, autoAlpha: 1, rotation: -1, duration: 0.6 },
      0.05
    )
    .fromTo(".sf-slate__stick", { rotation: -24 }, { rotation: 0, duration: 0.16, ease: "power4.in" }, 0.84)
    .fromTo(".sf-flash", { opacity: 0 }, { opacity: reduced ? 0 : 0.8, duration: 0.04, ease: "none" }, 1)
    .to(".sf-flash", { opacity: 0, duration: 0.4, ease: "power2.out" }, 1.04)
    .to(".sf-slate__board", { yPercent: -150, rotation: 7, duration: 0.35, ease: "power3.in" }, 1.1)
    .set(".sf-slate", { autoAlpha: 0 }, 1.45);

  /* 2 · Release night, 1.5-4.5 ----------------------------------------- */
  tl.set(".sf-night", { autoAlpha: 1 }, 1.5)
    .fromTo(s, { field: 0 }, { field: 1, duration: 1.6, ease: "power1.out" }, 1.5)
    .fromTo(s, { cam: 0 }, { cam: reduced ? 0 : 0.5, duration: 6.5, ease: "none" }, 1.5)
    .fromTo(
      ".sf-night .sf-kicker",
      { autoAlpha: 0, letterSpacing: "0.7em" },
      { autoAlpha: 1, letterSpacing: "0.3em", duration: 1.3, ease: "power2.out" },
      1.6
    )
    .fromTo(
      ".sf-night__line--1 .sf-word",
      { autoAlpha: 0, y: 18, filter: blur(10) },
      { autoAlpha: 1, y: 0, filter: blur(0), duration: 0.7, stagger: 0.07 },
      1.85
    )
    .to(".sf-night__line--1", { autoAlpha: 0, y: -12, filter: blur(8), duration: 0.35, ease: "power2.in" }, 3.05)
    .fromTo(
      ".sf-night__line--2 .sf-word",
      { autoAlpha: 0, y: 18, filter: blur(10) },
      { autoAlpha: 1, y: 0, filter: blur(0), duration: 0.7, stagger: 0.05 },
      3.3
    )
    .fromTo(s, { pass: 0 }, { pass: 1, duration: 1.1, ease: "power1.inOut" }, 3.3)
    .fromTo(s, { bug: 0 }, { bug: 1, duration: 0.2, ease: "power2.out" }, 4.25)
    .to(".sf-night", { autoAlpha: 0, duration: 0.3, ease: "none" }, 4.2);

  /* 3 · The bug, 4.5-8 -------------------------------------------------- */
  tl.set(".sf-bug", { autoAlpha: 1 }, 4.5)
    .fromTo(s, { focus: 0 }, { focus: 1, duration: 1.5, ease: "power3.inOut" }, 4.5)
    .fromTo(".sf-bug .sf-kicker", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, 4.9)
    .fromTo(
      ".sf-bug__line",
      { autoAlpha: 0, scale: 1.08, filter: blur(12) },
      { autoAlpha: 1, scale: 1, filter: blur(0), duration: 0.6 },
      5.3
    )
    .fromTo(".sf-bug__sub", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 6.1);
  [5, 6, 6.75, 7.4].forEach((at) => {
    tl.fromTo(s, { beat: 0 }, { beat: 1, duration: 0.07, ease: "power2.out", immediateRender: false }, at).to(
      s,
      { beat: 0, duration: 0.5, ease: "power2.out" },
      at + 0.07
    );
    pulse(at, { scale: 1.014 }, { scale: 1 });
  });
  tl.fromTo(
    ".sf-redout",
    { autoAlpha: 0, scale: 0.15 },
    { autoAlpha: 1, scale: 2.6, duration: 0.75, ease: "power3.in" },
    7.25
  )
    .to(".sf-bug", { autoAlpha: 0, duration: 0.3, ease: "none" }, 7.6)
    .set(".sf-redout", { autoAlpha: 0 }, 8)
    .set(s, { field: 0, bug: 0, focus: 0, beat: 0 }, 8);

  /* 4 · The engineer, 8-11.5 ------------------------------------------- */
  tl.set(".sf-hunter", { autoAlpha: 1 }, 8)
    .set(".sf-flare", { autoAlpha: 1, scaleX: 0.15, xPercent: -25 }, 8)
    .to(".sf-flare", { autoAlpha: 0, scaleX: 1.5, xPercent: 25, duration: 1.2, ease: "power2.out" }, 8)
    .fromTo(".sf-leak", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, 8.2)
    .to(".sf-leak", { autoAlpha: 0, duration: 1.4, ease: "power1.inOut" }, 9.2)
    .fromTo(
      ".sf-hunter__portrait",
      { clipPath: "inset(49% 0% 49% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "expo.inOut" },
      8.05
    )
    .fromTo(".sf-hunter__portrait img", { scale: 1 }, { scale: reduced ? 1 : 1.09, duration: 3.45, ease: "none" }, 8.05)
    .fromTo(
      ".sf-hunter__scan",
      { yPercent: -100, autoAlpha: reduced ? 0 : 1 },
      { yPercent: 260, autoAlpha: 0, duration: 1.3, ease: "power2.inOut" },
      8.35
    )
    .fromTo(".sf-hunter .sf-kicker", { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 8.55)
    .fromTo(
      ".sf-char",
      { yPercent: 118, rotation: 7 },
      { yPercent: 0, rotation: 0, duration: 0.9, stagger: 0.035, ease: "expo.out" },
      8.8
    )
    .fromTo(
      ".sf-hunter__lock",
      { autoAlpha: 0, scale: 1.6 },
      { autoAlpha: 1, scale: 1, duration: 0.6, ease: "expo.out" },
      9.2
    )
    .fromTo(".sf-hunter__tag", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 9.5)
    .fromTo(".sf-hunter__role", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 9.9)
    .fromTo(".sf-hunter__line", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 10.5)
    .to(".sf-hunter", { autoAlpha: 0, duration: 0.25, ease: "none" }, 11.25);

  /* 5 · The record, 11.5-15: a real Newman run, then the bug log ------- */
  tl.set(".sf-log", { autoAlpha: 1 }, 11.5)
    .fromTo(".sf-log__frame", { scale: reduced ? 1.06 : 1.22 }, { scale: 1.06, duration: 0.8, ease: "expo.out" }, 11.5)
    .to(".sf-log__frame", { scale: reduced ? 1.06 : 1.1, duration: 0.6, ease: "none" }, 12.3)
    .fromTo(
      ".sf-log__report",
      { filter: `${blur(12)} brightness(0.3)` },
      { filter: `${blur(0)} brightness(0.72)`, duration: 0.8, ease: "expo.out" },
      11.5
    )
    .fromTo(".sf-log__kicker", { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 11.65)
    .fromTo(
      ".sf-log__box--0",
      { autoAlpha: 0, scale: 1.3 },
      { autoAlpha: 1, scale: 1, duration: 0.4, ease: "expo.out" },
      11.95
    )
    .fromTo(
      ".sf-log__box--1",
      { autoAlpha: 0, scale: 1.3 },
      { autoAlpha: 1, scale: 1, duration: 0.4, ease: "expo.out" },
      12.25
    )
    .to(".sf-log__frame", { scale: 1, duration: 0.35, ease: "power2.inOut" }, 12.9)
    .to(".sf-log__report", { filter: `${blur(5)} brightness(0.22)`, duration: 0.35, ease: "power2.inOut" }, 12.9)
    .to(".sf-log__boxes, .sf-log__kicker", { autoAlpha: 0, duration: 0.25, ease: "none" }, 12.9)
    .fromTo(
      ".sf-term",
      { autoAlpha: 0, x: narrow ? 0 : 60, y: narrow ? 30 : 0, rotationY: narrow || reduced ? 0 : -16 },
      { autoAlpha: 1, x: 0, y: 0, rotationY: narrow || reduced ? 0 : -6, duration: 0.45, ease: "expo.out" },
      12.95
    )
    .fromTo(
      ".sf-term__typed",
      { clipPath: "inset(0% 100% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.3, ease: "steps(24)" },
      13.05
    );
  all(".sf-term__row").forEach((row, i) => {
    tl.fromTo(row, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.2, ease: "power2.out" }, 13.4 + i * 0.2);
  });
  tl.fromTo(".sf-log__headline", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 14.45).to(
    ".sf-log",
    { autoAlpha: 0, duration: 0.15, ease: "none" },
    14.85
  );

  /* 6 · The website, 15-20.5: real footage and the live audit ---------- */
  tl.set(".sf-site", { autoAlpha: 1 }, 15)
    .fromTo(".sf-site__kicker", { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 15.05)
    .fromTo(
      ".sf-browser",
      { autoAlpha: 0, scale: 0.72, rotationY: narrow || reduced ? 0 : 28, rotationX: reduced ? 0 : 16, y: 60 },
      {
        autoAlpha: 1,
        scale: 1,
        rotationY: narrow || reduced ? 0 : 12,
        rotationX: reduced ? 0 : narrow ? 6 : 4,
        y: 0,
        duration: 1,
        ease: "expo.out",
      },
      15
    )
    .fromTo(
      ".sf-browser__glare",
      { xPercent: -120, skewX: -12 },
      { xPercent: 240, skewX: -12, duration: 1.1, ease: "power2.inOut" },
      15.3
    )
    .fromTo(
      ".sf-browser__host",
      { clipPath: "inset(0% 100% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: `steps(${Math.max(8, host.length)})` },
      15.15
    );
  SHOTS.forEach((shot, i) => {
    const el = `.sf-shot--${shot.id}`;
    const end = shotEnd(i);
    tl.set(el, { autoAlpha: 1 }, shot.at).set(`.sf-browser__path--${shot.id}`, { autoAlpha: 1 }, shot.at);
    if (i > 0) {
      tl.fromTo(
        el,
        { xPercent: reduced ? 0 : 26, filter: blur(10) },
        { xPercent: 0, filter: blur(0), duration: 0.22, ease: "power3.out", immediateRender: false },
        shot.at
      );
    }
    tl.fromTo(
      `${el} .sf-shot__media`,
      { scale: 1 },
      { scale: reduced ? 1 : 1.06, duration: end - shot.at, ease: "none", immediateRender: false },
      shot.at
    );
    shot.boxes.forEach((box, b) => {
      tl.fromTo(
        `${el} .sf-shot__box--${b}`,
        { autoAlpha: 0, scale: 1.25 },
        { autoAlpha: 1, scale: 1, duration: 0.35, ease: "expo.out" },
        shot.at + 0.3 + b * 0.4
      );
    });
    if (i < SHOTS.length - 1) {
      tl.to(el, { xPercent: reduced ? 0 : -26, filter: blur(10), duration: 0.18, ease: "power3.in" }, end - 0.18)
        .set(el, { autoAlpha: 0 }, end)
        .set(`.sf-browser__path--${shot.id}`, { autoAlpha: 0 }, end);
    }
  });
  // The panel shows as many rows as fit (all of them on a desktop); past
  // that it scrolls like a log, keeping the newest row in view.
  const rows = all(".sf-audit__row");
  const rowHeight = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 24;
  const auditWindow = root.querySelector(".sf-audit__window");
  const visible = Math.max(3, Math.floor(((auditWindow && auditWindow.clientHeight) || 400) / rowHeight) - 1);
  tl.fromTo(
    ".sf-audit",
    { autoAlpha: 0, x: narrow ? 0 : 40, y: narrow ? 30 : 0 },
    { autoAlpha: 1, x: 0, y: 0, duration: 0.5, ease: "expo.out" },
    15.4
  );
  rows.forEach((row, i) => {
    const at = 15.6 + i * 0.4;
    tl.fromTo(row, { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.25, ease: "power2.out" }, at);
    // On phones the panel shows the latest few rows, scrolling like a log.
    if (i >= visible)
      tl.to(".sf-audit__rows", { y: -(i - visible + 1) * rowHeight, duration: 0.2, ease: "power2.out" }, at);
  });
  tl.fromTo(
    ".sf-audit__sum",
    { autoAlpha: 0, y: 6 },
    { autoAlpha: 1, y: 0, duration: 0.4 },
    15.6 + rows.length * 0.4
  ).to(".sf-site", { autoAlpha: 0, duration: 0.1, ease: "none" }, 20.4);

  /* 7 · The arsenal, 20.5-23 ------------------------------------------- */
  const tools = all(".sf-tool");
  const step = 0.34;
  tl.set(".sf-arsenal", { autoAlpha: 1 }, 20.5)
    .fromTo(".sf-arsenal .sf-kicker", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "none" }, 20.52)
    .fromTo(
      ".sf-arsenal__track--a",
      { xPercent: 0 },
      { xPercent: reduced ? 0 : -14, duration: 2.5, ease: "none" },
      20.5
    )
    .fromTo(
      ".sf-arsenal__track--b",
      { xPercent: -14 },
      { xPercent: reduced ? -14 : 0, duration: 2.5, ease: "none" },
      20.5
    )
    .fromTo(".sf-arsenal__meter i", { scaleX: 0 }, { scaleX: 1, duration: step * tools.length, ease: "none" }, 20.55);
  tools.forEach((el, i) => {
    const at = 20.55 + i * step;
    tl.set(el, { autoAlpha: 1 }, at).fromTo(
      el,
      { scale: reduced ? 1 : 1.35, filter: blur(14) },
      { scale: 1, filter: blur(0), duration: 0.24, ease: "expo.out", immediateRender: false },
      at
    );
    if (i < tools.length - 1) tl.set(el, { autoAlpha: 0 }, at + step);
  });
  tl.to(".sf-arsenal", { autoAlpha: 0, duration: 0.12, ease: "none" }, 22.88);

  /* 8 · The receipts, 23-25.5 (the score stops dead here) -------------- */
  tl.set(s, { pass: 1.4, focus: 0.55, cam: 0.5 }, 23)
    .set(".sf-proof", { autoAlpha: 1 }, 23)
    .fromTo(s, { field: 0 }, { field: 0.55, duration: 0.8, ease: "power1.out", immediateRender: false }, 23)
    .fromTo(s, { cam: 0.5 }, { cam: reduced ? 0.5 : 0.66, duration: 2.5, ease: "none", immediateRender: false }, 23);
  all(".sf-stat").forEach((el, i) => {
    const at = 23.05 + i * 0.8;
    const num = el.querySelector(".sf-stat__num");
    const counter = { v: 0 };
    const stat = STATS[i];
    tl.set(el, { autoAlpha: 1 }, at)
      .fromTo(
        el,
        { y: 34, scale: 0.94 },
        { y: 0, scale: 1, duration: 0.6, ease: "expo.out", immediateRender: false },
        at
      )
      .fromTo(
        counter,
        { v: 0 },
        {
          v: stat.number,
          duration: 0.6,
          ease: "power3.out",
          immediateRender: false,
          onUpdate: () => {
            num.textContent = formatStat(stat, counter.v);
          },
        },
        at
      )
      .to(el, { autoAlpha: 0, y: -18, duration: 0.1, ease: "power2.in" }, at + 0.68);
    pulse(at, { scale: 1.02 }, { scale: 1 });
  });

  /* 9 · The verdict, 25.5-30 -------------------------------------------- */
  tl.set(".sf-proof", { autoAlpha: 0 }, 25.4)
    .set(".sf-verdict", { autoAlpha: 1 }, 25.5)
    .fromTo(s, { focus: 0.55 }, { focus: 0, duration: 0.9, ease: "power2.inOut", immediateRender: false }, 25.2)
    .fromTo(s, { field: 0.55 }, { field: 1, duration: 0.6, ease: "power1.out", immediateRender: false }, 25.2)
    .fromTo(s, { bug: 0 }, { bug: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, 25.5)
    .fromTo(".sf-verdict .sf-kicker", { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 25.6)
    .fromTo(s, { morph: 0 }, { morph: 1, duration: 2.1, ease: "none", immediateRender: false }, 25.7)
    .fromTo(s, { fixed: 0 }, { fixed: 1, duration: 0.9, ease: "power2.inOut", immediateRender: false }, 26.95)
    .fromTo(
      ".sf-flash",
      { opacity: 0 },
      { opacity: reduced ? 0 : 0.3, duration: 0.05, ease: "none", immediateRender: false },
      27.85
    )
    .to(".sf-flash", { opacity: 0, duration: 0.7, ease: "power2.out" }, 27.9)
    .fromTo(s, { glow: 0 }, { glow: 1, duration: 0.8, ease: "power2.out", immediateRender: false }, 27.85)
    .fromTo(
      ".sf-verdict__stamp",
      { autoAlpha: 0, scale: 2.4, rotation: -16 },
      { autoAlpha: 1, scale: 1, rotation: -7, duration: 0.32, ease: "power4.in" },
      27.95
    )
    .fromTo(".sf-verdict__line", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 28.45)
    .fromTo(".sf-verdict__credit", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 29)
    .set({}, {}, RUNTIME);
  // The stamp lands: a short knock through the frame.
  if (!reduced) {
    tl.to(".sf-frame", { x: -7, duration: 0.03, ease: "none" }, 28.27).to(
      ".sf-frame",
      { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" },
      28.3
    );
  }
}
