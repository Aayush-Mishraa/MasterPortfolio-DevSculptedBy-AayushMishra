// Canvas layer in front of the signature: embers thrown off the pen, a burst
// when it lifts, and slow dust drifting up for depth.

const TAU = Math.PI * 2;

// Soft round sprite with a white-hot core, pre-rendered once per colour.
function sprite([r, g, b]) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.16, `rgba(${r}, ${g}, ${b}, 0.95)`);
  gradient.addColorStop(0.42, `rgba(${r}, ${g}, ${b}, 0.22)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

// Size a canvas's backing store to its box at 1x even on retina screens:
// everything drawn here is soft glow or 1px lines snapped to whole pixels, and
// a quarter of the pixels to redraw and upload each frame keeps it smooth.
function fitCanvas(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  return { width, height };
}

const TILE = 72;
const rgba = ([r, g, b], alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

// Canvas behind the signature that lights up the blueprint grid: a spotlight
// under the pen, one under the cursor, and the shockwave when the test passes.
// Drawing only the few grid lines in reach is far cheaper than repainting
// full-screen CSS masks every frame.
export function createGridFx(canvas, { glow, pass }) {
  const ctx = canvas.getContext("2d");
  const ring = pass.map((value) => Math.round(value + (255 - value) * 0.15));
  let width = 0;
  let height = 0;
  let drawn = null;
  const pen = { x: -999, y: -999, r: 0 };
  const wave = { x: 0, y: 0, r: 0, alpha: 0 };
  let cursor = null;

  const resize = () => {
    ({ width, height } = fitCanvas(canvas));
    drawn = null;
  };
  resize();

  // Same lattice as the CSS grid: 72px tiles at background-position
  // calc(50% - 36px) calc(46% - 36px), 1px lines.
  function lines(x0, y0, x1, y1) {
    const ox = (width - TILE) * 0.5 - TILE / 2;
    const oy = (height - TILE) * 0.46 - TILE / 2;
    for (let x = ox + Math.ceil((x0 - ox) / TILE) * TILE; x <= x1; x += TILE) ctx.fillRect(Math.round(x), y0, 1, y1 - y0);
    for (let y = oy + Math.ceil((y0 - oy) / TILE) * TILE; y <= y1; y += TILE) ctx.fillRect(x0, Math.round(y), x1 - x0, 1);
  }

  function spot(x, y, r, color, alpha) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, rgba(color, alpha));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    lines(Math.max(0, x - r), Math.max(0, y - r), Math.min(width, x + r), Math.min(height, y + r));
  }

  function frame() {
    const penOn = pen.r > 0.5;
    const waveOn = wave.alpha > 0.01 && wave.r > 0;
    // Skip the redraw (and the texture upload) when nothing has moved.
    const key = `${cursor ? `${cursor.x},${cursor.y}` : "-"}|${penOn ? `${pen.x},${pen.y},${pen.r}` : "-"}|${waveOn ? `${wave.r},${wave.alpha}` : "-"}`;
    if (key === drawn) return;
    drawn = key;
    ctx.clearRect(0, 0, width, height);

    if (cursor) spot(cursor.x, cursor.y, 190, glow, 0.2);
    if (penOn) spot(pen.x, pen.y, pen.r, glow, 0.4);
    if (waveOn) {
      // A 160px band of green grid trailing a bright ring.
      const inner = Math.max(0, wave.r - 160);
      const outer = wave.r + 3;
      const gradient = ctx.createRadialGradient(wave.x, wave.y, inner, wave.x, wave.y, outer);
      gradient.addColorStop(0, rgba(pass, 0));
      gradient.addColorStop((wave.r - inner) / (outer - inner), rgba(pass, 0.6 * wave.alpha));
      gradient.addColorStop(1, rgba(pass, 0));
      ctx.fillStyle = gradient;
      lines(Math.max(0, wave.x - outer), Math.max(0, wave.y - outer), Math.min(width, wave.x + outer), Math.min(height, wave.y + outer));
      ctx.strokeStyle = rgba(ring, 0.9 * wave.alpha);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return {
    pen,
    wave,
    frame,
    resize,
    setCursor(x, y) {
      cursor = x === null ? null : { x, y };
    }
  };
}

export function createSparks(canvas, { accent, motes: moteCount, maxSparks }) {
  const ctx = canvas.getContext("2d");
  const accentSprite = sprite(accent);
  const whiteSprite = sprite([255, 255, 255]);
  const streak = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, `;
  const sparks = [];
  let width = 0;
  let height = 0;
  let parallaxX = 0;
  let parallaxY = 0;
  let fade = 1;

  const resize = () => {
    ({ width, height } = fitCanvas(canvas));
  };
  resize();

  const newMote = (anywhere) => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 12,
    vy: -(6 + Math.random() * 14),
    size: 0.6 + Math.random() * 1.4,
    alpha: 0.05 + Math.random() * 0.16,
    phase: Math.random() * TAU,
    depth: 0.3 + Math.random() * 0.7
  });
  const motes = Array.from({ length: moteCount }, () => newMote(true));

  // vx/vy: the pen's velocity in px/s; embers kick back against it.
  function emit(x, y, vx, vy, amount) {
    for (let i = 0; i < amount && sparks.length < maxSparks; i++) {
      const angle = Math.random() * TAU;
      const speed = 20 + Math.random() * 110;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed - vx * 0.12,
        vy: Math.sin(angle) * speed - vy * 0.12 - 35,
        life: 0,
        max: 0.35 + Math.random() * 0.55,
        size: 0.8 + Math.random() * 1.8,
        hot: Math.random() < 0.3
      });
    }
  }

  function burst(x, y, amount) {
    for (let i = 0; i < amount && sparks.length < maxSparks; i++) {
      const angle = Math.random() * TAU;
      const speed = 60 + Math.random() * 220;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0,
        max: 0.5 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
        hot: Math.random() < 0.45
      });
    }
  }

  function frame(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    for (const mote of motes) {
      mote.y += mote.vy * dt;
      mote.phase += dt * 0.8;
      if (mote.y < -12) Object.assign(mote, newMote(false));
      const x = mote.x + Math.sin(mote.phase) * 6 + parallaxX * mote.depth;
      const y = mote.y + parallaxY * mote.depth;
      const size = mote.size * 6;
      ctx.globalAlpha = mote.alpha * fade;
      ctx.drawImage(whiteSprite, x - size / 2, y - size / 2, size, size);
    }

    ctx.lineCap = "round";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      spark.life += dt;
      if (spark.life >= spark.max) {
        sparks.splice(i, 1);
        continue;
      }
      const drag = Math.max(0, 1 - 2.2 * dt);
      spark.vx *= drag;
      spark.vy = spark.vy * drag + 260 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;

      const k = 1 - spark.life / spark.max;
      // Motion-blurred tail, then the glowing head.
      ctx.globalAlpha = k * 0.55 * fade;
      ctx.strokeStyle = `${streak}${k.toFixed(3)})`;
      ctx.lineWidth = spark.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(spark.x - spark.vx * 0.03, spark.y - spark.vy * 0.03);
      ctx.lineTo(spark.x, spark.y);
      ctx.stroke();

      const size = spark.size * 7 * (0.55 + 0.45 * k);
      ctx.globalAlpha = k * fade;
      ctx.drawImage(spark.hot ? whiteSprite : accentSprite, spark.x - size / 2, spark.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  return {
    emit,
    burst,
    frame,
    resize,
    setParallax(x, y) {
      parallaxX = x;
      parallaxY = y;
    },
    setFade(value) {
      fade = value;
    },
    destroy() {
      sparks.length = 0;
      ctx.clearRect(0, 0, width, height);
    }
  };
}
