import React, { Component } from "react";
import "./Repositories.css";
import { Fade } from "react-reveal";
import GithubRepoCard from "../../components/githubRepoCard/GithubRepoCard";
import AllProjectsData from "../../shared/opensource/all_projects.json";

class Repositories extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAllRepos: false, // Start with featured/recent repos
      searchTerm: "",
      sortBy: "updated",
      isLoading: false,
      animationDelay: 0
    };
  }

  toggleRepoView = () => {
    this.setState({ isLoading: true });
    
    setTimeout(() => {
      this.setState(prevState => ({
        showAllRepos: !prevState.showAllRepos,
        isLoading: false,
        animationDelay: 0
      }));
    }, 300);
  };

  handleSearchChange = (event) => {
    this.setState({ searchTerm: event.target.value });
  };

  handleSortChange = (event) => {
    this.setState({ sortBy: event.target.value });
  };

  getFilteredAndSortedRepos = () => {
    const { showAllRepos, searchTerm, sortBy } = this.state;
    let repos = AllProjectsData.data || [];

    // Filter by search term
    if (searchTerm) {
      repos = repos.filter(repo => 
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
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

    // If not showing all repos, limit to top 6
    return showAllRepos ? repos : repos.slice(0, 6);
  };

  render() {
    const theme = this.props.theme;
    const { showAllRepos, searchTerm, sortBy, isLoading } = this.state;
    const filteredRepos = this.getFilteredAndSortedRepos();
    const totalRepos = AllProjectsData.data ? AllProjectsData.data.length : 0;

    return (
      <div className="repositories-section">
        <div className="repositories-header-div">
          <Fade bottom duration={2000} distance="20px">
            <h1 className="repositories-header" style={{ color: theme.text }}>
              GitHub Repositories {isLoading && <span style={{ fontSize: '0.7em' }}>🔄</span>}
            </h1>
            <p className="repositories-subtitle" style={{ color: theme.secondaryText }}>
              Explore my latest projects and contributions ({totalRepos} total repositories)
            </p>
          </Fade>
        </div>

        {/* Repository Controls */}
        <div className="repositories-controls">
          <div className="control-row">
            <button
              className={`repo-toggle-btn ${!showAllRepos ? 'active' : ''}`}
              onClick={this.toggleRepoView}
              style={{
                padding: "8px 16px",
                margin: "0 5px",
                border: "2px solid",
                borderColor: !showAllRepos ? theme.highlight : theme.secondaryText,
                backgroundColor: !showAllRepos ? theme.highlight : "transparent",
                color: !showAllRepos ? "#fff" : theme.text,
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                transition: "all 0.3s ease"
              }}
            >
              Featured (6)
            </button>
            <button
              className={`repo-toggle-btn ${showAllRepos ? 'active' : ''}`}
              onClick={this.toggleRepoView}
              style={{
                padding: "8px 16px",
                margin: "0 5px",
                border: "2px solid",
                borderColor: showAllRepos ? theme.highlight : theme.secondaryText,
                backgroundColor: showAllRepos ? theme.highlight : "transparent",
                color: showAllRepos ? "#fff" : theme.text,
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                transition: "all 0.3s ease"
              }}
            >
              All ({totalRepos})
            </button>
          </div>

          <div className="search-sort-row">
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={this.handleSearchChange}
              style={{
                padding: "8px 12px",
                border: `2px solid ${theme.secondaryText}`,
                borderRadius: "20px",
                backgroundColor: theme.body,
                color: theme.text,
                fontSize: "14px",
                minWidth: "200px",
                marginRight: "10px"
              }}
            />
            
            <select
              value={sortBy}
              onChange={this.handleSortChange}
              style={{
                padding: "8px 12px",
                border: `2px solid ${theme.secondaryText}`,
                borderRadius: "20px",
                backgroundColor: theme.body,
                color: theme.text,
                fontSize: "14px"
              }}
            >
              <option value="updated">Latest Updated</option>
              <option value="created">Recently Created</option>
              <option value="name">Name A-Z</option>
              <option value="stars">Most Starred</option>
            </select>
          </div>
        </div>

        {/* Repository Grid */}
        <div className={`repositories-grid ${this.state.isLoading ? 'loading' : ''}`}>
          {filteredRepos.map((repo, index) => {
            return (
              <GithubRepoCard key={repo.id} repo={repo} theme={theme} />
            );
          })}
        </div>

        {filteredRepos.length === 0 && (
          <div className="no-repos-message" style={{ color: theme.secondaryText }}>
            <p>No repositories found matching your criteria.</p>
          </div>
        )}

        {!showAllRepos && totalRepos > 6 && (
          <div className="view-all-repos" style={{ textAlign: "center", marginTop: "30px" }}>
            <button
              onClick={this.toggleRepoView}
              style={{
                padding: "12px 24px",
                border: `2px solid ${theme.highlight}`,
                backgroundColor: "transparent",
                color: theme.highlight,
                borderRadius: "25px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.highlight;
                e.target.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = theme.highlight;
              }}
            >
              View All {totalRepos} Repositories
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default Repositories;
