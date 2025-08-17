import fetch from 'node-fetch';

class GitHubService {
  constructor() {
    this.GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
    this.GITHUB_USERNAME = process.env.REACT_APP_GITHUB_USERNAME;
    this.baseUrl = "https://api.github.com/graphql";
    this.restBaseUrl = "https://api.github.com";
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `bearer ${this.GITHUB_TOKEN}`,
    };
  }

  async getAllRepositories() {
    const query = {
      query: `
        query { 
          user(login: "${this.GITHUB_USERNAME}") { 
            repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
              totalCount
              nodes{
                id
                name
                createdAt
                updatedAt
                url
                description
                isFork
                isPrivate
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                }
                languages(first:10){
                  nodes{
                    name
                  }
                }
              }
            }
          }
        }
      `,
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(query),
      });

      const data = await response.json();
      return this.processRepositoryData(data.data.user.repositories.nodes);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return [];
    }
  }

  processRepositoryData(repos) {
    const languages_icons = {
      Python: "logos-python",
      "Jupyter Notebook": "logos-jupyter",
      HTML: "logos-html-5",
      CSS: "logos-css-3",
      JavaScript: "logos-javascript",
      "C#": "logos-c-sharp",
      Java: "logos-java",
      Shell: "simple-icons:shell",
      Ruby: "logos:ruby",
      PHP: "logos-php",
      Dockerfile: "simple-icons:docker",
      Rust: "logos-rust",
      TypeScript: "logos-typescript-icon",
      "C++": "logos-c-plusplus",
      C: "logos-c",
      Swift: "logos-swift",
      Kotlin: "simple-icons:kotlin",
      Go: "logos-go",
      Scala: "logos-scala",
      Dart: "logos-dart",
      Vue: "logos-vue",
      React: "logos-react",
      Angular: "logos-angular-icon",
      Node: "logos-nodejs-icon",
      Express: "simple-icons:express",
      MongoDB: "logos-mongodb-icon",
      MySQL: "logos-mysql-icon",
      PostgreSQL: "logos-postgresql",
      Redis: "logos-redis",
      Docker: "logos-docker-icon",
      Kubernetes: "logos-kubernetes",
      AWS: "logos-aws",
      Firebase: "logos-firebase",
      Unity: "logos-unity",
      R: "logos-r-lang",
      MATLAB: "simple-icons:matlab",
      Perl: "logos-perl",
      Lua: "file-icons:lua",
      PowerShell: "simple-icons:powershell",
      Bash: "simple-icons:gnubash",
      Vim: "logos-vim",
      Assembly: "simple-icons:assemblyscript",
      Makefile: "file-icons:makefile"
    };

    return repos
      .filter(repo => !repo.isPrivate) // Only public repos
      .map(repo => {
        const langobjs = repo.languages.nodes;
        const newLangobjs = [];
        
        // Add primary language first if it exists
        if (repo.primaryLanguage && repo.primaryLanguage.name in languages_icons) {
          newLangobjs.push({
            name: repo.primaryLanguage.name,
            iconifyClass: languages_icons[repo.primaryLanguage.name],
          });
        }
        
        // Add other languages
        langobjs.forEach(lang => {
          const langName = lang.name;
          if (langName in languages_icons && !newLangobjs.some(l => l.name === langName)) {
            newLangobjs.push({
              name: langName,
              iconifyClass: languages_icons[langName],
            });
          }
        });
        
        return {
          id: repo.id,
          name: repo.name,
          createdAt: repo.createdAt,
          updatedAt: repo.updatedAt,
          url: repo.url,
          description: repo.description || "No description available",
          isFork: repo.isFork,
          stargazerCount: repo.stargazerCount,
          forkCount: repo.forkCount,
          languages: newLangobjs
        };
      });
  }

  // Method to check for new repositories
  async hasNewRepositories(lastCount) {
    try {
      const response = await fetch(`${this.restBaseUrl}/users/${this.GITHUB_USERNAME}`, {
        headers: {
          "Authorization": `token ${this.GITHUB_TOKEN}`,
        }
      });
      
      const userData = await response.json();
      return userData.public_repos > lastCount;
    } catch (error) {
      console.error('Error checking repository count:', error);
      return false;
    }
  }
}

export default GitHubService;
