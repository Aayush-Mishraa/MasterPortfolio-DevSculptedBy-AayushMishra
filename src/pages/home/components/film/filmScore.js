/*
  The score for "Signed Off": composed to the cut at 120 BPM (a beat is half a
  second, and the scenes land on beats), synthesised live with the Web Audio
  API, so the film loads no audio files.

  slate    projector hiss, then the clapper
  night    a clock ticks at 23:59 over a low drone; glass notes as tests pass
  bug      the drone cuts out. Suspense strings, a heartbeat, a riser
  hunter   a braam and an impact, then the groove: A minor, Am-F-C-G
  log      hats come in; a keystroke per character, a blip per real fix
  site     the kick drops; a whip-pan per cut, a chime per live check
  arsenal  a pluck per tool, up the scale, into a tom fill
  proof    an impact and an odometer roll per number
  verdict  silence, a swell as the dots gather, then the release resolves
           to A major: a stamp, a bell chord, a shimmer

  Built to be heard on laptop and phone speakers: every low sound carries
  harmonics a small speaker can reproduce, and the mix runs through a glue
  compressor and a limiter. On iOS the page asks for a "playback" audio
  session, so the ringer switch doesn't silence the film.

  This file has no imports: the QA harness renders it offline.
*/

const BPM = 120;
const BEAT = 60 / BPM;
const LEVEL = 0.8;
const LOOKAHEAD = 0.12;
const STORAGE_KEY = "portfolio:film-sound";

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Am - F - C - G, a bar (two seconds) each, from the braam on.
const PROGRESSION = [
  { root: 45, pad: [57, 60, 64] },
  { root: 41, pad: [53, 57, 60] },
  { root: 48, pad: [55, 60, 64] },
  { root: 43, pad: [55, 59, 62] },
];
const BASS_STEPS = [0, 0, 12, 0, 0, 7, 12, 0];
const PENTATONIC = [81, 84, 86, 88, 91, 93];
const MINOR_SCALE = [69, 71, 72, 74, 76, 77, 79, 81];
const BELLS = [69, 73, 76, 81, 85];

/* ------------------------------------------------------------------ */
/* Preference and iOS audio session                                    */
/* ------------------------------------------------------------------ */

export function readFilmSound() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch (error) {
    return true;
  }
}

export function saveFilmSound(on) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch (error) {
    // Private mode: the choice just isn't remembered.
  }
}

let shared = null;
let keepAlive = null;

function context() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!shared) {
    try {
      shared = new AudioContextClass({ latencyHint: "interactive" });
    } catch (error) {
      return null;
    }
  }
  return shared;
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// A tenth of a second of silence as a WAV, for the iOS session trick below.
function silentWav() {
  const samples = 800;
  const view = new DataView(new ArrayBuffer(44 + samples));
  const text = (offset, value) => value.split("").forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([view], { type: "audio/wav" }));
}

// Called from the click that starts the film: resuming the context inside a
// real user gesture is what lets Safari play the score. On iOS the page also
// asks for a playback session (iOS 16.4+), and older iOS gets the same effect
// from a looping silent <audio> element, so the ringer switch can't mute it.
export function unlockFilmScore() {
  const ctx = context();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch (error) {
    // Not supported: the <audio> element below covers it.
  }
  if (isIOS() && typeof Audio !== "undefined") {
    if (!keepAlive) {
      keepAlive = new Audio(silentWav());
      keepAlive.loop = true;
      keepAlive.setAttribute("playsinline", "");
      keepAlive.setAttribute("x-webkit-airplay", "deny");
    }
    keepAlive.play().catch(() => {});
  }
}

function releaseSession() {
  if (keepAlive) keepAlive.pause();
}

/* ------------------------------------------------------------------ */
/* Engine: the instruments and the master chain                        */
/* ------------------------------------------------------------------ */

