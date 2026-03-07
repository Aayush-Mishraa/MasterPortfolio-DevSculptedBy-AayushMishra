import React, { useState, useEffect } from "react";
import "./FallingText.css";

const SimpleFallingText = ({
  className = '',
  text = '',
  highlightWords = ['QA', 'SDET', 'Testing', 'Automation', 'Selenium', 'Playwright', 'Cypress', 'API', 'Performance', 'Jenkins', 'GitHub', 'TypeScript', 'JavaScript', 'Java', 'Python', 'RestAssured', 'TestNG', 'JUnit', 'Agile', 'CI/CD'],
  fontSize = "1.2rem"
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clean text by removing periods and extra spaces
  const cleanedText = text.replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const words = cleanedText.split(/\s+/).filter(word => word.length > 0);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const isHighlighted = (word) => {
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    return highlightWords.some(hw => 
      cleanWord.includes(hw.toLowerCase()) || hw.toLowerCase().includes(cleanWord)
    );
  };

  const getWordClassName = (word, index) => {
    let classes = "word";
    if (isHighlighted(word)) {
      classes += " highlighted";
      // Add specific classes for special tools
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.includes('selenium')) classes += " selenium";
      if (cleanWord.includes('cypress')) classes += " cypress";
      if (cleanWord.includes('playwright')) classes += " playwright";
      if (cleanWord.includes('jenkins')) classes += " jenkins";
      if (cleanWord.includes('github')) classes += " github";
    }
    
    if (isHovered) {
      classes += " hover-glow";
    }
    
    return classes;
  };

  // Dynamic font size based on screen size
  const getDynamicFontSize = () => {
    if (window.innerWidth <= 360) return "0.75rem";
    if (window.innerWidth <= 480) return "0.8rem";
    if (window.innerWidth <= 768) return "0.9rem";
    if (window.innerWidth <= 1024) return "1.0rem";
    return fontSize;
  };

  return (
    <div 
      className={`falling-text-container ${className} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ fontSize: getDynamicFontSize() }}
    >
      {/* Inner glassmorphism effect */}
      <div className="inner-shine"></div>
      
      <div className="falling-text-target">
        {words.map((word, index) => (
          <span
            key={index}
            className={getWordClassName(word, index)}
            style={{
              '--stagger-delay': `${index * 0.1}s`,
            }}
          >
            {word}
          </span>
        ))}
      </div>
      
      {/* Floating particles effect - Reduced on mobile */}
      <div className="particles-container">
        {[...Array(isMobile ? 2 : 4)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>
    </div>
  );
};

export default SimpleFallingText;
