import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { greeting } from "../../portfolio";
import { createIntroSound } from "./introSound";
import { createGridFx, createSparks } from "./introSparks";
import { tracePen } from "./introPen";
import { introSoundOn, markIntroSeen, setIntroSound } from "./introPolicy";
import "./Splash.css";

/*
  Intro: the portfolio boots as a passing test run.

  0. Power on  a scan line wakes the stage and the pad fades in
  1. Run       the stats tick off in a test log while the odometer climbs
  2. Sign      a light pen writes the signature over its "expected" outline,
               throwing embers, lighting the grid, the ink cooling from hot
  3. Pass      the snapshot matches: a chord, a shockwave through the grid,
               and the role line decodes
  4. Handoff   the curtain lifts and the signature flies into the header logo

  It only plays when asked (F05): the home page's "Play intro" button or the
  header logo. Sound is off unless the visitor turns it on (remembered).

  It plays over the home page, which is already mounted underneath, so the
  handoff lands on the real header logo instead of cutting to a new page.
  The sound design lives in introSound.js.
*/

const CHECKS = [
  { name: "experience", value: 4, suffix: "+ yrs" },
  { name: "bugs squashed", value: 600, suffix: "+" },
  { name: "test cases run", value: 5000, suffix: "+" }
];
const ROLE = greeting.jobTitle;
const SCREENSHOT_CALL = "expect(signature).toHaveScreenshot()";
const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}#*+=";
const ODOMETER_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const ROW_AT = [0.45, 0.78, 1.1];
const CHECK_DELAY = 0.3;
const GHOST_AT = 0.85;
const SNAP_ROW_AT = 1.25;
const WRITE_AT = 1.38;
const WRITE_FOR = 1.2;
const PASS_AT = 2.62;
const ROLE_AT = 2.7;
const HANDOFF_AT = 3.65;
const FLIGHT_FOR = 1.05;

// Far enough past the end that the hot and diff bands have slid off the ink.
const INK_SETTLED = 1.3;

const FONT_WAIT_MS = 900;
// The signature is measured to fit the screen, so it has to be measured in its
// own font: sized against the fallback, it overflows narrow phones once
// Agustina arrives (a first visit on a slow connection).
const SIGNATURE_FONT = 'bold 64px "Agustina Regular"';
const SIGNATURE_FONT_WAIT_MS = 5000;
const FAILSAFE_MS = 10000;
const DEFAULT_ACCENT = [14, 107, 168];
const PASS_RGB = [52, 211, 153];

function browserEngine() {
  const ua = navigator.userAgent;
  if (/firefox|fxios/i.test(ua)) return "firefox";
  if (/chrome|chromium|crios|edg/i.test(ua)) return "chromium";
  if (/safari/i.test(ua)) return "webkit";
  return "browser";
}

function waitForFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const loads = Promise.all([
    document.fonts.load('bold 64px "Agustina Regular"'),
    document.fonts.load('500 16px "JetBrains Mono"'),
    document.fonts.load('500 16px "Inter"')
  ]).catch(() => {});
  return Promise.race([loads, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]);
}

function waitForSignatureFont() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load(SIGNATURE_FONT).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, SIGNATURE_FONT_WAIT_MS))
  ]);
}

function signatureFontLoaded() {
  return !document.fonts || !document.fonts.check || document.fonts.check(SIGNATURE_FONT);
}

function formatCount(value) {
  return Math.round(value).toLocaleString("en-US");
}

function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!match) return null;
  const value = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const n = parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(from, to, amount) {
  return from.map((value, i) => Math.round(value + (to[i] - value) * amount));
}

// Types the text in left to right, each character flickering through random
// glyphs before it settles.
function scramble(text, progress) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const start = (i / text.length) * 0.7;
    if (text[i] === " " || progress >= start + 0.3) out += text[i];
    else if (progress < start) out += " ";
    else out += SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
  }
  return out;
}

// Rolling odometer: each column carries over as the one to its right wraps.
function odometerPositions(value) {
  const ones = value % 10;
  const tens = (Math.floor(value / 10) % 10) + Math.max(0, ones - 9);
  const hundreds = Math.floor(value / 100) + Math.max(0, (value % 100) - 99);
  return [hundreds, tens, ones];
}

