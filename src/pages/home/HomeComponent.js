import React, { useCallback, useState } from "react";
// Base tokens first, so each section's stylesheet can override them
import "./Home.css";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../components/topButton/TopButton";
import { usePassVars } from "../shared/PageShell";
import Hero from "./sections/Hero";
import Logos from "./sections/Logos";
import Offers from "./sections/Offers";
import Evidence from "./sections/Evidence";
import Pipeline from "./sections/Pipeline";
import Work from "./sections/Work";
import Trajectory from "./sections/Trajectory";
import References from "./sections/References";
import RecruiterBrief from "./components/RecruiterBrief";
import { unlockFilmScore } from "./components/film/filmScore";
import SpecRail from "./components/SpecRail";
import MobileBar from "./components/MobileBar";
import { RECOMMENDATIONS, useGithub } from "./homeData";
import { prefersReducedMotion } from "./lib/motion";

/*
  Home, as a release report: the verdict (hero), who and what it's built on
  (logos), the services (F10: services-first), the evidence, the process (pipeline), the work, the history
  (trajectory) and, when there are real ones, kind words. The footer carries
  the final invitation.
*/

const SECTIONS = [
  { id: "hm-top", label: "Verdict" },
  { id: "hm-services", label: "Services" },
  { id: "hm-evidence", label: "Evidence" },
  { id: "hm-pipeline", label: "Pipeline" },
  { id: "hm-work", label: "Work" },
  { id: "hm-journey", label: "Trajectory" },
].concat(RECOMMENDATIONS.length ? [{ id: "hm-references", label: "References" }] : []);

function Home({ theme }) {
  // The GitHub snapshot (57KB) loads only once the Work section is near, or
  // when the recruiter brief asks for it.
  const [wantGithub, setWantGithub] = useState(false);
  const github = useGithub(wantGithub);
  const loadGithub = useCallback(() => setWantGithub(true), []);

  const [briefOpen, setBriefOpen] = useState(false);
  const openBrief = useCallback(() => {
    // Still inside the click: lets the film's score start on Safari too.
    if (!prefersReducedMotion()) unlockFilmScore();
    setWantGithub(true);
    setBriefOpen(true);
  }, []);
  const closeBrief = useCallback(() => setBriefOpen(false), []);

  // A pass green that clears WCAG AA on this theme's background
  const passVars = usePassVars(theme);

  return (
    <div className="hm-page">
      <a className="hm-skip" href="#main">
        Skip to content
      </a>
      <Header theme={theme} />
      <main className="hm hm-js" id="main" tabIndex={-1} style={passVars}>
        <div className="hm-backdrop" aria-hidden="true">
          <div className="hm-backdrop__grid" />
          <div className="hm-backdrop__glow hm-backdrop__glow--a" />
          <div className="hm-backdrop__glow hm-backdrop__glow--b" />
        </div>

        <SpecRail sections={SECTIONS} />
        <Hero />
        <Logos />
        <Offers />
        <Evidence />
        <Pipeline />
        <Work github={github} onNear={loadGithub} />
        <Trajectory onOpenBrief={openBrief} />
        <References />
        <MobileBar />
      </main>
      <RecruiterBrief open={briefOpen} onClose={closeBrief} github={github} style={passVars} />
      <CreativeFooter theme={theme} />
      <TopButton theme={theme} />
    </div>
  );
}

// Theme is the only prop, so switching between /home and /splash doesn't
// re-render the page under the intro.
export default React.memo(Home);
