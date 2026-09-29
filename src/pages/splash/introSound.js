/*
  Sound design for the intro, synthesised live with the Web Audio API, so there
  are no audio files to load. The palette is kept warm and minimal: pink noise
  (never raw white noise, which reads as hiss), soft attacks, bells voiced in
  the middle register, and everything in A major so the parts resolve into one
  another:

  power on   a soft swell of air and a low bloom; a wide pad fades in
  checks     a rising arpeggio (A, C#, E), one warm pluck per passing check,
             panned left where the log sits
  signature  a felt-tip stroke that follows the pen: louder with speed, a touch
             brighter on upstrokes and high strokes, panned with the pen
  tension    the pad opens up while the signature is written...
  pass       ...and resolves into a strummed A major bell chord: the intro's
             sonic logo
  handoff    a whoosh that pans up and left with the flying signature, then a
             soft "tock" as it locks into the header logo

  Every trigger takes an optional `when` (context time) so the whole score can
  also be rendered offline.
*/

const STORAGE_KEY = "portfolio:intro-sound";
const MASTER_LEVEL = 0.8;

const NOTE = {
  A1: 55,
  A2: 110,
  E3: 164.81,
  A3: 220,
  Cs4: 277.18,
  E4: 329.63,
  A4: 440,
  Cs5: 554.37,
  E5: 659.26,
  A5: 880,
  E6: 1318.51
};
const CHECK_NOTES = [NOTE.A4, NOTE.Cs5, NOTE.E5];
const CHORD = [NOTE.A4, NOTE.Cs5, NOTE.E5, NOTE.A5];
const LOG_PAN = -0.4;
const LOGO_PAN = -0.55;

let sharedContext = null;
let suspendTimer = null;
// Generated buffers are reused by every later intro at the same sample rate.
const bufferCache = new Map();

function cached(ctx, key, make) {
  const id = `${key}@${ctx.sampleRate}`;
  if (!bufferCache.has(id)) bufferCache.set(id, make(ctx));
  return bufferCache.get(id);
}

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedContext) {
    try {
      sharedContext = new AudioContextClass();
    } catch (error) {
      return null;
    }
  }
  return sharedContext;
}

// The header logo calls this from its click handler: resuming the context
// inside a real user gesture is what lets Safari play the intro's sound.
export function unlockIntroSound() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

export function readSoundPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch (error) {
    return true;
  }
}

function saveSoundPreference(on) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch (error) {
    // Private mode: the choice just isn't remembered.
  }
}

// Pink noise (Paul Kellet's filter): equal energy per octave, so it sounds
// like air rather than hiss. The tail is cross-faded into the head so the loop
// point doesn't click.
function pinkNoise(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const overlap = Math.floor(ctx.sampleRate * 0.25);
  const raw = new Float32Array(length + overlap);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    if (i < overlap) {
      // Equal-power blend of the spare tail into the start.
      const k = i / overlap;
      data[i] = raw[i] * Math.sin(k * Math.PI * 0.5) + raw[length + i] * Math.cos(k * Math.PI * 0.5);
    } else {
      data[i] = raw[i];
    }
  }
  return buffer;
}

// A room: decaying stereo noise that also darkens as it decays (a one-pole
// lowpass closing from ~9 kHz to ~1.5 kHz), like air absorbing the highs.
function impulseResponse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const preDelay = Math.floor(ctx.sampleRate * 0.015);
  const fade = Math.floor(length * 0.05);
  const step = Math.exp(-decay / (length - preDelay));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const coefficient = (hz) => 1 - Math.exp((-2 * Math.PI * hz) / ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let envelope = 1;
    let smoothed = 0;
    for (let i = preDelay; i < length; i++) {
      const progress = (i - preDelay) / (length - preDelay);
      smoothed += (Math.random() * 2 - 1 - smoothed) * coefficient(9000 - 7500 * progress);
      const tail = i > length - fade ? (length - i) / fade : 1;
      data[i] = smoothed * envelope * tail;
      envelope *= step;
    }
  }
  return buffer;
}

