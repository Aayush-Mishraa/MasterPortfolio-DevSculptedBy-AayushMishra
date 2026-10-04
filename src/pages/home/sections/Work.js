import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { categoryById, timeAgo } from "../../../services/github/githubData";
import { DEPTHS } from "../../automationArsenal/arsenalData";
import { ARSENAL_TOOLS, PROFILE } from "../homeData";
import { useOnScreen, useReveal } from "../lib/motion";
import "./Work.css";

/*
  Work you can open and inspect: the two flagship builds, three repositories
  and a year of commits. Repos and activity come from the build-time GitHub
  snapshot, fetched only when this section is about to scroll into view.
*/

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;

const FLAGSHIPS = ARSENAL_TOOLS.filter((tool) => tool.depth === "flagship");

function Flagship({ tool, index }) {
  return (
    <a
      href={tool.docsPath}
      className="hm-card hm-flagship"
      data-reveal
      style={{ "--d": `${index * 90}ms`, "--tool": tool.accent }}
    >
      <span className="hm-flagship__top">
        <img src={tool.image} alt="" width="52" height="52" loading="lazy" />
        <span className="hm-flagship__badge hm-mono">
          <i className={DEPTHS.flagship.icon} aria-hidden="true" /> {DEPTHS.flagship.label}
        </span>
      </span>
      <strong className="hm-flagship__title">{tool.name}</strong>
      <span className="hm-flagship__cat hm-mono">{tool.category}</span>
      <span className="hm-flagship__desc">{tool.description}</span>
      {tool.tags && (
        <span className="hm-flagship__tags">
          {tool.tags.map((tag) => (
            <span className="hm-chip" key={tag}>
              {tag}
            </span>
          ))}
        </span>
      )}
      <span className="hm-flagship__open">
        Open the build <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
      </span>
    </a>
  );
}

function RepoCard({ repo, index }) {
  const category = categoryById(repo.category);
  const languages = repo.languages.slice(0, 3);
  return (
    <Link
      to={`/projects/${encodeURIComponent(repo.name)}`}
      className="hm-card hm-repo"
      data-reveal
      style={{ "--d": `${index * 80}ms` }}
    >
      <span className="hm-repo__top">
        {category && (
          <span className="hm-repo__cat hm-mono">
            <i className={category.icon} aria-hidden="true" /> {category.label}
          </span>
        )}
        <i className="fa-solid fa-arrow-right hm-repo__go" aria-hidden="true" />
      </span>
      <strong className="hm-repo__title">{repo.title}</strong>
      <span className="hm-repo__desc">{repo.description.replace(/\s*🔗?\s*https?:\/\/\S+\s*$/, "")}</span>
      {languages.length > 0 && (
        <span className="hm-repo__langs">
          <span className="hm-repo__bar" aria-hidden="true">
            {languages.map((language) => (
              <i key={language.name} style={{ width: `${language.percent}%`, background: language.color }} />
            ))}
          </span>
          <span className="hm-repo__legend">
            {languages.map((language) => (
              <span key={language.name}>
                <i style={{ background: language.color }} aria-hidden="true" />
                {language.name}
              </span>
            ))}
          </span>
        </span>
      )}
      <span className="hm-repo__meta hm-mono">
        {repo.commitTotal > 0 && (
          <span>
            <i className="fa-solid fa-code-commit" aria-hidden="true" /> {repo.commitTotal} commits
          </span>
        )}
        {repo.stars > 0 && (
          <span>
            <i className="fa-regular fa-star" aria-hidden="true" /> {repo.stars}
          </span>
        )}
        <span>updated {timeAgo(repo.pushedAt)}</span>
      </span>
    </Link>
  );
}

// A rounded square as path data, so a whole activity level is one <path>
const cellPath = (x, y) =>
  `M${x + 2.5} ${y}h${CELL - 5}a2.5 2.5 0 0 1 2.5 2.5v${CELL - 5}a2.5 2.5 0 0 1-2.5 2.5h-${
    CELL - 5
  }a2.5 2.5 0 0 1-2.5-2.5v-${CELL - 5}a2.5 2.5 0 0 1 2.5-2.5z`;

