import React, { Component, useEffect } from "react";
import { Route, Switch, BrowserRouter, useLocation } from "react-router-dom";
import Home from "../pages/home/HomeComponent";
import Splash from "../pages/splash/Splash";
import Education from "../pages/education/EducationComponent";
import Experience from "../pages/experience/Experience";
import AutomationArsenal from "../pages/automationArsenal/AutomationArsenal";
import Opensource from "../pages/opensource/Opensource";
import Contact from "../pages/contact/ContactComponent";
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetail from "../pages/projects/ProjectDetail";
import Universe from "../pages/universe/Universe";
import { settings } from "../portfolio.js";
import Error404 from "../pages/errors/error404/Error";

// Start every new page at the top (hash links like #commits scroll themselves)
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

// The intro plays over the home page, so its signature can land on the real
// header logo. The header signature links to /splash to replay it.
const SPLASH_PATHS = settings.isSplash ? ["/", "/splash"] : ["/splash"];

export default class Main extends Component {
  render() {
    return (
      <BrowserRouter basename="/">
        <ScrollToTop />
        <Route
          exact
          path={SPLASH_PATHS}
          render={(props) => <Splash {...props} theme={this.props.theme} />}
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