function Splash({ history, theme }) {
  const rootRef = useRef(null);
  // Read when the intro starts: a theme change mid-intro shouldn't restart it.
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const environment = useMemo(
    () => `${browserEngine()} · ${window.innerWidth}×${window.innerHeight}`,
    []
  );

  useEffect(() => {
    const root = rootRef.current;
    const theme = themeRef.current;
    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => Array.from(root.querySelectorAll(selector));
    const html = document.documentElement;
    const media = (query) => Boolean(window.matchMedia && window.matchMedia(query).matches);
    const reduced = media("(prefers-reduced-motion: reduce)");
    const finePointer = media("(hover: hover) and (pointer: fine)");
    const compact = window.innerWidth < 720;

    const stage = $(".intro-stage");
    const stageInner = $(".intro-stage__inner");
    const glow = $(".intro-glow");
    const fxCanvas = $(".intro-fx");
    const lockup = $(".intro-lockup");
    const name = $(".intro-name");
    const ink = $(".intro-name__ink");
    const finalInk = $(".intro-name__final");
    const brackets = $$(".intro-bracket");
    const nib = $(".intro-nib");
    const edge = $(".intro-edge");
    const bar = $(".intro-progress");
    const strips = $$(".intro-odo__strip");
    const rows = $$(".intro-row");
    const snapRow = rows[CHECKS.length];
    const log = $(".intro-log");
    const code = $(".intro-frame__code");
    const roleText = $(".intro-role__text");
    const sparksCanvas = $(".intro-sparks");
    const cursor = $(".intro-cursor");
    const cursorText = $(".intro-cursor__text");
    const soundButton = $(".intro-sound");

    const accent = hexToRgb(theme && theme.imageHighlight) || DEFAULT_ACCENT;
    const glowRgb = mixRgb(accent, [255, 255, 255], 0.45);

    let timeline = null;
    let exit = null;
    let handedOff = false;
    let skipped = false;
    let finished = false;
    let cancelled = false;
    let failsafe = null;
    let fittedInFont = false;
    let retracePen = null;
    // Keyboard visitor? True when the intro was launched from a keyboard-focused
    // logo (Enter on the link), or when any key is pressed while it plays.
    let usedKeyboard = false;
    try {
      usedKeyboard = !!(
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement.matches(":focus-visible")
      );
    } catch (error) {
      // Browsers without :focus-visible (Safari before 15.4) throw on the
      // selector; treat the visitor as a mouse user rather than crash the intro.
    }
    const startedAt = performance.now();
    // On a first load Lenis is created after this effect runs (App's effect
    // comes after its children's), so the stop() below misses it; this is
    // called again once the intro actually shows.
    const holdScroll = () => {
      if (window.__lenis) window.__lenis.stop();
    };

    // intro-active hides the header logo until the signature lands on it;
    // intro-cover stops the page underneath painting while nobody can see it.
    html.classList.add("intro-active", "intro-cover");
    if (window.__lenis) window.__lenis.stop();
    // Focus the dialog itself: keyboard users land inside it (Esc/Enter skip,
    // Tab reaches the buttons) without a focus ring flashing on Skip.
    root.focus({ preventScroll: true });

    const finish = () => {
      if (finished) return;
      finished = true;
      history.replace("/");
    };

    // Off unless the visitor turned it on. The click that opened the intro
    // lets the audio start; if the browser still blocks it, the run is silent.
    let sound = introSoundOn() ? createIntroSound() : null;

    const renderSoundButton = () => {
      const on = Boolean(sound);
      soundButton.setAttribute("aria-pressed", on ? "true" : "false");
      soundButton.querySelector(".intro-sound__label").textContent = on ? "Sound on" : "Sound off";
      soundButton.querySelector("i").className = on ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    };
    const toggleSound = (event) => {
      // Any other click on the intro skips it.
      event.stopPropagation();
      if (sound) {
        sound.dispose();
        sound = null;
      } else {
        sound = createIntroSound();
        if (sound) sound.unlock();
      }
      setIntroSound(Boolean(sound));
      renderSoundButton();
    };
    renderSoundButton();

    // Visual helpers -----------------------------------------------------------

    const sparks = reduced
      ? null
      : createSparks(sparksCanvas, {
          accent: glowRgb,
          motes: compact ? 16 : 34,
          maxSparks: compact ? 110 : 220
        });
    const fx = reduced ? null : createGridFx(fxCanvas, { glow: glowRgb, pass: PASS_RGB });

    const setFront = (fraction) => lockup.style.setProperty("--front", `${(fraction * 100).toFixed(2)}%`);
    const panFor = (x) => Math.max(-1, Math.min(1, (x / window.innerWidth) * 2 - 1));

    const setMeter = (value) => {
      odometerPositions(value).forEach((position, i) => {
        strips[i].style.transform = `translate3d(0, ${-position}em, 0)`;
      });
      bar.style.transform = `scaleX(${value / 100})`;
    };

    // Size the signature to the viewport and copy the header logo's spacing, so
    // the lockup is an exact scaled-up twin of the logo it hands off to.
    const fitLockup = () => {
      const headerName = document.querySelector(".hud .logo-name");
      if (headerName) {
        const style = getComputedStyle(headerName);
        const ratio = parseFloat(style.paddingLeft) / parseFloat(style.fontSize);
        if (ratio >= 0) name.style.setProperty("--name-pad", `${ratio}em`);
      }
      lockup.style.fontSize = "100px";
      const widthAt100 = lockup.getBoundingClientRect().width || 1000;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = window.innerHeight;
      const share = vw < 480 ? 0.86 : vw < 720 ? 0.84 : 0.62;
      // Capped at 1040px on ordinary screens, allowed to grow on big ones
      // (QHD, 4K, ultrawide) so the signature doesn't look lost.
      const targetWidth = Math.min(vw * share, Math.max(1040, vw * 0.5));
      const size = Math.max(22, Math.min((targetWidth / widthAt100) * 100, vh * 0.2, 220));
      lockup.style.fontSize = `${size}px`;
      root.style.setProperty("--lockup-size", `${size}px`);
      return size;
    };

    const markPassed = (showTime) => {
      rows.forEach((row) => row.classList.add("is-pass"));
      CHECKS.forEach((check, i) => {
        rows[i].querySelector(".intro-row__value").textContent = formatCount(check.value) + check.suffix;
      });
      snapRow.querySelector(".intro-row__value").textContent = "100% match";
      log.classList.add("is-pass");
      root.classList.add("is-pass");
      $(".intro-log__state").textContent = "PASSED";
      if (showTime) {
        $(".intro-summary__time").textContent = `${((performance.now() - startedAt) / 1000).toFixed(2)}s`;
      }
    };

    // Pointer: parallax, grid spotlight and an inspector-style readout --------

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const glowX = !reduced && finePointer ? gsap.quickTo(glow, "x", { duration: 1.4, ease: "power3" }) : null;
    const glowY = !reduced && finePointer ? gsap.quickTo(glow, "y", { duration: 1.4, ease: "power3" }) : null;

    const onPointer = (event) => {
      if (!finePointer || (event.pointerType && event.pointerType !== "mouse")) return;
      pointer.tx = event.clientX / window.innerWidth - 0.5;
      pointer.ty = event.clientY / window.innerHeight - 0.5;
      if (fx && !handedOff) fx.setCursor(event.clientX, event.clientY);
      const overControls = Boolean(event.target.closest && event.target.closest(".intro-actions"));
      cursor.classList.toggle("is-on", !overControls && !handedOff);
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursorText.textContent = `${Math.round(event.clientX)} × ${Math.round(event.clientY)}`;
      if (glowX) {
        glowX(pointer.tx * -36);
        glowY(pointer.ty * -24);
      }
    };
    const onPointerLeave = () => {
      cursor.classList.remove("is-on");
      if (fx) fx.setCursor(null);
    };

    // One frame loop for the particles and the lit grid.
    const onFrame = (time, deltaMs) => {
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      if (fx) fx.frame();
      if (sparks) {
        sparks.setParallax(pointer.x * 28, pointer.y * 18);
        sparks.frame(deltaMs);
      }
    };
    if (!reduced) gsap.ticker.add(onFrame);
    const onResize = () => {
      if (sparks) sparks.resize();
      if (fx) fx.resize();
    };

    // Handoff ------------------------------------------------------------------

    const handoff = () => {
      if (handedOff) return;
      handedOff = true;
      setFront(INK_SETTLED);
      cursor.classList.remove("is-on");
      if (fx) fx.setCursor(null);
      html.classList.remove("intro-cover");

      exit = gsap.timeline({ onComplete: finish });
      if (skipped) exit.timeScale(1.4);

      exit.to(
        [$(".intro-top"), $(".intro-bottom"), $(".intro-role"), $(".intro-frame"), $(".intro-actions"), nib, sparksCanvas],
        { opacity: 0, duration: 0.3, ease: "power2.in" },
        0
      );
      exit.call(() => {
        if (!sound) return;
        sound.padOut(1.2);
        sound.whoosh(FLIGHT_FOR / exit.timeScale());
      }, null, 0.06);

      // Curtain lifts bottom to top, led by the finished progress line. The
      // stage slides up while its contents slide back down by the same amount:
      // a wipe done purely with transforms, so the GPU does it without repaints.
      const lift = { duration: FLIGHT_FOR, ease: "expo.inOut" };
      exit.fromTo(stage, { y: 0 }, { y: -window.innerHeight, ...lift }, 0.12)
        .fromTo(stageInner, { y: 0 }, { y: window.innerHeight, ...lift }, 0.12)
        .to(edge, { y: -window.innerHeight, ...lift }, 0.12)
        .to(edge, { opacity: 0, duration: 0.2 }, FLIGHT_FOR - 0.05);

      const target = document.querySelector(".hud .logo-name");
      const targetRect = target && target.getBoundingClientRect();
      if (!targetRect || !targetRect.width) {
        exit.to(lockup, { opacity: 0, scale: 0.94, duration: 0.5, ease: "power2.in" }, 0.1)
          .call(() => html.classList.remove("intro-active"), null, 0.6);
        return;
      }

      const from = name.getBoundingClientRect();
      const box = lockup.getBoundingClientRect();
      const originX = from.left + from.width / 2 - box.left;
      const originY = from.top + from.height / 2 - box.top;
      const nameColor = getComputedStyle(target).color;
      const targetBracket = document.querySelector(".hud .logo-bracket");
      const bracketColor = targetBracket ? getComputedStyle(targetBracket).color : nameColor;

      // Pivot on the name so it lands dead on the logo whatever the bracket widths.
      lockup.style.transformOrigin = `${originX}px ${originY}px`;
      finalInk.style.color = nameColor;
      exit.to(lockup, {
        x: targetRect.left + targetRect.width / 2 - (from.left + from.width / 2),
        scale: targetRect.width / from.width,
        duration: FLIGHT_FOR,
        ease: "expo.inOut"
      }, 0.08)
        .to(lockup, {
          y: targetRect.top + targetRect.height / 2 - (from.top + from.height / 2),
          duration: FLIGHT_FOR,
          ease: "power3.inOut"
        }, 0.08)
        // Cross-fade to a plain copy in the header's colour rather than animating
        // colour and glow, which would re-rasterise the text every frame.
        .to(finalInk, { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0.3)
        .to(ink, { opacity: 0, duration: 0.5, ease: "power1.in" }, 0.6)
        .to(brackets, { color: bracketColor, duration: 0.8, ease: "power2.inOut" }, 0.3)
        // Landed: reveal the real logo underneath and let the twin dissolve into it.
        .call(() => {
          html.classList.remove("intro-active");
          if (sound) sound.land();
        }, null, FLIGHT_FOR + 0.08)
        .to(lockup, { opacity: 0, duration: 0.18, ease: "none" }, FLIGHT_FOR + 0.08);
    };

    // Reduced motion: the finished frame, a chord, a fade ----------------------

    const playReduced = () => {
      gsap.set($$("[data-intro-in]"), { opacity: 1 });
      setFront(INK_SETTLED);
      lockup.classList.add("is-inked");
      setMeter(100);
      code.textContent = SCREENSHOT_CALL;
      markPassed(false);
      if (sound) sound.pass();
      exit = gsap.timeline({ delay: 1.6, onComplete: finish })
        .call(() => html.classList.remove("intro-active", "intro-cover"))
        .to(root, { opacity: 0, duration: 0.45, ease: "power1.out" });
    };

    // The full run ---------------------------------------------------------------

    const playFull = (size) => {
      // Trace the pen's path now rather than when it touches down, so the
      // measuring doesn't stutter the first stroke.
      let pen = tracePen(ink);
      retracePen = () => {
        pen = tracePen(ink);
      };
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline = tl;
      if (skipped) tl.timeScale(8);

      // 0. Power on
      tl.call(() => {
        if (!sound) return;
        sound.padIn();
        sound.powerOn();
      }, null, 0)
        .fromTo($(".intro-scan"), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, 0)
        .to($(".intro-scan"), { opacity: 0, duration: 0.6, ease: "power2.out" }, 0.35)
        .fromTo(glow, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out" }, 0.05)
        .fromTo($(".intro-grid"), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power1.out" }, 0.15)
        .fromTo($$(".intro-top > *"), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.15)
        .fromTo($(".intro-meter"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, 0.25)
        .fromTo($(".intro-log__head"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45 }, 0.25);

      // 1. Run: the odometer climbs in steps, one per finished check.
      const meter = { value: 0 };
      const renderMeter = () => setMeter(meter.value);
      tl.to(meter, { value: 24, duration: 0.5, ease: "power2.inOut", onUpdate: renderMeter }, 0.3)
        .to(meter, { value: 49, duration: 0.35, ease: "power2.inOut", onUpdate: renderMeter }, 0.8)
        .to(meter, { value: 71, duration: 0.3, ease: "power2.inOut", onUpdate: renderMeter }, 1.12)
        .to(meter, { value: 100, duration: PASS_AT - WRITE_AT, ease: "sine.inOut", onUpdate: renderMeter }, WRITE_AT);

      CHECKS.forEach((check, i) => {
        const row = rows[i];
        const value = row.querySelector(".intro-row__value");
        const count = { value: 0 };
        tl.fromTo(row, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, ROW_AT[i])
          .to(count, {
            value: check.value,
            duration: 0.5,
            ease: "power2.out",
            onUpdate: () => { value.textContent = formatCount(count.value) + check.suffix; }
          }, ROW_AT[i] + 0.05)
          .call(() => {
            row.classList.add("is-pass");
            if (sound) sound.check(i);
          }, null, ROW_AT[i] + CHECK_DELAY);
      });

      // Expected snapshot: outline, brackets, frame, and the assertion typed out.
      const typing = { chars: 0 };
      tl.fromTo($(".intro-name__ghost"), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "power2.out" }, GHOST_AT)
        .fromTo(brackets, { opacity: 0, x: (i) => (i === 0 ? 0.5 : -0.5) * size }, { opacity: 1, x: 0, duration: 0.9, ease: "expo.out" }, GHOST_AT + 0.05)
        .fromTo($$(".intro-frame__corner"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.7, ease: "expo.out", stagger: 0.05 }, GHOST_AT + 0.05)
        .fromTo($(".intro-frame__label"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, GHOST_AT + 0.15)
        .to(typing, {
          chars: SCREENSHOT_CALL.length,
          duration: 0.45,
          ease: "none",
          onUpdate: () => { code.textContent = SCREENSHOT_CALL.slice(0, Math.round(typing.chars)); }
        }, GHOST_AT + 0.15)
        .fromTo($(".intro-frame__status"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, GHOST_AT + 0.62)
        .fromTo(snapRow, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, SNAP_ROW_AT);

      // 2. Sign: the light pen writes over the outline.
      let lastNib = null;
      const drawPen = (progress) => {
        const x = pen.start + (pen.end - pen.start) * progress;
        setFront(x / pen.width);
        const column = Math.max(0, Math.min(pen.ys.length - 1, Math.round(x)));
        const nx = pen.left + x;
        const ny = pen.top + pen.ys[column];
        nib.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
        fx.pen.x = nx;
        fx.pen.y = ny;
        if (lastNib) {
          const dx = nx - lastNib.x;
          const dy = ny - lastNib.y;
          const step = Math.hypot(dx, dy);
          if (sparks && step > 0.2) {
            sparks.emit(nx, ny, dx * 60, dy * 60, Math.min(3, Math.round(step * 0.22 + Math.random() * 0.6)));
          }
          if (sound) sound.penMove(step / (size * 0.12), 1 - pen.ys[column] / pen.height, dy < 0, panFor(nx));
        }
        lastNib = { x: nx, y: ny };
      };

      const stroke = { progress: 0 };
      tl.call(() => {
        lastNib = null;
        drawPen(0);
        if (sound) {
          sound.penDown();
          sound.tension(WRITE_FOR);
        }
      }, null, WRITE_AT - 0.02)
        .fromTo($(".intro-nib__dot"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.25 }, WRITE_AT)
        .fromTo($(".intro-nib__flare"), { opacity: 0, scaleX: 0.3 }, { opacity: 0.85, scaleX: 1, duration: 0.3 }, WRITE_AT)
        .fromTo(fx.pen, { r: 0 }, { r: size * 2.1, duration: 0.4, ease: "power2.out" }, WRITE_AT)
        .to(stroke, {
          progress: 1,
          duration: WRITE_FOR,
          ease: "sine.inOut",
          onUpdate: () => drawPen(stroke.progress)
        }, WRITE_AT);

      // Pen lift: a last burst of embers, the flare stretches out and fades, and
      // the hot band slides off the end so the last letters cool to white too.
      const cooling = { front: 1 };
      tl.call(() => {
        cooling.front = pen.end / pen.width;
      }, null, PASS_AT - 0.06)
        .to(cooling, {
          front: INK_SETTLED,
          duration: 0.9,
          ease: "power1.inOut",
          onUpdate: () => setFront(cooling.front)
        }, PASS_AT - 0.05);
      tl.call(() => {
        if (sparks && lastNib) sparks.burst(lastNib.x, lastNib.y, compact ? 16 : 28);
        if (sound) {
          sound.penUp();
          sound.lift(lastNib ? panFor(lastNib.x) : 0);
        }
      }, null, PASS_AT - 0.05)
        .to($(".intro-nib__dot"), { scale: 2.6, opacity: 0, duration: 0.5, ease: "power2.out" }, PASS_AT - 0.05)
        .to($(".intro-nib__flare"), { scaleX: 3.2, opacity: 0, duration: 0.55, ease: "power2.out" }, PASS_AT - 0.05)
        .to(fx.pen, { r: 0, duration: 0.5, ease: "power2.in" }, PASS_AT - 0.05);

      // 3. Pass: chord, shockwave through the grid, glint, green across the board.
      const waveReach = Math.hypot(window.innerWidth, window.innerHeight);
      tl.call(() => {
        markPassed(true);
        if (sound) sound.pass();
        const box = name.getBoundingClientRect();
        fx.wave.x = box.left + box.width / 2;
        fx.wave.y = box.top + box.height / 2;
      }, null, PASS_AT)
        .fromTo(fx.wave, { r: 0, alpha: 1 }, { r: waveReach, duration: 1.6, ease: "expo.out", immediateRender: false }, PASS_AT)
        .to(fx.wave, { alpha: 0, duration: 0.6, ease: "power1.in" }, PASS_AT + 0.9)
        .to($$(".intro-frame__corner"), { scale: 1.3, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 }, PASS_AT)
        .to($(".intro-name__ghost"), { opacity: 0, duration: 0.5, ease: "power1.out" }, PASS_AT)
        .fromTo($(".intro-name__glint"), { opacity: 1, "--glint": "130%" }, {
          "--glint": "-30%",
          duration: 0.8,
          ease: "power2.inOut"
        }, PASS_AT + 0.05)
        .set($(".intro-name__glint"), { opacity: 0 }, PASS_AT + 0.9)
        // Ink has settled: drop the masks and effect layers for a light flight.
        .call(() => lockup.classList.add("is-inked"), null, PASS_AT + 0.92)
        .fromTo($(".intro-summary"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 }, PASS_AT + 0.05);

      // Role line decodes.
      const decode = { progress: 0 };
      tl.fromTo($$(".intro-role__rule"), { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.8, ease: "expo.out" }, ROLE_AT)
        .set(roleText, { opacity: 1 }, ROLE_AT)
        .to(decode, {
          progress: 1,
          duration: 0.6,
          ease: "none",
          onUpdate: () => { roleText.textContent = scramble(ROLE, decode.progress); }
        }, ROLE_AT);

      tl.call(handoff, null, HANDOFF_AT);
    };

    // Controls ---------------------------------------------------------------

    const skip = () => {
      if (skipped || finished) return;
      skipped = true;
      if (sound) sound.skipped();
      if (reduced) {
        if (exit) exit.kill();
        exit = gsap.timeline({ onComplete: finish })
          .call(() => html.classList.remove("intro-active", "intro-cover"))
          .to(root, { opacity: 0, duration: 0.3, ease: "power1.out" });
      } else if (handedOff) {
        exit.timeScale(1.6);
      } else if (timeline) {
        // Fast-forward the rest of the run, then hand off a little quicker.
        timeline.timeScale(8);
      }
    };

    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      usedKeyboard = true;
      // Enter or Space on the sound button toggles it rather than skipping.
      if (event.target === soundButton && event.key !== "Escape") return;
      if (["Escape", "Enter", " ", "Spacebar"].includes(event.key)) {
        event.preventDefault();
        skip();
      } else if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
      }
    };
    const blockScroll = (event) => event.preventDefault();

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    root.addEventListener("click", skip);
    soundButton.addEventListener("click", toggleSound);
    root.addEventListener("pointermove", onPointer);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("wheel", blockScroll, { passive: false });
    root.addEventListener("touchmove", blockScroll, { passive: false });

    waitForFonts().then(async () => {
      if (cancelled) return;
      if (sound) await sound.unlock();
      if (cancelled) return;
      await waitForSignatureFont();
      if (cancelled) return;
      holdScroll();
      const size = fitLockup();
      fittedInFont = signatureFontLoaded();
      root.classList.add("is-ready");
      failsafe = setTimeout(finish, FAILSAFE_MS);
      if (reduced) playReduced();
      else playFull(size);
    });

    // Safety net: if the font arrives after the wait gave up, refit (and
    // re-trace the pen) at once so the signature can't stay oversized.
    const onFontsLoaded = () => {
      if (fittedInFont || handedOff || !signatureFontLoaded()) return;
      if (!root.classList.contains("is-ready")) return;
      fittedInFont = true;
      fitLockup();
      if (retracePen) retracePen();
    };
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener("loadingdone", onFontsLoaded);
    }

    return () => {
      // Seen once (played through, skipped or left): / won't auto-play it again
      // this session. Marked on the way out so a re-render mid-intro can't
      // unmount it.
      markIntroSeen();
      cancelled = true;
      clearTimeout(failsafe);
      if (timeline) timeline.kill();
      if (exit) exit.kill();
      gsap.ticker.remove(onFrame);
      gsap.killTweensOf(glow);
      if (sparks) sparks.destroy();
      if (sound) sound.dispose();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      if (document.fonts && document.fonts.removeEventListener) {
        document.fonts.removeEventListener("loadingdone", onFontsLoaded);
      }
      root.removeEventListener("click", skip);
      soundButton.removeEventListener("click", toggleSound);
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("wheel", blockScroll);
      root.removeEventListener("touchmove", blockScroll);
      html.classList.remove("intro-active", "intro-cover");
      if (window.__lenis) window.__lenis.start();
      // Keyboard visitors get focus on the logo the signature just landed on.
      // Not for mouse and touch visitors: Chrome shows a focus ring for a
      // programmatic focus, which stayed on the logo until the next click.
      if (usedKeyboard) {
        setTimeout(() => {
          const logo = document.querySelector(".hud .logo");
          if (logo && (document.activeElement === document.body || !document.activeElement)) {
            logo.focus({ preventScroll: true });
          }
        }, 0);
      }
    };
  }, [history]);

  return (
    <div
      className="intro"
      ref={rootRef}
      tabIndex={-1}
      style={{
        "--intro-accent": (theme && theme.imageHighlight) || undefined,
        "--intro-tint": (theme && theme.splashBg) || undefined
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${greeting.title}, ${ROLE}. Intro`}
    >
      <div className="intro-stage" aria-hidden="true">
        <div className="intro-stage__inner">
          <div className="intro-glow" data-intro-in />
          <div className="intro-grid" data-intro-in />
          <canvas className="intro-fx" />
          <div className="intro-scan" />
          <div className="intro-grain" />

          <div className="intro-top">
            <span className="intro-env" data-intro-in>
              <span className="intro-env__dot" />
              <span className="intro-env__live">Live run ·</span>
              {environment}
            </span>
          </div>

          <div className="intro-bottom">
            <div className="intro-log">
              <div className="intro-log__head" data-intro-in>
                <span className="intro-log__dot" />
                <span className="intro-log__state">RUNNING</span>
                <span className="intro-log__file">portfolio.spec.ts</span>
              </div>
              <ul className="intro-log__rows">
                {CHECKS.map((check) => (
                  <li className="intro-row" data-intro-in key={check.name}>
                    <RowIcon />
                    <span className="intro-row__name">{check.name}</span>
                    <span className="intro-row__lead" />
                    <span className="intro-row__value">0{check.suffix}</span>
                  </li>
                ))}
                <li className="intro-row intro-row--snap" data-intro-in>
                  <RowIcon />
                  <span className="intro-row__name">signature snapshot</span>
                  <span className="intro-row__lead" />
                  <span className="intro-row__value">comparing…</span>
                </li>
              </ul>
              <div className="intro-summary" data-intro-in>
                <span className="intro-summary__pass">{CHECKS.length + 1} passed</span>
                <span className="intro-summary__fail">0 failed</span>
                <span className="intro-summary__time" />
              </div>
            </div>

            <div className="intro-meter" data-intro-in>
              <span className="intro-meter__label">Suite progress</span>
              <span className="intro-meter__number">
                <span className="intro-odo">
                  {[0, 1, 2].map((column) => (
                    <span className="intro-odo__col" key={column}>
                      <span className="intro-odo__strip">
                        {ODOMETER_DIGITS.map((digit, i) => (
                          <span key={i}>{digit}</span>
                        ))}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="intro-meter__pct">%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="intro-edge" aria-hidden="true">
        <span className="intro-progress" />
      </div>

      <div className="intro-center" aria-hidden="true">
        <div className="intro-lockup">
          <span className="intro-bracket" data-intro-in>&lt;</span>
          <span className="intro-name">
            <span className="intro-name__ghost">{greeting.logo_name}</span>
            <span className="intro-name__layer intro-name__diff">{greeting.logo_name}</span>
            <span className="intro-name__layer intro-name__ink">{greeting.logo_name}</span>
            <span className="intro-name__layer intro-name__hot">{greeting.logo_name}</span>
            <span className="intro-name__layer intro-name__glint">{greeting.logo_name}</span>
            <span className="intro-name__layer intro-name__final">{greeting.logo_name}</span>
          </span>
          <span className="intro-bracket" data-intro-in>/&gt;</span>

          <span className="intro-frame">
            <span className="intro-frame__label" data-intro-in>
              <span className="intro-frame__code" />
              <span className="intro-frame__status" />
            </span>
            <span className="intro-frame__corner intro-frame__corner--tl" data-intro-in />
            <span className="intro-frame__corner intro-frame__corner--tr" data-intro-in />
            <span className="intro-frame__corner intro-frame__corner--bl" data-intro-in />
            <span className="intro-frame__corner intro-frame__corner--br" data-intro-in />
          </span>
        </div>

        <p className="intro-role">
          <span className="intro-role__rule" data-intro-in />
          <span className="intro-role__text" data-intro-in>{ROLE}</span>
          <span className="intro-role__rule" data-intro-in />
        </p>
      </div>

      <canvas className="intro-sparks" aria-hidden="true" />

      <div className="intro-nib" aria-hidden="true">
        <span className="intro-nib__flare" />
        <span className="intro-nib__dot" />
      </div>

      <div className="intro-cursor" aria-hidden="true">
        <span className="intro-cursor__text" />
      </div>

      <div className="intro-actions">
        <button type="button" className="intro-sound" aria-pressed="false">
          <i className="fa-solid fa-volume-xmark" aria-hidden="true" />
          <span className="intro-sound__label">Sound off</span>
        </button>
        <button type="button" className="intro-skip">
          Skip intro <kbd>esc</kbd>
        </button>
      </div>
    </div>
  );
}

function RowIcon() {
  return (
    <span className="intro-row__icon">
      <span className="intro-row__spinner" />
      <svg className="intro-row__check" viewBox="0 0 12 12" focusable="false">
        <path d="M2.5 6.4 5 8.8 9.6 3.6" />
      </svg>
    </span>
  );
}

export default Splash;
