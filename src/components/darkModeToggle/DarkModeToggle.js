import React, { useState } from "react";
import "./DarkModeToggle.css";

const DarkModeToggle = ({ theme, onToggle }) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const isDark = theme.name === "dark";

  const handleToggle = () => {
    setIsSwitching(true);
    onToggle();
    
    // Remove animation class after animation completes
    setTimeout(() => {
      setIsSwitching(false);
    }, 600);
  };

  return (
    <button
      className={`theme-toggle ${isDark ? "dark" : "light"} ${isSwitching ? "switching" : ""}`}
      onClick={handleToggle}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{ 
        color: theme.text,
        borderColor: theme.text + "30"
      }}
    >
      <span className="theme-icon">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
};

export default DarkModeToggle;
