import React, { Component } from "react";
import "./AnimatedOrganizations.css";
import ContributedOrganizationsData from "../../shared/opensource/contributed_organizations.json";

class AnimatedOrganizations extends Component {
  render() {
    const theme = this.props.theme;
    const organizations = ContributedOrganizationsData.data;

    return (
      <div className="animated-organizations-container" 
           style={{ 
             '--theme-body': theme.body,
             '--theme-text': theme.text,
             '--theme-highlight': theme.highlight,
             '--theme-secondary': theme.secondaryText,
             '--theme-dark': theme.dark
           }}>
        <div className="animated-organizations-header">
          <h2 className="organizations-title" style={{ color: theme.text }}>
            Tech Partners
          </h2>
          <p className="organizations-subtitle" style={{ color: theme.secondaryText }}>
            Key collaborations
          </p>
        </div>
        
        <div className="organizations-slider">
          <div className="organizations-track">
            {/* First set of logos */}
            {organizations.map((org, index) => (
              <div key={`${org.id}-1`} className="organization-card">
                <div className="organization-logo-container">
                  <img
                    src={org.logoUrl}
                    alt={org.name}
                    className="organization-logo"
                    loading="lazy"
                  />
                </div>
                <span className="organization-name">{org.name}</span>
              </div>
            ))}
            {/* Second set for seamless looping */}
            {organizations.map((org, index) => (
              <div key={`${org.id}-2`} className="organization-card">
                <div className="organization-logo-container">
                  <img
                    src={org.logoUrl}
                    alt={org.name}
                    className="organization-logo"
                    loading="lazy"
                  />
                </div>
                <span className="organization-name">{org.name}</span>
              </div>
            ))}
            {/* Third set for extra smooth animation */}
            {organizations.map((org, index) => (
              <div key={`${org.id}-3`} className="organization-card">
                <div className="organization-logo-container">
                  <img
                    src={org.logoUrl}
                    alt={org.name}
                    className="organization-logo"
                    loading="lazy"
                  />
                </div>
                <span className="organization-name">{org.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default AnimatedOrganizations;
