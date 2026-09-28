import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme, isDarkColor, readableAccent, readableOn } from '../../contexts/ThemeContext';
import './ThemeSelector.css';

const ThemeSelector = () => {
  const { currentTheme, changeTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const toggleRef = useRef(null);
  const bodyRef = useRef(null);
  const activeThemeRef = useRef(null);

  // Split by the actual page background so each group previews honestly
  const groups = useMemo(() => {
    const light = availableThemes.filter((theme) => !isDarkColor(theme.body));
    const dark = availableThemes.filter((theme) => isDarkColor(theme.body));
    return [
      { id: 'light', label: 'Light', icon: 'fa-sun', themes: light },
      { id: 'dark', label: 'Dark', icon: 'fa-moon', themes: dark }
    ];
  }, [availableThemes]);

  // The panel itself is painted in the active theme
  const panelStyle = {
    '--ts-bg': currentTheme.body,
    '--ts-ink': currentTheme.text,
    '--ts-accent': readableAccent(currentTheme.imageHighlight, currentTheme.body),
    '--ts-on-accent': readableOn(currentTheme.imageHighlight)
  };

  const close = (returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus && toggleRef.current) toggleRef.current.focus();
  };

  const handleThemeChange = (themeId) => {
    changeTheme(themeId);
    close();

    // Close mobile menu if open
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn && menuBtn.checked) {
      menuBtn.checked = false;
    }
  };

  // Bring the active theme into view when the panel opens
  useEffect(() => {
    if (!isOpen || !activeThemeRef.current || !bodyRef.current) return;
    const container = bodyRef.current;
    const active = activeThemeRef.current;
    const top = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    container.scrollTop = Math.max(0, top);
  }, [isOpen]);

  // Close on outside click and on Escape
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        if (toggleRef.current) toggleRef.current.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className={`theme-selector-container ${isOpen ? 'is-open' : ''}`}
      ref={containerRef}
    >
      <button
        type="button"
        ref={toggleRef}
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme selector"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <i className="fa-solid fa-palette" aria-hidden="true"></i>
        <span className="theme-toggle-label"><span className="theme-toggle-prefix">Theme: </span>{currentTheme.name}</span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true"></i>
      </button>

      {isOpen && (
        <>
          <div className="ts-backdrop" onClick={() => close()} aria-hidden="true"></div>
          <div className="ts-panel" role="dialog" aria-label="Choose a theme" style={panelStyle}>
            <div className="ts-head">
              <span className="ts-head-icon" aria-hidden="true">
                <i className="fa-solid fa-palette"></i>
              </span>
              <div className="ts-head-text">
                <span className="ts-title">Choose a theme</span>
                <span className="ts-subtitle">{availableThemes.length} palettes, saved automatically</span>
              </div>
              <button
                type="button"
                className="ts-close"
                onClick={() => close(true)}
                aria-label="Close theme picker"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <div className="ts-body" ref={bodyRef}>
              {groups.map((group) => group.themes.length > 0 && (
                <section className="ts-group" key={group.id} aria-labelledby={`ts-group-${group.id}`}>
                  <h4 className="ts-group-label" id={`ts-group-${group.id}`}>
                    <i className={`fa-solid ${group.icon}`} aria-hidden="true"></i>
                    {group.label}
                    <span className="ts-group-count">{group.themes.length}</span>
                  </h4>
                  <div className="ts-grid" role="radiogroup" aria-labelledby={`ts-group-${group.id}`}>
                    {group.themes.map((theme) => {
                      const isActive = currentTheme.id === theme.id;
                      return (
                        <button
                          type="button"
                          key={theme.id}
                          ref={isActive ? activeThemeRef : null}
                          role="radio"
                          aria-checked={isActive}
                          className={`ts-option ${isActive ? 'is-active' : ''}`}
                          onClick={() => handleThemeChange(theme.id)}
                          title={theme.name}
                          style={{
                            '--sw-body': theme.body,
                            '--sw-text': theme.text,
                            '--sw-muted': theme.secondaryText || theme.text,
                            '--sw-soft': theme.highlight,
                            '--sw-accent': theme.imageHighlight
                          }}
                        >
                          <span className="ts-swatch" aria-hidden="true">
                            <span className="ts-swatch-soft"></span>
                            <span className="ts-swatch-line"></span>
                            <span className="ts-swatch-line is-short"></span>
                            <span className="ts-swatch-pill"></span>
                            {isActive && (
                              <span className="ts-swatch-check">
                                <i className="fa-solid fa-check"></i>
                              </span>
                            )}
                          </span>
                          <span className="ts-option-name">{theme.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="ts-foot">
              <span className="ts-foot-dot" aria-hidden="true"></span>
              Active: <strong>{currentTheme.name}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;
