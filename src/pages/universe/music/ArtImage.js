import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";
import { hueOf } from "../lib/kit";

/**
 * Track artwork that survives flaky content nodes: Audius lists mirror hosts
 * for every image, so on error we retry the same path on the next mirror, and
 * finally fall back to a generated cover.
 */
export default function ArtImage({ track, large = false, className = "", alt = "" }) {
  const sources = useMemo(() => {
    if (!track) return [];
    const primary = (large && track.artworkLarge) || track.artwork;
    if (!primary) return [];
    const list = [primary];
    (track.mirrors || []).forEach((host) => {
      try {
        list.push(`${host.replace(/\/$/, "")}${new URL(primary).pathname}`);
      } catch (error) {
        /* malformed mirror */
      }
    });
    return list;
  }, [track, large]);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [sources]);

  if (!sources.length || attempt >= sources.length) {
    return (
      <span className={`uv-art-fallback ${className}`} style={{ "--h": hueOf(track ? track.title : "") }} aria-hidden="true">
        <Icon name={track && track.kind === "live" ? "radio" : "sparkle"} size={18} />
      </span>
    );
  }
  return <img src={sources[attempt]} alt={alt} className={className} loading="lazy" onError={() => setAttempt((value) => value + 1)} />;
}
