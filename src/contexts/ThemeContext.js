import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  blueTheme, 
  brownTheme, 
  purpleTheme, 
  greenTheme, 
  redTheme, 
  blackTheme, 
  pinkTheme, 
  violetTheme, 
  tealTheme, 
  orangeTheme, 
  yellowTheme, 
  materialDarkTheme, 
  materialLightTheme, 
  materialTealTheme,
  cyberpunkTheme,
  nordDarkTheme,
  draculaTheme,
  monochromeTheme,
  oceanDepthTheme,
  amoledTheme,
  midnightTheme,
  neonTheme
} from '../theme';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const themes = {
  blue: { ...blueTheme, name: 'Blue Ocean', id: 'blue' },
  brown: { ...brownTheme, name: 'Warm Brown', id: 'brown' },
  purple: { ...purpleTheme, name: 'Royal Purple', id: 'purple' },
  green: { ...greenTheme, name: 'Nature Green', id: 'green' },
  red: { ...redTheme, name: 'Sunset Red', id: 'red' },
  black: { ...blackTheme, name: 'Classic Dark', id: 'black' },
  pink: { ...pinkTheme, name: 'Cherry Blossom', id: 'pink' },
  violet: { ...violetTheme, name: 'Deep Violet', id: 'violet' },
  teal: { ...tealTheme, name: 'Ocean Teal', id: 'teal' },
  orange: { ...orangeTheme, name: 'Vibrant Orange', id: 'orange' },
  yellow: { ...yellowTheme, name: 'Sunny Yellow', id: 'yellow' },
  materialDark: { ...materialDarkTheme, name: 'Material Dark', id: 'materialDark' },
  materialLight: { ...materialLightTheme, name: 'Material Light', id: 'materialLight' },
  materialTeal: { ...materialTealTheme, name: 'Material Teal', id: 'materialTeal' },
  cyberpunk: { ...cyberpunkTheme, name: 'Cyberpunk 2077', id: 'cyberpunk' },
  nordDark: { ...nordDarkTheme, name: 'Nord Dark', id: 'nordDark' },
  dracula: { ...draculaTheme, name: 'Dracula', id: 'dracula' },
  monochrome: { ...monochromeTheme, name: 'Monochrome', id: 'monochrome' },
  oceanDepth: { ...oceanDepthTheme, name: 'Ocean Depth', id: 'oceanDepth' },
  amoled: { ...amoledTheme, name: 'AMOLED Black', id: 'amoled' },
  midnight: { ...midnightTheme, name: 'GitHub Midnight', id: 'midnight' },
  neon: { ...neonTheme, name: 'Neon Synthwave', id: 'neon' }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load theme from localStorage or default to blue
    const savedTheme = localStorage.getItem('portfolioTheme');
    return savedTheme && themes[savedTheme] ? themes[savedTheme] : themes.blue;
  });

  const changeTheme = (themeId) => {
    if (themes[themeId]) {
      setCurrentTheme(themes[themeId]);
      localStorage.setItem('portfolioTheme', themeId);
    }
  };

  // Apply theme to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Clear existing theme classes
    body.className = body.className.replace(/\btheme-\S+/g, '');
    
    // Add theme class for CSS selectors
    body.classList.add(`theme-${currentTheme.id}`);
    
    Object.entries(currentTheme).forEach(([key, value]) => {
      if (key !== 'name' && key !== 'id') {
        root.style.setProperty(`--theme-${key}`, value);
        
        // Convert hex to RGB for rgba usage
        if (value && value.startsWith('#')) {
          const hex = value.slice(1);
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          root.style.setProperty(`--theme-${key}-rgb`, `${r}, ${g}, ${b}`);
        }
      }
    });
    
    // Add dark theme detection
    const isDarkTheme = currentTheme.id.includes('dark') || 
                       currentTheme.id.includes('black') || 
                       currentTheme.id.includes('midnight') || 
                       currentTheme.id.includes('amoled') ||
                       currentTheme.id.includes('cyberpunk') ||
                       currentTheme.id.includes('monochrome') ||
                       currentTheme.id.includes('dracula') ||
                       currentTheme.id.includes('nord') ||
                       currentTheme.id.includes('galaxy') ||
                       currentTheme.id.includes('ocean') ||
                       currentTheme.id.includes('crimson') ||
                       currentTheme.id.includes('neon');
    
    if (isDarkTheme) {
      body.classList.add('dark-theme');
      body.setAttribute('data-theme', 'dark');
    } else {
      body.classList.add('light-theme');
      body.setAttribute('data-theme', 'light');
    }
    
    // Also update body background
    document.body.style.backgroundColor = currentTheme.body;
  }, [currentTheme]);

  const value = {
    currentTheme,
    changeTheme,
    themes,
    availableThemes: Object.values(themes)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
