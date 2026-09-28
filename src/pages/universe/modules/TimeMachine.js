import React, { useState } from "react";
import { fetchOnThisDay } from "../../../services/universe/sources";
import { FeedState, PageHead, SectionTitle, Skeletons, Sync } from "../lib/kit";
import { useFeed } from "../lib/useFeed";
import "./TimeMachine.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const Event = ({ event, index, thisYear }) => (
  <li className="tm-event" style={{ "--i": Math.min(index, 14) }}>
    <span className="tm-year">
      <b>{event.year}</b>
      <small>{thisYear - event.year} yrs ago</small>
    </span>
    <span className="tm-node" aria-hidden="true" />
    <div className="tm-card">
      {event.image && <img src={event.image} alt="" loading="lazy" />}
      <p>{event.text}</p>
      {event.url && (
        <a href={event.url} target="_blank" rel="noopener noreferrer">
          Read on Wikipedia <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
        </a>
      )}
    </div>
  </li>
);

export default function TimeMachine({ now }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());
  const date = new Date(2024, month, day); // 2024 is a leap year, so 29 February works
  const feed = useFeed(`onthisday:${month + 1}-${day}`, () => fetchOnThisDay(date), { ttl: 12 * 60 * 60 * 1000 });
  const data = feed.data;
  const thisYear = today.getFullYear();
  const isToday = month === today.getMonth() && day === today.getDate();

  const shift = (delta) => {
    const next = new Date(2024, month, day + delta);
    setMonth(next.getMonth());
    setDay(next.getDate());
  };

  const random = () => {
    const m = Math.floor(Math.random() * 12);
    setMonth(m);
    setDay(1 + Math.floor(Math.random() * DAYS_IN[m]));
  };

  return (
    <div className="tm">
      <PageHead kicker="Time Machine" title="This day in *tech history*" aside={<Sync feed={feed} now={now} />}>
        Launches, breakthroughs, first flights and famous failures that happened on this date, pulled from Wikipedia's
        "On this day" feed and filtered for technology.
      </PageHead>

      <div className="tm-dial">
        <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => shift(-1)} aria-label="Previous day">
          <i className="fa-solid fa-backward-step" aria-hidden="true" />
        </button>
        <div className="tm-date">
          <select className="uv-input" value={month} onChange={(event) => { const m = Number(event.target.value); setMonth(m); setDay(Math.min(day, DAYS_IN[m])); }} aria-label="Month">
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <select className="uv-input" value={day} onChange={(event) => setDay(Number(event.target.value))} aria-label="Day">
            {Array.from({ length: DAYS_IN[month] }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => shift(1)} aria-label="Next day">
          <i className="fa-solid fa-forward-step" aria-hidden="true" />
        </button>
        <button type="button" className="uv-btn uv-btn--primary uv-btn--sm" onClick={random}>
          <i className="fa-solid fa-shuffle" aria-hidden="true" /> Random day
        </button>
        {!isToday && (
          <button type="button" className="uv-btn uv-btn--ghost uv-btn--sm" onClick={() => { setMonth(today.getMonth()); setDay(today.getDate()); }}>
            Today
          </button>
        )}
      </div>

      {!data && !feed.error ? (
        <Skeletons count={4} variant="row" />
      ) : (
        <FeedState feed={feed}>
          {data && (
            <div className="tm-layout">
              <section>
                <SectionTitle
                  icon="fa-solid fa-microchip"
                  title={`${MONTHS[month]} ${day} in tech`}
                  meta={data.tech.length ? `${data.tech.length} moments` : "no tech events on record, so here's the day in general"}
                />
                <ol className="tm-timeline" key={`${month}-${day}`}>
                  {(data.tech.length ? data.tech : data.selected).map((event, index) => (
                    <Event key={`${event.year}-${index}`} event={event} index={index} thisYear={thisYear} />
                  ))}
                </ol>
              </section>
              <aside className="tm-side">
                {data.births.length > 0 && (
                  <div className="uv-panel">
                    <SectionTitle icon="fa-solid fa-cake-candles" title="Born on this day" />
                    <ul className="tm-births">
                      {data.births.map((person) => (
                        <li key={person.text}>
                          {person.image ? <img src={person.image} alt="" loading="lazy" /> : <span className="tm-avatar"><i className="fa-solid fa-user" aria-hidden="true" /></span>}
                          <span>
                            <b>{person.year}</b>
                            {person.url ? (
                              <a href={person.url} target="_blank" rel="noopener noreferrer">
                                {person.text}
                              </a>
                            ) : (
                              person.text
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.tech.length > 0 && data.selected.length > 0 && (
                  <div className="uv-panel">
                    <SectionTitle icon="fa-solid fa-earth-americas" title="Also on this day" />
                    <ul className="tm-also">
                      {data.selected.slice(0, 5).map((event) => (
                        <li key={event.text}>
                          <b>{event.year}</b> {event.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          )}
        </FeedState>
      )}
      <p className="tm-note">Source: Wikimedia Feed API ("On this day"), CC BY-SA. Tech events are filtered by keyword, so a few may be surprising.</p>
    </div>
  );
}
