import React, { useMemo } from "react";
import { fetchAllStatus } from "../../../services/universe/sources";
import { timeAgo } from "../../../services/github/githubData";
import { Monogram, PageHead, Skeletons, Sync } from "../lib/kit";
import { useFeed } from "../lib/useFeed";
import "./InternetStatus.css";

const LEVEL = { none: 0, unknown: 0, minor: 1, major: 2, critical: 3 };

const WEATHER = [
  { icon: "fa-solid fa-sun", title: "Clear skies", note: "Everything you depend on is up. Ship it." },
  { icon: "fa-solid fa-cloud-sun", title: "Light turbulence", note: "Some services report minor issues. Check before blaming your code." },
  { icon: "fa-solid fa-cloud-showers-heavy", title: "Stormy", note: "A major outage is in progress. Maybe it really isn't your fault." },
  { icon: "fa-solid fa-cloud-bolt", title: "Severe storm", note: "Critical outage. Grab a coffee and watch the incident page." },
];

const STATUS_LABEL = {
  operational: "Operational",
  degraded_performance: "Degraded",
  partial_outage: "Partial outage",
  major_outage: "Major outage",
  under_maintenance: "Maintenance",
};

export default function InternetStatus({ now }) {
  const feed = useFeed("status:all", fetchAllStatus, { ttl: 60 * 1000, refreshMs: 60 * 1000 });
  const services = feed.data || [];

  const summary = useMemo(() => {
    const worst = services.reduce((max, service) => Math.max(max, LEVEL[service.indicator] || 0), 0);
    const healthy = services.filter((service) => service.indicator === "none").length;
    const incidents = services.flatMap((service) => service.incidents.map((incident) => ({ ...incident, service: service.name })));
    const groups = {};
    services.forEach((service) => {
      groups[service.group] = groups[service.group] || [];
      groups[service.group].push(service);
    });
    return { worst, healthy, incidents, groups };
  }, [services]);

  const weather = WEATHER[summary.worst];

  return (
    <div className="nx">
      <PageHead kicker="Internet Status · live" title="Is it down, or is it *just me?*" aside={<Sync feed={feed} now={now} label="checked" />}>
        Live health of the platforms developers depend on, read straight from their public status pages and re-checked every
        minute.
      </PageHead>

      {!services.length ? (
        <Skeletons count={6} />
      ) : (
        <>
          <section className={`nx-weather nx-weather--${summary.worst}`}>
            <i className={weather.icon} aria-hidden="true" />
            <div>
              <span className="uv-kicker">Internet weather</span>
              <strong>{weather.title}</strong>
              <p>{weather.note}</p>
            </div>
            <div className="nx-score">
              <b>
                {summary.healthy}/{services.length}
              </b>
              <span>fully operational</span>
            </div>
          </section>

          {summary.incidents.length > 0 && (
            <section className="uv-panel nx-incidents">
              <h2>
                <span className="uv-live-dot" aria-hidden="true" /> Active incidents
              </h2>
              <ul>
                {summary.incidents.map((incident) => (
                  <li key={incident.id} className={`nx-impact--${incident.impact}`}>
                    <a href={incident.url} target="_blank" rel="noopener noreferrer">
                      <b>{incident.service}</b> {incident.name}
                    </a>
                    <span className="uv-meta">
                      <span className="uv-tag uv-tag--muted">{incident.status}</span>
                      <span>updated {timeAgo(incident.updatedAt, now)}</span>
                    </span>
                    {incident.update && <p className="uv-clamp-2">{incident.update}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {Object.entries(summary.groups).map(([group, list]) => (
            <section key={group} className="uv-block nx-group">
              <h2 className="nx-group-title">{group}</h2>
              <div className="uv-grid nx-grid">
                {list.map((service, index) => (
                  <article key={service.id} className={`uv-card nx-card nx-card--${service.indicator}`} style={{ "--i": index }}>
                    <header>
                      <Monogram text={service.name} />
                      <div>
                        <strong>{service.name}</strong>
                        <span>{service.description}</span>
                      </div>
                      <span className={`uv-dot is-${service.indicator === "none" ? "ok" : service.indicator}`} />
                    </header>
                    {service.degraded.length > 0 ? (
                      <ul className="nx-components">
                        {service.degraded.slice(0, 4).map((component) => (
                          <li key={component.name}>
                            <span>{component.name}</span>
                            <em>{STATUS_LABEL[component.status] || component.status}</em>
                          </li>
                        ))}
                        {service.degraded.length > 4 && <li className="nx-more">+{service.degraded.length - 4} more</li>}
                      </ul>
                    ) : (
                      <p className="nx-ok-note">
                        {service.indicator === "unknown" ? "Couldn't reach the status page." : `All ${service.components || ""} components operational.`}
                      </p>
                    )}
                    <a className="nx-link" href={service.url} target="_blank" rel="noopener noreferrer">
                      Status page <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
          <p className="nx-note">Source: each company's public Statuspage API. This page only reports what they publish.</p>
        </>
      )}
    </div>
  );
}
