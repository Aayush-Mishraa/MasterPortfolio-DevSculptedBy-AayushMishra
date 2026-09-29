/*
  The film's one camera: a field of dots, one per test case, drawn in 2D with
  a fake depth. The timeline never touches the canvas; it tweens `state` and
  this loop draws whatever state says, so pausing and seeking are free.

  state
    field   0..1  how much of the field is in shot
    cam     0..1  dolly forward through the field
    pass    0..1+ a wave of passing tests, left to right
    bug     0..1  the one failing test turns red
    beat    0..1  heartbeat pulse on the bug
    focus   0..1  rack focus: the bug sharp and centred, the rest bokeh
    morph   0..1  the dots gather into the words "SIGNED OFF"
    fixed   0..1  the bug flies home and becomes the full stop, green
    glow    0..1  bloom on the finished title
*/

const GREEN = [34, 197, 94];
const RED = [239, 68, 68];
const IDLE = [196, 206, 222];
const TITLE = "SIGNED OFF";

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixColor = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// Deterministic randomness, so every viewing is the same take.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createFilmCanvas(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  const state = {
    field: 0,
    cam: 0,
    pass: 0,
    bug: 0,
    beat: 0,
    focus: 0,
    morph: 0,
    fixed: 0,
    glow: 0,
  };
  let w = 0;
  let h = 0;
  let dpr = 1;
  let particles = [];
  let period = { x: 0, y: 0, r: 4 };
  let dotSize = 2;
  let frame = 0;
  const start = performance.now();

  const layout = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width * dpr));
    h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;

    const count = Math.round(clamp((rect.width * rect.height) / 900, 480, 1600));
    const random = seeded(20260929);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: random() * 2 - 1,
        y: random() * 2 - 1,
        z: random(),
        seed: random(),
        delay: random() * 0.45,
        target: null,
      });
    }

    // Sample the title's pixels for the dots to gather on. The full stop is
    // left out of the sample: the bug becomes it.
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const o = off.getContext("2d");
    const portrait = w / h < 1.05;
    const lines = portrait ? ["SIGNED", "OFF"] : [TITLE];
    const longest = portrait ? "SIGNED." : `${TITLE}.`;
    let size = h * (portrait ? 0.2 : 0.26);
    o.font = `700 ${size}px Inter, system-ui, sans-serif`;
    const widest = o.measureText(longest).width;
    size = Math.min(size, (size * w * (portrait ? 0.86 : 0.82)) / widest);
    o.font = `700 ${size}px Inter, system-ui, sans-serif`;
    o.textBaseline = "middle";
    o.textAlign = "left";
    o.fillStyle = "#fff";
    const lineHeight = size * 0.98;
    const top = h * 0.44 - ((lines.length - 1) * lineHeight) / 2;
    let lastLine = { x: 0, y: 0, full: 0 };
    lines.forEach((line, i) => {
      const width = o.measureText(line).width;
      const full = o.measureText(`${line}.`).width;
      const x = (w - (i === lines.length - 1 ? full : width)) / 2;
      const y = top + i * lineHeight;
      o.fillText(line, x, y);
      lastLine = { x, y, full };
    });
    // The full stop's real glyph box, measured from the middle baseline. Its
    // origin comes from the kerned "OFF." width, since "F." kerns tight.
    const dot = o.measureText(".");
    const origin = lastLine.x + lastLine.full - dot.width;
    const dotLeft = origin - (dot.actualBoundingBoxLeft || 0);
    const dotRight = origin + (dot.actualBoundingBoxRight || dot.width * 0.7);
    const dotTop = lastLine.y - (dot.actualBoundingBoxAscent != null ? dot.actualBoundingBoxAscent : -size * 0.2);
    const dotBottom = lastLine.y + (dot.actualBoundingBoxDescent || size * 0.36);
    period = {
      x: (dotLeft + dotRight) / 2,
      y: (dotTop + dotBottom) / 2,
      r: Math.max((dotRight - dotLeft) / 2, (dotBottom - dotTop) / 2),
    };

    const data = o.getImageData(0, 0, w, h).data;
    const sample = (step) => {
      const points = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          if (data[(y * w + x) * 4 + 3] > 140) points.push({ x, y });
        }
      }
      return points;
    };
    let step = Math.max(2, Math.round(3 * dpr));
    let points = sample(step);
    while (points.length > count - 1 && step < 40) {
      step += 1;
      points = sample(step);
    }
    dotSize = step * 0.36;
    const order = seeded(7);
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(order() * (i + 1));
      const tmp = points[i];
      points[i] = points[j];
      points[j] = tmp;
    }
    particles.forEach((p, i) => {
      p.target = i > 0 && i - 1 < points.length ? points[i - 1] : null;
    });
  };

  // Where the field puts a dot, before rack focus and the gather.
  const project = (p, time) => {
    const depth = (((p.z - state.cam * 0.55) % 1) + 1) % 1;
    const d = 0.14 + depth;
    const scale = 0.5 / d;
    const wobble = reduced ? 0 : Math.sin(time * 0.35 + p.seed * 40) * 0.012;
    const x = w / 2 + (p.x + wobble) * w * 0.62 * scale;
    const y = h / 2 + (p.y + wobble * 0.6) * h * 0.62 * scale;
    const fade = clamp((d - 0.16) / 0.12) * clamp((1.14 - d) / 0.3);
    return { x, y, r: Math.max(0.55, 1.5 * scale) * dpr, a: fade };
  };

  const draw = () => {
    const time = (performance.now() - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    const s = state;
    if (s.field <= 0.001 && s.morph <= 0.001) return;

    const focus = ease(clamp(s.focus));
    const bugHome = { x: w * 0.58, y: h * 0.46 };
    const bugAt = {
      x: mix(bugHome.x, w / 2, focus),
      y: mix(bugHome.y, h / 2, focus),
    };

    ctx.globalCompositeOperation = "lighter";
    for (let i = 1; i < particles.length; i++) {
      const p = particles[i];
      const f = project(p, time);
      let x = f.x;
      let y = f.y;
      // Rack focus pushes the field out from the bug, like a zoom through it.
      if (focus > 0) {
        x = bugAt.x + (x - bugHome.x) * (1 + focus * 0.6);
        y = bugAt.y + (y - bugHome.y) * (1 + focus * 0.6);
      }
      let r = f.r * (1 + focus * 4.5);
      let alpha = f.a * s.field * (1 - focus * 0.78);
      const passed = clamp((s.pass * 1.3 - 0.12 - x / w - p.seed * 0.12) * 8);
      let color = mixColor(IDLE, GREEN, passed);
      alpha *= mix(0.5, 0.95, passed);

      if (s.morph > 0) {
        const local = ease(clamp((s.morph - p.delay) / 0.55));
        if (p.target) {
          x = mix(x, p.target.x, local);
          y = mix(y, p.target.y, local);
          r = mix(r, dotSize, local);
          alpha = mix(alpha, 0.95, local);
          color = mixColor(color, GREEN, local);
        } else {
          alpha *= 1 - local;
        }
      }
      if (alpha <= 0.01 || x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
      ctx.fillStyle = rgba(color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (s.glow > 0 && p.target) {
        ctx.fillStyle = rgba(GREEN, 0.07 * s.glow);
        ctx.beginPath();
        ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The bug.
    if (s.bug > 0.001) {
      const fixed = ease(clamp(s.fixed));
      const x = mix(bugAt.x, period.x, fixed);
      const y = mix(bugAt.y, period.y, fixed);
      const r = mix((2.2 + focus * 7 + s.beat * 4) * dpr, period.r, fixed);
      const color = mixColor(RED, GREEN, clamp((s.fixed - 0.55) / 0.35));
      const halo = r * mix(4 + s.beat * 3 + focus * 2, 2.8, fixed);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, halo);
      gradient.addColorStop(0, rgba(color, 0.55 * s.bug));
      gradient.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, halo, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgba(mixColor(color, [255, 255, 255], 0.25 * (1 - fixed)), s.bug);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Two thin rings lock on as the focus lands.
      if (focus > 0.2 && fixed < 0.2) {
        const lock = clamp((focus - 0.2) / 0.8);
        ctx.strokeStyle = rgba(RED, 0.5 * lock * s.bug * (1 - fixed * 5));
        ctx.lineWidth = dpr;
        [2.8, 4.6].forEach((k, j) => {
          ctx.beginPath();
          ctx.arc(x, y, r * mix(k * 3, k, lock) + s.beat * 6 * dpr * (j + 1), 0, Math.PI * 2);
          ctx.stroke();
        });
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const loop = () => {
    draw();
    frame = requestAnimationFrame(loop);
  };

  layout();
  frame = requestAnimationFrame(loop);
  // The title is sampled from Inter: lay it out again once the font is in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => frame && layout());
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => layout()) : null;
  if (observer) observer.observe(canvas);
  else window.addEventListener("resize", layout);

  return {
    state,
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (observer) observer.disconnect();
      else window.removeEventListener("resize", layout);
    },
  };
}
