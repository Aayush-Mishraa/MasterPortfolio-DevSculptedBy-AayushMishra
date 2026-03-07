import React, { useEffect } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { GlobalStyles } from "./global";
import Lenis from "@studio-freight/lenis";

function AppContent() {
  const { currentTheme } = useTheme();

  // Initialize Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup function
    return () => {
      lenis.destroy();
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
