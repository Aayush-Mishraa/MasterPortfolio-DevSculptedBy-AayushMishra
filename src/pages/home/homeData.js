import { useEffect, useState } from "react";
import {
  greeting,
  socialMediaLinks,
  experience,
  degrees,
  skills,
  contactPageData,
  availability,
  highlights,
  featuredProjects,
  recommendations,
} from "../../portfolio";
import { automationTools, STAGES } from "../automationArsenal/arsenalData";
import { aggregateStats, loadSnapshot, mergeRepos } from "../../services/github/githubData";

/* ------------------------------------------------------------------ */
/* Every fact on the home page is derived here from portfolio.js, the  */
/* Automation Arsenal data or the build-time GitHub snapshot, so the   */
/* page never says anything the rest of the site doesn't back up.      */
/* ------------------------------------------------------------------ */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

// "April 2023" -> Date(2023, 3); "Present" -> null
const parsePoint = (text) => {
  const t = (text || "").trim().toLowerCase();
  if (!t || /present|now|current/.test(t)) return null;
  const year = parseInt((t.match(/\d{4}/) || ["0"])[0], 10);
  const month = MONTHS.findIndex((m) => t.indexOf(m) === 0);
  return new Date(year, month < 0 ? 0 : month, 1);
};

const logoFor = (path) => {
  try {
    return require(`../../assets/images/${path}`);
  } catch (e) {
    return null;
  }
};

export const formatMonth = (date) => (date ? `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}` : "Present");

const TYPES = ["work", "intern", "community"];

export const ROLES = experience.sections
  .reduce(
    (acc, section, si) =>
      acc.concat(
        section.experiences.map((role) => {
          const [from, to] = role.duration.split(/\s+-\s+/);
          return {
            title: role.title,
            company: role.company,
            url: role.company_url,
            location: role.location,
            duration: role.duration,
            type: TYPES[si] || "community",
            start: parsePoint(from),
            end: parsePoint(to),
            logo: logoFor(role.logo_path),
          };
        })
      ),
    []
  )
  .filter((role) => role.start && role.start.getFullYear() > 0);

export const WORK_ROLES = ROLES.filter((role) => role.type === "work");
export const CURRENT_ROLE = WORK_ROLES.find((role) => !role.end) || WORK_ROLES[0];
export const CAREER_START = WORK_ROLES.reduce(
  (earliest, role) => (role.start < earliest ? role.start : earliest),
  CURRENT_ROLE.start
);

export const yearsSince = (date, now = Date.now()) => Math.floor((now - date.getTime()) / YEAR_MS);

// Each company once, most recent first, with the span of every role there.
const COMPANIES = ROLES.filter((role) => role.type !== "community")
  .sort((a, b) => b.start - a.start)
  .reduce((acc, role) => {
    const known = acc.find((company) => company.name === role.company);
    if (known) {
      if (role.start < known.from) known.from = role.start;
      known.roles.push(role.title);
    } else {
      acc.push({
        name: role.company,
        url: role.url,
        logo: role.logo,
        type: role.type,
        from: role.start,
        to: role.end,
        roles: [role.title],
      });
    }
    return acc;
  }, []);

const COMMUNITY = ROLES.filter((role) => role.type === "community");

const lastYear = (text) => Math.max(...(String(text).match(/\d{4}/g) || ["0"]).map(Number));

// Highest degree first
export const EDUCATION = degrees.degrees
  .map((degree) => ({
    school: degree.title,
    degree: degree.subtitle,
    duration: degree.duration,
    url: degree.website_link,
    logo: logoFor(degree.logo_path),
  }))
  .sort((a, b) => lastYear(b.duration) - lastYear(a.duration));

/*
  The career as a git graph, newest first. Lane 0 is the main line (degree,
  then QA roles); lane 1 carries the data-science and ML years, which branch
  off after the degree and merge into the first QA role, and the master's
  degree, which branches off that role and merges into the next one.
*/
const span = (start, end) => `${formatMonth(start)} – ${end ? formatMonth(end) : "now"}`;
const years = (text) => String(text).replace(/\s*-\s*/, " – ");

