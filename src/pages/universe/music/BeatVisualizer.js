import React, { useEffect, useRef } from "react";
import { useMusic } from "./MusicContext";
import { prefersReducedMotion } from "../../projects/lib/ui";

/*
 * A spectrum-style visualizer driven by the track's tempo instead of raw audio
 * samples (which cross-origin music files don't expose). Each frame reads the
 * playback position and places it on the beat grid: a kick envelope on every
 * beat, a softer snare on the off-beat and an accent on each bar's downbeat.
 *
 * variants: "bars" (wide strip), "mini" (dock), "ring" (around the record)
 */

const DEFAULT_BPM = { track: 104, live: 88 };

export default function BeatVisualizer({ variant = "bars", count, className = "" }) {
  const music = useMusic();
  const canvas = useRef(null);
  const info = useRef({});
  const track = music.track;
  info.current = {
    playing: music.status === "playing",
    bpm: (track && track.bpm) || (track && track.kind === "live" ? DEFAULT_BPM.live : DEFAULT_BPM.track),
    getTime: music.getTime,
  };

  useEffect(() => {
    const node = canvas.current;
    if (!node) return undefined;
    const ctx = node.getContext("2d");
    const n = count || (variant === "mini" ? 14 : variant === "ring" ? 72 : 64);
    const levels = new Float32Array(n);
    const seeds = Array.from({ length: n }, () => Math.random());
    const still = prefersReducedMotion();
    let energy = 0;
    let frozen = 0;
    let frame;
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = node.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      node.width = width * ratio;
      node.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(node);

    const colors = () => {
      const styles = getComputedStyle(node);
      return {
        a: styles.getPropertyValue("--viz-a").trim() || "#d6ff4a",
        b: styles.getPropertyValue("--viz-b").trim() || "#7ef2c9",
      };
    };
    let palette = colors();
    let paletteAt = 0;

    const compute = (now) => {
      const { playing, bpm, getTime } = info.current;
      energy += ((playing ? 1 : 0) - energy) * (playing ? 0.08 : 0.04);
      const t = playing ? getTime() : frozen;
      if (playing) frozen = t;
      const beat = (t * bpm) / 60;
      const phase = beat - Math.floor(beat);
      const kick = Math.exp(-phase * 7);
      const snare = Math.exp(-((phase + 0.5) % 1) * 10) * 0.55;
      const downbeat = Math.floor(beat) % 4 === 0 ? 1.18 : 1;
      for (let i = 0; i < n; i += 1) {
        const x = i / (n - 1);
        const s = seeds[i];
        const bass = Math.max(0, 1 - x * 3.2);
        const mids = Math.exp(-Math.pow((x - 0.45) / 0.22, 2));
        const highs = Math.max(0, (x - 0.55) / 0.45);
        const wobble = 0.5 + 0.5 * Math.sin(now * 0.0021 * (1 + s) + s * 12) * Math.sin(now * 0.0013 * (1 + s * 0.5) + s * 5);
        let target =
          bass * (0.32 + 0.68 * kick * downbeat) +
          mids * (0.2 + 0.45 * wobble + 0.25 * snare) +
          highs * (0.1 + 0.34 * wobble * (0.4 + 0.6 * kick));
        target = 0.035 + Math.min(1, target) * 0.965 * energy;
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.5 : 0.12);
      }
    };

    const drawBars = (mini) => {
      ctx.clearRect(0, 0, width, height);
      const gap = mini ? 2 : Math.max(2, width / n / 3.2);
      const barWidth = (width - gap * (n - 1)) / n;
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, palette.a);
      gradient.addColorStop(1, palette.b);
      ctx.fillStyle = gradient;
      for (let i = 0; i < n; i += 1) {
        const h = Math.max(2, levels[i] * height * (mini ? 1 : 0.92));
        const x = i * (barWidth + gap);
        const r = Math.min(barWidth / 2, 3);
        ctx.globalAlpha = mini ? 0.95 : 0.35 + levels[i] * 0.65;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, height - h, barWidth, h, [r, r, 1, 1]);
        else ctx.rect(x, height - h, barWidth, h);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawRing = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const inner = Math.min(width, height) * 0.36;
      const reach = Math.min(width, height) * 0.13;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2, (Math.PI * 2 * inner) / n / 2.2);
      for (let i = 0; i < n; i += 1) {
        // Mirror the spectrum so the ring is symmetrical.
        const level = levels[i < n / 2 ? i : n - 1 - i];
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r2 = inner + 4 + level * reach;
        ctx.strokeStyle = i % 2 ? palette.a : palette.b;
        ctx.globalAlpha = 0.25 + level * 0.75;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      if (variant === "ring") drawRing();
      else drawBars(variant === "mini");
    };

    const loop = (now) => {
      if (now - paletteAt > 1500) {
        palette = colors();
        paletteAt = now;
      }
      compute(now);
      draw();
      frame = requestAnimationFrame(loop);
    };

    if (still) {
      energy = info.current.playing ? 0.6 : 0.1;
      compute(0);
      draw();
    } else frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
    };
  }, [variant, count]);

  return <canvas ref={canvas} className={`uv-viz uv-viz--${variant} ${className}`} aria-hidden="true" />;
}
