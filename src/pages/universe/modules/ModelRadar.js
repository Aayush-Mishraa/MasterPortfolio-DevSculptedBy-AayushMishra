import React, { useMemo, useState } from "react";
import { fetchOpenRouterModels, fetchTrendingModels } from "../../../services/universe/sources";
import { timeAgo } from "../../../services/github/githubData";
import { Chips, FeedState, Monogram, PageHead, SectionTitle, Skeletons, Stat, Sync, compact } from "../lib/kit";
import { useFeed } from "../lib/useFeed";
import "./ModelRadar.css";

const PIPELINES = [
  { id: "", label: "All" },
  { id: "text-generation", label: "Text / LLM" },
  { id: "image-text-to-text", label: "Vision" },
  { id: "text-to-image", label: "Image gen" },
  { id: "text-to-speech", label: "Speech" },
  { id: "automatic-speech-recognition", label: "Transcription" },
  { id: "feature-extraction", label: "Embeddings" },
];

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "cheap", label: "Cheapest" },
  { id: "context", label: "Longest context" },
];

const MODALITY_ICON = {
  text: "fa-solid fa-font",
  image: "fa-regular fa-image",
  audio: "fa-solid fa-wave-square",
  video: "fa-solid fa-film",
  file: "fa-regular fa-file-lines",
};

const price = (value) => (value === 0 ? "free" : value < 0.01 ? "<$0.01" : `$${value >= 10 ? value.toFixed(0) : value.toFixed(2)}`);

const context = (tokens) => (tokens >= 1e6 ? `${(tokens / 1e6).toFixed(tokens % 1e6 ? 1 : 0)}M` : `${Math.round(tokens / 1000)}k`);

const HFCard = ({ model, index, max }) => (
  <a className="uv-card mr-hf" href={model.url} target="_blank" rel="noopener noreferrer" style={{ "--i": index }}>
    <div className="mr-hf-head">
      <Monogram text={model.org} />
      <div>
        <strong className="uv-clamp-2">{model.name}</strong>
        <span>{model.org}</span>
      </div>
      <b className="mr-hf-rank">#{index + 1}</b>
    </div>
    <div className="mr-trend" aria-label={`Trending score ${model.trending}`}>
      <i style={{ "--w": `${Math.max(4, (model.trending / max) * 100)}%` }} />
    </div>
    <div className="uv-meta">
      {model.pipeline && <span className="uv-tag uv-tag--muted">{model.pipeline.replace(/-/g, " ")}</span>}
      <span>
        <i className="fa-solid fa-heart" aria-hidden="true" /> {compact(model.likes)}
      </span>
      <span>
        <i className="fa-solid fa-download" aria-hidden="true" /> {compact(model.downloads)}
      </span>
      {model.license && <span>{model.license}</span>}
    </div>
  </a>
);

const LLMRow = ({ model, now }) => (
  <li className="mr-llm">
    <div className="mr-llm-name">
      <Monogram text={model.provider} size={32} />
      <div>
        <strong>{model.name}</strong>
        <code>{model.id}</code>
      </div>
    </div>
    <div className="mr-llm-caps">
      {model.inputs.map((modality) => (
        <i key={modality} className={MODALITY_ICON[modality] || "fa-solid fa-circle"} title={`${modality} input`} aria-label={`${modality} input`} />
      ))}
      {model.tools && <span className="uv-tag uv-tag--muted">tools</span>}
      {model.reasoning && <span className="uv-tag uv-tag--muted">reasoning</span>}
    </div>
    <span className="mr-llm-ctx">{context(model.context)}</span>
    <span className="mr-llm-price">
      {model.free ? (
        <span className="uv-tag mr-free">FREE</span>
      ) : (
        <>
          {price(model.input)} <small>in</small> · {price(model.output)} <small>out</small>
        </>
      )}
    </span>
    <span className="mr-llm-age">{model.created ? timeAgo(model.created, now) : "—"}</span>
  </li>
);