export const TRAJECTORY = (() => {
  const work = WORK_ROLES.slice().sort((a, b) => b.start - a.start);
  const branch = ROLES.filter(
    (role) => role.type === "intern" || (role.type === "community" && role.end && role.end < CAREER_START)
  ).sort((a, b) => b.start - a.start);
  const masters = EDUCATION.find((item) => /master/i.test(item.degree));
  const bachelors = EDUCATION.find((item) => !/master/i.test(item.degree));

  // The current employer's name stays off the home page (by request).
  const rows = work.map((role, i) => ({
    key: `${role.title}-${role.company}`,
    lane: 0,
    kind: i === 0 ? "head" : "commit",
    type: "work",
    date: span(role.start, role.end),
    title: role.title,
    org: role.company === CURRENT_ROLE.company ? "" : role.company,
  }));

  // The master's sits just above the first QA role it ran alongside.
  if (masters && rows.length > 1) {
    rows.splice(rows.length - 1, 0, {
      key: masters.degree,
      lane: 1,
      kind: "branch",
      type: "education",
      date: years(masters.duration),
      title: masters.degree.replace(/\s*\(AI\)/, "").replace(/^Master's degree in/i, "Master's in"),
      org: masters.school,
    });
    if (rows[rows.length - 3].kind !== "head") rows[rows.length - 3].kind = "merge";
  }
  if (rows.length) rows[rows.length - 1].kind = "merge";

  branch.forEach((role) =>
    rows.push({
      key: `${role.title}-${role.company}`,
      lane: 1,
      kind: "branch",
      type: role.type,
      date: span(role.start, role.end),
      title: role.title,
      org: role.company,
    })
  );

  if (bachelors) {
    rows.push({
      key: bachelors.degree,
      lane: 0,
      kind: "root",
      type: "education",
      date: years(bachelors.duration),
      title: bachelors.degree.replace(/\.\s*in/, " in"),
      org: bachelors.school,
    });
  }
  return rows;
})();

/* ------------------------------------------------------------------ */
/* Identity and contact                                                */
/* ------------------------------------------------------------------ */

const contact = contactPageData.contactSection;
const address = contactPageData.addressSection;
const socialLink = (name) => (socialMediaLinks.find((media) => media.name === name) || {}).link;

export const PROFILE = {
  name: greeting.title,
  firstName: greeting.title.split(" ")[0],
  role: greeting.jobTitle,
  company: CURRENT_ROLE.company,
  companyUrl: CURRENT_ROLE.url,
  since: CURRENT_ROLE.start,
  email: contact.email,
  resume: greeting.resumeLink,
  github: greeting.githubProfile,
  linkedin: socialLink("LinkedIn"),
  country: address.country,
  timeZone: contact.timezone,
  utcOffset: contact.utcOffsetMinutes,
  workingHours: contact.workingHours,
  responseTime: contact.responseTime,
  status: availability.status,
  openTo: availability.roles,
  workModes: availability.workModes,
};

/* ------------------------------------------------------------------ */
/* Proof                                                               */
/* ------------------------------------------------------------------ */

export const HIGHLIGHTS = highlights;

// Only quotes that can be traced back to where they were given.
export const RECOMMENDATIONS = (recommendations || []).filter((item) => item && item.quote && item.name && item.link);

/* ------------------------------------------------------------------ */
/* Capabilities: the four skill groups, cleaned for display            */
/* ------------------------------------------------------------------ */

const stripBullet = (text) => text.replace(/^[^A-Za-z0-9]+/, "").trim();

export const CAPABILITIES = skills.data.map((group) => ({
  title: group.title,
  points: group.skills.map(stripBullet),
  tools: (group.softwareSkills || [])
    .filter((tool) => tool.fontAwesomeClassname)
    .map((tool) => ({
      name: tool.skillName,
      icon: tool.fontAwesomeClassname,
      color: (tool.style && tool.style.color) || null,
    })),
}));

/* ------------------------------------------------------------------ */
/* Logo marquee: only names with a real line on the résumé, each with a */
/* caption saying what the connection is                               */
/* ------------------------------------------------------------------ */

const yearOf = (date) => (date ? date.getFullYear() : "now");
const yearSpan = (from, to) => (yearOf(from) === yearOf(to) ? `${yearOf(from)}` : `${yearOf(from)} – ${yearOf(to)}`);
const tidyName = (name) =>
  name
    .replace(/\s+Pvt\.?\s*Ltd\.?$/i, "")
    .replace(/^Github$/i, "GitHub")
    .replace(/\s+College$/i, "")
    .replace(/\s+Mohali$/i, "");

// intel_logo.jpg is Intel Corporation's mark, but that volunteer role was with
// Intel Indexer LLC, a different company, so its logo would say the wrong thing.
const LOGO_MISMATCH = ["Intel Indexer LLC"];

const degreeCaption = (degree) =>
  /master/i.test(degree)
    ? "Master's, Data Science & AI"
    : degree.replace(/\.\s*in\s+/i, ", ").replace(/^B\.Tech/i, "B.Tech");

// The current employer stays off the home page (by request); the Experience
// page still lists it.
export const AFFILIATIONS = COMPANIES.filter((company) => company.name !== CURRENT_ROLE.company)
  .map((company) => ({
    key: company.name,
    name: tidyName(company.name),
    caption: `${yearSpan(company.from, company.to)}${company.type === "intern" ? " · internship" : ""}`,
    logo: company.logo,
  }))
  .concat(
    COMMUNITY.filter((role) => role.logo && LOGO_MISMATCH.indexOf(role.company) === -1).map((role) => ({
      key: `${role.company}-${role.title}`,
      name: tidyName(role.company),
      caption: role.title.replace(new RegExp(`^${role.company}\\s+`, "i"), ""),
      logo: role.logo,
    }))
  )
  .concat(
    EDUCATION.filter((item) => item.logo).map((item) => ({
      key: item.school,
      name: tidyName(item.school),
      caption: degreeCaption(item.degree),
      logo: item.logo,
    }))
  );

/* ------------------------------------------------------------------ */
/* Automation Arsenal pipeline                                          */
/* ------------------------------------------------------------------ */

export const PIPELINE = STAGES.map((stage) => ({
  ...stage,
  tools: automationTools.filter((tool) => tool.stage === stage.id),
}));

export const ARSENAL_TOOLS = automationTools;

// The recruiter brief's short lists: the everyday stack from the first two
// skill groups (minus the generic entries), and the AI agents used for testing
// (the orchestration platforms in the Arsenal are my own builds).
export const CORE_STACK = CAPABILITIES.slice(0, 2)
  .reduce((acc, group) => acc.concat(group.tools.map((tool) => tool.name)), [])
  .filter((name) => !/^(git|maven|gradle|jira|javascript|typescript)$/i.test(name));

export const AI_AGENTS = automationTools
  .filter((tool) => tool.category.indexOf("AI") === 0 && tool.stage !== "orchestrate")
  .map((tool) => tool.name);

// The stack row of the marquee: tools from the skills data whose brand marks
// can be drawn in one colour (simple-icons / ionicons), then the AI agents
// from the Arsenal, which bring their own logos.
const MONO_ICON = /^(simple-icons|ion):|^ion-/;

// Near-black brand colours (Cypress, Gradle) would vanish on dark themes.
const visibleBrand = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const lum = (0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255)) / 255;
  return lum < 0.12 ? null : hex;
};

