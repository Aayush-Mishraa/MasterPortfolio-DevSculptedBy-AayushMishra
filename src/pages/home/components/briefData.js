import { AI_AGENTS, CAREER_START, CORE_STACK, EDUCATION, HIGHLIGHTS, PROFILE, formatMonth, utcLabel, yearsSince } from "../homeData";

/*
  The recruiter brief's content, shared by the home page's brief (the modal
  with the film) and /hire-me (F10), so both always say the same thing.
*/

export function briefFacts(years = yearsSince(CAREER_START)) {
  return [
    {
      label: "Now",
      value: PROFILE.role,
      note: `Leading the QA team since ${formatMonth(PROFILE.since)}`,
    },
    {
      label: "Experience",
      value: `${years}+ years in QA automation`,
      note: `Full-time since ${formatMonth(CAREER_START)}`,
    },
    {
      label: "Open to",
      value: PROFILE.openTo.join(" · "),
      note: PROFILE.workModes,
    },
    {
      label: "Location",
      value: PROFILE.country,
      note: `IST (${utcLabel()}) · replies in ${PROFILE.responseTime}`,
    },
    {
      label: "Core stack",
      value: CORE_STACK.slice(0, 6).join(" · "),
      note: CORE_STACK.slice(6).join(" · "),
    },
    {
      label: "AI testing",
      value: AI_AGENTS.join(" · "),
      note: "Agentic test authoring, with a human reviewing every test",
    },
    {
      label: "Education",
      value: EDUCATION.map((item) => item.degree.replace(/\s*\(AI\)/, "")).join(" · "),
      note: EDUCATION.map((item) => item.school).join(" · "),
    },
  ];
}

/** The highlight lines; GitHub contributions only once the snapshot is loaded. */
export function briefProof(github) {
  const contributions = github && github.stats ? github.stats.contributions : null;
  return [HIGHLIGHTS.testCases, HIGHLIGHTS.bugs, HIGHLIGHTS.suites]
    .map((item) => `${item.value} ${item.label}`)
    .concat(contributions ? [`${contributions.toLocaleString("en-US")} GitHub contributions in the last year`] : []);
}

/** The brief as plain text, for ATS notes. */
export function briefPlainText(facts, proof, origin) {
  return [`${PROFILE.name} — ${PROFILE.role}`]
    .concat(facts.map((fact) => `${fact.label}: ${fact.value}${fact.note ? ` (${fact.note})` : ""}`))
    .concat([
      `Highlights: ${proof.join(" · ")}`,
      `Résumé: ${PROFILE.resume}`,
      `Email: ${PROFILE.email}`,
      `LinkedIn: ${PROFILE.linkedin}`,
      `GitHub: ${PROFILE.github}`,
      `Portfolio: ${origin}`,
    ])
    .join("\n");
}