function pinkNoise(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function whiteNoise(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A hall: stereo noise that decays and darkens, like air absorbing the highs.
function hall(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const pre = Math.floor(ctx.sampleRate * 0.02);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let smooth = 0;
    for (let i = pre; i < length; i++) {
      const progress = (i - pre) / (length - pre);
      const k = 1 - Math.exp((-2 * Math.PI * (9500 - 8000 * progress)) / ctx.sampleRate);
      smooth += (Math.random() * 2 - 1 - smooth) * k;
      data[i] = smooth * Math.pow(1 - progress, decay);
    }
  }
  return buffer;
}

const curves = new Map();
function saturation(amount) {
  if (!curves.has(amount)) {
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    curves.set(amount, curve);
  }
  return curves.get(amount);
}

function createEngine(ctx, output) {
  const pink = pinkNoise(ctx, 3);
  const white = whiteNoise(ctx, 2);
  const floor = 0.0001;

  // Master: clean the sub, add presence and air, glue, then limit.
  const input = ctx.createGain();
  const lowcut = ctx.createBiquadFilter();
  lowcut.type = "highpass";
  lowcut.frequency.value = 32;
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2600;
  presence.Q.value = 0.8;
  presence.gain.value = 2;
  const air = ctx.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = 9000;
  air.gain.value = 2.5;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.knee.value = 8;
  glue.ratio.value = 3;
  glue.attack.value = 0.006;
  glue.release.value = 0.22;
  const makeup = ctx.createGain();
  makeup.gain.value = 1.9;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2.5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.09;
  const master = ctx.createGain();
  master.gain.value = LEVEL;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;
  // Chained one by one: older Safari's connect() doesn't return its target.
  const chain = [input, lowcut, presence, air, glue, makeup, limiter, master, analyser, output];
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);

  // Sends: a hall, and a ping-pong echo on the dotted eighth.
  const reverb = ctx.createConvolver();
  reverb.buffer = hall(ctx, 3.4, 3);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.34;
  reverb.connect(reverbReturn);
  reverbReturn.connect(input);

  const echoIn = ctx.createGain();
  const left = ctx.createDelay(1);
  const right = ctx.createDelay(1);
  left.delayTime.value = BEAT * 0.75;
  right.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.36;
  const darken = ctx.createBiquadFilter();
  darken.type = "lowpass";
  darken.frequency.value = 3200;
  const merge = ctx.createChannelMerger(2);
  echoIn.connect(left);
  left.connect(right);
  right.connect(darken);
  darken.connect(feedback);
  feedback.connect(left);
  left.connect(merge, 0, 0);
  right.connect(merge, 0, 1);
  const echoReturn = ctx.createGain();
  echoReturn.gain.value = 0.55;
  merge.connect(echoReturn);
  echoReturn.connect(input);

  // Every voice plays into the current "take". A seek fades the take out and
  // starts a new one, so nothing hangs over from the scene you left.
  const newTake = () => {
    const take = { dry: ctx.createGain(), verb: ctx.createGain(), echo: ctx.createGain() };
    take.dry.connect(input);
    take.verb.connect(reverb);
    take.echo.connect(echoIn);
    return take;
  };
  let take = newTake();

  const route = (node, { pan = 0, verb = 0.2, echo = 0 } = {}) => {
    let out = node;
    if (ctx.createStereoPanner && pan) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(panner);
      out = panner;
    }
    out.connect(take.dry);
    const send = (amount, to) => {
      const gain = ctx.createGain();
      gain.gain.value = amount;
      out.connect(gain);
      gain.connect(to);
    };
    if (verb) send(verb, take.verb);
    if (echo) send(echo, take.echo);
    return out;
  };

  // Attack, decay to sustain, hold, release. Returns when it ends.
  const envelope = (param, when, { a = 0.005, peak = 1, d = 0.1, s = 0, hold = 0, r = 0.08 }) => {
    const top = Math.max(peak, floor * 2);
    param.setValueAtTime(floor, when);
    param.exponentialRampToValueAtTime(top, when + a);
    if (!s) {
      param.exponentialRampToValueAtTime(floor, when + a + d);
      return when + a + d;
    }
    const level = Math.max(top * s, floor * 2);
    param.exponentialRampToValueAtTime(level, when + a + d);
    param.setValueAtTime(level, when + a + d + hold);
    param.exponentialRampToValueAtTime(floor, when + a + d + hold + r);
    return when + a + d + hold + r;
  };

  const shaper = (amount) => {
    const node = ctx.createWaveShaper();
    node.curve = saturation(amount);
    node.oversample = "2x";
    return node;
  };

  const filter = (type, freq, q = 0.7) => {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = freq;
    node.Q.value = q;
    return node;
  };

  // One oscillator voice. `filter.to` sweeps a filter; `drive` adds harmonics.
  const voice = (when, o) => {
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, when);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, when + (o.glide || o.d || 0.1));
    if (o.detune) osc.detune.value = o.detune;
    let head = osc;
    if (o.drive) {
      const ws = shaper(o.drive);
      head.connect(ws);
      head = ws;
    }
    if (o.filter) {
      const f = filter(o.filter.type || "lowpass", o.filter.freq, o.filter.q);
      f.frequency.setValueAtTime(o.filter.freq, when);
      if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, when + (o.filter.time || 0.2));
      head.connect(f);
      head = f;
    }
    const gain = ctx.createGain();
    head.connect(gain);
    const end = envelope(gain.gain, when, o);
    route(gain, o);
    osc.start(when);
    osc.stop(end + 0.05);
  };

  // A burst of filtered noise; `to` sweeps the filter over the burst.
  const hiss = (when, o) => {
    const src = ctx.createBufferSource();
    src.buffer = o.white ? white : pink;
    src.loop = true;
    const f = filter(o.type || "bandpass", o.freq, o.q || 1);
    f.frequency.setValueAtTime(o.freq, when);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, when + (o.time || o.d || 0.2));
    src.connect(f);
    const gain = ctx.createGain();
    f.connect(gain);
    const end = envelope(gain.gain, when, o);
    if (ctx.createStereoPanner && o.panTo !== undefined) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(o.pan || 0, when);
      panner.pan.linearRampToValueAtTime(o.panTo, end);
      gain.connect(panner);
      route(panner, { verb: o.verb, echo: o.echo });
    } else {
      route(gain, o);
    }
    src.start(when, Math.random() * 1.5);
    src.stop(end + 0.05);
  };

  // A sustained bed: detuned saws through a filter, with an optional sweep.
  const bed = (when, notes, o) => {
    const release = o.r || 0.3;
    const f = filter("lowpass", o.cutoff || 800, o.q || 0.7);
    f.frequency.setValueAtTime(o.cutoff || 800, when);
    if (o.cutoffTo) f.frequency.exponentialRampToValueAtTime(o.cutoffTo, when + o.dur);
    let head = f;
    if (o.drive) {
      const ws = shaper(o.drive);
      f.connect(ws);
      head = ws;
    }
    if (o.tremolo) {
      const trem = ctx.createGain();
      trem.gain.value = 1 - o.tremolo / 2;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.tremoloRate || 7;
      const depth = ctx.createGain();
      depth.gain.value = o.tremolo / 2;
      lfo.connect(depth);
      depth.connect(trem.gain);
      head.connect(trem);
      head = trem;
      lfo.start(when);
      lfo.stop(when + o.dur + release + 0.1);
    }
    const gain = ctx.createGain();
    head.connect(gain);
    gain.gain.setValueAtTime(floor, when);
    gain.gain.exponentialRampToValueAtTime(o.peak, when + (o.a || 0.5));
    gain.gain.setValueAtTime(o.peak, when + Math.max(o.dur, o.a || 0.5));
    gain.gain.exponentialRampToValueAtTime(floor, when + Math.max(o.dur, o.a || 0.5) + release);
    route(gain, o);
    notes.forEach((note, i) => {
      [-1, 1].forEach((side) => {
        const osc = ctx.createOscillator();
        osc.type = o.wave || "sawtooth";
        osc.frequency.value = hz(note);
        osc.detune.value = side * (o.detune || 8) + i * 1.5;
        osc.connect(f);
        osc.start(when);
        osc.stop(when + Math.max(o.dur, o.a || 0.5) + release + 0.1);
      });
    });
  };

  const instruments = {
    room(when, dur = 1.5) {
      const src = ctx.createBufferSource();
      src.buffer = pink;
      src.loop = true;
      const f = filter("bandpass", 2400, 0.7);
      const flutter = ctx.createGain();
      flutter.gain.value = 0.75;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 24;
      const depth = ctx.createGain();
      depth.gain.value = 0.25;
      lfo.connect(depth);
      depth.connect(flutter.gain);
      const gain = ctx.createGain();
      src.connect(f);
      f.connect(flutter);
      flutter.connect(gain);
      gain.gain.setValueAtTime(floor, when);
      gain.gain.exponentialRampToValueAtTime(0.07, when + 0.3);
      gain.gain.setValueAtTime(0.07, when + dur - 0.3);
      gain.gain.exponentialRampToValueAtTime(floor, when + dur);
      route(gain, { verb: 0 });
      src.start(when);
      lfo.start(when);
      src.stop(when + dur + 0.05);
      lfo.stop(when + dur + 0.05);
    },
    clack(when) {
      hiss(when, { white: true, freq: 2600, q: 2, a: 0.001, peak: 1.1, d: 0.06, verb: 0.35 });
      hiss(when, { white: true, freq: 900, q: 1.2, a: 0.001, peak: 0.8, d: 0.11, verb: 0.3 });
      voice(when, { type: "triangle", freq: 190, to: 110, a: 0.001, peak: 0.7, d: 0.09, drive: 2, verb: 0.2 });
    },
    tick(when, low) {
      const freq = low ? 1760 : 2200;
      const pan = low ? 0.2 : -0.2;
      voice(when, { freq, a: 0.001, peak: 0.34, d: 0.045, pan, verb: 0.3 });
      voice(when, { type: "triangle", freq: freq / 2, a: 0.001, peak: 0.24, d: 0.03, pan });
      hiss(when, { white: true, type: "highpass", freq: 4000, a: 0.001, peak: 0.16, d: 0.012 });
    },
    drone(when, dur) {
      bed(when, [33, 45, 52], { dur, peak: 0.1, a: 1.1, r: 0.06, cutoff: 320, cutoffTo: 1500, drive: 2.6, verb: 0.3 });
    },
    sparkle(when, i) {
      const note = PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, i))];
      const pan = -0.7 + (i / (PENTATONIC.length - 1)) * 1.4;
      voice(when, { freq: hz(note), a: 0.002, peak: 0.12, d: 0.55, pan, verb: 0.35, echo: 0.3 });
      voice(when, { freq: hz(note) * 2, a: 0.002, peak: 0.03, d: 0.25, pan, echo: 0.2 });
    },
    glitch(when) {
      for (let i = 0; i < 7; i++) {
        const at = when + i * 0.028;
        if (i % 2) hiss(at, { white: true, freq: 2500, q: 3, a: 0.001, peak: 0.3, d: 0.02, pan: 0.5, verb: 0 });
        else voice(at, { type: "square", freq: 400 + ((i * 373) % 1200), a: 0.001, peak: 0.13, d: 0.02, pan: -0.5 });
      }
    },
    tension(when, dur) {
      bed(when, [57, 58, 64], {
        dur,
        peak: 0.075,
        a: dur * 0.7,
        r: 0.05,
        cutoff: 1300,
        tremolo: 0.7,
        tremoloRate: 7.5,
        verb: 0.45,
      });
    },
    heartbeat(when) {
      [0, 0.2].forEach((offset, i) => {
        const at = when + offset;
        const k = i ? 0.8 : 1;
        voice(at, { freq: 58, to: 44, a: 0.004, peak: 0.7 * k, d: 0.17, drive: 3.2, verb: 0.1 });
        voice(at, { type: "triangle", freq: 116, to: 88, a: 0.004, peak: 0.6 * k, d: 0.12, drive: 2.5 });
        hiss(at, { freq: 190, q: 1, a: 0.002, peak: 0.45 * k, d: 0.08, verb: 0.05 });
        hiss(at, { white: true, type: "highpass", freq: 2000, a: 0.001, peak: 0.15 * k, d: 0.004, verb: 0 });
      });
    },
    riser(when, dur) {
      hiss(when, { freq: 300, to: 7000, time: dur, q: 3, a: dur - 0.02, peak: 0.42, d: 0.03, verb: 0.2 });
      voice(when, {
        type: "sawtooth",
        freq: 110,
        to: 880,
        glide: dur,
        a: dur - 0.02,
        peak: 0.12,
        d: 0.03,
        filter: { freq: 2500 },
      });
      hiss(when, { white: true, type: "highpass", freq: 3000, a: dur - 0.01, peak: 0.2, d: 0.02, verb: 0.3 });
    },
    impact(when, size = 1) {
      voice(when, { freq: 66, to: 32, glide: 0.7, a: 0.002, peak: 0.6 * size, d: 0.8, drive: 2, verb: 0.2 });
      voice(when, {
        type: "triangle",
        freq: 150,
        to: 50,
        glide: 0.35,
        a: 0.002,
        peak: 0.9 * size,
        d: 0.36,
        drive: 3,
        verb: 0.3,
      });
      hiss(when, { freq: 320, q: 0.9, a: 0.002, peak: 0.55 * size, d: 0.22, verb: 0.35 });
      hiss(when, { white: true, type: "highpass", freq: 1800, a: 0.001, peak: 0.7 * size, d: 0.07, verb: 0.4 });
      hiss(when, { type: "lowpass", freq: 520, to: 70, time: 0.6, a: 0.003, peak: 0.45 * size, d: 0.6, verb: 0.45 });
    },
    hit(when) {
      instruments.impact(when, 0.45);
    },
    braam(when) {
      const out = ctx.createGain();
      const drive = shaper(3.2);
      const f = filter("lowpass", 140, 5);
      f.frequency.setValueAtTime(140, when);
      f.frequency.exponentialRampToValueAtTime(2600, when + 0.16);
      f.frequency.exponentialRampToValueAtTime(700, when + 1.6);
      f.frequency.exponentialRampToValueAtTime(220, when + 2.6);
      drive.connect(f);
      f.connect(out);
      out.gain.setValueAtTime(floor, when);
      out.gain.exponentialRampToValueAtTime(0.5, when + 0.03);
      out.gain.setValueAtTime(0.5, when + 0.45);
      out.gain.exponentialRampToValueAtTime(0.22, when + 1.2);
      out.gain.exponentialRampToValueAtTime(floor, when + 2.7);
      route(out, { verb: 0.35 });
      [33, 45, 52].forEach((note) => {
        ["sawtooth", "sawtooth", "square"].forEach((type, i) => {
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.value = hz(note);
          osc.detune.value = [-11, 11, 0][i];
          const g = ctx.createGain();
          g.gain.value = type === "square" ? 0.25 : 0.4;
          osc.connect(g);
          g.connect(drive);
          osc.start(when);
          osc.stop(when + 2.8);
        });
      });
      voice(when, { freq: 55, a: 0.02, peak: 0.45, d: 1.8, drive: 2 });
    },
    whoosh(when, dur = 0.5) {
      hiss(when, {
        freq: 350,
        to: 3600,
        time: dur * 0.65,
        q: 1.3,
        a: dur * 0.62,
        peak: 0.45,
        d: dur * 0.38,
        pan: -0.7,
        panTo: 0.7,
        verb: 0.3,
      });
    },
    whip(when) {
      hiss(when, {
        white: true,
        freq: 900,
        to: 6000,
        time: 0.18,
        q: 1.8,
        a: 0.12,
        peak: 0.5,
        d: 0.12,
        pan: -0.8,
        panTo: 0.8,
        verb: 0.15,
      });
    },
    key(when) {
      const pan = (Math.random() - 0.5) * 0.5;
      hiss(when, {
        white: true,
        freq: 3800 + Math.random() * 1200,
        q: 1.4,
        a: 0.001,
        peak: 0.26,
        d: 0.014,
        pan,
        verb: 0.08,
      });
      voice(when, { type: "triangle", freq: 1400 + Math.random() * 500, a: 0.001, peak: 0.06, d: 0.012, pan });
    },
    blip(when, i = 0) {
      const pan = i % 2 ? 0.4 : -0.4;
      voice(when, { freq: 1568, a: 0.002, peak: 0.14, d: 0.06, pan, echo: 0.15 });
      voice(when, { type: "square", freq: 3136, a: 0.001, peak: 0.025, d: 0.02, pan });
    },
    chime(when, status = "pass") {
      if (status === "fail") {
        voice(when, { type: "square", freq: 165, a: 0.004, peak: 0.12, d: 0.22, filter: { freq: 1200 } });
        return;
      }
      const [first, second] = status === "warn" ? [88, 87] : [88, 93];
      voice(when, {
        type: "triangle",
        freq: hz(first),
        a: 0.002,
        peak: 0.13,
        d: 0.28,
        pan: -0.25,
        echo: 0.22,
        verb: 0.2,
      });
      voice(when + 0.06, {
        type: "triangle",
        freq: hz(second),
        a: 0.002,
        peak: 0.13,
        d: 0.34,
        pan: 0.25,
        echo: 0.22,
        verb: 0.2,
      });
    },
    bass(when, { note, accent }) {
      const peak = accent ? 0.42 : 0.33;
      voice(when, {
        type: "sawtooth",
        freq: hz(note),
        a: 0.003,
        peak,
        d: 0.22,
        drive: 2.2,
        filter: { freq: 1900, to: 360, time: 0.18, q: 5 },
      });
      voice(when, { type: "square", freq: hz(note) / 2, a: 0.003, peak: peak * 0.2, d: 0.2, filter: { freq: 500 } });
    },
    pad(when, { notes, dur }) {
      bed(when, notes, {
        dur: Math.max(0.2, dur - 0.6),
        peak: 0.075,
        a: 0.6,
        r: 0.6,
        cutoff: 1400,
        detune: 9,
        verb: 0.45,
      });
    },
    hat(when, { open, level }) {
      const pan = Math.random() > 0.5 ? 0.25 : -0.25;
      hiss(when, {
        white: true,
        type: "highpass",
        freq: 8000,
        a: 0.001,
        peak: (open ? 0.1 : 0.13) * level,
        d: open ? 0.14 : 0.03,
        pan,
        verb: 0.05,
      });
    },
    kick(when) {
      voice(when, { freq: 160, to: 45, glide: 0.12, a: 0.002, peak: 0.85, d: 0.28, drive: 2.6 });
      hiss(when, { white: true, type: "highpass", freq: 3000, a: 0.001, peak: 0.4, d: 0.006, verb: 0 });
    },
    snare(when) {
      hiss(when, { white: true, freq: 2000, q: 0.8, a: 0.001, peak: 0.5, d: 0.16, verb: 0.28 });
      voice(when, { type: "triangle", freq: 200, to: 160, a: 0.001, peak: 0.36, d: 0.09 });
    },
    tom(when, i = 0) {
      const freq = [140, 115, 92][i % 3];
      voice(when, {
        freq,
        to: freq * 0.55,
        glide: 0.3,
        a: 0.002,
        peak: 0.7,
        d: 0.34,
        drive: 1.6,
        pan: -0.3 + i * 0.3,
        verb: 0.3,
      });
      hiss(when, { type: "lowpass", freq: 700, a: 0.001, peak: 0.24, d: 0.08 });
    },
    pluck(when, i = 0) {
      const note = MINOR_SCALE[i % MINOR_SCALE.length];
      const pan = i % 2 ? 0.35 : -0.35;
      voice(when, {
        type: "sawtooth",
        freq: hz(note),
        a: 0.002,
        peak: 0.24,
        d: 0.36,
        filter: { freq: 5200, to: 900, time: 0.24, q: 2 },
        pan,
        echo: 0.3,
        verb: 0.25,
      });
      voice(when, { freq: hz(note + 12), a: 0.002, peak: 0.07, d: 0.25, pan, echo: 0.2 });
    },
    // A trailer stab: a short, bright chord hit that lands with each number.
    stab(when, i = 0) {
      const chord = [
        [57, 60, 64, 69],
        [60, 64, 67, 72],
        [64, 67, 71, 76],
      ][i % 3];
      chord.forEach((note, n) => {
        voice(when, {
          type: "sawtooth",
          freq: hz(note),
          detune: n % 2 ? 9 : -9,
          a: 0.004,
          peak: 0.4,
          d: 0.75,
          filter: { freq: 3600, to: 800, time: 0.6, q: 1.2 },
          drive: 2.4,
          pan: -0.45 + n * 0.3,
          verb: 0.45,
        });
      });
      voice(when, { type: "square", freq: hz(chord[0] - 12), a: 0.004, peak: 0.12, d: 0.3, filter: { freq: 1400 } });
      voice(when, {
        type: "sawtooth",
        freq: hz(chord[3] + 12),
        a: 0.004,
        peak: 0.08,
        d: 0.35,
        filter: { freq: 5000, to: 1500, time: 0.3 },
      });
    },
    counter(when, dur = 0.6) {
      const clicks = 12;
      for (let i = 0; i < clicks; i++) {
        const at = when + dur * (1 - Math.pow(1 - i / clicks, 2));
        hiss(at, { white: true, freq: 3200, q: 2, a: 0.001, peak: 0.45, d: 0.012, pan: 0.15, verb: 0.05 });
        voice(at, { type: "triangle", freq: 2100, a: 0.001, peak: 0.09, d: 0.014, pan: 0.15 });
      }
    },
    swell(when, dur = 2.2) {
      hiss(when, { white: true, type: "highpass", freq: 2800, a: dur - 0.02, peak: 0.4, d: 0.04, verb: 0.35 });
      voice(when, { freq: 55, to: 110, glide: dur, a: dur - 0.05, peak: 0.22, d: 0.05, drive: 3 });
      [69, 73, 76, 81, 85, 88, 93].forEach((note, i, list) => {
        const at = when + dur * Math.pow(i / list.length, 0.7);
        voice(at, {
          type: "triangle",
          freq: hz(note),
          a: 0.002,
          peak: 0.1 + i * 0.014,
          d: 0.3,
          pan: -0.6 + i * 0.2,
          echo: 0.3,
        });
      });
    },
    chord(when) {
      BELLS.forEach((note, i) => {
        const at = when + i * 0.035;
        const pan = -0.5 + i * 0.25;
        voice(at, { freq: hz(note), a: 0.002, peak: 0.2, d: 3.6, pan, verb: 0.5, echo: 0.18 });
        voice(at, { freq: hz(note) * 2.76, a: 0.002, peak: 0.05, d: 0.9, pan, verb: 0.4 });
        voice(at, { freq: hz(note) * 5.4, a: 0.001, peak: 0.012, d: 0.3, pan });
      });
      bed(when, [45, 52, 57, 61, 64], { dur: 1.6, peak: 0.09, a: 0.3, r: 1.9, cutoff: 2200, detune: 7, verb: 0.55 });
      voice(when, { freq: 55, a: 0.01, peak: 0.35, d: 2.2, drive: 2.4 });
    },
    stamp(when) {
      instruments.impact(when, 0.85);
      voice(when, { freq: 92, to: 40, glide: 0.25, a: 0.002, peak: 0.6, d: 0.3, drive: 2.6 });
      hiss(when, { white: true, freq: 1200, q: 1, a: 0.001, peak: 0.65, d: 0.08, verb: 0.3 });
    },
  };

  return {
    analyser,
    play(name, when, arg) {
      if (instruments[name]) instruments[name](when, arg);
    },
    // Fade the current take out and start a fresh one.
    cut() {
      const old = take;
      const t = ctx.currentTime;
      [old.dry, old.verb, old.echo].forEach((node) => {
        node.gain.setValueAtTime(node.gain.value, t);
        node.gain.linearRampToValueAtTime(0, t + 0.06);
      });
      setTimeout(() => [old.dry, old.verb, old.echo].forEach((node) => node.disconnect()), 400);
      take = newTake();
    },
    level(value, time = 0.15) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(value * LEVEL, t + time);
    },
    disconnect() {
      master.disconnect();
      analyser.disconnect();
    },
  };
}

