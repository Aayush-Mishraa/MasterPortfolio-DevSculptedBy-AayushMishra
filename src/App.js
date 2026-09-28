import React, { useEffect } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { GlobalStyles } from "./global";
import Lenis from "@studio-freight/lenis";

function AppContent() {
  const { currentTheme } = useTheme();

  // Initialize Lenis smooth scrolling (skipped when the user prefers reduced motion)
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 2,
    });
    // Shared so scroll-to-top and route changes go through Lenis instead of fighting it
    window.__lenis = lenis;

    let frame;
    function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
    };
  }, []);

  return (
    <StyledThemeProvider theme={currentTheme}>
      <>
        <GlobalStyles />
        <div>
          <Main theme={currentTheme} />
        </div>
      </>
    </StyledThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
