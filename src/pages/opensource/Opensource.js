import React, { Component } from "react";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import OpensourceCharts from "../../containers/opensourceCharts/OpensourceCharts";
import Organizations from "../../containers/organizations/Organizations";
import PullRequests from "../../containers/pullRequests/PullRequests";
import Issues from "../../containers/issues/Issues";
import Repositories from "../../containers/repositories/Repositories";
import TopButton from "../../components/topButton/TopButton";
import "./Opensource.css";
import { Fade } from "react-reveal";

class Opensource extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeSection: 'overview',
      isLoading: false
    };
  }

  handleSectionChange = (section) => {
    this.setState({ isLoading: true, activeSection: section });
    setTimeout(() => {
      this.setState({ isLoading: false });
    }, 300);
  };

  render() {
    const { theme } = this.props;
    const { activeSection, isLoading } = this.state;

    return (
      <div className="opensource-main">
        <Header theme={theme} />
        
        {/* Hero Section */}
        <div className="opensource-hero" style={{ background: `linear-gradient(135deg, ${theme.body} 0%, ${theme.secondaryText}20 100%)` }}>
          <div className="hero-background-animation"></div>
          <div className="hero-content">
            <Fade bottom duration={1000} distance="30px">
              <h1 className="hero-title" style={{ color: theme.text }}>
                Open Source <span className="highlight-text">Contributions</span>
              </h1>
            </Fade>
            <Fade bottom duration={1000} delay={300} distance="30px">
              <p className="hero-description" style={{ color: theme.secondaryText }}>
                Exploring the world of open source through meaningful contributions, 
                collaborative projects, and continuous learning.
              </p>
            </Fade>
            
            {/* Navigation Pills */}
            <Fade bottom duration={1000} delay={600} distance="30px">
              <div className="section-navigation">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'repositories', label: 'Repositories', icon: '📁' },
                  { id: 'charts', label: 'Analytics', icon: '📈' },
                  { id: 'contributions', label: 'Contributions', icon: '🔄' }
                ].map((section) => (
                  <button
                    key={section.id}
                    className={`nav-pill ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => this.handleSectionChange(section.id)}
                    style={{
                      background: activeSection === section.id 
                        ? `linear-gradient(135deg, ${theme.highlight}, ${theme.highlight}dd)` 
                        : 'transparent',
                      color: activeSection === section.id ? '#fff' : theme.text,
                      border: `2px solid ${activeSection === section.id ? theme.highlight : theme.secondaryText}40`
                    }}
                  >
                    <span className="nav-icon">{section.icon}</span>
                    <span className="nav-label">{section.label}</span>
                  </button>
                ))}
              </div>
            </Fade>
          </div>
        </div>

        {/* Content Sections */}
        <div className={`content-wrapper ${isLoading ? 'loading' : ''}`}>
          {activeSection === 'overview' && (
            <div className="section-content">
              <Organizations theme={theme} />
              <OpensourceCharts theme={theme} />
            </div>
          )}
          
          {activeSection === 'repositories' && (
            <div className="section-content">
              <Repositories theme={theme} />
            </div>
          )}
          
          {activeSection === 'charts' && (
            <div className="section-content">
              <OpensourceCharts theme={theme} />
            </div>
          )}
          
          {activeSection === 'contributions' && (
            <div className="section-content">
              <PullRequests theme={theme} />
              <Issues theme={theme} />
            </div>
          )}
        </div>

        <CreativeFooter theme={theme} />
        <TopButton theme={theme} />
      </div>
    );
  }
}

export default Opensource;