/*
  A year of contributions. One path per activity level (five in all) rather
  than 365 rects: an element per day, each with its own tooltip and
  transition, was heavy enough to stall the page.
*/
function Heatmap({ days }) {
  const layout = useMemo(() => {
    if (!days.length) return null;
    const first = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    const levels = ["", "", "", "", ""];
    const months = [];
    let cols = 0;
    days.forEach((day, i) => {
      const slot = i + first;
      const col = Math.floor(slot / 7);
      const row = slot % 7;
      cols = col + 1;
      const level = Math.max(0, Math.min(4, day.level || 0));
      levels[level] += cellPath(col * STEP, 16 + row * STEP);
      const month = Number(day.date.slice(5, 7)) - 1;
      const last = months[months.length - 1];
      if (row === 0 && (!last || last.month !== month)) {
        // a partial first month leaves two labels side by side ("SepOct"): keep the later one
        if (last && col - last.col < 3) months[months.length - 1] = { month, col };
        else months.push({ month, col });
      }
    });
    return { levels, cols, months: months.filter((item) => item.col < cols - 2) };
  }, [days]);

  if (!layout) return null;
  const width = layout.cols * STEP;
  const height = 7 * STEP + 16;
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <svg
      className="hm-heat"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${total.toLocaleString("en-US")} contributions in the last year`}
    >
      {layout.months.map((item) => (
        <text key={`${item.month}-${item.col}`} x={item.col * STEP} y={9} className="hm-heat__month" aria-hidden="true">
          {MONTHS[item.month]}
        </text>
      ))}
      {layout.levels.map((d, level) => (d ? <path key={level} d={d} className={`hm-heat__cells l${level}`} /> : null))}
    </svg>
  );
}

function Skeleton() {
  return (
    <div className="hm-work__repos" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="hm-card hm-repo hm-repo--skeleton" key={i}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export default function Work({ github, onNear }) {
  const ref = useRef(null);
  const near = useOnScreen(ref, { rootMargin: "600px 0px", once: true });
  useReveal(ref, [github]);

  useEffect(() => {
    if (near && onNear) onNear();
  }, [near, onNear]);

  const stats = github ? github.stats : null;

  return (
    <section className="hm-section hm-work" id="hm-work" aria-labelledby="hm-work-title" ref={ref}>
      <div className="hm-shell">
        <header className="hm-head">
          <div data-reveal>
            <p className="hm-eyebrow">
              <b>04</b> Work
            </p>
            <h2 className="hm-h2" id="hm-work-title">
              Work you can open and <span className="hm-grad">inspect.</span>
            </h2>
            <p className="hm-lead">
              Two original builds, then the frameworks, API suites and AI agents I ship in public, synced from GitHub.
              Open any of them and read the code.
            </p>
          </div>
        </header>

        <div className="hm-work__flagships">
          {FLAGSHIPS.map((tool, index) => (
            <Flagship tool={tool} index={index} key={tool.id} />
          ))}
        </div>

        {github === undefined && <Skeleton />}

        {github === null && (
          <p className="hm-card hm-work__fallback">
            The project feed didn&apos;t load this time.{" "}
            <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" className="hm-link">
              Browse the repositories on GitHub <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </a>
          </p>
        )}

        {github && (
          <>
            <div className="hm-work__repos">
              {github.featured.map((repo, index) => (
                <RepoCard repo={repo} index={index} key={repo.name} />
              ))}
            </div>

            <div className="hm-card hm-activity" data-reveal>
              <dl className="hm-activity__stats">
                <div>
                  <dt>Contributions, last 12 months</dt>
                  <dd>{stats.contributions.toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt>Active days</dt>
                  <dd>
                    {stats.activeDays}
                    <small> / {Math.min(365, github.days.length)}</small>
                  </dd>
                </div>
                <div>
                  <dt>Longest streak</dt>
                  <dd>
                    {stats.streaks.longest}
                    <small> days</small>
                  </dd>
                </div>
                <div>
                  <dt>Public repositories</dt>
                  <dd>{stats.ownCount}</dd>
                </div>
              </dl>
              <div className="hm-activity__map">
                <Heatmap days={github.days} />
                <p className="hm-activity__note hm-mono">
                  Snapshot · updated {timeAgo(github.generatedAt)} · <Link to="/work/open-source">full activity</Link>
                </p>
              </div>
            </div>

            <div className="hm-work__more" data-reveal>
              <Link to="/work" className="hm-link">
                All {stats.ownCount} projects <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