export default function ModelRadar({ now }) {
  const [pipeline, setPipeline] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [freeOnly, setFreeOnly] = useState(false);
  const [limit, setLimit] = useState(20);

  const hf = useFeed(`hf:models:${pipeline || "all"}`, () => fetchTrendingModels(pipeline), { ttl: 30 * 60 * 1000 });
  const catalogue = useFeed("openrouter:models", fetchOpenRouterModels, { ttl: 60 * 60 * 1000 });

  const models = catalogue.data || [];
  const stats = useMemo(() => {
    const month = Date.now() - 30 * 86400000;
    return {
      total: models.length,
      free: models.filter((model) => model.free).length,
      providers: new Set(models.map((model) => model.provider)).size,
      fresh: models.filter((model) => model.created > month).length,
      longest: models.reduce((best, model) => (model.context > (best?.context || 0) ? model : best), null),
    };
  }, [models]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = models.filter(
      (model) =>
        (!freeOnly || model.free) &&
        (!needle || model.id.toLowerCase().includes(needle) || model.name.toLowerCase().includes(needle))
    );
    const by = {
      new: (a, b) => b.created - a.created,
      cheap: (a, b) => a.input + a.output - (b.input + b.output) || b.context - a.context,
      context: (a, b) => b.context - a.context,
    }[sort];
    return filtered.sort(by);
  }, [models, query, sort, freeOnly]);

  const maxTrend = hf.data && hf.data.length ? Math.max(...hf.data.map((model) => model.trending)) || 1 : 1;

  return (
    <div className="mr">
      <PageHead kicker="Model Radar · live" title="Every new AI model, *as it drops*" aside={<Sync feed={hf} now={now} />}>
        Open models trending on Hugging Face right now, plus the full live catalogue of hosted LLMs with context sizes and
        prices per million tokens.
      </PageHead>

      <div className="uv-stats">
        <Stat icon="fa-solid fa-cubes" value={stats.total || "—"} label="LLMs tracked" />
        <Stat icon="fa-solid fa-gift" value={stats.free || "—"} label="free to call" />
        <Stat icon="fa-solid fa-building" value={stats.providers || "—"} label="providers" />
        <Stat icon="fa-solid fa-seedling" value={stats.fresh || "—"} label="new in 30 days" />
        <Stat icon="fa-solid fa-ruler-horizontal" value={stats.longest ? context(stats.longest.context) : "—"} label="longest context" />
      </div>

      <section className="uv-block" style={{ marginTop: 8 }}>
        <SectionTitle icon="fa-solid fa-fire" title="Trending on Hugging Face" meta="by 7-day trending score" />
        <div className="uv-toolbar">
          <Chips items={PIPELINES} value={pipeline} onChange={setPipeline} label="Model type" />
        </div>
        {!hf.data && !hf.error ? (
          <Skeletons count={8} />
        ) : (
          <FeedState feed={hf}>
            <div className="uv-grid mr-hf-grid" key={pipeline}>
              {(hf.data || []).slice(0, 16).map((model, index) => (
                <HFCard key={model.id} model={model} index={index} max={maxTrend} />
              ))}
            </div>
          </FeedState>
        )}
      </section>

      <section className="uv-block">
        <SectionTitle icon="fa-solid fa-list" title="LLM catalogue" meta={`${list.length} models`}>
          <Sync feed={catalogue} now={now} />
        </SectionTitle>
        <div className="uv-toolbar">
          <label className="uv-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              className="uv-input"
              type="search"
              value={query}
              placeholder="Search models: try “claude”, “llama”, “qwen”, “gemini”…"
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(20);
              }}
              aria-label="Search models"
            />
          </label>
          <Chips items={SORTS} value={sort} onChange={setSort} label="Sort" />
          <label className="mr-switch">
            <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
            <span aria-hidden="true" /> Free only
          </label>
        </div>

        {!catalogue.data && !catalogue.error ? (
          <Skeletons count={6} variant="row" />
        ) : (
          <FeedState feed={catalogue} empty="No models match that search.">
            <div className="uv-panel mr-table">
              <div className="mr-llm mr-llm--head" aria-hidden="true">
                <span>Model</span>
                <span>Inputs</span>
                <span>Context</span>
                <span>Price / 1M tokens</span>
                <span>Added</span>
              </div>
              <ul>
                {list.slice(0, limit).map((model) => (
                  <LLMRow key={model.id} model={model} now={now} />
                ))}
              </ul>
              {list.length > limit && (
                <button type="button" className="uv-btn uv-btn--ghost mr-more" onClick={() => setLimit((value) => value + 30)}>
                  Show more ({list.length - limit} left)
                </button>
              )}
              {!list.length && <p className="mr-none">No models match “{query}”.</p>}
            </div>
          </FeedState>
        )}
        <p className="mr-credit">
          Catalogue: OpenRouter public models API. Prices are USD per million tokens as listed by the router and can differ from
          each provider's own pricing.
        </p>
      </section>
    </div>
  );
}