export const STACK = CAPABILITIES.reduce((acc, group) => acc.concat(group.tools), [])
  .filter((tool) => MONO_ICON.test(tool.icon))
  .filter((tool, i, all) => all.findIndex((other) => other.name === tool.name) === i)
  .map((tool) => ({ key: tool.name, name: tool.name, icon: tool.icon, color: visibleBrand(tool.color) }))
  .concat(
    automationTools
      .filter((tool) => tool.category.indexOf("AI") === 0 && tool.stage !== "orchestrate")
      .map((tool) => ({ key: tool.id, name: tool.name, image: tool.image }))
  );

/* ------------------------------------------------------------------ */
/* Availability: local time in IST and whether I'm inside work hours   */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, "0");
const mod = (n, m) => ((n % m) + m) % m;

export const formatSpan = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
};

const hhmm = (minutes) => `${pad(Math.floor(mod(minutes, 1440) / 60))}:${pad(mod(minutes, 1440) % 60)}`;

export const availabilityAt = (date) => {
  const local = mod(date.getUTCHours() * 60 + date.getUTCMinutes() + PROFILE.utcOffset, 1440);
  const start = PROFILE.workingHours.start * 60;
  const end = PROFILE.workingHours.end * 60;
  const online = local >= start && local < end;
  return {
    online,
    time: hhmm(local),
    until: online ? end - local : mod(start - local, 1440),
  };
};

