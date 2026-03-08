import React, { Component } from "react";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import GithubRepoCard from "../../components/githubRepoCard/GithubRepoCard";
import PublicationCard from "../../components/publicationsCard/PublicationCard";
import Button from "../../components/button/Button";
import TopButton from "../../components/topButton/TopButton";
import { Fade } from "react-reveal";
import {
  greeting,
  projectsHeader,
  publicationsHeader,
  publications,
} from "../../portfolio.js";
import ProjectsData from "../../shared/opensource/projects.json";
import AllProjectsData from "../../shared/opensource/all_projects.json";
import "./Projects.css";
import ProjectsImg from "./ProjectsImg";

const GITHUB_USERNAME = "Aayush-Mishraa";

const GITHUB_REPOS_API_URL =
  `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated`;
const GITHUB_USER_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}`;
const GITHUB_EVENTS_API_URL =
  `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=100`;
const GITHUB_CONTRIBUTIONS_API_URL =
  `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}`;

const GITHUB_STATS_CARD_URL =
  `https://github-readme-stats.vercel.app/api?username=${GITHUB_USERNAME}&show_icons=true&hide_border=true&count_private=true&include_all_commits=true&title_color=174a78&text_color=4f6f90&icon_color=2f9ed8&bg_color=00000000`;
const GITHUB_STREAK_CARD_URL =
  `https://github-readme-streak-stats.herokuapp.com/?user=${GITHUB_USERNAME}&hide_border=true&background=00000000&ring=2f9ed8&fire=2f9ed8&currStreakLabel=174a78&sideNums=174a78&currStreakNum=174a78&dates=4f6f90&sideLabels=4f6f90`;
const GITHUB_ACTIVITY_GRAPH_URL =
  `https://github-readme-activity-graph.vercel.app/graph?username=${GITHUB_USERNAME}&bg_color=00000000&color=4f6f90&line=2f9ed8&point=174a78&area=true&hide_border=true`;

const AUTOMATION_REPO_KEYWORDS = [
  "automation",
  "framework",
  "testing",
  "test",
  "playwright",
  "selenium",
  "api",
  "ai",
  "agent",
];

const LANGUAGE_ICON_MAP = {
  JavaScript: "logos-javascript",
  TypeScript: "logos-typescript-icon",
  Python: "logos-python",
  Java: "logos-java",
  HTML: "logos-html-5",
  CSS: "logos-css-3",
  "C#": "logos-c-sharp",
  "C++": "logos-c-plusplus",
  C: "logos-c",
  Go: "logos-go",
  Shell: "simple-icons:shell",
  Dockerfile: "simple-icons:docker",
  Kotlin: "simple-icons:kotlin",
  Swift: "logos-swift",
  Dart: "logos-dart",
  PHP: "logos-php",
  Ruby: "logos:ruby",
  Rust: "logos-rust",
};

const LANGUAGE_COLOR_MAP = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00add8",
  Kotlin: "#a97bff",
  PHP: "#4f5d95",
  Ruby: "#701516",
  Rust: "#dea584",
  Shell: "#89e051",
};

class AllProjects extends Component {
  constructor(props) {
    super(props);
    this.counterIntervals = new Set();
    this.animationTimeouts = new Set();
    this.counterStartTimeout = null;
    this.languageBarTimeout = null;
    this.state = {
      showAllRepos: true, // Default to show all repositories
      searchTerm: "",
      sortBy: "updated", // updated, created, name, stars
      filterBy: "all", // all, original, forks
      allRepos: [],
      pinnedRepos: ProjectsData.data,
      loading: true,
      errorMessage: "",
      lastRefresh: new Date().toLocaleTimeString(),
      autoRefresh: true,
      refreshInterval: null,
      githubProfileUrl: `https://github.com/${GITHUB_USERNAME}`,
      githubDashboard: {
        publicRepos: 0,
        totalStars: 0,
        totalContributions: 0,
        totalCommits: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastCommitLabel: "No recent commit activity",
        topLanguages: [],
      },
    };
  }

  componentDidMount() {
    // Always request fresh repositories when the page is opened.
    this.refreshRepositories();

    // Set up auto-refresh every 5 minutes
    if (this.state.autoRefresh) {
      const interval = setInterval(() => {
        this.refreshRepositories();
      }, 5 * 60 * 1000); // 5 minutes
      
      this.setState({ refreshInterval: interval });
    }
  }

