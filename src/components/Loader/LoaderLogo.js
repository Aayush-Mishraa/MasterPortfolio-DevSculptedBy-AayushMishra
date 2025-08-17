import React from "react";
import "./LoaderLogo.css";
import "./SpectacularAnimations.css";

class LogoLoader extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isMobile: window.innerWidth <= 768,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    this.setState({
      isMobile: window.innerWidth <= 768,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    });
  };

  // Function to determine if current theme is dark
  isDarkTheme = (theme) => {
    // Convert hex to RGB and calculate brightness
    const hex = theme.body.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness < 128; // Dark if brightness is less than 128
  };

  // Get responsive text based on screen size
  getResponsiveText = () => {
    const { isMobile, screenWidth } = this.state;
    
    if (screenWidth <= 480) {
      // Very small screens
      return {
        description: "Quality assurance & test automation expert.",
        fontSize: 14,
        titleFontSize: 16,
        nameFontSize: 24,
        sdetFontSize: 28
      };
    } else if (isMobile) {
      // Mobile screens
      return {
        description: "Passionate about quality assurance & test automation.",
        fontSize: 16,
        titleFontSize: 18,
        nameFontSize: 28,
        sdetFontSize: 30
      };
    } else if (screenWidth <= 1024) {
      // Tablet screens
      return {
        description: "Passionate about quality assurance, test automation, and software excellence.",
        fontSize: 17,
        titleFontSize: 19,
        nameFontSize: 30,
        sdetFontSize: 32
      };
    } else {
      // Desktop screens
      return {
        description: "Passionate about quality assurance, test automation, and software excellence.",
        fontSize: 18,
        titleFontSize: 20,
        nameFontSize: 32,
        sdetFontSize: 34
      };
    }
  };

  // Generate floating automation tool names with smart positioning
  generateFloatingTools = () => {
    const tools = [
      "Selenium", "Postman", "JavaScript", "Java", "TypeScript", 
      "Playwright", "TestNG", "Rest Assured", "Cypress", "Jest",
      "WebDriver", "Appium", "JUnit", "Mocha", "API Testing",
      "Automation", "QA", "Testing", "CI/CD", "Jenkins",
      "Maven", "Gradle", "Docker", "Kubernetes", "Git",
      "JIRA", "Cucumber", "Protractor", "Jasmine", "Chai",
      "Newman", "SoapUI", "Katalon", "Puppeteer", "Nightwatch",
      "WebDriverIO", "Robotium", "Espresso", "XCTest", "Detox",
      "Allure", "ExtentReports", "TestRail", "Zephyr", "Performance Testing",
      "Load Testing", "Security Testing", "Mobile Testing", "Cross-browser Testing"
    ];
    
    const floatingTools = [];
    const usedPositions = []; // Track used positions to avoid overlap
    const { isMobile, screenWidth, screenHeight } = this.state;
    
    // Responsive viewBox and logo zone
    const viewBoxWidth = isMobile ? Math.min(screenWidth, 400) : 800;
    const viewBoxHeight = isMobile ? Math.min(screenHeight, 600) : 600;
    
    // Define zones to avoid logo overlap - responsive
    const logoZone = {
      centerX: viewBoxWidth / 2,
      centerY: viewBoxHeight / 2,
      width: isMobile ? Math.min(250, viewBoxWidth * 0.7) : 300,
      height: isMobile ? Math.min(200, viewBoxHeight * 0.6) : 250
    };

    // Function to check if position overlaps with existing tools
    const isPositionFree = (x, y, toolLength) => {
      const buffer = Math.max(toolLength * (isMobile ? 4 : 6), isMobile ? 40 : 60);
      
      for (let pos of usedPositions) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < buffer) {
          return false;
        }
      }
      return true;
    };

    // Function to check if position is in logo zone
    const isInLogoZone = (x, y) => {
      return (
        x > logoZone.centerX - logoZone.width/2 && 
        x < logoZone.centerX + logoZone.width/2 &&
        y > logoZone.centerY - logoZone.height/2 && 
        y < logoZone.centerY + logoZone.height/2
      );
    };
    
    // Generate tools with smart positioning and collision detection
    const toolCount = isMobile ? 25 : 35; // Fewer tools on mobile
    
    for (let i = 0; i < toolCount; i++) {
      const tool = tools[Math.floor(Math.random() * tools.length)];
      let x, y;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        attempts++;
        
        // Mobile-optimized positioning
        if (isMobile) {
          const zone = Math.random();
          if (zone < 0.4) {
            // Top area (above logo)
            x = Math.random() * (viewBoxWidth - 20) + 10;
            y = Math.random() * (logoZone.centerY - logoZone.height/2 - 20) + 10;
          } else if (zone < 0.8) {
            // Bottom area (below logo)
            x = Math.random() * (viewBoxWidth - 20) + 10;
            y = Math.random() * (viewBoxHeight - (logoZone.centerY + logoZone.height/2) - 20) + (logoZone.centerY + logoZone.height/2 + 10);
          } else {
            // Side areas
            if (Math.random() < 0.5) {
              // Left side
              x = Math.random() * (logoZone.centerX - logoZone.width/2 - 20) + 10;
              y = Math.random() * (viewBoxHeight - 20) + 10;
            } else {
              // Right side
              x = Math.random() * (viewBoxWidth - (logoZone.centerX + logoZone.width/2) - 20) + (logoZone.centerX + logoZone.width/2 + 10);
              y = Math.random() * (viewBoxHeight - 20) + 10;
            }
          }
        } else {
          // Desktop positioning (original logic)
          const zone = Math.random();
          if (zone < 0.25) {
            x = Math.random() * 200 + 10;
            y = Math.random() * 600 + 10;
          } else if (zone < 0.5) {
            x = Math.random() * 200 + 600;
            y = Math.random() * 600 + 10;
          } else if (zone < 0.75) {
            x = Math.random() * 800 + 10;
            y = Math.random() < 0.5 ? Math.random() * 100 + 10 : Math.random() * 100 + 500;
          } else {
            x = Math.random() * 800 + 10;
            y = Math.random() * 600 + 10;
          }
        }
        
      } while (
        (isInLogoZone(x, y) || !isPositionFree(x, y, tool.length)) && 
        attempts < maxAttempts
      );
      
      if (attempts >= maxAttempts) {
        continue;
      }
      
      usedPositions.push({ x, y, tool });
      
      const fontSize = isMobile ? Math.random() * 4 + 8 : Math.random() * 6 + 10; // 8-12px mobile, 10-16px desktop
      const opacity = Math.random() * 0.12 + 0.03;
      const animationDelay = Math.random() * 20;
      const animationDuration = Math.random() * 25 + 30;
      const animationType = Math.floor(Math.random() * 4);
      
      floatingTools.push(
        <text
          key={`tool-${i}`}
          x={x}
          y={y}
          fontSize={fontSize}
          fontFamily="Arial, sans-serif"
          fontWeight="200"
          fill="#ffffff"
          opacity={opacity}
          className={`floating-tool floating-tool-${animationType}`}
          style={{ 
            animationDelay: `${animationDelay}s`,
            animationDuration: `${animationDuration}s`
          }}
        >
          {tool}
        </text>
      );
    }
    
    return floatingTools;
  };

  render() {
    const theme = this.props.theme;
    const { isMobile, screenWidth, screenHeight } = this.state;
    const responsiveText = this.getResponsiveText();
    
    // Responsive viewBox dimensions
    const viewBoxWidth = isMobile ? Math.min(screenWidth, 400) : 800;
    const viewBoxHeight = isMobile ? Math.min(screenHeight, 600) : 600;
    
    return (
      <div className="loader-container">
        {/* Floating automation tools background */}
        <svg
          className="floating-tools-background"
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {this.generateFloatingTools()}
        </svg>
        
        {/* Main logo SVG with space theme colors */}
        <svg
          className="raw_logo"
          width={isMobile ? "80%" : "50%"}
          height={isMobile ? "60%" : "50%"}
          viewBox="0 0 440 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
        {/* Define advanced gradients and effects for spectacular styling */}
        <defs>
          {/* Animated radial gradient for hexagons */}
          <radialGradient id="hexagonGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8">
              <animate attributeName="stop-color" values="#00d4ff;#0099cc;#0066ff;#00d4ff" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95">
              <animate attributeName="stop-color" values="#ffffff;#e6f3ff;#ccebff;#ffffff" dur="4s" repeatCount="indefinite" />
            </stop>
          </radialGradient>
          
          {/* Glowing text gradient for SDET */}
          <linearGradient id="sdetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1">
              <animate attributeName="stop-color" values="#ffffff;#00d4ff;#0099ff;#ffffff" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.9">
              <animate attributeName="stop-color" values="#00d4ff;#ffffff;#00ccff;#00d4ff" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#0099cc" stopOpacity="0.8">
              <animate attributeName="stop-color" values="#0099cc;#00d4ff;#ffffff;#0099cc" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          {/* Premium name gradient with animation */}
          <linearGradient id="nameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1">
              <animate attributeName="stop-opacity" values="1;0.9;1" dur="2.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#f0f8ff" stopOpacity="0.95">
              <animate attributeName="stop-color" values="#f0f8ff;#e0f4ff;#f0f8ff" dur="2.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#d0e8ff" stopOpacity="0.9">
              <animate attributeName="stop-opacity" values="0.9;0.95;0.9" dur="2.5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          {/* Elite title gradient */}
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a8d8f0" stopOpacity="0.95">
              <animate attributeName="stop-color" values="#a8d8f0;#88c8e0;#a8d8f0" dur="3.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#7fc0e8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#66b3d8" stopOpacity="0.85">
              <animate attributeName="stop-opacity" values="0.85;0.9;0.85" dur="3.5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          {/* Sophisticated description gradient */}
          <linearGradient id="descGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#90c4e0" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#7ab5d5" stopOpacity="0.8">
              <animate attributeName="stop-opacity" values="0.8;0.85;0.8" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#6aa6ca" stopOpacity="0.75" />
          </linearGradient>
          
          {/* Glow filter effects */}
          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="hexagonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Shimmer effect */}
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-100 0;400 0;-100 0" dur="3s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
        <path
          className="myHexagon"
          d="M293.545 167.405L229.5 204.381C227.025 205.81 223.975 205.81 221.5 204.381L157.455 167.405C154.98 165.976 153.455 163.335 153.455 160.476L153.455 86.5234C153.455 83.6653 154.98 81.0243 157.455 79.5952L221.5 42.6187C223.975 41.1896 227.025 41.1897 229.5 42.6187L293.545 79.5952C296.02 81.0243 297.545 83.6653 297.545 86.5234L297.545 160.476C297.545 163.335 296.02 165.976 293.545 167.405Z"
          stroke="url(#hexagonGradient)"
          strokeWidth="4"
          filter="url(#hexagonGlow)"
        />
        <path
          className="myHexagon"
          d="M147.455 73.5953L211.5 36.6188C213.975 35.1898 217.025 35.1898 219.5 36.6188L283.545 73.5953C286.02 75.0244 287.545 77.6654 287.545 80.5235L287.545 154.477C287.545 157.335 286.02 159.976 283.545 161.405L219.5 198.381C217.025 199.81 213.975 199.81 211.5 198.381L147.455 161.405C144.98 159.976 143.455 157.335 143.455 154.477L143.455 80.5235C143.455 77.6654 144.98 75.0244 147.455 73.5953Z"
          stroke="url(#hexagonGradient)"
          strokeWidth="4"
          filter="url(#hexagonGlow)"
        />
        
        {/* Shimmer overlay effect */}
        <rect x="150" y="70" width="140" height="140" fill="url(#shimmer)" opacity="0.3" className="shimmer-overlay" />
        
        <text
          className="letter"
          x="225"
          y="125"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={responsiveText.sdetFontSize}
          fontWeight="700"
          fontFamily="'Segoe UI', 'Roboto', Arial, sans-serif"
          fill="url(#sdetGradient)"
          filter="url(#textGlow)"
          style={{ letterSpacing: isMobile ? '1px' : '2px' }}
        >
          SDET
        </text>
        <text
          className="name-text"
          x="225"
          y="240"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={responsiveText.nameFontSize}
          fontWeight="700"
          fontFamily="'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif"
          fill="url(#nameGradient)"
          filter="url(#textGlow)"
          style={{ letterSpacing: isMobile ? '1px' : '1.5px' }}
        >
          Aayush Mishra
        </text>
        <text
          className="subtitle-text"
          x="225"
          y="275"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={responsiveText.titleFontSize}
          fontWeight="500"
          fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
          fill="url(#titleGradient)"
          filter="url(#textGlow)"
          style={{ letterSpacing: isMobile ? '0.4px' : '0.8px' }}
        >
          {isMobile ? "Software Development Engineer In Test" : "Software Development Engineer In Test"}
        </text>
        <text
          className="description-text"
          x="225"
          y={isMobile ? "305" : "310"}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={responsiveText.fontSize}
          fontWeight="400"
          fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
          fill="url(#descGradient)"
          opacity="0.98"
          filter="url(#textGlow)"
          style={{ letterSpacing: isMobile ? '0.2px' : '0.4px' }}
        >
          {responsiveText.description}
        </text>
      </svg>
      </div>
    );
  }
}

export default LogoLoader;
