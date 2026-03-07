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

class AllProjects extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAllRepos: true, // Default to show all repositories
      searchTerm: "",
      sortBy: "updated", // updated, created, name, stars
      filterBy: "all", // all, original, forks
      allRepos: AllProjectsData.data,
      pinnedRepos: ProjectsData.data,
      loading: false,
      lastRefresh: new Date().toLocaleTimeString(),
      autoRefresh: true,
      refreshInterval: null
    };
  }

  componentDidMount() {
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
  }

  refreshRepositories = async () => {
    this.setState({ loading: true });
    
    try {
      // In a real app, you would call your GitHub service here
      // For now, we'll simulate a refresh by re-reading the JSON files
      // This would be replaced with actual API calls
      console.log("Refreshing repositories data...");
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, you would:
      // const service = new GitHubService();
      // const freshRepos = await service.getAllRepositories();
      // this.setState({ allRepos: freshRepos });
      
      this.setState({ 
        lastRefresh: new Date().toLocaleTimeString(),
        loading: false 
      });
      
    } catch (error) {
      console.error("Error refreshing repositories:", error);
      this.setState({ loading: false });
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
      lastRefresh, 
      autoRefresh,
      allRepos,
      pinnedRepos 
    } = this.state;
    const filteredRepos = this.getFilteredAndSortedRepos();

    return (
      <div className="projects-main">
        <Header theme={theme} />
        <div className="basic-projects">
          <Fade bottom duration={2000} distance="40px">
            <div className="projects-heading-div">
              <div className="projects-heading-img-div">
                <ProjectsImg theme={theme} />
              </div>
              <div className="projects-heading-text-div">
                <h1
                  className="projects-heading-text"
                  style={{ color: theme.text }}
                >
                  {projectsHeader.title} {loading && "🔄"}
                </h1>
                <p
                  className="projects-header-detail-text subTitle"
                  style={{ color: theme.secondaryText }}
                >
                  {projectsHeader["description"]}
                </p>
                <p style={{ color: theme.secondaryText, fontSize: "14px", marginTop: "10px" }}>
                  Last refreshed: {lastRefresh} | Auto-refresh: {autoRefresh ? "ON" : "OFF"}
                </p>
              </div>
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
