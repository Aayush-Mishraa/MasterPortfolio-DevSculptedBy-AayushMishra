import React from "react";
import { Fade } from "react-reveal";
import { automationTools } from "../../pages/automationArsenal/AutomationArsenal";
import "./AutomationArsenalPreview.css";

export default function AutomationArsenalPreview(props) {
  const { theme } = props;
  const featuredTools = automationTools;

  const getToolHref = (tool) =>
    tool.isReady && tool.docsPath ? tool.docsPath : "/automation-arsenal";

  const handleToolClick = (event, tool) => {
    if (!tool.isReady || !tool.docsPath) {
      event.preventDefault();
      window.location.assign("/automation-arsenal");
      return;
    }

    event.preventDefault();
    window.location.assign(tool.docsPath);
  };

  return (
    <section
      className="home-arsenal-section"
      id="automation-arsenal-preview"
      style={{ backgroundColor: theme.body }}
    >
      <div className="home-arsenal-shell">
        <Fade bottom duration={800} distance="18px">
          <div className="home-arsenal-head">
            <span
              className="home-arsenal-chip"
              style={{ borderColor: `${theme.highlight}66`, color: theme.text }}
            >
              AI + Automation + QA
            </span>
            <h2 className="home-arsenal-title" style={{ color: theme.text }}>
              Automation Arsenal
            </h2>
            <p className="home-arsenal-subtitle" style={{ color: theme.secondaryText }}>
              As you scroll, explore the core tools and AI agents I use for modern
              software quality engineering.
            </p>
            <a className="home-arsenal-cta" href="/automation-arsenal">
              View Full Automation Arsenal
            </a>
          </div>
        </Fade>

        <div className="home-arsenal-grid">
          {featuredTools.map((tool, index) => (
            <Fade key={tool.name} bottom duration={700} delay={90 + index * 70} distance="16px">
              <a
                href={getToolHref(tool)}
                onClick={(event) => handleToolClick(event, tool)}
                className={`home-arsenal-card ${tool.isReady ? "ready" : "coming-soon"}`}
                style={{
                  background: theme.body,
                  borderColor: `${theme.highlight}33`,
                }}
              >
                <div className="home-arsenal-card-image-wrap">
                  <img
                    src={tool.image}
                    alt={`${tool.name} logo`}
                    className="home-arsenal-card-image"
                  />
                </div>

                <div className="home-arsenal-card-content">
                  <span className="home-arsenal-category" style={{ color: theme.highlight }}>
                    {tool.category}
                  </span>
                  <h3 className="home-arsenal-card-title" style={{ color: theme.text }}>
                    {tool.name}
                  </h3>
                  <p className="home-arsenal-card-description" style={{ color: theme.secondaryText }}>
                    {tool.description}
                  </p>
                </div>

                <div className="home-arsenal-card-footer">
                  <span
                    className="home-arsenal-link-text"
                    style={{ color: tool.isReady ? theme.text : theme.secondaryText }}
                  >
                    {tool.isReady ? "Open Docs" : "Open Arsenal Page"}
                  </span>
                  <span className="home-arsenal-link-arrow" aria-hidden="true">
                    {tool.isReady ? "->" : "=>"}
                  </span>
                </div>
              </a>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
