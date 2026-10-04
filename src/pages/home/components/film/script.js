/*
  The screenplay for "Signed Off": the scenes and their timing, and every
  piece of data the film shows. All of it is real: the facts come from the
  portfolio data, the bug log from public GitHub commits, the footage from the
  site itself (scripts/film/capture-footage.mjs), and the audit from the
  visitor's own browser.
*/
import { AI_AGENTS, CAREER_START, CORE_STACK, HIGHLIGHTS, PROFILE, yearsSince } from "../../homeData";
import bugLog from "../../../../shared/opensource/bug_log.json";
import siteHome from "../../../../assets/film/site-home.webp";
import siteSkylineWebm from "../../../../assets/film/site-skyline.webm";
import siteSkylineMp4 from "../../../../assets/film/site-skyline.mp4";
import siteSkylinePoster from "../../../../assets/film/site-skyline-poster.webp";
import siteOrbitWebm from "../../../../assets/film/site-orbit.webm";
import siteOrbitMp4 from "../../../../assets/film/site-orbit.mp4";
import siteOrbitPoster from "../../../../assets/film/site-orbit-poster.webp";
import siteUniverse from "../../../../assets/film/site-universe.webp";
import siteProjects from "../../../../assets/film/site-projects.webp";
import report from "../../../../assets/film/report.webp";

export const RUNTIME = 30;
export const FPS = 24;

// Nine scenes, cut on the beat of a 120 BPM score (a beat is 0.5 s).
export const SCENES = [
  { id: "slate", at: 0, title: "Slate", spec: "rolls camera" },
  { id: "night", at: 1.5, title: "Release night", spec: "sets the stakes" },
  { id: "bug", at: 4.5, title: "The bug", spec: "finds the one failing test" },
  { id: "hunter", at: 8, title: "The engineer", spec: "introduces the engineer" },
  { id: "log", at: 11.5, title: "The record", spec: "reads the real bug log" },
  { id: "site", at: 15, title: "The website", spec: "audits this website, live" },
  { id: "arsenal", at: 20.5, title: "The arsenal", spec: "loads the toolkit" },
  { id: "proof", at: 23, title: "The receipts", spec: "shows the receipts" },
  { id: "verdict", at: 25.5, title: "The verdict", spec: "signs off the release" },
];

export const pad = (n) => String(n).padStart(2, "0");
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const sceneLength = (i) => (i < SCENES.length - 1 ? SCENES[i + 1].at : RUNTIME) - SCENES[i].at;
export const sceneAt = (t) => SCENES.reduce((found, scene, i) => (t >= scene.at ? i : found), 0);
export const timecode = (t) => {
  const frames = Math.floor(clamp(t, 0, RUNTIME) * FPS);
  return `00:00:${pad(Math.floor(frames / FPS))}:${pad(frames % FPS)}`;
};

export const YEARS = yearsSince(CAREER_START);

// Seven tools, so the cuts stay under three a second.
export const TOOLS = CORE_STACK.slice(0, 4)
  .map((name) => ({ name, ai: false }))
  .concat(AI_AGENTS.slice(0, 3).map((name) => ({ name, ai: true })));

// "5,000+" -> 5000 with its "+" kept, so the number can count up.
const parseStat = (item) => {
  const match = /^(\D*)([\d,.]+)(.*)$/.exec(item.value) || [];
  return {
    value: item.value,
    label: item.label,
    prefix: match[1] || "",
    number: parseFloat((match[2] || "0").replace(/,/g, "")) || 0,
    suffix: match[3] || "",
    grouped: /,/.test(match[2] || ""),
  };
};
export const formatStat = (stat, v) =>
  `${stat.prefix}${stat.grouped ? Math.round(v).toLocaleString("en-US") : Math.round(v)}${stat.suffix}`;
export const STATS = [HIGHLIGHTS.testCases, HIGHLIGHTS.bugs, HIGHLIGHTS.suites].map(parseStat);

