import React from "react";
import "./Greeting.css";
import SocialMedia from "../../components/socialMedia/SocialMedia";
import Button from "../../components/button/Button";
import { greeting } from "../../portfolio";
import { Fade } from "react-reveal";
import ProfileCard from "../../components/profileCard/ProfileCard";
import ShinyText from "../../components/shinyText/ShinyText";
import SimpleFallingText from "../../components/FallingText/SimpleFallingText";
import RotatingRoles from "../../components/RotatingRoles/RotatingRoles";

export default function Greeting(props) {
  const theme = props.theme;
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
              
              {/* QA/SDET Skills Falling Text Animation */}
              <div className="falling-text-section" style={{ margin: "2rem 0", minHeight: "200px" }}>
                <SimpleFallingText
                  text="Quality Assurance Expert • Test Automation Engineer • Selenium WebDriver • Playwright Testing • Cypress E2E • API Testing • CI/CD Integration • Performance Testing • Jenkins • GitHub Actions • Docker • TypeScript • JavaScript • Java • Python • RestAssured • TestNG • JUnit • Agile Testing • SDET Professional"
                  fontSize="1.1rem"
                  trigger="hover"
                  delay={300}
                  animationDuration={4000}
                />
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
