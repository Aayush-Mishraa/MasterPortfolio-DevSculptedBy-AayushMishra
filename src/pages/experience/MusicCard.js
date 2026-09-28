import React, { useEffect, useRef, useState } from "react";

// 30-second previews from the public iTunes Lookup API (no key needed, CORS enabled).
// Track IDs are pinned so we always get the original, non-explicit recordings.
const PLAYLIST_IDS = [
  1499378607, // Blinding Lights — The Weeknd
  1538003843, // Levitating — Dua Lipa
  1193701392, // Shape of You — Ed Sheeran
  1122773680, // Viva La Vida — Coldplay
  1411628233, // Believer — Imagine Dragons
  1471704175, // Counting Stars — OneRepublic
  1445949267, // Sunflower — Post Malone & Swae Lee
  943946671, // Uptown Funk — Mark Ronson ft. Bruno Mars
  1207120448, // Something Just Like This — The Chainsmokers & Coldplay
  1615585008, // As It Was — Harry Styles
  1193701400, // Perfect — Ed Sheeran
];

const LOOKUP_URL = `https://itunes.apple.com/lookup?id=${PLAYLIST_IDS.join(",")}&entity=song`;
const STORAGE_KEY = "xp-music-track";

const readStored = () => {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
  } catch (e) {
    return 0;
  }
};

const store = (i) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(i));
  } catch (e) {
    // storage unavailable (private mode) — not important
  }
};

const cleanTitle = (name) => name.replace(/\s*\((feat\.|Spider-Man)[^)]*\)/i, "");

const clock = (s) => `0:${String(Math.floor(s || 0)).padStart(2, "0")}`;

const MusicCard = ({ role }) => {
  const audioRef = useRef(null);
  const pendingRef = useRef(null);
  const [tracks, setTracks] = useState(null);
  const [index, setIndex] = useState(readStored);
  const [status, setStatus] = useState("idle"); // idle | loading | playing | paused | error
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(30);

  // one shared <audio> element for the card's lifetime
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = 0.6;
    audioRef.current = audio;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 30);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.src = "";
    };
  }, []);

  // one lookup request for the whole playlist, shared by warm-up and click
  const loadTracks = () => {
    if (tracks) return Promise.resolve(tracks);
    if (!pendingRef.current) {
      pendingRef.current = fetch(LOOKUP_URL)
        .then((res) => {
          if (!res.ok) throw new Error("lookup failed");
          return res.json();
        })
        .then((data) => {
          const byId = {};
          data.results.forEach((r) => {
            if (r.kind === "song" && r.previewUrl) byId[r.trackId] = r;
          });
          const ordered = PLAYLIST_IDS.map((id) => byId[id]).filter(Boolean);
          if (!ordered.length) throw new Error("no previews");
          setTracks(ordered);
          return ordered;
        })
        .catch((err) => {
          pendingRef.current = null; // allow a retry on the next click
          throw err;
        });
    }
    return pendingRef.current;
  };

  // warm up on hover/focus so the first click only waits for the audio itself
  const warmUp = () => {
    if (status !== "idle") return;
    loadTracks()
      .then((list) => {
        const audio = audioRef.current;
        const first = list[index % list.length];
        if (audio && !audio.src && first) {
          audio.preload = "auto";
          audio.src = first.previewUrl;
        }
      })
      .catch(() => {});
  };

  const playAt = async (i) => {
    const audio = audioRef.current;
    setStatus("loading");
    try {
      const list = await loadTracks();
      const next = ((i % list.length) + list.length) % list.length;
      setIndex(next);
      store(next);
      if (audio.src !== list[next].previewUrl) {
        audio.src = list[next].previewUrl;
        setTime(0);
      }
      await audio.play();
      setStatus("playing");
    } catch (e) {
      setStatus("error");
    }
  };

  // auto-advance when a preview finishes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onEnded = () => playAt(index + 1);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  });

  const toggle = () => {
    const audio = audioRef.current;
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
    } else if (status === "paused") {
      audio.play().then(() => setStatus("playing")).catch(() => setStatus("error"));
    } else {
      playAt(index);
    }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * (duration || 30);
  };

  const track = tracks && tracks[index];
  const active = track && status !== "idle" && status !== "error";
  const playing = status === "playing";

  return (
    <div
      className={`xp-now xp-music ${active ? "is-active" : ""} ${playing ? "is-playing" : ""}`}
      onPointerEnter={warmUp}
      onFocus={warmUp}
    >
      <button
        type="button"
        className="xp-music__main"
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play a 30-second song preview"}
      >
        <span className={`xp-now__logo xp-music__art ${active ? "is-disc" : ""}`}>
          {active ? (
            <img src={track.artworkUrl100} alt="" />
          ) : role && role.logo ? (
            <img src={role.logo} alt="" />
          ) : null}
          <span className="xp-music__icon" aria-hidden="true">
            <i className={`fa-solid ${status === "loading" ? "fa-spinner fa-spin" : playing ? "fa-pause" : "fa-play"}`} />
          </span>
        </span>

        <span className="xp-now__text">
          {active ? (
            <>
              <span className="xp-mono">{playing ? "now playing" : "paused"} · preview</span>
              <strong>{cleanTitle(track.trackName)}</strong>
              <span>{track.artistName}</span>
            </>
          ) : (
            <>
              <span className="xp-mono">now running {status === "error" ? "· music unavailable" : "· tap for music"}</span>
              <strong>{role ? role.title : "Now playing"}</strong>
              <span>{role ? role.company : ""}</span>
            </>
          )}
        </span>

        <span className="xp-now__eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>

      {active && (
        <div className="xp-music__panel">
          <div className="xp-music__controls">
            <button type="button" onClick={() => playAt(index - 1)} aria-label="Previous song">
              <i className="fa-solid fa-backward-step" aria-hidden="true" />
            </button>
            <button type="button" className="xp-music__play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
              <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => playAt(index + 1)} aria-label="Next song">
              <i className="fa-solid fa-forward-step" aria-hidden="true" />
            </button>
          </div>

          <div className="xp-music__timeline">
            <span className="xp-mono">{clock(time)}</span>
            <div
              className="xp-music__bar"
              onClick={seek}
              role="progressbar"
              aria-label="Preview progress"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(time)}
            >
              <i style={{ transform: `scaleX(${Math.min(time / (duration || 30), 1)})` }} />
            </div>
            <span className="xp-mono">{clock(duration)}</span>
          </div>

          <div className="xp-music__meta xp-mono">
            <span>
              {String(index + 1).padStart(2, "0")}/{String(tracks.length).padStart(2, "0")}
            </span>
            <a href={track.trackViewUrl} target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-apple" aria-hidden="true" /> Preview via Apple Music ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicCard;
