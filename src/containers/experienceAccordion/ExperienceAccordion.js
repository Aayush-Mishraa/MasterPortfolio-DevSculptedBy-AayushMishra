import React, { Component } from "react";
import ExperienceCard from "../../components/experienceCard/ExperienceCard.js";
import "./ExperienceAccordion.css";
import { Accordion, Panel } from "baseui/accordion";

class ExperienceAccordion extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <div className="experience-accord">
        <Accordion>
          {this.props.sections.map((section, index) => {
            // Define gradient colors for each section
            const gradientColors = [
              { primary: '#4a90e2', secondary: '#6b37ff', accent: '#ff5757' }, // Work
              { primary: '#6b37ff', secondary: '#ff5757', accent: '#4a90e2' }, // Internships
              { primary: '#ff5757', secondary: '#4a90e2', accent: '#6b37ff' }  // Volunteerships
            ];
            const colors = gradientColors[index % gradientColors.length];
            
            return (
              <Panel
                className={`accord-panel section-${index}`}
                title={
                  <div className="panel-title-wrapper">
                    <div className="panel-icon" style={{
                      background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`
                    }}>
                      {section["title"][0]}
                    </div>
                    <span className="panel-title">{section["title"]}</span>
                    <div className="panel-count">
                      {section["experiences"].length}
                    </div>
                  </div>
                }
                key={section["title"]}
                overrides={{
                  Header: {
                    style: () => ({
                      backgroundColor: `rgba(255, 255, 255, 0.08)`,
                      border: `1px solid rgba(255, 255, 255, 0.15)`,
                      borderRadius: `20px`,
                      marginBottom: `20px`,
                      fontFamily: "Google Sans Medium",
                      color: `${theme.text}`,
                      fontSize: '18px',
                      fontWeight: '600',
                      padding: '20px 30px',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      ":hover": {
                        backgroundColor: `rgba(255, 255, 255, 0.12)`,
                        color: `${theme.text}`,
                        transform: 'translateY(-3px)',
                        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.15)',
                        borderColor: `rgba(${colors.primary.replace('#', '')}, 0.3)`,
                      },
                      ":before": {
                        content: '""',
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        height: '4px',
                        background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
                        borderRadius: '20px 20px 0 0',
                      },
                      ":after": {
                        content: '""',
                        position: 'absolute',
                        top: '0',
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)`,
                        transition: 'left 0.6s ease',
                      },
                      ":hover:after": {
                        left: '100%',
                      }
                    }),
                  },
                  Content: {
                    style: () => ({
                      backgroundColor: `rgba(255, 255, 255, 0.02)`,
                      backdropFilter: 'blur(10px)',
                      borderRadius: '0 0 20px 20px',
                      padding: '0',
                      marginTop: '-20px',
                    }),
                  },
                }}
              >
{section["experiences"].map((experience,index) => {
                  return (
                    <ExperienceCard index={index} totalCards={section["experiences"].length} experience={experience} theme={theme} />
                  );
                })}
              </Panel>
            );
          })}
        </Accordion>
      </div>
    );
  }
}

export default ExperienceAccordion;
