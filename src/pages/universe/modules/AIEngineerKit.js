import React, { useEffect, useMemo, useState } from "react";
import { fetchOpenRouterModels } from "../../../services/universe/sources";
import { FeedState, Monogram, PageHead, SectionTitle, Skeletons, Sync, copyText } from "../lib/kit";
import { useFeed, useLocalState } from "../lib/useFeed";
import "./AIEngineerKit.css";

/* ------------------------------------------------------------------ */
/* Static knowledge                                                    */
/* ------------------------------------------------------------------ */

const PROVIDERS = [
  { name: "OpenRouter", what: "One API for hundreds of models; models tagged :free cost nothing within daily limits.", url: "https://openrouter.ai/models?max_price=0", tag: "Router" },
  { name: "Google AI Studio", what: "Gemini API key in a minute, with a rate-limited free tier.", url: "https://ai.google.dev/pricing", tag: "Gemini" },
  { name: "Groq", what: "Very fast inference for open models, with a free rate-limited tier.", url: "https://console.groq.com/docs/rate-limits", tag: "Speed" },
  { name: "GitHub Models", what: "Try frontier and open models free for prototyping with your GitHub account.", url: "https://docs.github.com/en/github-models", tag: "Prototyping" },
  { name: "Hugging Face", what: "Inference Providers with monthly free credits, plus thousands of open models.", url: "https://huggingface.co/docs/inference-providers", tag: "Open models" },
  { name: "Cloudflare Workers AI", what: "Serverless models at the edge with a daily free allocation.", url: "https://developers.cloudflare.com/workers-ai/platform/pricing/", tag: "Edge" },
  { name: "Mistral", what: "La Plateforme offers a free experiment tier for building and testing.", url: "https://mistral.ai/pricing", tag: "EU" },
  { name: "Ollama", what: "Run open models on your own machine. Free, private and offline.", url: "https://ollama.com", tag: "Local" },
];

const ROADMAP = [
  {
    stage: "Foundations",
    icon: "fa-solid fa-cubes",
    items: ["Python or TypeScript fluency", "REST APIs, JSON and streaming", "Tokens, context windows and pricing", "Git, environments and secrets hygiene"],
  },
  {
    stage: "Prompting",
    icon: "fa-solid fa-message",
    items: ["System prompts and roles", "Few-shot examples", "Structured output (JSON schema)", "Prompt versioning"],
  },
  {
    stage: "RAG",
    icon: "fa-solid fa-magnifying-glass-chart",
    items: ["Embeddings and similarity", "Chunking strategies", "Vector databases", "Reranking and hybrid search"],
  },
  {
    stage: "Agents & tools",
    icon: "fa-solid fa-robot",
    items: ["Function / tool calling", "Model Context Protocol (MCP)", "Planning and memory", "Browser and computer-use agents"],
  },
  {
    stage: "Evals & testing",
    icon: "fa-solid fa-vial-circle-check",
    items: ["Golden datasets", "LLM-as-judge evals", "Regression tests for prompts", "Red-teaming and jailbreak tests"],
  },
  {
    stage: "Ship it",
    icon: "fa-solid fa-rocket",
    items: ["Caching and cost control", "Latency and streaming UX", "Observability and tracing", "Guardrails and safety filters"],
  },
];

const PRESETS = [
  { id: "chat", label: "Chat assistant", requests: 1000, input: 1500, output: 400 },
  { id: "rag", label: "RAG over docs", requests: 500, input: 6000, output: 500 },
  { id: "agent", label: "Coding agent", requests: 50, input: 60000, output: 8000 },
  { id: "qa", label: "Test-case generator", requests: 200, input: 3000, output: 2500 },
];

const money = (value) =>
  value >= 1000 ? `$${Math.round(value).toLocaleString("en-US")}` : value >= 1 ? `$${value.toFixed(2)}` : value > 0 ? `$${value.toFixed(4)}` : "$0";

const snippets = (model) => ({
  curl: `curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Write 5 test cases for a login form."}]
  }'`,
  javascript: `const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "${model}",
    messages: [{ role: "user", content: "Write 5 test cases for a login form." }],
  }),
});
const data = await response.json();
console.log(data.choices[0].message.content);`,
  python: `import os, requests

response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"},
    json={
        "model": "${model}",
        "messages": [{"role": "user", "content": "Write 5 test cases for a login form."}],
    },
)
print(response.json()["choices"][0]["message"]["content"])`,
});

const ctx = (tokens) => (tokens >= 1e6 ? `${(tokens / 1e6).toFixed(1).replace(/\.0$/, "")}M` : `${Math.round(tokens / 1000)}k`);

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const CopyButton = ({ text, label = "Copy" }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ai-copy"
      onClick={() =>
        copyText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }, () => {})
      }
    >
      <i className={done ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" /> {done ? "Copied" : label}
    </button>
  );
};

