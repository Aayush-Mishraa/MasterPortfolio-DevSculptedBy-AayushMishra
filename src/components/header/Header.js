import React, { Component, createRef } from "react";
import "./Header.css";
import { NavLink, withRouter } from "react-router-dom";
import { greeting, socialMediaLinks } from "../../portfolio.js";
import SeoHeader from "../seoHeader/SeoHeader";
import ThemeSelector from "../themeSelector/ThemeSelector";
import CommandPalette from "./CommandPalette";
import { MODULES as UNIVERSE_PAGES } from "../../pages/universe/modules";
import { automationTools } from "../../pages/automationArsenal/arsenalData";
import { loadSnapshot, prettyName } from "../../services/github/githubData";
import { unlockIntroSound } from "../../pages/splash/introSound";
import { introSoundOn } from "../../pages/splash/introPolicy";

const NAV_LINKS = [
  {
    to: "/",
    label: "Home",
    icon: "fa-solid fa-house",
    isActive: (match, location) => Boolean(match || location.pathname === "/")
  },
  { to: "/education", label: "Education", icon: "fa-solid fa-graduation-cap" },
  { to: "/experience", label: "Experience", icon: "fa-solid fa-briefcase" },
  { to: "/projects", label: "Projects", icon: "fa-solid fa-diagram-project" },
  { to: "/automation-arsenal", label: "Automation Arsenal", icon: "fa-solid fa-robot" },
  {
    to: "/opensource",
    label: "Open Source",
    icon: "fa-solid fa-code-branch",
    // The Tech Universe lives under Open Source.
    isActive: (match, location) => Boolean(match || location.pathname.startsWith("/universe"))
  }
];

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

// Pick dark or white text for a button filled with the theme accent (WCAG luminance).
const readableOn = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.36 ? "#0b1220" : "#ffffff";
};

// Every page mounts its own Header, so the indicator's last position is kept
// here to let it glide from the previous page's link to the new one.
let lastIndicator = null;

class Header extends Component {
  state = {
    isScrolled: false,
    paletteOpen: false,
    projects: []
  };

  linksRef = createRef();
  progressRef = createRef();
  headerRef = createRef();

  closeMobileMenu = () => {
    const menuBtn = document.getElementById("menu-btn");
    if (menuBtn) {
      menuBtn.checked = false;
    }
  }

  // The logo replays the intro; unlocking audio inside this click is what lets
  // browsers (Safari especially) play its sound.
  replayIntro = () => {
    // Inside the click, so the intro may play sound (only if it's turned on).
    if (introSoundOn()) unlockIntroSound();
    this.closeMobileMenu();
  }

