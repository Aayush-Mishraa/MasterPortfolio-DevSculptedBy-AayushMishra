/* ------------------------------------------------------------------ */
/* Automation Arsenal — single source of truth                         */
/* Shared by the full page and the home-page preview.                  */
/* ------------------------------------------------------------------ */

/**
 * depth:
 *   flagship  — an original, interactive build
 *   deep-dive — a long-form interactive case study
 *   notes     — a focused field guide with one interactive demo
 * stage: which step of the quality pipeline the tool powers (see STAGES).
 * ring: orbit ring in the hero (0 = inner AI agents, 1 = frameworks, 2 = platforms).
 */
export const automationTools = [
  {
    id: "nova-act",
    name: "Amazon Nova Act",
    category: "AI Agent",
    description:
      "Generative AI-powered agent workflow orchestration for robust test authoring and decision-driven automation.",
    image: "/tool-logos/amazon-nova-act.svg",
    docsPath: "/tools/nova-act.html",
    isReady: true,
    stage: "author",
    depth: "deep-dive",
    ring: 0,
    accent: "#FF9900",
    tags: ["Agent workflows", "Natural-language steps", "Python SDK"],
  },
  {
    id: "playwright",
    name: "Playwright",
    category: "Web Automation",
    description:
      "Modern end-to-end browser automation for reliable, parallel, and cross-browser quality engineering.",
    image: "/tool-logos/playwright.svg",
    docsPath: "/tools/playwright.html",
    isReady: true,
    stage: "execute",
    depth: "deep-dive",
    ring: 1,
    accent: "#2EAD33",
    tags: ["Cross-browser", "Parallel runs", "Auto-waiting"],
  },
  {
    id: "selenium",
    name: "Selenium",
    category: "Web Automation",
    description:
      "Battle-tested browser automation framework used for scalable regression and compatibility test suites.",
    image: "/tool-logos/selenium.svg",
    docsPath: "/tools/selenium.html",
    isReady: true,
    stage: "execute",
    depth: "deep-dive",
    ring: 1,
    accent: "#43B02A",
    tags: ["WebDriver", "Page Object Model", "Regression at scale"],
  },
  {
    id: "testng",
    name: "TestNG",
    category: "Java Test Framework",
    description:
      "Powerful Java test runner for suite orchestration, parallel execution, groups, dependencies, and rich Selenium reporting.",
    image: "/tool-logos/testng.svg",
    docsPath: "/tools/testng-selenium.html",
    isReady: true,
    stage: "execute",
    depth: "deep-dive",
    ring: 1,
    accent: "#E8702A",
    tags: ["Java", "Suites & groups", "Parallel execution"],
  },
  {
    id: "postman",
    name: "Postman",
    category: "API Testing",
    description:
      "API design, validation, and test automation workflows for collections, mocks, and contract checks.",
    image: "/tool-logos/postman.svg",
    docsPath: "/tools/postman.html",
    isReady: true,
    stage: "verify",
    depth: "notes",
    ring: 1,
    accent: "#FF6C37",
    tags: ["Collections", "Mock servers", "Contract checks"],
  },
  {
    id: "browser-use",
    name: "Browser Use AI",
    category: "AI Browser Agent",
    description:
      "Agentic browser interaction layer for workflow simulation, navigation automation, and autonomous QA tasks.",
    image: "/tool-logos/browser-use-ai.svg",
    docsPath: "/tools/browser-use.html",
    isReady: true,
    stage: "execute",
    depth: "notes",
    ring: 0,
    accent: "#8B5CF6",
    tags: ["Agentic navigation", "LLM-driven", "Workflow simulation"],
  },
  {
    id: "kane-ai",
    name: "Kane AI",
    category: "AI Test Assistant",
    description:
      "AI-assisted test generation and optimization for faster coverage, stable suites, and reduced maintenance.",
    image: "/tool-logos/kane-ai.svg",
    docsPath: "/tools/kane-ai.html",
    isReady: true,
    stage: "author",
    depth: "notes",
    ring: 0,
    accent: "#6E56CF",
    tags: ["AI test authoring", "Suite optimization", "Low maintenance"],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    category: "CI/CD",
    description:
      "Pipeline orchestration for build validation, automated test execution, reporting, and release quality gates.",
    image: "/tool-logos/github-actions.svg",
    docsPath: "/tools/github-actions.html",
    isReady: true,
    stage: "ship",
    depth: "deep-dive",
    ring: 2,
    accent: "#2088FF",
    tags: ["Quality gates", "Matrix builds", "Test reports"],
  },
  {
    id: "agentops",
    name: "AgentOps Architecture",
    category: "Agent Orchestration",
    description:
      "Interactive system architecture, diagrams and operator guidance for Claude, Agents and the MCP platform.",
    image: "/tool-logos/agentops.svg",
    docsPath: "/tools/Engineering-OS-Architecture-Interactive.html",
    isReady: true,
    stage: "orchestrate",
    depth: "flagship",
    ring: 2,
    accent: "#D97757",
    tags: ["Claude + MCP", "Agent event tracing", "Clickable system map"],
  },
  {
    id: "neuralforge",
    name: "NeuralForge",
    category: "AI Engineering OS",
    description:
      "Interactive learning and delivery workspace for LLMs, RAG, agents, MCP, evaluation, AI security, and SDET workflows.",
    image: "/tool-logos/neuralforge.svg",
    docsPath: "/tools/neuralforge.html",
    isReady: true,
    stage: "orchestrate",
    depth: "flagship",
    ring: 2,
    accent: "#14B8A6",
    tags: ["LLMs & RAG", "Evals", "AI security", "Skill tree"],
  },
];

