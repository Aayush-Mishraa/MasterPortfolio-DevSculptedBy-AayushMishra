import React, { Component, useEffect, useRef } from "react";
import { Route, Switch, BrowserRouter, useLocation } from "react-router-dom";
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
import Error404 from "../pages/errors/error404/Error";

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
            path="/opensource"
            render={(props) => (
              <Opensource {...props} theme={this.props.theme} />
            )}
          />
          <Route
            path="/contact"
            render={(props) => <Contact {...props} theme={this.props.theme} />}
          />

          <Route
            path="/projects"
            exact
            render={(props) => <ProjectsPage {...props} theme={this.props.theme} />}
          />
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
