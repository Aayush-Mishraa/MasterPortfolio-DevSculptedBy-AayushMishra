import React, { Component } from "react";
import "./ExperienceCard.css";
import { Fade } from "react-reveal";

class ExperienceCard extends Component {
  // Helper function to convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '102, 126, 234';
  }

  render() {
    const experience = this.props.experience;
    const index = this.props.index;
    const totalCards = this.props.totalCards;
    const theme = this.props.theme;
    const sectionColor = this.props.sectionColor || '#667eea';
    const isFirst = index === 0;
    const isLast = index === totalCards - 1;
    
    // Calculate staggered animation delay
    const animationDelay = index * 150;
    
    return (
      <Fade up duration={600} delay={animationDelay} distance="30px">
        <article className={`experience-timeline-item ${isFirst ? "is-first" : ""} ${isLast ? "is-last" : ""}`}>
          <div className="timeline-column" aria-hidden="true">
            <span
              className="timeline-dot"
              style={{
                background: sectionColor,
                boxShadow: `0 0 0 5px rgba(${this.hexToRgb(sectionColor)}, 0.18)`
              }}
            ></span>
          </div>

          <div
            className="card-container"
            style={{
              background: theme.body,
              border: `1px solid ${theme.headerColor}26`
            }}
          >
            <div className="card-header-row">
              <div className="company-logo-wrapper">
                <img
                  className="company-logo"
                  src={require(`../../assets/images/${experience["logo_path"]}`)}
                  alt={`${experience.company} logo`}
                />
              </div>

              <div className="card-title-block">
                <h3 className="job-title" style={{ color: theme.text }}>
                  {experience["title"]}
                </h3>
                <p className="duration-text" style={{ color: theme.secondaryText }}>
                  {experience["duration"]}
                </p>
                <a
                  href={experience["company_url"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="company-name"
                  style={{ color: theme.text }}
                >
                  {experience["company"]}
                </a>
              </div>
            </div>

            <p className="location" style={{ color: theme.secondaryText }}>
              {experience["location"]}
            </p>

            <p className="job-description" style={{ color: theme.secondaryText }}>
              {experience["description"]}
            </p>

            {experience.skills && (
              <div className="skills-tags">
                {experience.skills.map((skill, skillIndex) => (
                  <span
                    key={skillIndex}
                    className="skill-tag"
                    style={{
                      background: `${sectionColor}10`,
                      color: sectionColor,
                      border: `1px solid ${sectionColor}24`
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            </div>
        </article>
      </Fade>
    );
  }
}

export default ExperienceCard;
