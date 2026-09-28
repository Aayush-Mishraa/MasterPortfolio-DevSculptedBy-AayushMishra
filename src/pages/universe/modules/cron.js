/**
 * Small standard-cron (5 field) parser: lists, ranges, steps, month/day
 * names and @macros. Day-of-month and day-of-week follow Vixie cron: when
 * both are restricted, a day matches if either one does.
 */

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MACROS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export const FIELDS = [
  { key: "minute", label: "Minute", min: 0, max: 59 },
  { key: "hour", label: "Hour", min: 0, max: 23 },
  { key: "dom", label: "Day of month", min: 1, max: 31 },
  { key: "month", label: "Month", min: 1, max: 12, names: MONTHS, offset: 1 },
  { key: "dow", label: "Day of week", min: 0, max: 7, names: DAYS, offset: 0 },
];

const toNumber = (token, field) => {
  const upper = token.toUpperCase();
  if (field.names && field.names.includes(upper)) return field.names.indexOf(upper) + field.offset;
  if (!/^\d+$/.test(token)) throw new Error(`“${token}” is not a valid ${field.label.toLowerCase()}`);
  const value = Number(token);
  if (value < field.min || value > field.max) throw new Error(`${field.label} ${value} is outside ${field.min}–${field.max}`);
  return value;
};

const parseField = (text, field) => {
  const values = new Set();
  text.split(",").forEach((part) => {
    if (!part) throw new Error(`Empty value in ${field.label.toLowerCase()}`);
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step “${stepText}” in ${field.label.toLowerCase()}`);
    let start;
    let end;
    if (range === "*") {
      start = field.min;
      end = field.key === "dow" ? 6 : field.max;
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      start = toNumber(a, field);
      end = toNumber(b, field);
      if (end < start) throw new Error(`Range ${range} runs backwards`);
    } else {
      start = toNumber(range, field);
      end = stepText === undefined ? start : field.key === "dow" ? 6 : field.max;
    }
    for (let v = start; v <= end; v += step) values.add(field.key === "dow" && v === 7 ? 0 : v);
  });
  return { values: [...values].sort((a, b) => a - b), any: text === "*" };
};

export const parseCron = (expression) => {
  const trimmed = expression.trim().replace(/\s+/g, " ");
  const expanded = MACROS[trimmed.toLowerCase()] || trimmed;
  const parts = expanded.split(" ");
  if (parts.length !== 5) throw new Error(`Expected 5 fields (minute hour day month weekday), got ${parts.length}`);
  const parsed = {};
  FIELDS.forEach((field, index) => {
    parsed[field.key] = { ...parseField(parts[index], field), raw: parts[index] };
  });
  return parsed;
};

const pad = (n) => String(n).padStart(2, "0");

const listText = (values, map = String) => {
  const items = values.map(map);
  if (items.length <= 2) return items.join(" and ");
  if (items.length > 7) return `${items.slice(0, 6).join(", ")} and ${items.length - 6} more`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
};

const stepOf = (raw) => (raw.startsWith("*/") ? Number(raw.slice(2)) : null);

export const describeCron = (cron) => {
  const { minute, hour, dom, month, dow } = cron;
  let time;
  const minuteStep = stepOf(minute.raw);
  const hourStep = stepOf(hour.raw);
  if (minute.any && hour.any) time = "Every minute";
  else if (minuteStep && hour.any) time = `Every ${minuteStep} minutes`;
  else if (minute.values.length === 1 && hourStep) time = `At minute ${minute.values[0]} of every ${hourStep} hours`;
  else if (minute.values.length === 1 && hour.any) time = minute.values[0] === 0 ? "At the start of every hour" : `At minute ${minute.values[0]} of every hour`;
  else if (minute.values.length === 1 && hour.values.length <= 6) time = `At ${listText(hour.values, (h) => `${pad(h)}:${pad(minute.values[0])}`)}`;
  else if (minuteStep) time = `Every ${minuteStep} minutes during hour ${listText(hour.values, pad)}`;
  else time = `At minute ${listText(minute.values)} past hour ${hour.any ? "every hour" : listText(hour.values, pad)}`;

  const days = [];
  const weekdays = dow.values.join(",") === "1,2,3,4,5";
  const weekend = dow.values.join(",") === "0,6";
  if (!dom.any && !dow.any) {
    days.push(`on day ${listText(dom.values)} of the month or on ${listText(dow.values, (d) => DAY_NAMES[d])}`);
  } else if (!dom.any) {
    days.push(dom.values.length === 1 ? `on day ${dom.values[0]} of the month` : `on days ${listText(dom.values)} of the month`);
  } else if (!dow.any) {
    days.push(weekdays ? "on weekdays" : weekend ? "on weekends" : `on ${listText(dow.values, (d) => DAY_NAMES[d])}`);
  }
  if (!month.any) days.push(`in ${listText(month.values, (m) => MONTH_NAMES[m - 1])}`);
  return [time, ...days].join(", ") + ".";
};

/** Next `count` run times after `from`, in the browser's time zone. */
export const nextRuns = (cron, count = 5, from = new Date()) => {
  const runs = [];
  const start = new Date(from);
  start.setSeconds(0, 0);
  const minutes = cron.minute.values;
  const hours = cron.hour.values;
  const domSet = new Set(cron.dom.values);
  const dowSet = new Set(cron.dow.values);
  const monthSet = new Set(cron.month.values);
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; i < 366 * 5 && runs.length < count; i += 1) {
    const inMonth = monthSet.has(day.getMonth() + 1);
    const domMatch = domSet.has(day.getDate());
    const dowMatch = dowSet.has(day.getDay());
    const dayOk = cron.dom.any && cron.dow.any ? true : cron.dom.any ? dowMatch : cron.dow.any ? domMatch : domMatch || dowMatch;
    if (inMonth && dayOk) {
      for (const h of hours) {
        for (const m of minutes) {
          const run = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
          if (run > start) runs.push(run);
          if (runs.length >= count) return runs;
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return runs;
};
