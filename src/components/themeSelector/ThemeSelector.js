import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeSelector.css';

const ThemeSelector = () => {
  const { currentTheme, changeTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const activeThemeRef = useRef(null);

  // Theme descriptions for mobile view
  const getThemeDescription = (themeId) => {
    const descriptions = {
      blue: "Fresh & Professional",
      brown: "Warm & Cozy",
      purple: "Creative & Elegant", 
      green: "Natural & Calm",
      red: "Bold & Dynamic",
      orange: "Energetic & Vibrant",
      yellow: "Bright & Cheerful",
      pink: "Soft & Friendly",
      violet: "Mysterious & Unique",
      teal: "Modern & Clean",
      materialDark: "Material Design Dark",
      blackTheme: "Classic Black",
      cyberpunk: "Futuristic Neon",
      oceanDepth: "Deep Ocean Blue",
      midnightPurple: "Midnight Purple",
      neonGreen: "Electric Green",
      darkOrange: "Dark Orange",
      crimsonDark: "Crimson Red",
      galaxy: "Space Galaxy",
      nordDark: "Nordic Dark",
      dracula: "Dracula Theme",
      monochrome: "Black & White",
      amoled: "Pure Black AMOLED",
      midnight: "Midnight Blue",
      neon: "Neon Lights"
    };
    return descriptions[themeId] || "Custom Theme";
  };

  const handleThemeChange = (themeId) => {
    console.log('Theme change clicked:', themeId); // Debug log
    changeTheme(themeId);
    setIsOpen(false);
    
    // Close mobile menu if open
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn && menuBtn.checked) {
      menuBtn.checked = false;
      // Force reflow to ensure transitions
      // eslint-disable-next-line no-unused-expressions
      menuBtn.offsetHeight;
    }
  };

  // Scroll active theme into view when dropdown opens
  useEffect(() => {
    if (isOpen && activeThemeRef.current && dropdownRef.current) {
      const timer = setTimeout(() => {
        const container = dropdownRef.current.querySelector('.theme-grid');
        const activeElement = activeThemeRef.current;
        
        if (container && activeElement) {
          // Calculate scroll position to center the active theme
          const scrollTop = activeElement.offsetTop - (container.clientHeight / 2) + (activeElement.clientHeight / 2);
          
          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
          });
        }
      }, 150); // Increased delay for better animation timing
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle mouse wheel scrolling for theme grid
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const themeGrid = dropdownRef.current.querySelector('.theme-grid');
      
      const handleWheel = (e) => {
        // Check if the mouse is over the theme grid
        const rect = themeGrid.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        if (mouseX >= rect.left && mouseX <= rect.right && 
            mouseY >= rect.top && mouseY <= rect.bottom) {
          e.preventDefault();
          e.stopPropagation();
          
          // Smooth scrolling with momentum
          const scrollAmount = e.deltaY * 0.5;
          themeGrid.scrollBy({
            top: scrollAmount,
            behavior: 'auto'
          });
        }
      };

      // Add event listener to the theme grid itself and document
      themeGrid.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        themeGrid.removeEventListener('wheel', handleWheel);
        document.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isOpen]);

  return (
    <div className="theme-selector-container" ref={dropdownRef}>
      <button 
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme selector"
      >
        <i className="fa-solid fa-palette"></i>
        <span>Theme: {currentTheme.name}</span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>
      
      {isOpen && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-header">
            <i className="fa-solid fa-palette"></i>
            <span>Choose Your Theme</span>
          </div>
          
          <div className="theme-grid">
            {availableThemes.map((theme) => (
              <div
                key={theme.id}
                ref={currentTheme.id === theme.id ? activeThemeRef : null}
                className={`theme-option ${currentTheme.id === theme.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleThemeChange(theme.id);
                }}
                style={{
                  '--preview-body': theme.body,
                  '--preview-text': theme.text,
                  '--preview-highlight': theme.highlight,
                  '--preview-secondary': theme.secondaryText,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 10
                }}
              >
                <div className="theme-preview">
                  <div className="preview-bar"></div>
                  <div className="preview-content">
                    <div className="preview-text-line"></div>
                    <div className="preview-text-line short"></div>
                    <div className="preview-highlight-box"></div>
                  </div>
                </div>
                <div className="theme-info">
                  <span className="theme-name">{theme.name}</span>
                  <span className="theme-description">{getThemeDescription(theme.id)}</span>
                  {currentTheme.id === theme.id && (
                    <i className="fa-solid fa-check theme-check"></i>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="theme-dropdown-footer">
            <span>Theme will be saved automatically</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
