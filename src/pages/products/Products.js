import React from "react";
import { Link } from "react-router-dom";
import PageShell from "../shared/PageShell";
import { KIND_LABEL, TOOLS, toolPath } from "../../data/tools";
import { KIT, kitCheckout, kitPrice } from "../../data/starterKit";
import { SESSIONS, formatInr, sessionPrice } from "../../data/mentoring";
import { KIT_PAGE } from "../../data/recruiterKit";
import "../services/Services.css";
import "../tools/Tools.css";

/*
  /products: one place for everything beyond the services: the products
  (Starter Kit, mentoring, NeuralForge), the free tools, the site's AI and
  the recruiter kit. Status and prices come from the same config as each
  page (src/data/*), so this page never disagrees with them.
*/

// NeuralForge lives on its own subdomain; /neuralforge/ on this domain
// serves it until the subdomain is live, then redirects there (F30).
const NEURALFORGE = "/neuralforge/";

function Tile({ icon, kind, title, text, to, href, cta, meta }) {
  const link = href ? (
    <a href={href}>{title}</a>
  ) : (
    <Link to={to}>{title}</Link>
  );
  return (
    <li className="hm-card ft-tile">
      <span className="ft-tile__icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <p className="ft-tile__kind">{kind}</p>
      <h3 className="ft-tile__title">{link}</h3>
      <p className="ft-tile__text">{text}</p>
      {meta && <p className="pr-meta">{meta}</p>}
      <span className="ft-tile__go" aria-hidden="true">
        {cta} <i className="fa-solid fa-arrow-right" />
      </span>
    </li>
  );
}

function Group({ id, eyebrow, title, text, children }) {
  return (
    <section className="hm-section pr-group" id={id} aria-labelledby={`${id}-title`}>
      <div className="hm-shell">
        <p className="hm-eyebrow">{eyebrow}</p>
        <h2 className="hm-h2" id={`${id}-title`}>
          {title}
        </h2>
        {text && <p className="hm-lead">{text}</p>}
        <ul className="ft-grid pr-grid">{children}</ul>
      </div>
    </section>
  );
}

export default function Products({ theme }) {
  const checkout = kitCheckout();
  const price = kitPrice();
  const kitMeta = checkout
    ? price && price.amount != null
      ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(price.amount)} · available now`
      : "Available now"
    : "Coming soon · join the waitlist";
  const lowest = SESSIONS.map((session) => sessionPrice(session.id)).filter(Boolean).sort((a, b) => a.amount - b.amount)[0];

  return (
    <PageShell theme={theme} className="ft pr">
      <section className="hm-section ft-hero" aria-labelledby="pr-title">
        <div className="hm-shell">
          <p className="hm-eyebrow">Products · free tools · AI</p>
          <h1 className="ft-hero__title" id="pr-title">
            Everything I&apos;ve built <span className="hm-grad">for testing teams.</span>
          </h1>
          <p className="hm-lead">
            A template to start from, one-to-one mentoring, a free learning path, tools that run in your browser and an AI
            that answers from this site. Want it done for you instead? That&apos;s the <Link to="/services">services</Link>.
          </p>
          <nav className="pr-jump" aria-label="On this page">
            <a href="#products" className="hm-chip">
              Products
            </a>
            <a href="#tools" className="hm-chip">
              Free tools
            </a>
            <a href="#ai" className="hm-chip">
              AI
            </a>
            <a href="#hiring" className="hm-chip">
              For hiring teams
            </a>
          </nav>
        </div>
      </section>

      <Group
        id="products"
        eyebrow="Products"
        title="Learn it, or start from it."
        text="Paid products check out with the provider (this site never sees your card); NeuralForge is free with an email sign-in."
      >
        <Tile
          icon="fa-solid fa-box-open"
          kind="Template repo"
          title={KIT.name}
          text={KIT.tagline}
          to="/starter-kit"
          cta={checkout ? "Buy" : "Join the waitlist"}
          meta={kitMeta}
        />
        <Tile
          icon="fa-solid fa-user-tie"
          kind="One-to-one"
          title="Mentoring & SDET mock interviews"
          text="Mock interviews with written feedback, career calls and reviews of your framework or résumé."
          to="/mentoring"
          cta="See the sessions"
          meta={lowest ? `From ${formatInr(lowest)} a session` : null}
        />
        <Tile
          icon="fa-solid fa-bolt"
          kind="Free · sign up to sync"
          title="NeuralForge"
          text="A 21-level path from SDET to AI engineer: Python, LLMs, RAG, agents, MCP, evals and AI testing, with labs and projects."
          href={NEURALFORGE}
          cta="Start learning"
          meta="Progress syncs across devices"
        />
      </Group>

      <Group
        id="tools"
        eyebrow="Free tools"
        title="Use them today, no sign-up."
        text="Most run entirely in your browser. The checklist and the full quiz report arrive by email."
      >
        {TOOLS.map((tool) => (
          <Tile
            key={tool.slug}
            icon={tool.icon}
            kind={KIND_LABEL[tool.kind]}
            title={tool.title}
            text={tool.tagline}
            to={toolPath(tool.slug)}
            cta="Open"
          />
        ))}
      </Group>

      <Group id="ai" eyebrow="AI" title="Ask, and check the answer.">
        <Tile
          icon="fa-solid fa-comments"
          kind="AI, with its eval scores"
          title="Ask my site's AI"
          text="Questions about my work, services and experience, answered only from this site, with sources and its own groundedness score."
          to="/ask"
          cta="Ask a question"
        />
        <Tile
          icon="fa-solid fa-flask-vial"
          kind="Runs in your browser"
          title="AI Eval Playground"
          text="Watch an eval suite grade chatbot answers for hallucination, toxicity, leaked data and prompt injection."
          to="/free-tools/ai-eval-playground"
          cta="Run the evals"
        />
      </Group>

      <Group id="hiring" eyebrow="For hiring teams" title="Hiring a Senior SDET or QA lead?">
        <Tile
          icon="fa-solid fa-file-pdf"
          kind="One page · PDF"
          title="Recruiter kit"
          text="Role fit, highlights, references and how to book a call, on one printable page."
          to={KIT_PAGE}
          cta="Open the kit"
          meta={'Tip: type "sudo hire aayush" anywhere'}
        />
        <Tile
          icon="fa-solid fa-id-card"
          kind="Recruiter brief"
          title="Hire me"
          text="The résumé, the 30-second brief and the hiring snapshot."
          to="/hire-me"
          cta="Read the brief"
        />
      </Group>

      <section className="hm-section ft-cta" aria-labelledby="pr-next">
        <div className="hm-shell">
          <div className="hm-card ft-cta__card">
            <div>
              <p className="hm-eyebrow">Rather have it done for you?</p>
              <h2 className="hm-h2" id="pr-next">
                QA services, from one call to a fractional lead.
              </h2>
              <p className="hm-lead">
                Release reviews, QA health checks, Playwright frameworks, AI feature evals and accessibility audits.
              </p>
            </div>
            <div className="ft-cta__actions">
              <Link to="/services" className="hm-btn hm-btn--primary">
                See the services <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/contact" className="hm-link">
                Contact <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
