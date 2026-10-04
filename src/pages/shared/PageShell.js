import React, { useMemo } from "react";
// The home page's tokens, type and buttons (.hm, .hm-btn, .hm-card, ...)
import "../home/Home.css";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { readableAccent, readableOn } from "../../contexts/ThemeContext";

/*
  The frame for the Stage 2 pages (/about, /hire-me, /services, ...): the
  header, a main landmark that speaks the home page's design language (.hm),
  the grid backdrop, the footer and the back-to-top button. Pages bring their
  own sections and a stylesheet with their own class prefix.
*/

const PASS_GREEN = "#22c55e";

const rgbTriple = (hex) => {
  const value = parseInt(String(hex).replace("#", "").slice(0, 6), 16);
  return Number.isNaN(value) ? "21, 128, 61" : `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

/** A pass green that clears WCAG AA on this theme's background (same as the home page). */
export function usePassVars(theme) {
  return useMemo(() => {
    const pass = readableAccent(PASS_GREEN, (theme && theme.body) || "#EDF9FE");
    return { "--hm-pass": pass, "--hm-pass-rgb": rgbTriple(pass), "--hm-on-pass": readableOn(pass) };
  }, [theme]);
}

export default function PageShell({ theme, className = "", children, after = null }) {
  const passVars = usePassVars(theme);
  return (
    <div className="hm-page">
      <a className="hm-skip" href="#main">
        Skip to content
      </a>
      <Header theme={theme} />
      <main className={`hm ${className}`} id="main" tabIndex={-1} style={passVars}>
        <div className="hm-backdrop" aria-hidden="true">
          <div className="hm-backdrop__grid" />
          <div className="hm-backdrop__glow hm-backdrop__glow--a" />
          <div className="hm-backdrop__glow hm-backdrop__glow--b" />
        </div>
        {children}
      </main>
      {typeof after === "function" ? after(passVars) : after}
      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
}
