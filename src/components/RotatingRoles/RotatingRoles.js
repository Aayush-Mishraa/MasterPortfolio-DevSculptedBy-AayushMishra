import React, { useState, useEffect } from 'react';
import './RotatingRoles.css';

const RotatingRoles = ({ theme }) => {
  const roles = [
    "-> 4+ Years Testing Excellence 🏆",
    "-> QA Automation Specialist 🔧",
    "-> 600+ Bugs Squashed 🎯",
    "-> Testing Framework Architect 🏗️",
    "-> 50+ Test Suites Created 📋",
    "-> API Testing Specialist 🔌",
    "-> 5000 + Test Cases Executed 📊",
  ];

  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false); // Start fade out
      
      setTimeout(() => {
        setCurrentRoleIndex((prevIndex) => (prevIndex + 1) % roles.length);
        setIsVisible(true); // Start fade in
      }, 300); // Half of transition duration for smooth effect
      
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [roles.length]);

  return (
    <div className="rotating-roles-container">
      <h2 
        className={`rotating-role ${isVisible ? 'visible' : 'hidden'}`}
        style={{ color: theme.text }}
      >
        {roles[currentRoleIndex]}
      </h2>
    </div>
  );
};

export default RotatingRoles;
