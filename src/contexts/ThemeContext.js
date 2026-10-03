import React, { createContext, useContext, useState, useLayoutEffect } from 'react';
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

const hexToRgb = (hex = '') => {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
  const value = parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return null;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

export const isDarkColor = (hex) => {
  const rgb = hexToRgb(hex);
  return rgb ? luminance(rgb) < 0.3 : false;
};

// Black or white, whichever reads better on the given color
export const readableOn = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  return contrast(rgb, [255, 255, 255]) >= contrast(rgb, [0, 0, 0]) ? '#ffffff' : '#0b1220';
};

// Nudge the accent toward white (dark pages) or black (light pages) until it
// passes WCAG AA (4.5:1) as text on the page background.
export const readableAccent = (accentHex, bodyHex) => {
  const accent = hexToRgb(accentHex);
  const body = hexToRgb(bodyHex);
  if (!accent || !body) return accentHex;
  // Head for whichever end contrasts more with the page: on a mid-tone
  // background white can never reach 4.5:1 even below the dark/light cut-off
  const white = [255, 255, 255];
  const black = [0, 0, 0];
  const target = contrast(white, body) >= contrast(black, body) ? white : black;
  for (let t = 0; t <= 1; t += 0.05) {
    const mixed = accent.map((c, i) => c + (target[i] - c) * t);
    if (contrast(mixed, body) >= 4.5) return rgbToHex(mixed);
  }
  return rgbToHex(target);
};

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
  black: { ...blackTheme, name: 'Classic Grey', id: 'black' },
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

  // Apply theme to CSS custom properties. A layout effect runs before the
  // browser paints, so the first frame already has the theme's colours.
  useLayoutEffect(() => {
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
    
    // Accent that stays readable when used as text on the page background
    root.style.setProperty('--theme-accentText', readableAccent(currentTheme.imageHighlight, currentTheme.body));
    root.style.setProperty('--theme-onAccent', readableOn(currentTheme.imageHighlight));

    // Dark/light is decided by the actual page background, not the theme name
    const isDarkTheme = isDarkColor(currentTheme.body);

    body.classList.remove('dark-theme', 'light-theme');
    body.classList.add(isDarkTheme ? 'dark-theme' : 'light-theme');
    body.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    
    // Also update body background
    document.body.style.backgroundColor = currentTheme.body;

    // The page behind the body (and the inline script in index.html on the
    // next load) uses the same colour, so nothing light shows around a dark
    // theme. A variable, so rules like Tech Universe's html.uv-standalone win.
    root.style.setProperty('--page-bg', currentTheme.body);
    try {
      localStorage.setItem('portfolioThemeBg', currentTheme.body);
    } catch (error) {
      // Storage blocked: the next load starts on the default background.
    }
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', currentTheme.body);

    // The prerendered HTML was hidden while it showed the default theme (index.html).
    root.classList.remove('theme-pending');
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