  componentDidMount() {
    document.addEventListener("click", this.handleOutsideClick);
    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.placeIndicatorOnActive);
    this.handleScroll();
    this.initIndicator();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(this.placeIndicatorOnActive);
    }
    this.tickClock();
    this.clockTimer = setInterval(this.tickClock, 1000);
  }

  componentWillUnmount() {
    document.removeEventListener("click", this.handleOutsideClick);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.placeIndicatorOnActive);
    cancelAnimationFrame(this.indicatorFrame);
    cancelAnimationFrame(this.scrollFrame);
    clearInterval(this.clockTimer);
    this.unmounted = true;
  }

  tickClock = () => {
    const time = CLOCK.format(new Date());
    document.querySelectorAll("[data-hud-clock]").forEach((el) => {
      el.textContent = time;
    });
  }

  // Batch scroll work to one update per frame
  onScroll = () => {
    if (this.scrollFrame) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.handleScroll();
    });
  }

  handleScroll = () => {
    const y = window.scrollY;
    const isScrolled = y > 24;
    if (isScrolled !== this.state.isScrolled) {
      this.setState({ isScrolled });
    }

    // Set on the progress line itself: custom properties inherit, so setting it on the
    // whole bar restyled every element in the header on every scroll frame.
    const line = this.progressRef.current;
    if (line) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(y / max, 1) : 0;
      line.style.setProperty("--hud-progress", progress.toFixed(4));
    }
  }

  handleOutsideClick = (event) => {
    const header = this.headerRef.current;
    const menuBtn = document.getElementById("menu-btn");

    if (header && !header.contains(event.target) && menuBtn && menuBtn.checked) {
      this.closeMobileMenu();
    }
  }

  handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      this.togglePalette();
    } else if (event.key === "Escape") {
      this.closeMobileMenu();
    }
  }

  togglePalette = () => {
    this.closeMobileMenu();
    this.loadProjects();
    this.setState((state) => ({ paletteOpen: !state.paletteOpen }));
  }

  // Projects come from the build-time GitHub snapshot, fetched on first open.
  loadProjects = () => {
    if (this.projectsRequested) return;
    this.projectsRequested = true;
    loadSnapshot().then((snapshot) => {
      const repos = snapshot && Array.isArray(snapshot.repos) ? snapshot.repos : [];
      if (!this.unmounted) this.setState({ projects: repos.filter((repo) => !repo.fork) });
    });
  }

  closePalette = () => this.setState({ paletteOpen: false });

  setIndicator = (rect) => {
    const list = this.linksRef.current;
    if (!list || !rect) return;
    list.style.setProperty("--indicator-x", `${rect.x}px`);
    list.style.setProperty("--indicator-w", `${rect.w}px`);
    list.style.setProperty("--indicator-opacity", rect.w ? "1" : "0");
  }

  // Measure the <li>: it is the indicator's sibling inside the positioned list.
  measure = (link) => {
    const item = link && link.closest("li");
    if (!item) return { x: 0, w: 0 };
    return { x: item.offsetLeft, w: item.offsetWidth };
  }

  activeLink = () => {
    const list = this.linksRef.current;
    return list ? list.querySelector('a[aria-current="page"]') : null;
  }

  placeIndicatorOnActive = () => {
    const rect = this.measure(this.activeLink());
    this.setIndicator(rect);
    if (rect.w) lastIndicator = rect;
  }

  initIndicator = () => {
    const list = this.linksRef.current;
    if (!list) return;
    if (lastIndicator) {
      this.setIndicator(lastIndicator);
      // Double rAF so the starting position is painted before sliding.
      this.indicatorFrame = requestAnimationFrame(() => {
        this.indicatorFrame = requestAnimationFrame(() => {
          list.classList.add("is-ready");
          this.placeIndicatorOnActive();
        });
      });
    } else {
      this.placeIndicatorOnActive();
      this.indicatorFrame = requestAnimationFrame(() => list.classList.add("is-ready"));
    }
  }

  handleLinkHover = (event) => {
    this.setIndicator(this.measure(event.currentTarget));
  }

  paletteItems = () => {
    const { history, location } = this.props;
    const path = location ? location.pathname : "";
    const go = (to) => () => history.push(to);

    const pages = NAV_LINKS.concat({
      to: "/contact",
      label: "Contact",
      icon: "fa-solid fa-paper-plane"
    }).map((link, index) => ({
      id: `page-${link.to}`,
      group: "Navigate",
      label: link.label,
      icon: link.icon,
      hint: String(index + 1).padStart(2, "0"),
      current: path === link.to || (link.to === "/" && path === "/home"),
      run: go(link.to)
    }));

    const socials = socialMediaLinks.map((media) => ({
      id: `social-${media.name}`,
      group: "Connect",
      label: media.name,
      icon: `fab ${media.fontAwesomeIcon}`,
      hint: "↗",
      run: () => window.open(media.link, "_blank", "noopener,noreferrer")
    }));

    // The Tech Universe is its own app, so it opens in a new tab.
    const bandIcons = {
      signal: "fa-solid fa-tower-broadcast",
      ai: "fa-solid fa-microchip",
      build: "fa-solid fa-screwdriver-wrench",
      play: "fa-solid fa-gamepad"
    };
    const universe = [{ id: "hub", title: "Tech Universe", band: "hub" }]
      .concat(UNIVERSE_PAGES)
      .map((page) => {
        const to = page.id === "hub" ? "/universe" : `/universe/${page.id}`;
        return {
          id: `universe-${page.id}`,
          group: "Tech Universe",
          label: page.title,
          icon: bandIcons[page.band] || "fa-solid fa-atom",
          hint: "↗",
          run: () => window.open(to, "_blank", "noopener")
        };
      });

    const tools = automationTools.map((tool) => ({
      id: `tool-${tool.id}`,
      group: "Automation Arsenal",
      label: tool.name,
      keywords: `${tool.category} ${(tool.tags || []).join(" ")}`,
      icon: "fa-solid fa-toolbox",
      hint: tool.category,
      run: () => { window.location.href = tool.docsPath; }
    }));

    const projects = this.state.projects.map((repo) => ({
      id: `project-${repo.name}`,
      group: "Projects",
      label: prettyName(repo.name),
      keywords: `${repo.name} ${repo.language || ""} ${(repo.topics || []).join(" ")}`,
      icon: "fa-solid fa-folder-open",
      hint: repo.language || "",
      run: go(`/projects/${encodeURIComponent(repo.name)}`)
    }));

    return pages.concat(tools, projects, universe, socials);
  }

  render() {
    const { isScrolled, paletteOpen } = this.state;
    const shortcut = IS_MAC ? "⌘K" : "Ctrl K";
    const theme = this.props.theme || {};
    const themeVars = {
      "--nav-text": theme.text,
      "--nav-accent": theme.imageHighlight,
      "--nav-body": theme.body,
      "--nav-on-accent": readableOn(theme.imageHighlight)
    };

    return (
      <>
        <SeoHeader />
        <header
          ref={this.headerRef}
          className={`header hud${isScrolled ? " is-scrolled" : ""}`}
          style={themeVars}
        >
          <div className="hud-bar">
            <span className="hud-progress" ref={this.progressRef} aria-hidden="true"></span>

            <NavLink to="/splash" className="logo" aria-label="Aayush Mishra, replay intro" onClick={this.replayIntro}>
              <span className="logo-bracket">&lt;</span>
              <span className="logo-name">{greeting.logo_name}</span>
              <span className="logo-bracket">/&gt;</span>
            </NavLink>

            <span className="hud-status">
              <span className="hud-dot" aria-hidden="true"></span>
              Available
            </span>

            <input className="menu-btn" type="checkbox" id="menu-btn" />
            <button
              type="button"
              className="hud-icon-btn hud-search-compact"
              onClick={this.togglePalette}
              aria-label="Open command palette"
            >
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            </button>
            <label className="menu-icon" htmlFor="menu-btn" aria-label="Toggle navigation">
              <span className="navicon"></span>
            </label>

            <nav className="nav-panel" aria-label="Primary" data-lenis-prevent>
              <div className="nav-panel-head" aria-hidden="true">
                <span>Menu</span>
                <span>IST <span data-hud-clock>--:--:--</span></span>
              </div>

              <ul
                className="menu"
                ref={this.linksRef}
                onMouseLeave={this.placeIndicatorOnActive}
              >
                <li className="nav-indicator" role="presentation" aria-hidden="true"></li>
                {NAV_LINKS.map((link, index) => (
                  <li key={link.to} style={{ "--i": index }}>
                    <NavLink
                      to={link.to}
                      isActive={link.isActive}
                      onClick={this.closeMobileMenu}
                      onMouseEnter={this.handleLinkHover}
                      onFocus={this.handleLinkHover}
                      onBlur={this.placeIndicatorOnActive}
                    >
                      <span className="nav-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="nav-label">{link.label}</span>
                      <i className="nav-arrow fa-solid fa-arrow-right" aria-hidden="true"></i>
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="nav-actions">
                <button type="button" className="hud-search" onClick={this.togglePalette}>
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                  <span className="hud-search-label">Search</span>
                  <kbd>{shortcut}</kbd>
                </button>
                <div className="theme-selector-nav">
                  <ThemeSelector />
                </div>
                <NavLink to="/contact" className="cta-link" onClick={this.closeMobileMenu}>
                  <span>Let's Talk</span>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </NavLink>
              </div>

              <div className="nav-panel-foot">
                <div className="nav-socials">
                  {socialMediaLinks.map((media) => (
                    <a
                      key={media.name}
                      href={media.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={media.name}
                    >
                      <i className={`fab ${media.fontAwesomeIcon}`} aria-hidden="true"></i>
                    </a>
                  ))}
                </div>
                <span className="nav-foot-status">
                  <span className="hud-dot" aria-hidden="true"></span>
                  Open to SDET roles
                </span>
              </div>
            </nav>
          </div>
        </header>
        <div className="header-spacer" aria-hidden="true"></div>
        <CommandPalette
          open={paletteOpen}
          onClose={this.closePalette}
          items={this.paletteItems()}
          statusText="Available for work"
          style={themeVars}
        />
      </>
    );
  }
}

export default withRouter(Header);