export const DEPTHS = {
  flagship: { label: "Flagship build", icon: "fa-solid fa-star" },
  "deep-dive": { label: "Interactive deep-dive", icon: "fa-solid fa-layer-group" },
  notes: { label: "Field guide", icon: "fa-regular fa-compass" },
};

/**
 * The quality pipeline. Terminal lines are arrays of [tone, text] segments;
 * tones map to CSS classes (prompt, cmd, key, txt, dim, ok).
 */
export const STAGES = [
  {
    id: "author",
    index: "01",
    label: "Author",
    icon: "fa-solid fa-wand-magic-sparkles",
    summary: "Turn product intent into test scenarios, with AI doing the first draft.",
    terminal: [
      [["prompt", "$ "], ["cmd", "arsenal stage author --explain"]],
      [["key", "input    "], ["txt", "user stories, acceptance criteria, plain English"]],
      [["key", "kane-ai  "], ["txt", "drafts and optimizes scenarios from intent"]],
      [["key", "nova-act "], ["txt", "turns steps into reliable agent actions"]],
      [["dim", "# a human reviews every generated test before it ships"]],
      [["ok", "✓ "], ["txt", "scenarios ready for execution"]],
    ],
  },
  {
    id: "execute",
    index: "02",
    label: "Execute",
    icon: "fa-solid fa-play",
    summary: "Run suites across browsers in parallel, from Java grids to agentic flows.",
    terminal: [
      [["prompt", "$ "], ["cmd", "arsenal stage execute --parallel --browsers all"]],
      [["key", "playwright  "], ["txt", "chromium · firefox · webkit, auto-waiting"]],
      [["key", "selenium    "], ["txt", "page-object regression across real browsers"]],
      [["key", "testng      "], ["txt", "groups, dependencies, parallel suites"]],
      [["key", "browser-use "], ["txt", "LLM-driven exploratory walkthroughs"]],
      [["ok", "✓ "], ["txt", "results streamed to the report"]],
    ],
  },
  {
    id: "verify",
    index: "03",
    label: "Verify APIs",
    icon: "fa-solid fa-plug-circle-check",
    summary: "Lock down the contracts underneath the UI before they can break it.",
    terminal: [
      [["prompt", "$ "], ["cmd", "arsenal stage verify --contracts"]],
      [["key", "postman "], ["txt", "collections for every critical endpoint"]],
      [["key", "mocks   "], ["txt", "unblock UI tests while services evolve"]],
      [["key", "asserts "], ["txt", "status, schema, latency, auth flows"]],
      [["ok", "✓ "], ["txt", "contracts green, UI layer unblocked"]],
    ],
  },
  {
    id: "ship",
    index: "04",
    label: "Ship",
    icon: "fa-solid fa-rocket",
    summary: "Every pull request passes a quality gate before it reaches users.",
    terminal: [
      [["prompt", "$ "], ["cmd", "arsenal stage ship --on pull_request"]],
      [["key", "github-actions "], ["txt", "build → test → report → gate"]],
      [["key", "matrix         "], ["txt", "browsers × environments in parallel"]],
      [["key", "artifacts      "], ["txt", "traces, screenshots, HTML reports"]],
      [["dim", "# red gate = no merge. quality is enforced, not requested."]],
      [["ok", "✓ "], ["txt", "release candidate approved"]],
    ],
  },
  {
    id: "orchestrate",
    index: "05",
    label: "Orchestrate",
    icon: "fa-solid fa-diagram-project",
    summary: "Design the agent platforms that tie the whole system together.",
    terminal: [
      [["prompt", "$ "], ["cmd", "arsenal stage orchestrate --trace"]],
      [["key", "agentops    "], ["txt", "Claude + MCP architecture, every event traced"]],
      [["key", "neuralforge "], ["txt", "LLMs, RAG, evals and AI security in one OS"]],
      [["key", "loop        "], ["txt", "observe → evaluate → improve"]],
      [["ok", "✓ "], ["txt", "pipeline online · all stages connected"]],
    ],
  },
];

