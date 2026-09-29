import React, { useLayoutEffect, useRef, useState } from "react";
import { EASE, gsap, prefersReducedMotion } from "../../lib/motion";
import { createFilmCanvas } from "./filmCanvas";
import { createFilmScore, readFilmSound, saveFilmSound } from "./filmScore";
import { fpsCheck, fpsFrom, runAudit } from "./liveAudit";
import { Arsenal, Bug, Hunter, Log, Night, Proof, Site, Slate, Verdict } from "./Scenes";
import { buildTimeline } from "./timeline";
import {
  LOG,
  PROFILE,
  RUNTIME,
  SCENES,
  SHOTS,
  TOOLS,
  clamp,
  narration,
  pad,
  sceneAt,
  sceneLength,
  shotEnd,
  timecode,
} from "./script";
import "./Film.css";

/*
  "Signed Off": the 30-second brief as a 30-second film, played before the
  brief card. A release-night thriller in nine scenes, every frame of it real:

    slate    the clapper snaps, the letterbox opens
    night    23:59, a dot per test case, a wave of passes; one dot stays red
    bug      rack focus on the bug, silence, a heartbeat
    hunter   hard cut on a braam: the engineer, rim-lit, "starring"
    log      the record: a real Newman run, then real fix commits
    site     tonight's release is this website: real footage of its pages,
             and a live audit of this very page, run in the visitor's browser
    arsenal  the toolkit, one tool per beat
    proof    the receipts, counted up in stop-time
    verdict  the dots gather into SIGNED OFF; the bug, fixed, becomes its
             full stop

  The player bar is a test run: each scene is an it() block that passes as
  it plays, and the film ends on "9 passing". Then it hands off to the brief.

  Pictures, sound and clips all follow one clock: the GSAP timeline. The
  canvas draws what the timeline's state says, the score schedules what falls
  due, and the clips seek to the timeline, so pause, seek and replay are exact.
*/

const HOLD_MS = 1600;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const AUDIT_AT = 15.6;
const AUDIT_STEP = 0.4;
const EQ_BARS = 5;

