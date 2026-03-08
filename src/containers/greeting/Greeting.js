import React, { useEffect, useState } from "react";
import "./Greeting.css";
import SocialMedia from "../../components/socialMedia/SocialMedia";
import Button from "../../components/button/Button";
import { greeting } from "../../portfolio";
import { Fade } from "react-reveal";
import { Link } from "react-router-dom";
import ProfileCard from "../../components/profileCard/ProfileCard";
import ShinyText from "../../components/shinyText/ShinyText";
import RotatingRoles from "../../components/RotatingRoles/RotatingRoles";

const AUTOMATION_TOOL_NAMES = [
  "AWS Services",
  "Playwright",
  "Nova Act",
  "Browser Use",
  "Selenium",
  "MCP Server",
  "Generative AI",
  "LLM Models",
  "AI Test Bedrock",
  "API Testing",
  "CI/CD",
  "Jenkins"
];

export default function Greeting(props) {
  const theme = props.theme;
  const [activeToolIndex, setActiveToolIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveToolIndex(
        (currentIndex) => (currentIndex + 1) % AUTOMATION_TOOL_NAMES.length
      );
    }, 1700);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Fade bottom duration={2000} distance="40px">
      <div className="greet-main" id="greeting">
        <div className="greeting-main">
          <div className="greeting-text-div">
            <div>
              <ShinyText
                text={greeting.title}
                disabled={false}
                speed={3}
                className="greeting-text"
                style={{ color: theme.text }}
              />

              {/* Dynamic Rotating Roles without parentheses */}
              <RotatingRoles theme={theme} />

              <p
                className="greeting-text-p subTitle"
                style={{ color: theme.secondaryText }}
              >
                {greeting.subTitle}
              </p>

              <div className="automation-arsenal-cta-wrap">
                <Link
                  to="/automation-arsenal"
                  className="automation-arsenal-cta"
                  aria-label="Open Automation Arsenal page"
                >
                  <span className="cta-chip">Hot</span>
                  <span className="cta-text">
                    <span className="cta-label">Enter Automation Arsenal:</span>
                    <span className="cta-tools-viewport" aria-hidden="true">
                      <span
                        key={activeToolIndex}
                        className={`cta-tool cta-path-${activeToolIndex % 4}`}
                      >
                        {AUTOMATION_TOOL_NAMES[activeToolIndex]}
                      </span>
                    </span>
                  </span>
                  <span className="cta-arrow" aria-hidden="true">-&gt;</span>
                </Link>
                <p
                  className="automation-arsenal-cta-note"
                  style={{ color: theme.secondaryText }}
                >
                  Explore testing frameworks, live tools, and automation demos.
                </p>
              </div>

              <SocialMedia theme={theme} />
              <div className="portfolio-repo-btn-div">
                <Button
                  text="⭐ Star Me On Github"
                  newTab={true}
                  href={greeting.portfolio_repository}
                  theme={theme}
                  className="portfolio-repo-btn"
                />
              </div>
              {/* <div className="button-greeting-div">
              <Button text="Contact me" href="#contact" />
              <Button text="See my resume" newTab={true} href={greeting.resumeLink} />
            </div> */}
            </div>
          </div>
          <div className="greeting-image-div">
            {/* <img
							alt="saad sitting on table"
							src={require("../../assets/images/feelingProud.svg")}
						></img> */}
            <ProfileCard theme={theme} />
          </div>
        </div>
      </div>
    </Fade>
  );
}
