import React, { useState, useEffect } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider } from "styled-components";
import { blueTheme, materialDarkTheme } from "./theme";
import { GlobalStyles } from "./global";
import Lenis from "@studio-freight/lenis";

function App() {
  // Use fixed light theme
  const [currentTheme] = useState({ ...blueTheme, name: "light" });

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
    <ThemeProvider theme={currentTheme}>
      <>
        <GlobalStyles />
        <div>
          <Main theme={currentTheme} />
        </div>
      </>
    </ThemeProvider>
  );
}

export default App;