export default function SignedOffFilm({ onLeave, onGone, onAudit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const timecodeRef = useRef(null);
  const eqRef = useRef(null);
  const apiRef = useRef(null);
  const sceneRef = useRef(0);
  const mutedRef = useRef(!readFilmSound());
  const handlers = useRef({ onLeave, onGone, onAudit });
  handlers.current = { onLeave, onGone, onAudit };

  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(mutedRef.current);
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState(true);
  const [audit, setAudit] = useState(() => runAudit(0));
  const auditRef = useRef(audit);
  auditRef.current = audit;
  const host = (typeof window !== "undefined" && window.location.host) || "aayushmishra.engineer";

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduced = prefersReducedMotion();
    const narrow = root.clientWidth < 720;
    const camera = createFilmCanvas(canvasRef.current, { reduced });
    const s = camera.state;
    const score = createFilmScore({
      muted: mutedRef.current,
      logRows: LOG.rows.length,
      checks: auditRef.current,
      tools: TOOLS.length,
    });
    const segments = Array.from(root.querySelectorAll(".sf-runner__seg"));
    const clips = Array.from(root.querySelectorAll("video[data-shot]")).map((el) => {
      const index = SHOTS.findIndex((shot) => shot.id === el.dataset.shot);
      return { el, start: SHOTS[index].at, end: shotEnd(index) };
    });
    const stamps = [];
    let tl = null;
    let hold = null;
    let gone = null;
    let frame = 0;
    let measured = false;
    let leavingNow = false;

    const isPlaying = () => !tl.paused() && tl.progress() < 1;

    // The clips follow the timeline: right frame, right state, after any seek.
    const syncClips = (t) => {
      clips.forEach(({ el, start, end }) => {
        if (t >= start && t < end) {
          const want = t - start;
          if (Math.abs(el.currentTime - want) > 0.25) {
            try {
              el.currentTime = want;
            } catch (error) {
              // Not seekable yet: it starts from the top.
            }
          }
          if (isPlaying() && el.paused) el.play().catch(() => {});
          if (!isPlaying() && !el.paused) el.pause();
        } else if (!el.paused) {
          el.pause();
        }
      });
    };

    // The last audit check is this film's own frame rate, measured live.
    const measureFps = (t) => {
      if (measured || t < AUDIT_AT - 0.7) return;
      measured = true;
      const recent = stamps.filter((stamp) => stamp > stamps[stamps.length - 1] - 2000);
      const check = fpsCheck(fpsFrom(recent));
      const index = auditRef.current.findIndex((item) => item.id === "fps");
      if (score && index !== -1) score.retune(AUDIT_AT + index * AUDIT_STEP, "chime", check.status);
      setAudit((checks) => checks.map((item) => (item.id === "fps" ? check : item)));
    };

    const refresh = () => {
      const t = tl.time();
      if (timecodeRef.current) timecodeRef.current.textContent = timecode(t);
      segments.forEach((el, i) => el.style.setProperty("--p", clamp((t - SCENES[i].at) / sceneLength(i)).toFixed(4)));
      const index = sceneAt(t);
      if (index !== sceneRef.current) {
        sceneRef.current = index;
        setScene(index);
      }
      syncClips(t);
      measureFps(t);
      if (score && isPlaying()) score.update(t);
    };

    const leave = () => {
      if (leavingNow) return;
      leavingNow = true;
      clearTimeout(hold);
      tl.pause();
      clips.forEach(({ el }) => el.pause());
      if (score) score.stop();
      setLeaving(true);
      handlers.current.onLeave();
      gone = setTimeout(() => handlers.current.onGone(), 650);
    };

    const gctx = gsap.context(() => {
      tl = gsap.timeline({
        paused: true,
        defaults: { ease: EASE },
        onUpdate: refresh,
        onComplete: () => {
          setDone(true);
          setPlaying(false);
          hold = setTimeout(leave, HOLD_MS);
        },
      });
      buildTimeline(tl, { root, s, reduced, narrow, host });
    }, root);

    const play = () => {
      clearTimeout(hold);
      setDone(false);
      if (tl.progress() >= 1) {
        tl.seek(0);
        if (score) score.seek(0);
      }
      if (score) score.resume();
      tl.play();
      setPlaying(true);
    };
    const pause = () => {
      tl.pause();
      setPlaying(false);
      if (score) score.pause();
      refresh();
    };
    const toggle = () => (tl.paused() || tl.progress() >= 1 ? play() : pause());
    const seekScene = (target) => {
      const i = Math.max(0, Math.min(SCENES.length - 1, target));
      const wasPaused = tl.paused() && tl.progress() < 1;
      clearTimeout(hold);
      setDone(false);
      const t = SCENES[i].at + 0.02;
      tl.seek(t);
      if (score) score.seek(t);
      if (wasPaused) {
        refresh();
        return;
      }
      if (score) score.resume();
      tl.play();
      setPlaying(true);
      refresh();
    };
    const setMute = (value) => {
      mutedRef.current = value;
      setMuted(value);
      saveFilmSound(!value);
      if (score) score.setMuted(value);
    };
    apiRef.current = { toggle, seekScene, leave, setMute, replay: play };

    // The film is its own modal on top of the brief: it takes the keys first.
    const onKey = (event) => {
      if (leavingNow) return;
      const key = event.key;
      const onButton = event.target && event.target.tagName === "BUTTON";
      if (key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        leave();
      } else if (key === "Tab") {
        event.stopPropagation();
        const items = Array.from(root.querySelectorAll(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if ((key === " " && !onButton) || key === "k" || key === "K") {
        event.preventDefault();
        toggle();
      } else if (key === "m" || key === "M") {
        setMute(!mutedRef.current);
      } else if (key === "ArrowRight") {
        event.preventDefault();
        seekScene(sceneRef.current + 1);
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        seekScene(tl.time() - SCENES[sceneRef.current].at > 1 ? sceneRef.current : sceneRef.current - 1);
      }
    };
    const onVisibility = () => {
      if (document.hidden && isPlaying()) pause();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVisibility);

    // Frame stamps for the fps check, and the sound meter in the top bar.
    const bars = eqRef.current ? Array.from(eqRef.current.children) : [];
    const bins = score && score.analyser ? new Uint8Array(score.analyser.frequencyBinCount) : null;
    const loop = (now) => {
      stamps.push(now);
      if (stamps.length > 240) stamps.shift();
      if (bins && bars.length) {
        score.analyser.getByteFrequencyData(bins);
        bars.forEach((bar, i) => {
          const from = Math.floor(Math.pow(i / EQ_BARS, 1.6) * bins.length * 0.6);
          const to = Math.max(from + 1, Math.floor(Math.pow((i + 1) / EQ_BARS, 1.6) * bins.length * 0.6));
          let peak = 0;
          for (let b = from; b < to; b++) peak = Math.max(peak, bins[b]);
          bar.style.transform = `scaleY(${Math.max(0.12, peak / 255).toFixed(3)})`;
        });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const toastTimer = setTimeout(() => setToast(false), 2600);

    root.focus({ preventScroll: true });
    tl.play(0);
    refresh();

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(frame);
      clearTimeout(hold);
      clearTimeout(gone);
      clearTimeout(toastTimer);
      clips.forEach(({ el }) => el.pause());
      gctx.revert();
      camera.destroy();
      if (score) score.stop();
    };
    // The film is built once per mount; the brief remounts it to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The brief shows the same live audit.
  useLayoutEffect(() => {
    if (handlers.current.onAudit) handlers.current.onAudit(audit);
  }, [audit]);

  const api = (name, arg) => () => apiRef.current && apiRef.current[name](arg);
  const current = SCENES[scene];
  const lines = narration({ audit });

  return (
    <div
      className={`sf${leaving ? " sf--leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Signed Off: a 30-second film about ${PROFILE.name}. Press Escape to skip to the brief.`}
      ref={rootRef}
      tabIndex={-1}
      data-lenis-prevent
    >
      <div className="sf-frame">
        <canvas className="sf-canvas" ref={canvasRef} aria-hidden="true" />
        <Slate />
        <Night />
        <Bug />
        <Hunter />
        <Log />
        <Site audit={audit} host={host} />
        <Arsenal />
        <Proof />
        <Verdict />
        <span className="sf-flare" aria-hidden="true" />
        <span className="sf-leak" aria-hidden="true" />
        <span className="sf-flash" aria-hidden="true" />
        <span className="sf-vignette" aria-hidden="true" />
        <span className="sf-grain" aria-hidden="true" />
      </div>

      <p className="sf-sr" aria-live="polite">
        {lines[scene]}
      </p>

      <header className="sf-hud">
        <span className="sf-hud__brand">
          <i aria-hidden="true" />
          Signed Off
          <em>a film in 30 seconds</em>
        </span>
        <span className="sf-hud__scene">
          SC {pad(scene + 1)} / {pad(SCENES.length)} · {current.title}
        </span>
        <span className={`sf-eq${muted ? " is-muted" : ""}`} ref={eqRef} aria-hidden="true">
          {Array.from({ length: EQ_BARS }, (_, i) => (
            <i key={i} />
          ))}
        </span>
        <span className="sf-hud__tc" ref={timecodeRef}>
          00:00:00:00
        </span>
      </header>

      <p className={`sf-toast${toast ? " is-on" : ""}`} aria-hidden="true">
        <i className={`fa-solid ${muted ? "fa-volume-xmark" : "fa-headphones"}`} />
        {muted ? "Sound is off · press M" : "Sound on · best with headphones"}
      </p>

      <footer className="sf-controls">
        <div className="sf-controls__buttons">
          <button
            type="button"
            className="sf-btn"
            onClick={done ? api("replay") : api("toggle")}
            aria-label={done ? "Replay the film" : playing ? "Pause" : "Play"}
          >
            <i
              className={`fa-solid ${done ? "fa-rotate-left" : playing ? "fa-pause" : "fa-play"}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="sf-btn"
            onClick={api("setMute", !muted)}
            aria-label={muted ? "Turn sound on" : "Mute"}
            aria-pressed={muted}
          >
            <i className={`fa-solid ${muted ? "fa-volume-xmark" : "fa-volume-high"}`} aria-hidden="true" />
          </button>
        </div>

        <div className="sf-runner">
          <p className="sf-runner__line">
            {done ? (
              <span className="sf-runner__pass">
                <i className="fa-solid fa-check" aria-hidden="true" /> {SCENES.length} passing ({RUNTIME}s)
                <em> · opening the brief</em>
              </span>
            ) : (
              <>
                <span className="sf-runner__describe">describe(&apos;{PROFILE.name}&apos;)</span>
                <span className="sf-runner__it">
                  <i className={playing ? "is-running" : ""} aria-hidden="true" />
                  it(&apos;{current.spec}&apos;)
                </span>
              </>
            )}
          </p>
          <div className="sf-runner__track">
            {SCENES.map((item, i) => (
              <button
                type="button"
                key={item.id}
                className={`sf-runner__seg${i < scene || done ? " is-done" : ""}${
                  i === scene && !done ? " is-now" : ""
                }`}
                style={{ flexGrow: sceneLength(i) }}
                onClick={api("seekScene", i)}
                aria-label={`Scene ${i + 1}: ${item.title}`}
              />
            ))}
          </div>
        </div>

        <button type="button" className="sf-skip" onClick={api("leave")}>
          Skip to brief <i className="fa-solid fa-forward" aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
