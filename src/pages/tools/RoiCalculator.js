import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ToolPage, { ToolCta, ToolHero } from "./ToolPage";
import { toolBySlug } from "../../data/tools";
import { PRICES } from "../../data/pricing";

/*
  F21: what flaky tests, manual regression and escaped bugs cost a team in a
  year, and how quickly fixing them pays back. Runs only in the browser; the
  inputs live in the URL so a result can be shared. Every formula is shown
  under "How it's calculated".
*/

const TOOL = toolBySlug("qa-roi-calculator");
const WORKDAYS = 230;
const HOURS_PER_YEAR = 1800;

const sprint = PRICES["playwright-starter-sprint"] || { min: 1500, max: 3000 };
const DEFAULT_INVESTMENT = Math.round((sprint.min + sprint.max) / 2);

const CURRENCIES = {
  USD: { locale: "en-US", rate: 60, bug: 5000 },
  EUR: { locale: "de-DE", rate: 55, bug: 4500 },
  GBP: { locale: "en-GB", rate: 50, bug: 4000 },
  INR: { locale: "en-IN", rate: 1500, bug: 150000 },
};

// [key, label, hint, min, max, step, default, unit]
const FIELDS = [
  ["engineers", "Engineers on the team", "Developers and QA who work in this codebase.", 1, 200, 1, 12, ""],
  ["runs", "CI pipeline runs a day", "Every push and pull request that runs the tests.", 1, 500, 1, 40, "runs"],
  ["flake", "Runs that fail from flakiness", "Red builds that pass on a rerun with no code change.", 0, 50, 0.5, 8, "%"],
  ["flakeMinutes", "Time lost per flaky failure", "Triage, rerun, waiting, getting back into the work.", 5, 180, 5, 30, "min"],
  ["manualHours", "Manual regression per release", "Person-hours of clicking through before each release.", 0, 400, 1, 24, "h"],
  ["releases", "Releases a month", "", 0, 60, 1, 4, ""],
  ["bugs", "Bugs reaching production a month", "Ones a user or customer reports.", 0, 100, 1, 3, ""],
  ["bugCost", "Cost of one production bug", "Fix, hotfix, support, refunds, lost trust. Industry guesses run from hundreds to tens of thousands.", 0, 1000000, 100, null, "money"],
  ["rate", "Loaded hourly cost of an engineer", "Salary plus overheads, divided by working hours.", 1, 50000, 1, null, "money"],
];

const IMPROVEMENTS = [
  ["fixFlake", "Flaky failures removed", 80],
  ["fixManual", "Manual regression automated", 70],
  ["fixBugs", "Fewer production bugs", 40],
];

function defaults(currency) {
  const values = { currency, investment: currency === "USD" ? DEFAULT_INVESTMENT : 0 };
  FIELDS.forEach(([key, , , , , , value]) => {
    values[key] = value;
  });
  values.rate = CURRENCIES[currency].rate;
  values.bugCost = CURRENCIES[currency].bug;
  IMPROVEMENTS.forEach(([key, , value]) => {
    values[key] = value;
  });
  return values;
}

function fromQuery(search) {
  const params = new URLSearchParams(search);
  const currency = CURRENCIES[params.get("c")] ? params.get("c") : "USD";
  const values = defaults(currency);
  Object.keys(values).forEach((key) => {
    if (key === "currency" || !params.has(key)) return;
    const number = Number(params.get(key));
    if (Number.isFinite(number) && number >= 0) values[key] = number;
  });
  return values;
}

export function calculate(v) {
  const flakyFailures = v.runs * (v.flake / 100) * WORKDAYS;
  const flakyHours = (flakyFailures * v.flakeMinutes) / 60;
  const manualHours = v.manualHours * v.releases * 12;
  const bugCost = v.bugs * v.bugCost * 12;
  const flakyCost = flakyHours * v.rate;
  const manualCost = manualHours * v.rate;
  const hours = flakyHours + manualHours;
  const total = flakyCost + manualCost + bugCost;
  const saved =
    flakyCost * (v.fixFlake / 100) + manualCost * (v.fixManual / 100) + bugCost * (v.fixBugs / 100);
  const savedHours = flakyHours * (v.fixFlake / 100) + manualHours * (v.fixManual / 100);
  const capacity = v.engineers > 0 ? hours / (v.engineers * HOURS_PER_YEAR) : 0;
  const payback = saved > 0 ? v.investment / (saved / 12) : null;
  return { flakyFailures, flakyHours, manualHours, flakyCost, manualCost, bugCost, hours, total, saved, savedHours, capacity, payback };
}

