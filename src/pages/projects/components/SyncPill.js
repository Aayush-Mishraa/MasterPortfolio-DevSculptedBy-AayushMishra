import React from "react";
import { timeAgo } from "../../../services/github/githubData";

// Where the numbers come from: the GitHub snapshot the scheduled build
// refreshes (F07). No live API calls, so no request counter or refresh button.
const SyncPill = ({ status, now }) => {
  const label = {
    loading: "Loading GitHub data",
    snapshot: "Synced from GitHub",
    error: "GitHub data unavailable",
  }[status.state] || "Synced from GitHub";
  return (
    <div className={`pj-sync pj-sync--${status.state === "snapshot" ? "live" : status.state}`} title="Refreshed from GitHub by a scheduled build every 6 hours">
      <span className="pj-sync-dot" aria-hidden="true" />
      <span className="pj-sync-label">{label}</span>
      {status.syncedAt && <span className="pj-sync-time">{timeAgo(status.syncedAt, now)}</span>}
    </div>
  );
};

export default SyncPill;