export const utcLabel = (offset = PROFILE.utcOffset) => {
  const abs = Math.abs(offset);
  return `UTC${offset >= 0 ? "+" : "−"}${Math.floor(abs / 60)}${abs % 60 ? `:${pad(abs % 60)}` : ""}`;
};

/**
 * My working hours in the visitor's own clock, e.g. "06:30–15:30 your time".
 * Null when the visitor is on IST already.
 */
export const workingHoursForVisitor = (date = new Date()) => {
  const visitorOffset = -date.getTimezoneOffset();
  if (visitorOffset === PROFILE.utcOffset) return null;
  const shift = visitorOffset - PROFILE.utcOffset;
  const start = PROFILE.workingHours.start * 60 + shift;
  const end = PROFILE.workingHours.end * 60 + shift;
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch (e) {
    zone = "";
  }
  return { from: hhmm(start), to: hhmm(end), zone: zone.replace(/_/g, " ") };
};

/* ------------------------------------------------------------------ */
/* GitHub: loaded once per visit and shared by every section            */
/* ------------------------------------------------------------------ */

let snapshotRequest = null;

// The owner's picks (portfolio.js featuredProjects) in order, topped up with
// the strongest remaining repos by the Projects page's `signal` score.
const pickFeatured = (repos, count = 3) => {
  const ranked = repos
    .filter((repo) => !repo.fork && !repo.archived && repo.description)
    .sort((a, b) => b.signal - a.signal);
  const picks = (featuredProjects || []).map((name) => ranked.find((repo) => repo.name === name)).filter(Boolean);
  ranked.forEach((repo) => {
    if (picks.length < count && picks.indexOf(repo) === -1) picks.push(repo);
  });
  return picks.slice(0, count);
};

const buildGithub = (snapshot) => {
  if (!snapshot || !Array.isArray(snapshot.repos)) return null;
  const repos = mergeRepos(snapshot.repos);
  const stats = aggregateStats(repos, snapshot.contributions);
  const featured = pickFeatured(repos);
  const days = (snapshot.contributions && snapshot.contributions.contributions) || [];
  return { repos, stats, featured, days, generatedAt: snapshot.generatedAt };
};

/**
 * undefined while loading, null if the snapshot couldn't be read, else the
 * data. Nothing is fetched until `enabled` (the Work section is near).
 */
export const useGithub = (enabled = true) => {
  const [github, setGithub] = useState(undefined);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    if (!snapshotRequest) {
      snapshotRequest = loadSnapshot()
        .then(buildGithub)
        .catch(() => null)
        .then((data) => {
          // A failed load shouldn't stick for the whole visit.
          if (!data) snapshotRequest = null;
          return data;
        });
    }
    snapshotRequest.then((data) => {
      if (alive) setGithub(data);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return github;
};