function NumberField({ field, value, onChange, currency }) {
  const [key, label, hint, min, max, step, , unit] = field;
  const id = `roi-${key}`;
  const isMoney = unit === "money";
  const sliderMax = isMoney ? (key === "rate" ? CURRENCIES[currency].rate * 4 : CURRENCIES[currency].bug * 10) : max;
  return (
    <div className="ft-num">
      <span>
        <label htmlFor={id}>{label}</label>
        <em>{isMoney ? currency : unit}</em>
      </span>
      <div className="ft-num__row">
        <input
          type="range"
          min={min}
          max={Math.max(sliderMax, value)}
          step={step}
          value={value}
          onChange={(event) => onChange(key, Number(event.target.value))}
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(key, event.target.value === "" ? 0 : Number(event.target.value))}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      </div>
      {hint && (
        <small className="ft-hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
    </div>
  );
}

export default function RoiCalculator({ theme, location, history }) {
  const [values, setValues] = useState(() => defaults("USD"));
  const loaded = useRef(false);

  // The URL's inputs win (read after the first render, so the prerendered page hydrates cleanly).
  useEffect(() => {
    if (location && location.search) setValues(fromQuery(location.search));
    loaded.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded.current || !history) return;
    const params = new URLSearchParams();
    const base = defaults(values.currency);
    Object.keys(values).forEach((key) => {
      if (key === "currency") return;
      if (values[key] !== base[key]) params.set(key, String(values[key]));
    });
    if (values.currency !== "USD") params.set("c", values.currency);
    const search = params.toString();
    history.replace({ pathname: location.pathname, search: search ? `?${search}` : "" });
  }, [values]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => calculate(values), [values]);
  const { locale } = CURRENCIES[values.currency];
  const money = (amount) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: values.currency, maximumFractionDigits: 0 }).format(Math.round(amount || 0));
  const number = (amount) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(amount || 0));
  const update = (key, value) => setValues((current) => ({ ...current, [key]: Math.max(0, value) }));
  const setCurrency = (currency) =>
    setValues((current) => ({ ...current, currency, rate: CURRENCIES[currency].rate, bugCost: CURRENCIES[currency].bug, investment: currency === "USD" ? DEFAULT_INVESTMENT : current.investment }));

  const parts = [
    ["Flaky tests", result.flakyCost],
    ["Manual regression", result.manualCost],
    ["Production bugs", result.bugCost],
  ];
  const biggest = Math.max(1, ...parts.map(([, value]) => value));
  const payback =
    result.payback == null
      ? "—"
      : result.payback < 1
      ? "under a month"
      : `${result.payback.toFixed(result.payback < 10 ? 1 : 0)} months`;

  return (
    <ToolPage theme={theme} className="ft-roi">
      <ToolHero tool={TOOL} title="What do flaky tests and manual QA cost you a year?">
        <p className="ft-muted">Nothing is sent anywhere: the numbers stay in your browser (and in the link, if you share it).</p>
      </ToolHero>

      <section className="hm-section" aria-labelledby="roi-inputs-title">
        <div className="hm-shell ft-two">
          <div className="hm-card ft-panel">
            <div className="ft-panel__body">
              <h2 className="ft-h2" id="roi-inputs-title">
                Your team
              </h2>
              <div className="ft-currency" role="group" aria-label="Currency">
                <span className="ft-muted">Currency</span>
                <div className="ft-tabs">
                  {Object.keys(CURRENCIES).map((code) => (
                    <button key={code} type="button" aria-pressed={values.currency === code} onClick={() => setCurrency(code)}>
                      {code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ft-inputs sv-form">
                {FIELDS.map((field) => (
                  <NumberField key={field[0]} field={field} value={values[field[0]]} onChange={update} currency={values.currency} />
                ))}
              </div>
              <h3 className="ft-h3">If you fixed it</h3>
              <div className="ft-inputs sv-form">
                {IMPROVEMENTS.map(([key, label]) => (
                  <NumberField key={key} field={[key, label, "", 0, 100, 5, 0, "%"]} value={values[key]} onChange={update} currency={values.currency} />
                ))}
                <NumberField
                  field={["investment", "One-time cost of fixing it", values.currency === "USD" ? "Defaults to the middle of the Playwright Starter Sprint range." : "", 0, 1000000, 100, 0, "money"]}
                  value={values.investment}
                  onChange={update}
                  currency={values.currency}
                />
              </div>
            </div>
          </div>

          <div className="ft-roi__result">
            <div className="hm-card ft-panel" aria-live="polite">
              <div className="hm-bar">
                <span className="hm-bar__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="hm-bar__title">cost-of-quality.report</span>
              </div>
              <div className="ft-panel__body">
                <dl className="ft-stats">
                  <div className="ft-stat ft-stat--lead">
                    <dt>Lost per year</dt>
                    <dd>{money(result.total)}</dd>
                  </div>
                  <div className="ft-stat">
                    <dt>Hours lost per year</dt>
                    <dd>
                      {number(result.hours)}
                      <small>{(result.capacity * 100).toFixed(1)}% of the team&apos;s time</small>
                    </dd>
                  </div>
                  <div className="ft-stat">
                    <dt>Saved per year if fixed</dt>
                    <dd>
                      {money(result.saved)}
                      <small>{number(result.savedHours)} hours back</small>
                    </dd>
                  </div>
                  <div className="ft-stat">
                    <dt>Payback period</dt>
                    <dd>{payback}</dd>
                  </div>
                </dl>
                <ul className="ft-roi__breakdown" aria-label="Where it goes">
                  {parts.map(([label, value]) => (
                    <li key={label}>
                      <div>
                        <span>{label}</span>
                        <b>{money(value)}</b>
                      </div>
                      <div className="ft-meter" aria-hidden="true">
                        <span style={{ transform: `scaleX(${value / biggest})` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <details className="ft-roi__math">
                  <summary>How it&apos;s calculated</summary>
                  <ul>
                    <li>
                      Flaky failures a year = {values.runs} runs × {values.flake}% × {WORKDAYS} working days ={" "}
                      {number(result.flakyFailures)}
                    </li>
                    <li>
                      Flaky hours = failures × {values.flakeMinutes} min = {number(result.flakyHours)} h × {money(values.rate)}
                    </li>
                    <li>
                      Manual regression = {values.manualHours} h × {values.releases} releases × 12 = {number(result.manualHours)} h ×{" "}
                      {money(values.rate)}
                    </li>
                    <li>
                      Production bugs = {values.bugs} × {money(values.bugCost)} × 12
                    </li>
                    <li>
                      Team time = hours ÷ ({values.engineers} engineers × {HOURS_PER_YEAR} h)
                    </li>
                    <li>Savings apply your &quot;if you fixed it&quot; percentages; payback = one-time cost ÷ monthly savings.</li>
                  </ul>
                </details>
                <p className="ft-hint">
                  A model, not an audit: it leaves out slower releases, context switching and the cost of people learning to
                  ignore red builds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="Turn the number into a plan"
        title="Find out what's really behind it."
        text="The QA Health Check measures your actual flake rate, regression time and coverage gaps in five days, and ranks the fixes by payback. The Playwright Starter Sprint builds the automation."
        to="/services"
        label="See the services"
      />
      <section className="hm-section" aria-label="Related">
        <div className="hm-shell">
          <p className="ft-muted">
            Know which tests are flaky? Find out with the <Link to="/free-tools/flaky-test-doctor">Flaky Test Doctor</Link>.
          </p>
        </div>
      </section>
    </ToolPage>
  );
}