/** Capability claims for recruiters, each backed by the case studies that prove it. */
export const PROOFS = [
  {
    icon: "fa-solid fa-cubes",
    title: "Builds frameworks from zero",
    body: "Page-object architecture, suite design and parallel execution across Java and TypeScript stacks.",
    tools: ["selenium", "testng", "playwright"],
  },
  {
    icon: "fa-solid fa-robot",
    title: "Puts AI agents to work in QA",
    body: "Uses agentic tools to author and run tests, with human review kept in the loop.",
    tools: ["nova-act", "browser-use", "kane-ai"],
  },
  {
    icon: "fa-solid fa-code-branch",
    title: "Makes quality a pipeline, not a phase",
    body: "API contracts and UI suites wired into CI so every change is gated automatically.",
    tools: ["github-actions", "postman"],
  },
  {
    icon: "fa-solid fa-network-wired",
    title: "Architects agent platforms end to end",
    body: "Original interactive systems covering MCP, agent tracing, RAG, evals and AI security.",
    tools: ["agentops", "neuralforge"],
  },
];

/**
 * "Which tool, when?" Real situations, the tool I'd reach for, and why.
 * `instead` names the tempting wrong choice, which is where the judgement shows.
 */
export const SCENARIOS = [
  {
    id: "cross-browser",
    icon: "fa-solid fa-globe",
    prompt: "Regression across Chrome, Firefox and Safari on every pull request",
    tool: "playwright",
    why: [
      "One API drives Chromium, Firefox and WebKit, so Safari's engine is covered in CI",
      "Auto-waiting and web-first assertions remove most timing flakiness",
      "Parallel workers and sharding keep a PR gate under a few minutes",
    ],
    instead: { tool: "browser-use", note: "An AI agent is non-deterministic, which is wrong for a merge gate." },
  },
  {
    id: "java-grid",
    icon: "fa-brands fa-java",
    prompt: "A large Java codebase that already runs on a Selenium Grid",
    tool: "testng",
    why: [
      "Reuse the existing grid, page objects and the team's Java skills",
      "TestNG groups, dependencies and parallel suites organise big regression packs",
      "Migrating working coverage for its own sake is cost with no new signal",
    ],
    instead: { tool: "playwright", note: "Great for new suites, but a rewrite of a healthy one rarely pays off." },
  },
  {
    id: "renamed-field",
    icon: "fa-solid fa-code-compare",
    prompt: "An API field was renamed and the UI broke silently",
    tool: "postman",
    why: [
      "A schema check fails at the source, with the exact field named",
      "Runs in seconds on every PR, long before a browser starts",
      "One contract test replaces symptoms scattered across many UI tests",
    ],
    instead: { tool: "selenium", note: "More UI tests find the symptom late and blame the wrong layer." },
  },
  {
    id: "ui-churn",
    icon: "fa-solid fa-shuffle",
    prompt: "The UI changes every sprint and selectors keep breaking",
    tool: "browser-use",
    why: [
      "Goal-based agent runs target intent, not DOM structure",
      "Good for nightly exploratory passes over fast-moving screens",
      "Pair it with a backend check so a pass is proof, not a claim",
    ],
    instead: { tool: "selenium", note: "Brittle CSS/XPath locators turn every redesign into test maintenance." },
  },
  {
    id: "drafts",
    icon: "fa-solid fa-wand-magic-sparkles",
    prompt: "A backlog of acceptance criteria and no time to script them",
    tool: "kane-ai",
    why: [
      "Plain-English intent becomes a runnable first draft in minutes",
      "Proposes the negative and boundary cases people tend to skip",
      "Every draft is reviewed before it joins CI: AI drafts, humans approve",
    ],
    instead: { tool: "nova-act", note: "Better for agent-driven workflows than bulk test authoring." },
  },
  {
    id: "red-merges",
    icon: "fa-solid fa-code-branch",
    prompt: "Red builds still get merged because nothing blocks them",
    tool: "github-actions",
    why: [
      "Required status checks make a failing suite a hard stop",
      "Matrix jobs run browsers × environments in parallel",
      "Traces, screenshots and reports are attached to every run",
    ],
    instead: { tool: "postman", note: "Great checks, but without a gate they're only a suggestion." },
  },
  {
    id: "agent-blackbox",
    icon: "fa-solid fa-eye",
    prompt: "Our AI agents take actions and no one can see what they did",
    tool: "agentops",
    why: [
      "Every tool call and decision lands on one traced timeline",
      "Clear boundaries: what an agent may read vs what it may change",
      "Designed around Claude and MCP, the way production agent systems are built",
    ],
    instead: { tool: "browser-use", note: "Adding more agents before adding observability multiplies the blind spots." },
  },
  {
    id: "upskill",
    icon: "fa-solid fa-graduation-cap",
    prompt: "The QA team needs to get fluent in LLMs, RAG and evals",
    tool: "neuralforge",
    why: [
      "A structured roadmap and skill tree from fundamentals to agents",
      "Hands-on labs for RAG, evaluation and AI security",
      "An AI × QA track that connects it back to testing work",
    ],
    instead: { tool: "kane-ai", note: "Using AI tools without the fundamentals makes it hard to judge their output." },
  },
];

/** Bento order for the full grid: flagships sit where they can span two columns. */
export const GRID_ORDER = [
  "neuralforge",
  "nova-act",
  "playwright",
  "agentops",
  "selenium",
  "testng",
  "github-actions",
  "postman",
  "browser-use",
  "kane-ai",
];

export const toolById = (id) => automationTools.find((tool) => tool.id === id);
