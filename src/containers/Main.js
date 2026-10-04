import React, { Component, useEffect, useRef } from "react";
import { Redirect, Route, Switch, BrowserRouter, useLocation } from "react-router-dom";
import Home from "../pages/home/HomeComponent";
import Splash from "../pages/splash/Splash";
import { introPlaysAt } from "../pages/splash/introPolicy";
import Education from "../pages/education/EducationComponent";
import Experience from "../pages/experience/Experience";
import AutomationArsenal from "../pages/automationArsenal/AutomationArsenal";
import Opensource from "../pages/opensource/Opensource";
import Contact from "../pages/contact/ContactComponent";
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetail from "../pages/projects/ProjectDetail";
import Universe from "../pages/universe/Universe";
import About from "../pages/about/About";
import HireMe from "../pages/hire/HireMe";
import Services from "../pages/services/Services";
import ServiceDetail from "../pages/services/ServiceDetail";
import Error404 from "../pages/errors/error404/Error";
import ToolsHub from "../pages/tools/ToolsHub";
import ReleaseChecklist from "../pages/tools/ReleaseChecklist";
import RoiCalculator from "../pages/tools/RoiCalculator";
import FlakyDoctor from "../pages/tools/FlakyDoctor";
import AiReadinessQuiz from "../pages/tools/AiReadinessQuiz";
import SiteScanner from "../pages/tools/SiteScanner";
import ScanReport from "../pages/tools/ScanReport";
import EvalPlayground from "../pages/tools/EvalPlayground";
import StarterKit from "../pages/starterKit/StarterKit";
import Mentoring from "../pages/mentoring/Mentoring";
import Ask from "../pages/ask/Ask";
import Products from "../pages/products/Products";
import RecruiterKit from "../pages/hire/RecruiterKit";
import SudoHire from "../components/sudoHire/SudoHire";

// Stage 3 + 4: the free tools (/free-tools/<slug>), one component each.
const TOOL_PAGES = {
  "release-readiness-checklist": ReleaseChecklist,
  "qa-roi-calculator": RoiCalculator,
  "flaky-test-doctor": FlakyDoctor,
  "ai-readiness-quiz": AiReadinessQuiz,
  "site-scanner": SiteScanner,
  "ai-eval-playground": EvalPlayground,
};

// Start every new page at the top (hash links like #commits scroll themselves).
// A fresh load or a refresh keeps the position the browser restores: scrolling
// to the top there ran before Lenis existed, and with html's
// scroll-behavior: smooth it animated the whole page back up after a refresh.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (hash) return;
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      // Jump, don't glide (no Lenis means reduced motion is on)
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch (error) {
        window.scrollTo(0, 0);
      }
    }
  }, [pathname, hash]);
  return null;
}

// The intro plays over the home page, so its signature can land on the real
// header logo: on the first visit to / (see introPolicy) and whenever the
// header signature links to /splash.

export default class Main extends Component {
  render() {
    return (
      <BrowserRouter basename="/">
        <ScrollToTop />
        <SudoHire />
        <Route
          exact
          path={["/", "/splash"]}
          render={(props) =>
            introPlaysAt(props.location.pathname) ? <Splash {...props} theme={this.props.theme} /> : null
          }
        />
        <Switch>
          <Route
            exact
            path={["/", "/home", "/splash"]}
            // Theme only: Home is pure, so switching between /home and /splash
            // doesn't re-render the whole page under the intro.
            render={() => <Home theme={this.props.theme} />}
          />
          <Route
            path="/experience"
            exact
            render={(props) => (
              <Experience {...props} theme={this.props.theme} />
            )}
          />
          <Route
            path="/education"
            render={(props) => (
              <Education {...props} theme={this.props.theme} />
            )}
          />
          <Route
            path="/automation-arsenal"
            render={(props) => (
              <AutomationArsenal {...props} theme={this.props.theme} />
            )}
          />
          <Route
            path="/work/open-source"
            exact
            render={(props) => (
              <Opensource {...props} theme={this.props.theme} />
            )}
          />
          <Route
            path="/contact"
            render={(props) => <Contact {...props} theme={this.props.theme} />}
          />
          <Route
            path="/work"
            exact
            render={(props) => <ProjectsPage {...props} theme={this.props.theme} />}
          />
          <Route
            path="/about"
            exact
            render={(props) => <About {...props} theme={this.props.theme} />}
          />
          <Route
            path="/services"
            exact
            render={(props) => <Services {...props} theme={this.props.theme} />}
          />
          <Route
            path="/services/:slug"
            exact
            render={(props) => <ServiceDetail {...props} theme={this.props.theme} />}
          />
          <Route
            path="/hire-me"
            exact
            render={(props) => <HireMe {...props} theme={this.props.theme} />}
          />
          <Route
            path="/hire-me/kit"
            exact
            render={(props) => <RecruiterKit {...props} theme={this.props.theme} />}
          />
          <Route
            path="/free-tools"
            exact
            render={(props) => <ToolsHub {...props} theme={this.props.theme} />}
          />
          <Route
            path="/free-tools/site-scanner/report"
            exact
            render={(props) => <ScanReport {...props} theme={this.props.theme} />}
          />
          <Route
            path="/free-tools/:slug"
            exact
            render={(props) => {
              const Page = TOOL_PAGES[props.match.params.slug];
              return Page ? <Page {...props} theme={this.props.theme} /> : <Error404 {...props} theme={this.props.theme} />;
            }}
          />
          <Route
            path="/products"
            exact
            render={(props) => <Products {...props} theme={this.props.theme} />}
          />
          <Route
            path="/starter-kit"
            exact
            render={(props) => <StarterKit {...props} theme={this.props.theme} />}
          />
          <Route
            path="/mentoring"
            exact
            render={(props) => <Mentoring {...props} theme={this.props.theme} />}
          />
          <Route
            path="/ask"
            exact
            render={(props) => <Ask {...props} theme={this.props.theme} />}
          />
          {/* F10: Projects and Open Source moved under Work (the server 301s these too). */}
          <Route
            exact
            path="/projects"
            render={({ location }) => <Redirect to={{ pathname: "/work", search: location.search }} />}
          />
          <Redirect exact from="/opensource" to="/work/open-source" />
          <Route
            path="/projects/:name"
            render={(props) => <ProjectDetail {...props} theme={this.props.theme} />}
          />
          <Route
            path="/universe/:module?"
            render={(props) => <Universe {...props} theme={this.props.theme} />}
          />
          <Route
            path="*"
            render={(props) => <Error404 {...props} theme={this.props.theme} />}
          />
        </Switch>
      </BrowserRouter>
    );
  }
}
