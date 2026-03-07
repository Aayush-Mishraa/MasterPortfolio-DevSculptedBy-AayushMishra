import React, { Component } from "react";
import { Fade } from "react-reveal";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import "./AutomationArsenal.css";

export const automationTools = [
  {
    name: "Amazon Nova Act",
    category: "AI Agent",
    description:
      "Generative AI-powered agent workflow orchestration for robust test authoring and decision-driven automation.",
    image: "/tool-logos/amazon-nova-act.svg",
    docsPath: "/tools/nova-act.html",
    isReady: true,
  },
  {
    name: "Playwright",
    category: "Web Automation",
    description:
      "Modern end-to-end browser automation for reliable, parallel, and cross-browser quality engineering.",
    image: "/tool-logos/playwright.svg",
    docsPath: "/tools/playwright.html",
    isReady: false,
  },
  {
    name: "Selenium",
    category: "Web Automation",
    description:
      "Battle-tested browser automation framework used for scalable regression and compatibility test suites.",
    image: "/tool-logos/selenium.svg",
    docsPath: "/tools/selenium.html",
    isReady: false,
  },
  {
    name: "Postman",
    category: "API Testing",
    description:
      "API design, validation, and test automation workflows for collections, mocks, and contract checks.",
    image: "/tool-logos/postman.svg",
    docsPath: "/tools/postman.html",
    isReady: false,
  },
  {
    name: "Browser Use AI",
    category: "AI Browser Agent",
    description:
      "Agentic browser interaction layer for workflow simulation, navigation automation, and autonomous QA tasks.",
    image: "/tool-logos/browser-use-ai.svg",
    docsPath: "/tools/browser-use.html",
    isReady: false,
  },
  {
    name: "Kane AI",
    category: "AI Test Assistant",
    description:
      "AI-assisted test generation and optimization for faster coverage, stable suites, and reduced maintenance.",
    image: "/tool-logos/kane-ai.svg",
    docsPath: "/tools/kane-ai.html",
    isReady: false,
  },
  {
    name: "GitHub Actions",
    category: "CI/CD",
    description:
      "Pipeline orchestration for build validation, automated test execution, reporting, and release quality gates.",
    image: "/tool-logos/github-actions.svg",
    docsPath: "/tools/github-actions.html",
    isReady: false,
  },
];

class AutomationArsenal extends Component {
  handleCardClick = (event, tool) => {
    if (!tool.isReady) {
      event.preventDefault();
    }
  };

  render() {
    const { theme } = this.props;

    return (
      <div className="automation-arsenal-main">
        <Header theme={theme} />

        <section className="arsenal-hero" style={{ backgroundColor: `${theme.body}` }}>
          <div className="arsenal-hero-bg" aria-hidden="true"></div>
          <Fade bottom duration={900} distance="26px">
            <div className="arsenal-hero-content">
              <span className="arsenal-chip" style={{ borderColor: `${theme.highlight}66`, color: theme.text }}>
                Automation + AI + QA Engineering
              </span>
              <h1 className="arsenal-title" style={{ color: theme.text }}>
                Automation Arsenal
              </h1>
              <p className="arsenal-subtitle" style={{ color: theme.secondaryText }}>
                Tools and AI agents I use to build scalable test automation.
              </p>
            </div>
          </Fade>
        </section>

        <section className="arsenal-cards-section">
          <div className="arsenal-grid">
            {automationTools.map((tool, index) => (
              <Fade
                key={tool.name}
                bottom
                duration={700}
                delay={100 + index * 80}
                distance="22px"
              >
                <a
                  href={tool.docsPath}
                  onClick={(event) => this.handleCardClick(event, tool)}
                  className={`arsenal-card ${tool.isReady ? "ready" : "coming-soon"}`}
                  style={{
                    background: theme.body,
                    borderColor: `${theme.highlight}33`,
                  }}
                >
                  <div className="arsenal-card-image-wrap">
                    <img src={tool.image} alt={`${tool.name} logo`} className="arsenal-card-image" />
                  </div>

                  <div className="arsenal-card-content">
                    <span className="arsenal-category" style={{ color: theme.highlight }}>
                      {tool.category}
                    </span>
                    <h3 className="arsenal-card-title" style={{ color: theme.text }}>
                      {tool.name}
                    </h3>
                    <p className="arsenal-card-description" style={{ color: theme.secondaryText }}>
                      {tool.description}
                    </p>
                  </div>

                  <div className="arsenal-card-footer">
                    <span
                      className="arsenal-link-text"
                      style={{ color: tool.isReady ? theme.text : theme.secondaryText }}
                    >
                      {tool.isReady ? "Open Docs" : "Docs coming soon"}
                    </span>
                    <span className="arsenal-link-arrow" aria-hidden="true">
                      {tool.isReady ? "->" : "--"}
                    </span>
                  </div>
                </a>
              </Fade>
            ))}
          </div>
        </section>

        <CreativeFooter theme={theme} />
        <TopButton theme={theme} />
      </div>
    );
  }
}

export default AutomationArsenal;