/* ------------------------------------------------------------------ */
/* The cue sheet                                                       */
/* ------------------------------------------------------------------ */

// Every sound in the film, in film seconds. `logRows`, `checks` and `tools`
// follow what's on screen, so a warning in the live audit sounds like one.
export function buildCueSheet({ logRows = 6, checks = [], tools = 7 } = {}) {
  const sheet = [];
  const add = (t, name, arg) => sheet.push({ t, name, arg });

  add(0, "room", 1.5);
  add(1.0, "clack");
  for (let i = 0; i < 6; i++) add(1.5 + i * BEAT, "tick", i % 2);
  add(1.5, "drone", 2.94);
  for (let i = 0; i < 6; i++) add(3.35 + i * 0.17, "sparkle", i);
  add(4.25, "glitch");
  add(4.5, "tension", 3.35);
  [5.0, 6.0, 6.75, 7.4].forEach((t) => add(t, "heartbeat"));
  add(6.9, "riser", 1.1);

  // The groove runs from the braam to the receipts, where it stops dead so
  // each number lands on its own (stop-time).
  const GROOVE_END = 23;
  add(8.0, "braam");
  add(8.0, "impact", 1);
  for (let bar = 0; bar < 8; bar++) {
    const start = 8 + bar * 2;
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const from = Math.max(start, 9);
    const to = Math.min(start + 2, GROOVE_END);
    if (to - from > 0.8) add(from, "pad", { notes: chord.pad, dur: to - from });
    BASS_STEPS.forEach((step, i) => {
      const t = start + i * 0.25;
      if (t >= 8.5 && t < GROOVE_END) add(t, "bass", { note: chord.root + step, accent: i % 4 === 0 });
    });
  }
  for (let i = 0; 11.5 + i * 0.125 < GROOVE_END; i++) {
    const t = 11.5 + i * 0.125;
    add(t, "hat", { open: i % 8 === 6, level: t < 15 ? 0.6 : 1 });
  }
  for (let t = 15; t < GROOVE_END; t += BEAT) add(t, "kick");
  for (let t = 19.5; t < GROOVE_END; t += 1) add(t, "snare");

  // The record: the Newman report, two tiles framed, a whip to the terminal,
  // the command typed, then a blip per real fix.
  add(11.2, "whoosh", 0.3);
  add(11.95, "blip", 0);
  add(12.25, "blip", 1);
  add(12.88, "whip");
  [13.05, 13.1, 13.16, 13.21, 13.27, 13.33].forEach((t) => add(t, "key"));
  for (let i = 0; i < logRows; i++) add(13.4 + i * 0.2, "blip", i);
  add(14.45, "hit");

  add(14.55, "whoosh", 0.45);
  add(15.0, "impact", 0.8);
  for (let i = 0; i < 10; i++) add(15.15 + i * 0.058 + (i % 3) * 0.01, "key");
  [16.6, 18.0, 19.0, 19.7].forEach((t) => add(t - 0.08, "whip"));
  (checks.length ? checks : new Array(11).fill({ status: "pass" })).forEach((item, i) =>
    add(15.6 + i * 0.4, "chime", item.status)
  );

  add(20.5, "impact", 0.6);
  for (let i = 0; i < tools; i++) add(20.55 + i * 0.34, "pluck", i);
  [22.55, 22.7, 22.85].forEach((t, i) => add(t, "tom", i));
  [23.05, 23.85, 24.65].forEach((t) => {
    add(t, "impact", 0.5);
    add(t, "counter", 0.6);
    add(t, "stab", Math.round((t - 23.05) / 0.8));
  });

  add(25.6, "swell", 2.2);
  add(27.85, "chord");
  add(28.25, "stamp");
  [28.6, 28.85, 29.1, 29.35].forEach((t, i) => add(t, "sparkle", 5 - i));

  return sheet.sort((a, b) => a.t - b.t);
}