const Calculator = ({ models }) => {
  const byId = useMemo(() => Object.fromEntries(models.map((model) => [model.id, model])), [models]);
  const defaults = useMemo(() => {
    const paid = models.filter((model) => !model.free && model.input > 0).sort((a, b) => b.created - a.created);
    const picks = ["anthropic/", "openai/", "google/"].map((prefix) => paid.find((model) => model.id.startsWith(prefix))).filter(Boolean);
    return (picks.length === 3 ? picks : paid.slice(0, 3)).map((model) => model.id);
  }, [models]);
  const [picked, setPicked] = useState([]);
  const [drafts, setDrafts] = useState(["", "", ""]);
  const [usage, setUsage] = useState(PRESETS[0]);

  useEffect(() => {
    if (!picked.length && defaults.length) {
      setPicked(defaults);
      setDrafts(defaults);
    }
  }, [defaults, picked.length]);

  const rows = picked
    .map((id) => byId[id])
    .filter(Boolean)
    .map((model) => {
      const perRequest = (usage.input * model.input + usage.output * model.output) / 1e6;
      return { model, perRequest, monthly: perRequest * usage.requests * 30 };
    });
  const max = Math.max(0.0001, ...rows.map((row) => row.monthly));

  const setSlot = (index, value) => {
    setDrafts((list) => list.map((item, i) => (i === index ? value : item)));
    if (byId[value]) setPicked((list) => {
      const next = [...list];
      next[index] = value;
      return next;
    });
  };

  const setNumber = (key) => (event) => setUsage((current) => ({ ...current, id: "custom", [key]: Math.max(0, Number(event.target.value) || 0) }));

  return (
    <div className="uv-panel ai-calc">
      <div className="ai-calc-inputs">
        <div className="ai-presets" role="group" aria-label="Usage preset">
          {PRESETS.map((preset) => (
            <button key={preset.id} type="button" className={usage.id === preset.id ? "is-active" : ""} onClick={() => setUsage(preset)}>
              {preset.label}
            </button>
          ))}
        </div>
        <div className="ai-numbers">
          <label>
            <span>Requests / day</span>
            <input className="uv-input uv-input--mono" type="number" min="0" value={usage.requests} onChange={setNumber("requests")} />
          </label>
          <label>
            <span>Input tokens / request</span>
            <input className="uv-input uv-input--mono" type="number" min="0" value={usage.input} onChange={setNumber("input")} />
          </label>
          <label>
            <span>Output tokens / request</span>
            <input className="uv-input uv-input--mono" type="number" min="0" value={usage.output} onChange={setNumber("output")} />
          </label>
        </div>
        <div className="ai-picks">
          {[0, 1, 2].map((index) => (
            <label key={index}>
              <span>Model {index + 1}</span>
              <input
                className="uv-input uv-input--mono"
                list="ai-model-ids"
                value={drafts[index] || ""}
                onChange={(event) => setSlot(index, event.target.value)}
                placeholder="type to search model ids…"
              />
            </label>
          ))}
          <datalist id="ai-model-ids">
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </datalist>
        </div>
      </div>
      <div className="ai-calc-out">
        <span className="ai-calc-caption">
          Monthly cost for {(usage.requests * 30).toLocaleString("en-US")} requests
        </span>
        {rows.map((row) => (
          <div key={row.model.id} className="ai-bar">
            <div className="ai-bar-head">
              <strong>{row.model.name}</strong>
              <b>{money(row.monthly)}</b>
            </div>
            <div className="ai-bar-track">
              <i style={{ "--w": `${Math.max(1.5, (row.monthly / max) * 100)}%` }} />
            </div>
            <span className="ai-bar-note">
              {money(row.perRequest)} per request · ${row.model.input.toFixed(2)} in / ${row.model.output.toFixed(2)} out per 1M
            </span>
          </div>
        ))}
        {!rows.length && <p className="ai-muted">Pick models to compare.</p>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AIEngineerKit({ now }) {
  const catalogue = useFeed("openrouter:models", fetchOpenRouterModels, { ttl: 60 * 60 * 1000 });
  const [lang, setLang] = useState("curl");
  const [done, setDone] = useLocalState("ai:roadmap", {});
  const models = catalogue.data || [];
  const free = useMemo(() => models.filter((model) => model.free).sort((a, b) => b.context - a.context), [models]);
  const [snippetModel, setSnippetModel] = useState("");
  const chosen = snippetModel || (free[0] && free[0].id) || "openrouter/auto";

  const total = ROADMAP.reduce((sum, stage) => sum + stage.items.length, 0);
  const ticked = Object.values(done).filter(Boolean).length;
  const progress = Math.round((ticked / total) * 100);

  return (
    <div className="ai">
      <PageHead kicker="AI Engineer Kit" title="Build with LLMs, *starting for free*" aside={<Sync feed={catalogue} now={now} />}>
        Which models you can call for free today, what a real workload would cost, copy-paste starter code, and a roadmap
        from your first prompt to shipping evaluated AI features.
      </PageHead>

      <section>
        <SectionTitle icon="fa-solid fa-gift" title="Free LLMs right now" meta={free.length ? `${free.length} models · live` : null} />
        {!catalogue.data && !catalogue.error ? (
          <Skeletons count={6} />
        ) : (
          <FeedState feed={catalogue}>
            <div className="uv-grid ai-free">
              {free.slice(0, 12).map((model, index) => (
                <article key={model.id} className="uv-card" style={{ "--i": index }}>
                  <div className="ai-free-head">
                    <Monogram text={model.provider} />
                    <div>
                      <strong>{model.name.replace(/\s*\(free\)\s*/i, "")}</strong>
                      <code>{model.id}</code>
                    </div>
                  </div>
                  {model.description && <p className="uv-clamp-2 ai-muted">{model.description}</p>}
                  <div className="uv-meta">
                    <span>{ctx(model.context)} context</span>
                    <span>{model.inputs.join(" + ")}</span>
                    {model.tools && <span className="uv-tag uv-tag--muted">tools</span>}
                  </div>
                  <div className="uv-row">
                    <CopyButton text={model.id} label="Copy id" />
                    <button type="button" className="ai-copy" onClick={() => { setSnippetModel(model.id); document.getElementById("ai-quickstart").scrollIntoView({ behavior: "smooth" }); }}>
                      <i className="fa-solid fa-code" aria-hidden="true" /> Use in code
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </FeedState>
        )}
      </section>

      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-calculator" title="Token cost calculator" meta="live prices, USD" />
        {models.length ? <Calculator models={models} /> : <Skeletons count={1} />}
      </section>

      <section className="uv-block" id="ai-quickstart">
        <SectionTitle icon="fa-solid fa-terminal" title="Quickstart" meta={chosen} />
        <div className="ai-code">
          <div className="ai-code-bar">
            {["curl", "javascript", "python"].map((item) => (
              <button key={item} type="button" className={lang === item ? "is-active" : ""} onClick={() => setLang(item)}>
                {item}
              </button>
            ))}
            <CopyButton text={snippets(chosen)[lang]} />
          </div>
          <pre>
            <code>{snippets(chosen)[lang]}</code>
          </pre>
        </div>
        <p className="ai-muted ai-note">
          Get a key at openrouter.ai and keep it in an environment variable. Never put it in front-end code.
        </p>
      </section>

      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-door-open" title="Free tiers & playgrounds" meta="curated" />
        <div className="uv-grid ai-providers">
          {PROVIDERS.map((provider, index) => (
            <a key={provider.name} className="uv-card" href={provider.url} target="_blank" rel="noopener noreferrer" style={{ "--i": index }}>
              <div className="ai-provider-head">
                <Monogram text={provider.name} />
                <strong>{provider.name}</strong>
                <span className="uv-tag uv-tag--muted">{provider.tag}</span>
              </div>
              <p className="ai-muted">{provider.what}</p>
            </a>
          ))}
        </div>
        <p className="ai-muted ai-note">Free tiers change often. Check each provider's pricing page before you rely on one.</p>
      </section>

      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-route" title="AI engineer roadmap" meta={`${ticked}/${total} skills · saved in this browser`} />
        <div className="ai-roadmap">
          <div className="ai-progress" style={{ "--p": progress }}>
            <strong>{progress}%</strong>
            <span>ready</span>
          </div>
          <ol className="ai-stages">
            {ROADMAP.map((stage, stageIndex) => {
              const count = stage.items.filter((item) => done[`${stage.stage}:${item}`]).length;
              return (
                <li key={stage.stage} className={count === stage.items.length ? "is-done" : ""}>
                  <header>
                    <span className="ai-stage-num">{stageIndex + 1}</span>
                    <i className={stage.icon} aria-hidden="true" />
                    <strong>{stage.stage}</strong>
                    <em>
                      {count}/{stage.items.length}
                    </em>
                  </header>
                  <ul>
                    {stage.items.map((item) => {
                      const key = `${stage.stage}:${item}`;
                      return (
                        <li key={item}>
                          <label>
                            <input type="checkbox" checked={Boolean(done[key])} onChange={() => setDone((map) => ({ ...map, [key]: !map[key] }))} />
                            <span>{item}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}