// The bug log: real fix commits, curated at build time.
const shortRepo = (name) =>
  name
    .replace(/-+$/, "")
    .replace(/-DevSculptedBy-AayushMishra$/i, "")
    .replace(/-Automation-Framework$/i, "")
    .replace(/-(Tests|Project)$/i, "");
export const LOG = {
  total: bugLog.total,
  repos: bugLog.repos,
  rows: bugLog.fixes.slice(0, 6).map((fix) => ({
    key: fix.sha,
    date: fix.date.slice(0, 10),
    repo: shortRepo(fix.repo),
    message: fix.message,
    sha: fix.short,
  })),
};

// The real website, shot by shot. Boxes are the inspector's framing, in
// percent of the shot; each one outlines a real element of that page.
export const SHOTS = [
  {
    id: "home",
    at: 15,
    path: "",
    image: siteHome,
    boxes: [
      { x: 2, y: 32, w: 43, h: 23, label: "h1 · Every release, signed off." },
      { x: 60, y: 63.5, w: 21.5, h: 26.5, label: "aayush.spec.ts · 4 passed" },
    ],
  },
  {
    id: "skyline",
    at: 16.6,
    path: "/work/open-source",
    video: { webm: siteSkylineWebm, mp4: siteSkylineMp4 },
    poster: siteSkylinePoster,
    boxes: [{ x: 9.5, y: 23.5, w: 81, h: 37, label: "Contribution skyline · a year of commits" }],
  },
  {
    id: "orbit",
    at: 18,
    path: "/automation-arsenal",
    video: { webm: siteOrbitWebm, mp4: siteOrbitMp4 },
    poster: siteOrbitPoster,
    boxes: [{ x: 53, y: 19, w: 37, h: 61, label: "Automation Arsenal · tools in orbit" }],
  },
  {
    id: "universe",
    at: 19,
    path: "/universe",
    image: siteUniverse,
    boxes: [{ x: 57, y: 24, w: 33, h: 46, label: "Tech Universe · live channels" }],
  },
  {
    id: "projects",
    at: 19.7,
    path: "/work",
    image: siteProjects,
    boxes: [{ x: 54.5, y: 28, w: 36, h: 59, label: "Repo radar · live from GitHub" }],
  },
];
export const SITE_END = 20.5;
export const shotEnd = (i) => (i < SHOTS.length - 1 ? SHOTS[i + 1].at : SITE_END);

// The Newman report from the Phoenix API suite's README, with the two tiles
// the camera frames (percent of the image).
export const REPORT = {
  image: report,
  boxes: [
    { x: 26.5, y: 19.5, w: 22.5, h: 14, label: "Every assertion, automated" },
    { x: 51, y: 19.5, w: 22.5, h: 14, label: "Every failure, caught in QA", below: true },
  ],
};

export const narration = ({ audit }) => {
  const passed = audit ? audit.filter((item) => item.status === "pass" || item.status === "info").length : 0;
  return [
    "Film slate: Signed Off, scene one, take one.",
    `Release night, 23:59. The release ships at midnight. ${STATS[0].value} tests stand between it and your users.`,
    "One test is failing. One bug is still hiding, and midnight is 60 seconds away.",
    `Starring ${PROFILE.name}, ${PROFILE.role}. ${YEARS}+ years finding what others miss.`,
    `The record: a real Newman run from the Phoenix API suite, then the bug log, ${
      LOG.total
    } fixes from public GitHub commits, starting with "${LOG.rows[0] ? LOG.rows[0].message : ""}".`,
    `Tonight's release is this website, audited live in your browser: ${passed} of ${
      audit ? audit.length : 0
    } checks pass.`,
    `The arsenal: ${TOOLS.map((tool) => tool.name).join(", ")}.`,
    `The receipts: ${STATS.map((stat) => `${stat.value} ${stat.label}`).join(", ")}.`,
    "The bug is fixed and the dots spell Signed Off. The release ships on time.",
  ];
};

export { PROFILE };
