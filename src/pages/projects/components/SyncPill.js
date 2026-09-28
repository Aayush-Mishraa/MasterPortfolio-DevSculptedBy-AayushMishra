import React from "react";
import { timeAgo } from "../../../services/github/githubData";

const SyncPill = ({ status, limit, onRefresh, now }) => {
  const label = {
    loading: "Connecting to GitHub",
    syncing: "Syncing",
    live: "Live",
    stale: "Cached",
    snapshot: "Snapshot",
    error: "Offline",
  }[status.state];
  return (
    <div className={`pj-sync pj-sync--${status.state}`} title={status.message || undefined}>
      <span className="pj-sync-dot" aria-hidden="true" />
      <span className="pj-sync-label">{label}</span>
      {status.syncedAt && <span className="pj-sync-time">synced {timeAgo(status.syncedAt, now)}</span>}
      {limit.remaining !== null && (
        <span className="pj-sync-quota" title="GitHub API requests left this hour for your browser">
          API {limit.remaining}/{limit.limit}
        </span>
      )}
      <button
        type="button"
        className="pj-sync-btn"
        onClick={() => onRefresh(true)}
        disabled={status.state === "loading" || status.state === "syncing"}
        aria-label="Refresh from GitHub"
      >
        <i className="fa-solid fa-rotate" aria-hidden="true" />
      </button>
    </div>
  );
};

export default SyncPill;