  componentWillUnmount() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
    }
    this.clearCounterAnimations();
  }

  clearCounterAnimations = () => {
    this.counterIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.counterIntervals.clear();
    this.animationTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.animationTimeouts.clear();

    if (this.counterStartTimeout) {
      clearTimeout(this.counterStartTimeout);
      this.counterStartTimeout = null;
    }

    if (this.languageBarTimeout) {
      clearTimeout(this.languageBarTimeout);
      this.languageBarTimeout = null;
    }
  };

  setManagedTimeout = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      this.animationTimeouts.delete(timeoutId);
      callback();
    }, delay);

    this.animationTimeouts.add(timeoutId);
    return timeoutId;
  };

  hasAutomationKeyword = (repoName = "", repoDescription = "") => {
    const normalizedName = repoName.toLowerCase();
    const normalizedDescription = repoDescription.toLowerCase();
    const combinedText = `${normalizedName} ${normalizedDescription}`;

    return AUTOMATION_REPO_KEYWORDS.some((keyword) => {
      if (keyword === "ai") {
        // Keep AI matching strict to avoid false positives like "main".
        return /(^|[^a-z0-9])ai([^a-z0-9]|$)/.test(combinedText);
      }

      return combinedText.includes(keyword);
    });
  };

  toLanguageLogos = (languageName) => {
    if (!languageName || !LANGUAGE_ICON_MAP[languageName]) {
      return [];
    }

    return [
      {
        name: languageName,
        iconifyClass: LANGUAGE_ICON_MAP[languageName],
      },
    ];
  };

  normalizeRepo = (repo) => ({
    id: repo.id,
    name: repo.name,
    description: repo.description || "No description available",
    primaryLanguage: repo.language || "Not specified",
    languages: this.toLanguageLogos(repo.language),
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    url: repo.html_url,
    isFork: repo.fork,
    stargazerCount: repo.stargazers_count,
    forkCount: repo.forks_count,
  });

  fetchContributionData = async () => {
    const currentYear = new Date().getFullYear();

    try {
      const response = await fetch(
        `${GITHUB_CONTRIBUTIONS_API_URL}?y=${currentYear}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch (error) {
      return null;
    }
  };

  formatRelativeTime = (isoDate) => {
    if (!isoDate) {
      return "No recent commit activity";
    }

    const now = new Date();
    const target = new Date(isoDate);
    const diffInMs = now - target;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) {
      return "Just now";
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInHours < 24) {
      return `${diffInHours} hr ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
  };

  calculateLanguageStats = (repos, aggregatedBytes = {}) => {
    const hasByteData = Object.keys(aggregatedBytes).length > 0;

    if (hasByteData) {
      const totalBytes = Object.values(aggregatedBytes).reduce(
        (sum, bytes) => sum + bytes,
        0
      );
      const topLanguages = Object.entries(aggregatedBytes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, bytes]) => ({
          name,
          count: bytes,
          percentage:
            totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
          color: LANGUAGE_COLOR_MAP[name] || "#4f6f90",
        }));
      console.log("[Languages] Final processed topLanguages (byte-based):", topLanguages);
      return topLanguages;
    }

    // Fallback: use repo.language primary field if no byte data was returned
    console.warn("[Languages] No byte data — falling back to repo.language counts");
    const languageCount = repos
      .filter((repo) => !repo.fork && repo.language)
      .reduce((accumulator, repo) => {
        const languageName = repo.language;
        accumulator[languageName] = (accumulator[languageName] || 0) + 1;
        return accumulator;
      }, {});

    const languageEntries = Object.entries(languageCount).sort(
      (a, b) => b[1] - a[1]
    );
    const totalTaggedRepos = languageEntries.reduce(
      (total, [, count]) => total + count,
      0
    );
    const fallback = languageEntries.slice(0, 5).map(([name, count]) => ({
      name,
      count,
      percentage:
        totalTaggedRepos > 0 ? Math.round((count / totalTaggedRepos) * 100) : 0,
      color: LANGUAGE_COLOR_MAP[name] || "#4f6f90",
    }));
    console.log("[Languages] Fallback topLanguages (repo.language):", fallback);
    return fallback;
  };

  calculateEventStreak = (events) => {
    const pushDates = events
      .filter((event) => event.type === "PushEvent")
      .map((event) => event.created_at.slice(0, 10));

    if (!pushDates.length) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const uniqueDates = [...new Set(pushDates)].sort();
    let longestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;

    uniqueDates.forEach((dateString) => {
      const currentDate = new Date(`${dateString}T00:00:00`);

      if (!previousDate) {
        runningStreak = 1;
      } else {
        const differenceInDays =
          (currentDate - previousDate) / (1000 * 60 * 60 * 24);
        runningStreak = differenceInDays === 1 ? runningStreak + 1 : 1;
      }

      longestStreak = Math.max(longestStreak, runningStreak);
      previousDate = currentDate;
    });

    const today = new Date();
    const currentStreak = uniqueDates
      .slice()
      .reverse()
      .reduce((streak, dateString, index, array) => {
        if (index === 0) {
          const firstDate = new Date(`${dateString}T00:00:00`);
          const gap = (today - firstDate) / (1000 * 60 * 60 * 24);

          if (gap > 1) {
            return 0;
          }

          return 1;
        }

        if (streak === 0) {
          return 0;
        }

        const previous = new Date(`${array[index - 1]}T00:00:00`);
        const current = new Date(`${dateString}T00:00:00`);
        const differenceInDays = (previous - current) / (1000 * 60 * 60 * 24);

        return differenceInDays === 1 ? streak + 1 : streak;
      }, 0);

    return { currentStreak, longestStreak };
  };

  calculateContributionStreak = (contributionDays) => {
    if (!contributionDays || !contributionDays.length) {
      return null;
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const validDays = contributionDays
      .filter((day) => day.date <= todayISO)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!validDays.length) {
      return null;
    }

    let longestStreak = 0;
    let runningStreak = 0;

    validDays.forEach((day) => {
      if (day.count > 0) {
        runningStreak += 1;
        longestStreak = Math.max(longestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    });

    let currentStreak = 0;

    for (let index = validDays.length - 1; index >= 0; index -= 1) {
      if (validDays[index].count > 0) {
        currentStreak += 1;
      } else {
        break;
      }
    }

    return { currentStreak, longestStreak };
  };

  buildDashboardData = ({ repos, profile, events, contributionData, aggregatedBytes = {} }) => {
    const totalStars = repos.reduce(
      (sum, repo) => sum + (repo.stargazers_count || 0),
      0
    );
    const pushEvents = events.filter((event) => event.type === "PushEvent");
    const totalCommits = pushEvents.reduce(
      (sum, event) => sum + (event.payload?.size || 0),
      0
    );

    const latestCommitDate =
      pushEvents[0]?.created_at || repos[0]?.pushed_at || repos[0]?.updated_at;

    const yearKey = String(new Date().getFullYear());
    const contributionTotalFromApi = contributionData?.total?.[yearKey] || 0;
    const contributionStreakFromApi = this.calculateContributionStreak(
      contributionData?.contributions
    );
    const contributionStreakFromEvents = this.calculateEventStreak(events);

    const currentStreak = contributionStreakFromApi
      ? contributionStreakFromApi.currentStreak
      : contributionStreakFromEvents.currentStreak;
    const longestStreak = contributionStreakFromApi
      ? contributionStreakFromApi.longestStreak
      : contributionStreakFromEvents.longestStreak;

    return {
      publicRepos: profile?.public_repos || repos.length,
      totalStars,
      totalContributions:
        contributionTotalFromApi > 0 ? contributionTotalFromApi : events.length,
      totalCommits,
      currentStreak,
      longestStreak,
      lastCommitLabel: this.formatRelativeTime(latestCommitDate),
      topLanguages: this.calculateLanguageStats(repos, aggregatedBytes),
    };
  };

  animateCounter = (element, target, options = {}) => {
    const { steps = 50, intervalMs = 30, suffix = "" } = options;

    if (!element || !Number.isFinite(target) || target <= 0) {
      if (element) element.textContent = `0${suffix}`;
      return;
    }

    let count = 0;
    const increment = target / steps;

    element.textContent = `0${suffix}`;

    const intervalId = setInterval(() => {
      count += increment;

      if (count >= target) {
        element.textContent = `${Math.round(target)}${suffix}`;
        clearInterval(intervalId);
        this.counterIntervals.delete(intervalId);
      } else {
        element.textContent = `${Math.floor(count)}${suffix}`;
      }
    }, intervalMs);

    this.counterIntervals.add(intervalId);
  };

  // Animate dashboard counters after React has rendered updated GitHub data
  animateCounters = () => {
    this.clearCounterAnimations();
    const { githubDashboard } = this.state;

    requestAnimationFrame(() => {
      this.counterStartTimeout = setTimeout(() => {
        // Animate all stat counters from 0 -> final value
        const counterElements = document.querySelectorAll('.stat-number[data-target]');
        counterElements.forEach((element) => {
          const finalValue = parseInt(element.getAttribute('data-target'), 10);
          this.animateCounter(element, Number.isFinite(finalValue) ? finalValue : 0);
        });

        const hasLanguageData = (githubDashboard?.topLanguages || []).length > 0;
        if (!hasLanguageData) {
          return;
        }

        // Animate language bars and percentages in a subtle stagger after data load
        this.languageBarTimeout = this.setManagedTimeout(() => {
          const languageBars = document.querySelectorAll('.language-fill[data-width]');
          languageBars.forEach((bar, index) => {
            const width = Number(bar.getAttribute('data-width'));
            const safeWidth = Number.isFinite(width) ? width : 0;

            bar.style.width = '0%';
            bar.style.transitionDelay = `${0.3 + index * 0.1}s`;
            this.setManagedTimeout(() => {
              bar.style.width = `${safeWidth}%`;
            }, 20);
          });

          const languagePercents = document.querySelectorAll('.language-percent[data-percent]');
          languagePercents.forEach((percentElement, index) => {
            const targetPercent = Number(percentElement.getAttribute('data-percent'));
            const delayMs = 300 + index * 100;

            percentElement.textContent = '0%';

            this.setManagedTimeout(() => {
              this.animateCounter(
                percentElement,
                Number.isFinite(targetPercent) ? targetPercent : 0,
                { steps: 40, intervalMs: 30, suffix: '%' }
              );
            }, delayMs);
          });
        }, 200);
      }, 100);
    });
  };

  refreshRepositories = async () => {
    this.setState({ loading: true, errorMessage: "" });

    try {
      const [reposResponse, profileResponse, eventsResponse, contributionData] =
        await Promise.all([
          fetch(
            `${GITHUB_REPOS_API_URL}&direction=desc&per_page=100&t=${Date.now()}`,
            {
              method: "GET",
              headers: {
                Accept: "application/vnd.github+json",
              },
              cache: "no-store",
            }
          ),
          fetch(GITHUB_USER_API_URL, {
            method: "GET",
            headers: {
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          }),
          fetch(`${GITHUB_EVENTS_API_URL}&t=${Date.now()}`, {
            method: "GET",
            headers: {
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          }),
          this.fetchContributionData(),
        ]);

      if (!reposResponse.ok) {
        throw new Error(
          `GitHub API request failed with status ${reposResponse.status}`
        );
      }

      const repos = await reposResponse.json();
      const profile = profileResponse.ok ? await profileResponse.json() : null;
      const events = eventsResponse.ok ? await eventsResponse.json() : [];

      // --- Fetch per-repo language byte counts (top 25 non-forks to stay within rate limits) ---
      const nonForkRepos = repos.filter((r) => !r.fork).slice(0, 25);
      const languageResults = await Promise.allSettled(
        nonForkRepos.map((repo) =>
          fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/languages`,
            {
              method: "GET",
              headers: { Accept: "application/vnd.github+json" },
              cache: "no-store",
            }
          ).then((r) => (r.ok ? r.json() : {}))
        )
      );
      console.log("[Languages] Raw API results per repo:", languageResults);

      const aggregatedBytes = {};
      languageResults.forEach(({ status, value }) => {
        if (status === "fulfilled" && value && typeof value === "object") {
          Object.entries(value).forEach(([lang, bytes]) => {
            aggregatedBytes[lang] = (aggregatedBytes[lang] || 0) + bytes;
          });
        }
      });
      console.log("[Languages] Aggregated byte counts:", aggregatedBytes);
      // -----------------------------------------------------------------------------------------

      const latestAutomationRepos = repos
        .filter((repo) => !repo.fork)
        .filter((repo) => this.hasAutomationKeyword(repo.name, repo.description || ""))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 12)
        .map(this.normalizeRepo);

      const githubDashboard = this.buildDashboardData({
        repos,
        profile,
        events,
        contributionData,
        aggregatedBytes,
      });

      this.setState({
        allRepos: latestAutomationRepos,
        githubDashboard,
        githubProfileUrl: profile?.html_url || `https://github.com/${GITHUB_USERNAME}`,
        lastRefresh: new Date().toLocaleTimeString(),
        loading: false,
      }, () => {
        this.animateCounters();
      });
    } catch (error) {
      const fallbackRepos = (AllProjectsData.data || [])
        .filter((repo) => !repo.isFork)
        .filter((repo) => this.hasAutomationKeyword(repo.name, repo.description || ""))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
        )
        .slice(0, 12);

      this.setState({
        allRepos: fallbackRepos,
        loading: false,
        errorMessage: "Unable to load live repositories right now. Showing cached data.",
      });
    }
  };

  toggleAutoRefresh = () => {
    const { autoRefresh, refreshInterval } = this.state;
    
    if (autoRefresh && refreshInterval) {
      clearInterval(refreshInterval);
      this.setState({ autoRefresh: false, refreshInterval: null });
    } else {
      const interval = setInterval(() => {
        this.refreshRepositories();
      }, 5 * 60 * 1000);
      
      this.setState({ autoRefresh: true, refreshInterval: interval });
    }
  };

  toggleRepoView = () => {
    this.setState(prevState => ({
      showAllRepos: !prevState.showAllRepos
    }));
  };

  handleSearchChange = (event) => {
    this.setState({ searchTerm: event.target.value });
  };

  handleSortChange = (event) => {
    this.setState({ sortBy: event.target.value });
  };

  handleFilterChange = (event) => {
    this.setState({ filterBy: event.target.value });
  };

  getFilteredAndSortedRepos = () => {
    const { showAllRepos, searchTerm, sortBy, filterBy, allRepos, pinnedRepos } = this.state;
    let repos = showAllRepos ? allRepos : pinnedRepos;

    // Filter by search term
    if (searchTerm) {
      repos = repos.filter(repo => 
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (filterBy === "original") {
      repos = repos.filter(repo => !repo.isFork);
    } else if (filterBy === "forks") {
      repos = repos.filter(repo => repo.isFork);
    }

    // Sort repositories
    repos.sort((a, b) => {
      switch (sortBy) {
        case "updated":
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        case "created":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "name":
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        case "stars":
          return (b.stargazerCount || 0) - (a.stargazerCount || 0);
        default:
          return 0;
      }
    });

    return repos;
  };

  render() {
    const theme = this.props.theme;
    const {
      showAllRepos,
      searchTerm,
      sortBy,
      filterBy,
      loading,
      errorMessage,
      lastRefresh,
      autoRefresh,
      allRepos,
      pinnedRepos,
      githubDashboard,
      githubProfileUrl,
    } = this.state;
    const filteredRepos = this.getFilteredAndSortedRepos();

    return (
      <div className="projects-main">
        <Header theme={theme} />
        <div className="basic-projects">
          <Fade bottom duration={2000} distance="40px">
            <div className="projects-hero-dashboard">
              <div className="projects-hero-left">
                <div className="projects-heading-img-div">
                  <ProjectsImg theme={theme} />
                </div>

                <div
                  className="dashboard-card github-actions-cta-card"
                  style={{
                    background: theme.body,
                    borderColor: `${theme.highlight}55`,
                  }}
                >
                  <h3 style={{ color: theme.text }}>Boost CI/CD With GitHub Actions</h3>
                  <p style={{ color: theme.secondaryText }}>
                    Explore pipeline design, workflow triggers, matrix jobs, and
                    deployment automation in the interactive GitHub Actions guide.
                  </p>
                  <a
                    className="github-actions-cta-link"
                    href="/tools/github-actions.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: theme.highlight,
                    }}
                  >
                    <span>Open GitHub Actions Guide</span>
                    <span className="cta-arrow" aria-hidden="true">-&gt;</span>
                  </a>
                </div>
              </div>

              <div className="projects-hero-right">
                <div className="projects-heading-text-div">
                  <h1
                    className="projects-heading-text"
                    style={{ color: theme.text }}
                  >
                    {projectsHeader.title} {loading && "↻"}
                  </h1>
                  <p
                    className="projects-header-detail-text subTitle"
                    style={{ color: theme.secondaryText }}
                  >
                    {projectsHeader["description"]}
                  </p>
                  <p
                    style={{
                      color: theme.secondaryText,
                      fontSize: "clamp(12px, 1.4vw, 15px)",
                      marginTop: "10px",
                    }}
                  >
                    Last refreshed: {lastRefresh} | Auto-refresh: {autoRefresh ? "ON" : "OFF"}
                  </p>
                </div>

                <div
                  className="dashboard-card github-activity-card"
                  style={{
                    background: theme.body,
                    borderColor: `${theme.highlight}33`,
                  }}
                >
                  <div className="dashboard-card-head">
                    <h3 style={{ color: theme.text }}>GitHub Activity Graph</h3>
                    <a
                      href={githubProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-link"
                      style={{ color: theme.highlight }}
                    >
                      View Profile
                    </a>
                  </div>

                  <div className="activity-graph-wrap">
                    <img
                      src={GITHUB_ACTIVITY_GRAPH_URL}
                      alt="GitHub contribution activity graph"
                      className="activity-graph-image"
                      loading="lazy"
                      style={{
                        imageRendering: 'auto',
                        width: '100%',
                        height: 'auto'
                      }}
                    />
                  </div>

                  <div className="activity-preview-grid">
                    <img
                      src={GITHUB_STATS_CARD_URL}
                      alt="GitHub stats summary"
                      loading="lazy"
                      style={{
                        imageRendering: 'auto',
                        width: '100%',
                        height: 'auto'
                      }}
                    />
                    <img
                      src={GITHUB_STREAK_CARD_URL}
                      alt="GitHub streak statistics"
                      loading="lazy"
                      style={{
                        imageRendering: 'auto',
                        width: '100%',
                        height: 'auto'
                      }}
                    />
                  </div>

                  <div className="activity-metrics-row">
                    <div className="metric-pill">
                      <span className="metric-label">Total Commits</span>
                      <span className="metric-value">{githubDashboard.totalCommits}</span>
                    </div>
                    <div className="metric-pill">
                      <span className="metric-label">Current Streak</span>
                      <span className="metric-value">{githubDashboard.currentStreak}</span>
                    </div>
                    <div className="metric-pill">
                      <span className="metric-label">Repo Count</span>
                      <span className="metric-value">{githubDashboard.publicRepos}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Fade>
        </div>

        <div className="basic-projects projects-insights-row">
          <Fade bottom duration={1800} distance="30px">
            <div
              className="dashboard-card github-stats-card"
              style={{
                background: theme.body,
                borderColor: `${theme.highlight}33`,
              }}
            >
              <h3 style={{ color: theme.text }}>GitHub Developer Statistics</h3>

              <div className="github-stats-grid">
                <div className="stat-mini-card">
                  <span className="stat-icon">PR</span>
                  <span id="publicRepos" className="stat-number" data-target={githubDashboard.publicRepos} style={{ color: theme.text }}>
                    {githubDashboard.publicRepos}
                  </span>
                  <span className="stat-label" style={{ color: theme.secondaryText }}>
                    Public Repositories
                  </span>
                </div>

                <div className="stat-mini-card">
                  <span className="stat-icon">ST</span>
                  <span id="totalStars" className="stat-number" data-target={githubDashboard.totalStars} style={{ color: theme.text }}>
                    {githubDashboard.totalStars}
                  </span>
                  <span className="stat-label" style={{ color: theme.secondaryText }}>
                    Total Stars
                  </span>
                </div>

                <div className="stat-mini-card">
                  <span className="stat-icon">CT</span>
                  <span id="totalContributions" className="stat-number" data-target={githubDashboard.totalContributions} style={{ color: theme.text }}>
                    {githubDashboard.totalContributions}
                  </span>
                  <span className="stat-label" style={{ color: theme.secondaryText }}>
                    Total Contributions
                  </span>
                </div>

                <div className="stat-mini-card">
                  <span className="stat-icon">LS</span>
                  <span id="longestStreak" className="stat-number" data-target={githubDashboard.longestStreak} style={{ color: theme.text }}>
                    {githubDashboard.longestStreak}
                  </span>
                  <span className="stat-label" style={{ color: theme.secondaryText }}>
                    Longest Streak
                  </span>
                </div>
              </div>

              <div className="stats-footer-row">
                <div className="last-commit-pill" style={{ color: theme.secondaryText }}>
                  Last Commit Activity: {githubDashboard.lastCommitLabel}
                </div>
              </div>

              <div className="language-panel">
                <h4 style={{ color: theme.text }}>Most Used Languages</h4>
                <div id="mostUsedLanguages" className="language-list">
                  {githubDashboard.topLanguages.length > 0 ? (
                    githubDashboard.topLanguages.map((language, index) => (
                      <div
                        className="language-row"
                        key={language.name}
                        style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                      >
                        <span className="language-name" style={{ color: theme.secondaryText }}>
                          <span
                            className="language-dot"
                            style={{ backgroundColor: language.color }}
                          ></span>
                          {language.name}
                        </span>
                        <span
                          className="language-percent"
                          data-percent={language.percentage}
                          style={{ color: theme.text }}
                        >
                          {language.percentage}%
                        </span>
                        <div className="language-bar">
                          <div
                            className="language-fill"
                            data-width={language.percentage}
                            style={{
                              backgroundColor: language.color,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: theme.secondaryText, margin: 0, fontSize: "13px" }}>
                      Language data will appear after repository sync.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Fade>

          <Fade bottom duration={1800} distance="30px">
            <div
              className="dashboard-card automation-pipeline-card"
              style={{
                background: theme.body,
                borderColor: `${theme.highlight}33`,
              }}
            >
              <div className="automation-pill" style={{ color: theme.highlight }}>
                CI/CD Automation
              </div>
              <h3 style={{ color: theme.text }}>Automated Deployment Pipeline</h3>
              <p style={{ color: theme.secondaryText }}>
                This portfolio automatically deploys to production using GitHub Actions
                whenever new code is pushed.
              </p>

              <div className="pipeline-flow">
                <div className="pipeline-node">
                  <span style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', display: 'block', marginBottom: '4px' }}>💻</span>
                  VS Code
                </div>
                <div className="pipeline-arrow">↓</div>
                <div className="pipeline-node">
                  <span style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', display: 'block', marginBottom: '4px' }}>📤</span>
                  Git Push
                </div>
                <div className="pipeline-arrow">↓</div>
                <div className="pipeline-node highlighted">
                  <span style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', display: 'block', marginBottom: '4px' }}>⚙️</span>
                  GitHub Actions Workflow
                </div>
                <div className="pipeline-arrow">↓</div>
                <div className="pipeline-node">
                  <span style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', display: 'block', marginBottom: '4px' }}>🚀</span>
                  Auto Deploy to Hostinger
                </div>
              </div>

              <a
                className="automation-tools-link"
                href="/automation-arsenal"
                style={{
                  color: theme.body,
                  backgroundColor: theme.highlight,
                }}
              >
                <span>Explore GitHub Actions Guide</span>
                <span style={{ fontSize: '12px' }} aria-hidden="true">→</span>
              </a>
            </div>
          </Fade>
        </div>

        {/* Repository Controls */}
        <div className="repo-controls" style={{ margin: "20px 40px", textAlign: "center" }}>
          <div className="control-row" style={{ marginBottom: "20px" }}>
            <button
              className={`repo-toggle-btn ${showAllRepos ? 'active' : ''}`}
              onClick={this.toggleRepoView}
              style={{
                padding: "10px 20px",
                margin: "0 10px",
                border: "2px solid",
                borderColor: showAllRepos ? theme.highlight : theme.text,
                backgroundColor: showAllRepos ? theme.highlight : "transparent",
                color: showAllRepos ? "#fff" : theme.text,
                borderRadius: "25px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease"
              }}
            >
              All Repositories ({allRepos.length})
            </button>
            <button
              className={`repo-toggle-btn ${!showAllRepos ? 'active' : ''}`}
              onClick={this.toggleRepoView}
              style={{
                padding: "10px 20px",
                margin: "0 10px",
                border: "2px solid",
                borderColor: !showAllRepos ? theme.highlight : theme.text,
                backgroundColor: !showAllRepos ? theme.highlight : "transparent",
                color: !showAllRepos ? "#fff" : theme.text,
                borderRadius: "25px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease"
              }}
            >
              Pinned Repositories ({pinnedRepos.length})
            </button>
          </div>

          {/* Real-time controls */}
          <div className="control-row" style={{ marginBottom: "20px" }}>
            <button
              onClick={this.refreshRepositories}
              disabled={loading}
              style={{
                padding: "8px 16px",
                margin: "0 10px",
                border: `2px solid ${theme.highlight}`,
                backgroundColor: theme.highlight,
                color: "#fff",
                borderRadius: "20px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Refreshing..." : "🔄 Refresh Now"}
            </button>
            
            <button
              onClick={this.toggleAutoRefresh}
              style={{
                padding: "8px 16px",
                margin: "0 10px",
                border: `2px solid ${theme.text}`,
                backgroundColor: autoRefresh ? theme.highlight : "transparent",
                color: autoRefresh ? "#fff" : theme.text,
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              {autoRefresh ? "🟢 Auto-refresh ON" : "⭕ Auto-refresh OFF"}
            </button>
          </div>

          <div className="control-row" style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={this.handleSearchChange}
              style={{
                padding: "10px 15px",
                border: `2px solid ${theme.text}`,
                borderRadius: "25px",
                backgroundColor: theme.body,
                color: theme.text,
                fontSize: "14px",
                minWidth: "200px"
              }}
            />
            
            <select
              value={sortBy}
              onChange={this.handleSortChange}
              style={{
                padding: "10px 15px",
                border: `2px solid ${theme.text}`,
                borderRadius: "25px",
                backgroundColor: theme.body,
                color: theme.text,
                fontSize: "14px"
              }}
            >
              <option value="updated">Sort by Updated</option>
              <option value="created">Sort by Created</option>
              <option value="name">Sort by Name</option>
              <option value="stars">Sort by Stars</option>
            </select>

            <select
              value={filterBy}
              onChange={this.handleFilterChange}
              style={{
                padding: "10px 15px",
                border: `2px solid ${theme.text}`,
                borderRadius: "25px",
                backgroundColor: theme.body,
                color: theme.text,
                fontSize: "14px"
              }}
            >
              <option value="all">All Repos</option>
              <option value="original">Original Only</option>
              <option value="forks">Forks Only</option>
            </select>
          </div>
        </div>

        {/* Repository Grid */}
        {errorMessage && (
          <div style={{ textAlign: "center", margin: "20px", color: theme.secondaryText }}>
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="repo-cards-div-main">
          {filteredRepos.map((repo) => {
            return <GithubRepoCard repo={repo} theme={theme} key={repo.id} />;
          })}
        </div>

        {filteredRepos.length === 0 && (
          <div style={{ textAlign: "center", margin: "40px", color: theme.secondaryText }}>
            <p>No repositories found matching your criteria.</p>
          </div>
        )}

        <Button
          text={"View on GitHub"}
          className="project-button"
          href={greeting.githubProfile}
          newTab={true}
          theme={theme}
        />

        {/* Publications  */}
        {publications.data.length > 0 ? (
          <div className="basic-projects">
            <Fade bottom duration={2000} distance="40px">
              <div className="publications-heading-div">
                <div className="publications-heading-text-div">
                  <h1
                    className="publications-heading-text"
                    style={{ color: theme.text }}
                  >
                    {publicationsHeader.title}
                  </h1>
                  <p
                    className="projects-header-detail-text subTitle"
                    style={{ color: theme.secondaryText }}
                  >
                    {publicationsHeader["description"]}
                  </p>
                </div>
              </div>
            </Fade>
          </div>
        ) : null}

        <div className="repo-cards-div-main">
          {publications.data.map((pub) => {
            return <PublicationCard pub={pub} theme={theme} key={pub.id} />;
          })}
        </div>

        <CreativeFooter theme={this.props.theme} />
        <TopButton theme={this.props.theme} />
      </div>
    );
  }
}

export default AllProjects;