/* ------------------------------------------------------------------ */
/* Live player                                                         */
/* ------------------------------------------------------------------ */

// Plays the cue sheet in step with the film clock: update(t) on every frame
// schedules what falls due in the next 120 ms, seek(t) jumps, and pausing
// freezes the audio clock itself, so nothing drifts.
export function createFilmScore({ muted = false, ...cues } = {}) {
  const ctx = context();
  if (!ctx) return null;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  const engine = createEngine(ctx, ctx.destination);
  const sheet = buildCueSheet(cues);
  let index = 0;
  let stopped = false;
  engine.level(muted ? 0 : 1, 0.01);

  return {
    analyser: engine.analyser,
    update(filmTime) {
      if (stopped || ctx.state !== "running") return;
      const horizon = filmTime + LOOKAHEAD;
      while (index < sheet.length && sheet[index].t <= horizon) {
        const cue = sheet[index++];
        // Anything more than a moment late (after a stall) is dropped.
        if (cue.t >= filmTime - 0.15) engine.play(cue.name, ctx.currentTime + Math.max(0, cue.t - filmTime), cue.arg);
      }
    },
    // Change a cue that hasn't played yet (the live fps check lands late).
    retune(t, name, arg) {
      const cue = sheet.find((item, i) => i >= index && item.name === name && Math.abs(item.t - t) < 0.01);
      if (cue) cue.arg = arg;
    },
    seek(filmTime) {
      engine.cut();
      index = sheet.findIndex((cue) => cue.t >= filmTime);
      if (index === -1) index = sheet.length;
    },
    pause() {
      if (ctx.state === "running") ctx.suspend().catch(() => {});
    },
    resume() {
      if (ctx.state !== "running") ctx.resume().catch(() => {});
    },
    setMuted(value) {
      engine.level(value ? 0 : 1);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      engine.level(0, 0.35);
      setTimeout(() => {
        engine.disconnect();
        releaseSession();
      }, 450);
    },
  };
}

// For QA: the whole score rendered offline, to measure its loudness.
export function renderFilmScore(cues, seconds = 31) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Offline(2, Math.ceil(44100 * seconds), 44100);
  const engine = createEngine(ctx, ctx.destination);
  buildCueSheet(cues).forEach((cue) => engine.play(cue.name, cue.t, cue.arg));
  return ctx.startRendering();
}
