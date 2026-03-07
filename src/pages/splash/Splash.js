import React, { Component } from "react";
import "./Splash.css";
import { Redirect } from "react-router-dom";

// Modern Splash Screen Component
function ModernSplash(props) {
  const isDarkTheme = props.theme.body && props.theme.body.includes('#') && 
    parseInt(props.theme.body.replace('#', ''), 16) < 8388608; // Check if dark

  // Tool names for starfield effect
  const toolNames = [
    'Java', 'Selenium', 'Postman', 'Cypress', 'TestNG', 'JUnit', 'RestAssured', 
    'Mocha', 'Jest', 'Gradle', 'Maven', 'Jenkins', 'Cucumber', 'Appium', 
    'LoadRunner', 'JMeter', 'Katalon', 'Playwright', 'Docker', 'API Testing', 
    'Performance', 'Automation', 'Mobile Testing', 'CI/CD', 'WebDriver', 
    'K6', 'Artillery', 'Gatling', 'Newman', 'Supertest'
  ];

  // Generate random positions avoiding center area (hero text zone)
  const generateSafePosition = () => {
    let x, y;
    do {
      x = Math.random() * 100;
      y = Math.random() * 100;
    } while (
      // Avoid center area (30-70% width, 25-75% height)
      (x > 30 && x < 70 && y > 25 && y < 75)
    );
    return { x, y };
  };

  // Generate initial positions for all tools
  const [toolPositions, setToolPositions] = React.useState(() => 
    toolNames.map((name, index) => ({
      id: index,
      name,
      ...generateSafePosition(),
      opacity: Math.random() * 0.4 + 0.3, // 0.3 to 0.7
      size: Math.random() * 6 + 12, // 12px to 18px
      isMeteor: false,
      meteorAngle: 45 // default angle
    }))
  );

  // Meteor effect logic: one event per splash, 5-7 random meteors, each at random time 1-6s
  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Only one meteor event per splash
    // Pick 5-7 random tools
    const availableTools = toolPositions.filter(tool => !tool.isMeteor);
    const meteorCount = Math.min(Math.floor(Math.random() * 3) + 5, availableTools.length); // 5-7 meteors
    const selectedTools = [];
    let usedIndexes = new Set();
    while (selectedTools.length < meteorCount && usedIndexes.size < availableTools.length) {
      const randomIndex = Math.floor(Math.random() * availableTools.length);
      if (!usedIndexes.has(randomIndex)) {
        selectedTools.push(availableTools[randomIndex]);
        usedIndexes.add(randomIndex);
      }
    }

    // For each selected tool, trigger meteor at a random time between 1-6s
    selectedTools.forEach((tool) => {
      const meteorDelay = Math.random() * 5000 + 1000; // 1-6 seconds
      // Pick a random angle between 20 and 70 degrees (or 110-160 for leftward)
      const angle = Math.random() > 0.5
        ? Math.random() * 50 + 20 // 20-70 deg
        : Math.random() * 50 + 110; // 110-160 deg
      setTimeout(() => {
        setToolPositions(prev =>
          prev.map(t =>
            t.id === tool.id
              ? { ...t, isMeteor: true, meteorAngle: angle }
              : t
          )
        );
        // After meteor animation (2.2s), respawn in new position
        setTimeout(() => {
          const newPosition = generateSafePosition();
          setToolPositions(prev =>
            prev.map(t =>
              t.id === tool.id
                ? {
                    ...t,
                    ...newPosition,
                    opacity: Math.random() * 0.4 + 0.3,
                    size: Math.random() * 6 + 12,
                    isMeteor: false,
                    meteorAngle: 45
                  }
                : t
            )
          );
        }, 2200);
      }, meteorDelay);
    });
    // No repeat
  // eslint-disable-next-line
  }, []);

  return (
    <div className={`modern-splash ${props.isExiting ? 'exiting' : 'entering'}`}>
      {/* Animated Background */}
      <div className="splash-background" style={{ background: props.theme.splashBg || props.theme.body }}>
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
          <div className="orb orb-4"></div>
        </div>
        
        {/* Gradient Overlay */}
        <div className="gradient-overlay"></div>
        
        {/* Main Content */}
        <div className="splash-content">
          {/* Logo/Initial Animation */}
          <div className="logo-container">
            <div className="modern-logo">
              <div className="logo-circle">
                <span className="logo-text" style={{ color: props.theme.text }}>
                  SDET
                </span>
              </div>
              <div className="logo-ripple"></div>
              <div className="logo-ripple-2"></div>
            </div>
          </div>
          
          {/* Text Content */}
          <div className="splash-text">
            <h1 className="main-name shine-text" style={{ color: props.theme.text }}>
              Aayush Mishra
            </h1>
            <p className="role-title" style={{ color: props.theme.secondaryText || props.theme.text }}>
              Software Development Engineer in Test
            </p>
            <p className="expertise-line" style={{ color: props.theme.secondaryText || props.theme.text }}>
              Quality Assurance & Test Automation Specialist
            </p>
            <p className="tagline" style={{ color: props.theme.highlight || props.theme.text }}>
               Passionate About Quality Into Every Line Of Code, And Software Excellence.
            </p>
          </div>
          
          {/* Loading Animation */}
          <div className="loading-section">
            <div className="modern-loader">
              <div className="loader-dots">
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
                <span className="dot" style={{ backgroundColor: props.theme.highlight }}></span>
              </div>
              <div className="progress-ring">
                <svg width="60" height="60">
                  <circle 
                    cx="30" 
                    cy="30" 
                    r="25" 
                    stroke={props.theme.highlight} 
                    strokeWidth="3"
                    fill="none"
                    className="progress-circle"
                  />
                </svg>
              </div>
            </div>
            <p className="loading-text" style={{ color: props.theme.secondaryText || props.theme.text }}>
              Initializing Portfolio Experience...
            </p>
            <div className="skill-tags">
              <span className="skill-tag" style={{ color: props.theme.text, borderColor: props.theme.highlight }}>
                Selenium
              </span>
              <span className="skill-tag" style={{ color: props.theme.text, borderColor: props.theme.highlight }}>
                CI/CD Integration
              </span>
              <span className="skill-tag" style={{ color: props.theme.text, borderColor: props.theme.highlight }}>
                RestAssured
              </span>
              <span className="skill-tag" style={{ color: props.theme.text, borderColor: props.theme.highlight }}>
                Postman
              </span>
            </div>
          </div>
        </div>
        
        {/* Starfield Tool Names */}
        <div className="starfield-tools">
          {toolPositions.map((tool) => (
            <span
              key={tool.id}
              className={`starfield-tool ${tool.isMeteor ? 'meteor-active' : ''}`}
              style={{
                left: `${tool.x}%`,
                top: `${tool.y}%`,
                color: props.theme.secondaryText,
                opacity: tool.opacity,
                fontSize: `${tool.size}px`,
                '--meteor-angle': `${tool.meteorAngle}deg`
              }}
            >
              {tool.name}
            </span>
          ))}
        </div>

        {/* Particle System */}
        <div className="particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

class Splash extends Component {
  constructor(props) {
    super(props);
    this.state = {
      redirect: false,
      isExiting: false,
      loadingProgress: 0,
    };
  }

  componentDidMount() {
    // Simulate loading progress
    this.progressInterval = setInterval(() => {
      this.setState(prevState => ({
        loadingProgress: Math.min(prevState.loadingProgress + Math.random() * 12, 100)
      }));
    }, 180);

    // Start exit animation at 6.5 seconds (extended for more viewing time)
    this.exitTimer = setTimeout(() => {
      this.setState({ isExiting: true });
    }, 6500);

    // Complete redirect at 7.5 seconds
    this.redirectTimer = setTimeout(() => {
      this.setState({ redirect: true });
    }, 7500);
  }

  componentWillUnmount() {
    clearTimeout(this.exitTimer);
    clearTimeout(this.redirectTimer);
    clearInterval(this.progressInterval);
  }

  render() {
    return this.state.redirect ? (
      <Redirect to="/home" />
    ) : (
      <ModernSplash 
        theme={this.props.theme} 
        isExiting={this.state.isExiting}
        loadingProgress={this.state.loadingProgress}
      />
    );
  }
}

export default Splash;
