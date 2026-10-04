/*
  F23: the AI-Agent Readiness quiz. 12 questions, four answers each, worth
  0–3 points in the order listed (the page shows them in this order too: from
  "not yet" to "solid"). Score = points ÷ 36 × 100.

  Answers travel as a 12-digit string ("012302..."): in the emailed report
  link (?r=) and to api/magnet.php, which only checks the format.
*/

export const AREAS = {
  evals: "Evals & quality",
  security: "Security",
  safety: "Safety & privacy",
  ops: "Operations",
};

export const QUESTIONS = [
  {
    area: "evals",
    q: "How do you know a prompt or model change made answers better, not worse?",
    options: [
      "We try a few prompts by hand",
      "A shared list of test prompts we check manually",
      "An automated eval set we run before releases",
      "Automated evals in CI on every change, with score thresholds",
    ],
    tip: "Build a small eval set (30–50 real questions with expected answers or rubrics) and run it on every prompt, model or retrieval change. A score that moves is the only safe signal that a change helped.",
  },
  {
    area: "evals",
    q: "Where do your eval cases come from?",
    options: [
      "We don't have eval cases yet",
      "The team wrote them",
      "Team-written plus real user questions",
      "Real traffic, past failures and edge cases, refreshed regularly",
    ],
    tip: "Seed evals from real usage: sampled production questions, every bug report, and the edge cases support sees. Team-written cases test what you expect; real ones test what users do.",
  },
  {
    area: "evals",
    q: "How do you check answers are grounded in your sources (no hallucinations)?",
    options: [
      "We don't, yet",
      "Spot checks now and then",
      "LLM-as-judge or reference checks on a sample",
      "Automated faithfulness scoring, with the judge calibrated against human ratings",
    ],
    tip: "Score faithfulness automatically: every claim in an answer should trace to retrieved context. Use an LLM judge, but calibrate it against 50–100 human ratings first, or you're measuring the judge.",
  },
  {
    area: "security",
    q: "Have you tested prompt injection, both typed in and hidden in retrieved content or tool results?",
    options: [
      "No",
      "We tried a few jailbreaks",
      "A suite of injection tests, including indirect injection",
      "An injection suite in CI plus red-teaming before launches",
    ],
    tip: "Test indirect injection, not just jailbreaks: instructions planted in a web page, PDF, email or tool output your system reads. Keep the attacks as a regression suite; new model versions reopen old holes.",
  },
  {
    area: "security",
    q: "What can your agent's tools do without a human approving it?",
    options: [
      "Anything the API key allows",
      "We trust the model to ask first",
      "Scoped permissions; destructive actions need confirmation",
      "Least privilege, allow-lists, confirmations and an audit log of every tool call",
    ],
    tip: "Assume the model will eventually be talked into calling any tool it has. Give each tool the least privilege possible, put confirmations on anything destructive or costly, and log every call.",
  },
  {
    area: "safety",
    q: "How do you stop toxic, unsafe or off-brand output?",
    options: [
      "We rely on the model provider",
      "The system prompt asks it to behave",
      "Moderation or guardrail checks on the output",
      "Input and output guardrails, tested with an adversarial set",
    ],
    tip: "A system prompt is a request, not a control. Add an output check (moderation API or a classifier) and test it with an adversarial set so you know its miss rate.",
  },
  {
    area: "safety",
    q: "What happens to personal data in prompts and logs?",
    options: [
      "Not sure",
      "It's logged as is",
      "Redacted from logs; we've reviewed the provider's data retention",
      "Minimised, redacted, with a retention policy and a DPA with each provider",
    ],
    tip: "Map where prompts go: your logs, the provider, any eval tooling. Redact personal data before logging, check the provider's retention and training settings, and sign a DPA.",
  },
  {
    area: "ops",
    q: "What do you monitor in production?",
    options: [
      "Nothing specific to AI",
      "Errors and latency",
      "Errors, latency, cost, token use and user feedback",
      "All that, plus sampled quality scoring and drift alerts",
    ],
    tip: "Score a sample of live answers with the same evals you run in CI, and alert when the score drops. Quality degrades silently: provider updates, new content, new kinds of users.",
  },
  {
    area: "ops",
    q: "When the model is slow, down or unsure, what does the user get?",
    options: [
      "An error or an endless spinner",
      "A retry",
      "A timeout with a graceful fallback",
      "A fallback model or path, and the product says when it isn't sure",
    ],
    tip: "Design the unhappy path: a timeout, a fallback (smaller model, cached answer, human handoff) and honest \"I'm not sure\" answers. Test it by killing the provider in staging.",
  },
  {
    area: "ops",
    q: "Can you roll back a prompt or model change in minutes?",
    options: [
      "No: prompts are scattered in code and the model version floats",
      "Yes, with a full redeploy",
      "Prompts and model versions are pinned and versioned",
      "Behind flags, with staged rollout and instant rollback",
    ],
    tip: "Pin model versions, keep prompts versioned in one place, and ship changes behind a flag so a bad one is a toggle, not a deploy.",
  },
  {
    area: "ops",
    q: "Do you know the cost per conversation or task, and do you have limits?",
    options: [
      "No",
      "We see the monthly bill",
      "We track cost per request",
      "Budgets, per-user limits and alerts",
    ],
    tip: "Track tokens and cost per request and per user, set per-user and daily limits, and alert on spikes. Agents in loops and abusive users are how a monthly bill becomes a daily one.",
  },
  {
    area: "evals",
    q: "Who signs off AI quality before a launch?",
    options: [
      "Nobody in particular",
      "The developer who built it",
      "Product and engineering review the eval results",
      "A defined release gate: eval thresholds, a safety review and a named owner",
    ],
    tip: "Make it a gate, not a feeling: agreed eval thresholds, a safety and injection review, and one named owner who signs off, just like any other release.",
  },
];

export const MAX_POINTS = QUESTIONS.length * 3;

export function decode(code) {
  if (!/^[0-3]{12}$/.test(code || "")) return null;
  return code.split("").map(Number);
}

export function scoreOf(answers) {
  const points = answers.reduce((sum, value) => sum + value, 0);
  return Math.round((points / MAX_POINTS) * 100);
}

export function areaScores(answers) {
  return Object.keys(AREAS).map((area) => {
    const indexes = QUESTIONS.map((question, index) => (question.area === area ? index : -1)).filter((index) => index >= 0);
    const points = indexes.reduce((sum, index) => sum + answers[index], 0);
    return { area, label: AREAS[area], score: Math.round((points / (indexes.length * 3)) * 100) };
  });
}

export function verdict(score) {
  if (score >= 90) return { label: "Launch-ready", text: "You test AI features like the rest of your product. Keep the evals growing with real traffic." };
  if (score >= 70) return { label: "Ready, with gaps", text: "The basics are there. Close the gaps below before your next big launch or model change." };
  if (score >= 40) return { label: "Getting there", text: "Some safety nets exist, but a model or prompt change could still ship a regression nobody sees." };
  return { label: "Not ready yet", text: "Right now quality depends on luck and manual checks. The good news: the first steps are cheap." };
}

/** The weakest answers first (lowest points, then question order). */
export function gaps(answers) {
  return QUESTIONS.map((question, index) => ({ ...question, index, points: answers[index] }))
    .filter((item) => item.points < 3)
    .sort((a, b) => a.points - b.points || a.index - b.index);
}
