import React, { Component } from "react";
import ExperienceCard from "../../components/experienceCard/ExperienceCard.js";
import "./ExperienceAccordion.css";
import { Fade } from "react-reveal";

class ExperienceAccordion extends Component {
  render() {
    const theme = this.props.theme;
    
    // Section accent colors
    const sectionConfig = [
      { 
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#667eea'
      },
      { 
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: '#f093fb'
      },
      { 
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: '#4facfe'
      }
    ];
    
    return (
      <div className="modern-experience-timeline">
        {this.props.sections.map((section, sectionIndex) => {
          const config = sectionConfig[sectionIndex] || sectionConfig[0];
          
          return (
            <Fade bottom duration={800} distance="30px" delay={sectionIndex * 200} key={section["title"]}>
              <div className={`timeline-section section-${sectionIndex}`}>
                {/* Section Header */}
                <div className="timeline-section-header">
                  <div className="section-info">
                    <h2 className="section-title" style={{ color: theme.text }}>
                      {section["title"]}
                    </h2>
                    <div className="section-meta">
                      <span className="experience-count" style={{ color: theme.secondaryText }}>
                        {section["experiences"].length} {section["experiences"].length === 1 ? 'Position' : 'Positions'}
                      </span>
                      <div 
                        className="section-line"
                        style={{ background: config.gradient }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Experience Cards Grid */}
                <div className="timeline-cards-grid">{section["experiences"].map((experience, experienceIndex) => {
                    return (
                      <ExperienceCard 
                        key={experienceIndex}
                        index={experienceIndex} 
                        totalCards={section["experiences"].length} 
                        experience={experience} 
                        theme={theme}
                        sectionIndex={sectionIndex}
                        sectionColor={config.color}
                      />
                    );
                  })}
                </div>
              </div>
            </Fade>
          );
        })}
      </div>
    );
  }
}

export default ExperienceAccordion;