export function createIntroSound({ onChange, context } = {}) {
  const ctx = context || getContext();
  if (!ctx) return null;
  const offline = Boolean(context);
  clearTimeout(suspendTimer);

  let enabled = offline ? true : readSoundPreference();
  let quiet = false; // set once a skipped intro starts fast-forwarding
  let disposed = false;

  // Master chain: clear sub rumble, take the fizz off the top, gentle glue.
  const master = ctx.createGain();
  master.gain.value = 0;
  const rumble = ctx.createBiquadFilter();
  rumble.type = "highpass";
  rumble.frequency.value = 40;
  rumble.Q.value = 0.7;
  const air = ctx.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = 7000;
  air.gain.value = -4;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.knee.value = 18;
  glue.ratio.value = 2.5;
  glue.attack.value = 0.012;
  glue.release.value = 0.3;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.7;
  master.connect(rumble);
  rumble.connect(air);
  air.connect(glue);
  glue.connect(analyser);
  analyser.connect(ctx.destination);

  // One shared, dark room glues the palette together.
  const reverb = ctx.createConvolver();
  reverb.buffer = cached(ctx, "room-v2", (c) => impulseResponse(c, 2.2, 5));
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.32;
  reverb.connect(reverbReturn);
  reverbReturn.connect(master);

  const noise = cached(ctx, "pink", (c) => pinkNoise(c, 2));
  const spectrum = new Uint8Array(analyser.frequencyBinCount);
  const live = new Set();

  const running = () => offline || ctx.state === "running";
  const audible = () => !disposed && enabled && running();
  // One-shots are dropped (not queued) while the context is suspended, so
  // unmuting later doesn't release a burst of stale sounds.
  const canPlay = (evenWhenQuiet) => audible() && (evenWhenQuiet || !quiet);
  const at = (when) => (when !== undefined ? when : ctx.currentTime + 0.01);

  master.gain.setTargetAtTime(enabled ? MASTER_LEVEL : 0, ctx.currentTime, 0.05);

  function route(node, { pan = 0, panTo, send = 0, t = 0, span = 0 } = {}) {
    let tail = node;
    if (ctx.createStereoPanner && (pan || panTo !== undefined)) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, t);
      if (panTo !== undefined) panner.pan.linearRampToValueAtTime(panTo, t + span);
      node.connect(panner);
      tail = panner;
    }
    tail.connect(master);
    if (send) {
      const sendGain = ctx.createGain();
      sendGain.gain.value = send;
      tail.connect(sendGain);
      sendGain.connect(reverb);
    }
    return tail;
  }

  // Freeze a param at whatever value its automation has reached by time t.
  function hold(param, t, floor) {
    if (param.cancelAndHoldAtTime) {
      param.cancelAndHoldAtTime(t);
    } else {
      param.cancelScheduledValues(t);
      param.setValueAtTime(Math.max(param.value, floor), t);
    }
  }

  // Soft attack, natural exponential decay. Attacks stay at 4ms or longer so
  // nothing starts with a click.
  function envelope(param, t, peak, attack, release) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  function noiseSource(t) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.start(t, Math.random() * 1.5);
    return src;
  }

  // Filtered pink-noise gesture with an optional sweep and pan move.
  function breath(t, { from, to, q = 0.8, type = "bandpass", peak, attack, release, pan = 0, panTo, send = 0 }) {
    const src = noiseSource(t);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + attack + release);
    const gain = ctx.createGain();
    envelope(gain.gain, t, peak, attack, release);
    src.connect(filter);
    filter.connect(gain);
    route(gain, { pan, panTo, send, t, span: attack + release });
    src.stop(t + attack + release + 0.05);
  }

  // Additive bell/pluck: each partial has its own level and decay, the upper
  // ones dying first, so the strike is bright and the tail stays pure. A
  // slightly detuned twin of the fundamental adds a slow, warm shimmer.
  function bell(freq, t, { peak, decay, partials, pan = 0, send = 0, attack = 0.006 }) {
    const out = ctx.createGain();
    out.gain.value = peak;
    route(out, { pan, send, t });
    const voices = partials.concat([[1.0015, 0.35, 1]]);
    voices.forEach(([ratio, level, decayScale]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;
      const gain = ctx.createGain();
      envelope(gain.gain, t, level, attack, decay * decayScale);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + attack + decay * decayScale + 0.05);
    });
  }

  // Power on ---------------------------------------------------------------

  function powerOn(when) {
    if (!canPlay()) return;
    const t = at(when);
    // A low bloom rather than a thump: A1 with an octave so small speakers
    // still carry it, easing in over 80ms.
    const bloom = ctx.createGain();
    envelope(bloom.gain, t, 0.13, 0.08, 0.9);
    [[NOTE.A1, "sine", 1], [NOTE.A2, "triangle", 0.7]].forEach(([freq, type, level]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq * 0.94, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.25);
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(bloom);
      osc.start(t);
      osc.stop(t + 1.05);
    });
    route(bloom, { send: 0.25, t });
    // Rising air for the scan line.
    breath(t, { from: 300, to: 2400, q: 0.7, peak: 0.16, attack: 0.3, release: 0.45, send: 0.5 });
  }

  // Pad: A2 / E3 / A3 / C#4 / E4, detuned pairs spread across the stereo field.
  let pad = null;

  function padIn(when) {
    if (disposed || pad) return;
    const t = at(when);
    const level = ctx.createGain();
    // Linear, not exponential: an exponential fade from silence stays inaudible
    // for most of its length.
    level.gain.setValueAtTime(0.0001, t);
    level.gain.linearRampToValueAtTime(0.05, t + 1.2);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(480, t);
    filter.Q.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 90;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);

    const nodes = [lfo];
    [
      [NOTE.A2, "triangle", -6, -0.45, 0.16],
      [NOTE.A2, "sine", 6, 0.45, 0.2],
      [NOTE.E3, "sine", -4, -0.25, 0.18],
      [NOTE.A3, "sine", 4, 0.25, 0.16],
      [NOTE.Cs4, "sine", -3, 0.1, 0.1],
      [NOTE.E4, "sine", 3, -0.1, 0.06]
    ].forEach(([freq, type, detune, pan, gain]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const voice = ctx.createGain();
      voice.gain.value = gain;
      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        osc.connect(panner);
        panner.connect(voice);
      } else {
        osc.connect(voice);
      }
      voice.connect(filter);
      nodes.push(osc);
    });
    filter.connect(level);
    route(level, { send: 0.55, t });
    nodes.forEach((node) => {
      node.start(t);
      live.add(node);
    });
    pad = { level, filter, nodes };
  }

  function rampFilter(to, seconds, when) {
    if (!pad) return;
    const t = at(when);
    const param = pad.filter.frequency;
    hold(param, t, 40);
    param.exponentialRampToValueAtTime(to, t + seconds);
  }

  // The pad opens and swells while the signature is written...
  function tension(seconds, when) {
    if (!pad) return;
    const t = at(when);
    rampFilter(1500, seconds, t);
    hold(pad.level.gain, t, 0.0001);
    pad.level.gain.setTargetAtTime(0.065, t, seconds / 2);
  }

  function padOut(seconds, when) {
    if (!pad) return;
    const t = at(when);
    const param = pad.level.gain;
    hold(param, t, 0.0001);
    param.exponentialRampToValueAtTime(0.0001, t + seconds);
    pad.nodes.forEach((node) => {
      try {
        node.stop(t + seconds + 0.05);
      } catch (error) {
        // Already stopped.
      }
      live.delete(node);
    });
    pad = null;
  }

  // Checks -----------------------------------------------------------------

  // A warm, marimba-like pluck per check, rising A, C#, E.
  function check(index, when) {
    if (!canPlay()) return;
    const t = at(when);
    bell(CHECK_NOTES[index % CHECK_NOTES.length], t, {
      peak: 0.2,
      decay: 0.45,
      attack: 0.005,
      partials: [[1, 1, 1], [2, 0.22, 0.45], [3.99, 0.06, 0.25]],
      pan: LOG_PAN,
      send: 0.35
    });
  }

  // Pen --------------------------------------------------------------------

  // A soft pencil-on-paper stroke: pink noise shaped around 1.3-2 kHz with the
  // hiss above ~5 kHz rolled off, following the pen's speed, height and
  // position smoothly.
  let pen = null;

  function penDown(when) {
    if (disposed || pen) return;
    const t = at(when);
    const src = noiseSource(t);
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 650;
    highpass.Q.value = 0.5;
    const body = ctx.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = 1500;
    body.Q.value = 0.55;
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 4500;
    soften.Q.value = 0.5;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.0001, t);
    src.connect(highpass);
    highpass.connect(body);
    body.connect(soften);
    soften.connect(level);

    let panner = null;
    let tail = level;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      level.connect(panner);
      tail = panner;
    }
    tail.connect(master);
    const send = ctx.createGain();
    send.gain.value = 0.18;
    tail.connect(send);
    send.connect(reverb);

    live.add(src);
    pen = { src, body, soften, level, panner };
  }

  // speed 0-1, height 0 (baseline) to 1 (top), pan -1 (left) to 1 (right).
  function penMove(speed, height, rising, pan, when) {
    if (!pen) return;
    const t = at(when);
    const s = Math.max(0, Math.min(1, speed));
    // Slow-ish time constants keep the texture smooth instead of choppy.
    pen.level.gain.setTargetAtTime(quiet ? 0.0001 : 0.04 + s * 0.28, t, 0.05);
    pen.body.frequency.setTargetAtTime(1250 + height * 600 + (rising ? 200 : 0), t, 0.08);
    pen.soften.frequency.setTargetAtTime(3800 + s * 1400, t, 0.08);
    if (pen.panner) pen.panner.pan.setTargetAtTime(pan * 0.6, t, 0.08);
  }

  function penUp(when) {
    if (!pen) return;
    const t = at(when);
    hold(pen.level.gain, t, 0.0001);
    pen.level.gain.setTargetAtTime(0.0001, t, 0.06);
    try {
      pen.src.stop(t + 0.5);
    } catch (error) {
      // Already stopped.
    }
    live.delete(pen.src);
    pen = null;
  }

  // The pen leaving the paper: a small airy release.
  function lift(pan, when) {
    if (!canPlay()) return;
    const t = at(when);
    breath(t, { from: 900, to: 2600, q: 0.7, peak: 0.06, attack: 0.03, release: 0.3, pan: pan * 0.6, send: 0.5 });
  }

  // Pass: the sonic logo ----------------------------------------------------

  function pass(when) {
    if (!canPlay()) return;
    const t = at(when);
    CHORD.forEach((freq, i) =>
      bell(freq, t + i * 0.06, {
        peak: 0.13 - i * 0.012,
        decay: 2.4,
        attack: 0.006,
        partials: [[1, 1, 1], [2, 0.3, 0.55], [3, 0.12, 0.35], [4.2, 0.05, 0.2]],
        pan: (i - 1.5) * 0.22,
        send: 0.6
      })
    );
    // A light low A under the chord for weight, well short of a boom.
    bell(NOTE.A2, t, { peak: 0.09, decay: 1.2, attack: 0.02, partials: [[1, 1, 1], [2, 0.4, 0.6]] });
    // ...and the pad settles back down.
    if (pad) {
      rampFilter(700, 1.2, t);
      hold(pad.level.gain, t, 0.0001);
      pad.level.gain.setTargetAtTime(0.045, t, 0.4);
    }
  }

  // Handoff ----------------------------------------------------------------

  function whoosh(seconds, when) {
    if (!canPlay(true)) return;
    const t = at(when);
    const src = noiseSource(t);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.7;
    band.frequency.setValueAtTime(280, t);
    band.frequency.exponentialRampToValueAtTime(1800, t + seconds * 0.55);
    band.frequency.exponentialRampToValueAtTime(500, t + seconds);
    const gain = ctx.createGain();
    // Peaks mid-flight, where the signature moves fastest.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1.1, t + seconds * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    src.connect(band);
    band.connect(gain);
    route(gain, { pan: 0.1, panTo: LOGO_PAN, span: seconds, send: 0.35, t });
    src.stop(t + seconds + 0.05);
  }

  // The signature locking into the header logo: a soft wooden tock and a
  // quiet A to close on the key.
  function land(when) {
    if (!canPlay(true)) return;
    const t = at(when);
    const tock = ctx.createOscillator();
    tock.type = "sine";
    tock.frequency.setValueAtTime(420, t);
    tock.frequency.exponentialRampToValueAtTime(220, t + 0.06);
    const gain = ctx.createGain();
    envelope(gain.gain, t, 0.16, 0.004, 0.14);
    tock.connect(gain);
    route(gain, { pan: LOGO_PAN, t });
    tock.start(t);
    tock.stop(t + 0.2);
    bell(NOTE.A5, t + 0.01, { peak: 0.05, decay: 0.8, partials: [[1, 1, 1], [2, 0.15, 0.4]], pan: LOGO_PAN, send: 0.6 });
  }

  // Skip: a quick soft rise to acknowledge it, then the fast-forward is quiet.
  function skipped(when) {
    if (canPlay(true)) {
      breath(at(when), { from: 500, to: 2400, q: 0.7, peak: 0.08, attack: 0.04, release: 0.16, send: 0.3 });
    }
    quiet = true;
    penUp(when);
  }

  // Controls ---------------------------------------------------------------

  function confirmOn() {
    const t = at();
    bell(NOTE.A5, t, { peak: 0.07, decay: 0.35, partials: [[1, 1, 1], [2, 0.2, 0.5]], send: 0.4 });
    bell(NOTE.E6, t + 0.08, { peak: 0.05, decay: 0.45, partials: [[1, 1, 1], [2, 0.15, 0.5]], send: 0.4 });
  }

  function setEnabled(on) {
    enabled = on;
    saveSoundPreference(on);
    master.gain.setTargetAtTime(on ? MASTER_LEVEL : 0, ctx.currentTime, 0.05);
    if (on) {
      if (running()) confirmOn();
      else
        ctx.resume()
          .then(() => {
            if (enabled && !disposed) confirmOn();
          })
          .catch(() => {});
    }
    if (onChange) onChange();
  }

  // Four bands for the equaliser bars: pad, body, pen, air.
  function readLevels(target) {
    if (!audible()) {
      target.fill(0);
      return target;
    }
    analyser.getByteFrequencyData(spectrum);
    const bins = [0, 1, 2, 4];
    for (let i = 0; i < target.length; i++) target[i] = spectrum[bins[i]] / 255;
    return target;
  }

  const onState = () => {
    if (onChange) onChange();
  };
  if (!offline) {
    if (ctx.addEventListener) ctx.addEventListener("statechange", onState);
    // Works when the page already has user activation; otherwise the sound
    // toggle stays available to turn it on.
    if (enabled && ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  function dispose() {
    if (disposed) return;
    padOut(0.8);
    penUp();
    disposed = true;
    if (!offline && ctx.removeEventListener) ctx.removeEventListener("statechange", onState);
    const t = ctx.currentTime;
    // Let the chord and the landing ring out before going silent.
    master.gain.setTargetAtTime(0, t + 1.6, 0.15);
    live.forEach((node) => {
      try {
        node.stop(t + 2.2);
      } catch (error) {
        // Already stopped.
      }
    });
    if (offline) return;
    setTimeout(() => {
      try {
        master.disconnect();
        reverbReturn.disconnect();
      } catch (error) {
        // Already disconnected.
      }
    }, 2600);
    clearTimeout(suspendTimer);
    suspendTimer = setTimeout(() => {
      if (ctx.state === "running") ctx.suspend().catch(() => {});
    }, 2800);
  }

  return {
    powerOn,
    padIn,
    tension,
    padOut,
    check,
    penDown,
    penMove,
    penUp,
    lift,
    pass,
    whoosh,
    land,
    skipped,
    setEnabled,
    isAudible: audible,
    readLevels,
    dispose
  };
}
