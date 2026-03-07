import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const openSource = {
  githubConvertedToken: process.env.GITHUB_TOKEN,
  githubUserName: process.env.GITHUB_USERNAME,
};

const query_pr = {
  query: `
	query {
	  user(login: "${openSource.githubUserName}"){
	    pullRequests(last: 100, orderBy: {field: CREATED_AT, direction: DESC}){
      totalCount
      nodes{
        id
        title
        url
        state
	      mergedBy {
	          avatarUrl
	          url
	          login
	      }
	      createdAt
	      number
        changedFiles
	      additions
	      deletions
        baseRepository {
	          name
	          url
	          owner {
	            avatarUrl
	            login
	            url
	          }
	        }
      }
    }
	}
}
	`,
};

const query_issue = {
  query: `query{

		user(login: "${openSource.githubUserName}") {
    issues(last: 100, orderBy: {field:CREATED_AT, direction: DESC}){
      totalCount
      nodes{
      	id
        closed
        title
        createdAt
        url
        number
        assignees(first:100){
          nodes{
            avatarUrl
            name
            url
          }
        }
        repository{
          name
          url
          owner{
            login
            avatarUrl
            url
          }
        }
      }
    }
  }

	}`,
};

const query_org = {
  query: `query{
	user(login: "${openSource.githubUserName}") {
	    repositoriesContributedTo(last: 100){
	      totalCount
	      nodes{
	        owner{
	          login
	          avatarUrl
	          __typename
	        }
	      }
	    }
	  }
	}`,
};

const query_pinned_projects = {
  query: `
	query { 
	  user(login: "${openSource.githubUserName}") { 
	    pinnedItems(first: 6, types: REPOSITORY) {
	      totalCount
	      nodes{
	        ... on Repository{
	          id
		          name
		          createdAt,
		          url,
		          description,
		          isFork,
		          languages(first:10){
		            nodes{
		              name
		            }
		          }
	        }
	      }
		  }
	  }
	}
	`,
};

const query_all_repositories = {
  query: `
	query { 
	  user(login: "${openSource.githubUserName}") { 
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

const baseUrl = "https://api.github.com/graphql";

const headers = {
  "Content-Type": "application/json",
  Authorization: "bearer " + openSource.githubConvertedToken,
};

fetch(baseUrl, {
  method: "POST",
  headers: headers,
  body: JSON.stringify(query_pr),
})
  .then((response) => response.text())
  .then((txt) => {
    const data = JSON.parse(txt);
    var cropped = { data: [] };
    cropped["data"] = data["data"]["user"]["pullRequests"]["nodes"];

    var open = 0;
    var closed = 0;
    var merged = 0;
    for (var i = 0; i < cropped["data"].length; i++) {
      if (cropped["data"][i]["state"] === "OPEN") open++;
      else if (cropped["data"][i]["state"] === "MERGED") merged++;
      else closed++;
    }

    cropped["open"] = open;
    cropped["closed"] = closed;
    cropped["merged"] = merged;
    cropped["totalCount"] = cropped["data"].length;

    console.log("Fetching the Pull Request Data.\n");
    fs.writeFile(
      "./src/shared/opensource/pull_requests.json",
      JSON.stringify(cropped),
      function (err) {
        if (err) {
          console.log(err);
        }
      }
    );
  })
  .catch((error) => console.log(JSON.stringify(error)));

fetch(baseUrl, {
  method: "POST",
  headers: headers,
  body: JSON.stringify(query_issue),
})
  .then((response) => response.text())
  .then((txt) => {
    const data = JSON.parse(txt);
    var cropped = { data: [] };
    cropped["data"] = data["data"]["user"]["issues"]["nodes"];

    var open = 0;
    var closed = 0;
    for (var i = 0; i < cropped["data"].length; i++) {
      if (cropped["data"][i]["closed"] === false) open++;
      else closed++;
    }

    cropped["open"] = open;
    cropped["closed"] = closed;
    cropped["totalCount"] = cropped["data"].length;

    console.log("Fetching the Issues Data.\n");
    fs.writeFile(
      "./src/shared/opensource/issues.json",
      JSON.stringify(cropped),
      function (err) {
        if (err) {
          console.log(err);
        }
      }
    );
  })
  .catch((error) => console.log(JSON.stringify(error)));

fetch(baseUrl, {
  method: "POST",
  headers: headers,
  body: JSON.stringify(query_org),
})
  .then((response) => response.text())
  .then((txt) => {
    const data = JSON.parse(txt);
    const orgs = data["data"]["user"]["repositoriesContributedTo"]["nodes"];
    var newOrgs = { data: [] };
    for (var i = 0; i < orgs.length; i++) {
      var obj = orgs[i]["owner"];
      if (obj["__typename"] === "Organization") {
        var flag = 0;
        for (var j = 0; j < newOrgs["data"].length; j++) {
          if (JSON.stringify(obj) === JSON.stringify(newOrgs["data"][j])) {
            flag = 1;
            break;
          }
        }
        if (flag === 0) {
          newOrgs["data"].push(obj);
        }
      }
    }

    console.log("Fetching the Contributed Organization Data.\n");
    fs.writeFile(
      "./src/shared/opensource/organizations.json",
      JSON.stringify(newOrgs),
      function (err) {
        if (err) {
          console.log(err);
        }
      }
    );
  })
  .catch((error) => console.log(JSON.stringify(error)));

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
  "Jupyter Notebook": "logos-jupyter",
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

fetch(baseUrl, {
  method: "POST",
  headers: headers,
  body: JSON.stringify(query_pinned_projects),
})
  .then((response) => response.text())
  .then((txt) => {
    const data = JSON.parse(txt);
    // console.log(txt);
    const projects = data["data"]["user"]["pinnedItems"]["nodes"];
    var newProjects = { data: [] };
    for (var i = 0; i < projects.length; i++) {
      var obj = projects[i];
      var langobjs = obj["languages"]["nodes"];
      var newLangobjs = [];
      for (var j = 0; j < langobjs.length; j++) {
        if (langobjs[j]["name"] in languages_icons) {
          newLangobjs.push({
            name: langobjs[j]["name"],
            iconifyClass: languages_icons[langobjs[j]["name"]],
          });
        }
      }
      obj["languages"] = newLangobjs;
      newProjects["data"].push(obj);
    }

    console.log("Fetching the Pinned Projects Data.\n");
    fs.writeFile(
      "./src/shared/opensource/projects.json",
      JSON.stringify(newProjects),
      function (err) {
        if (err) {
          console.log(
            "Error occured in pinned projects 1",
            JSON.stringify(err)
          );
        }
      }
    );
  })
  .catch((error) =>
    console.log("Error occured in pinned projects 2", JSON.stringify(error))
  );

// Fetch ALL repositories for comprehensive display
fetch(baseUrl, {
  method: "POST",
  headers: headers,
  body: JSON.stringify(query_all_repositories),
})
  .then((response) => response.text())
  .then((txt) => {
    const data = JSON.parse(txt);
    const allRepos = data["data"]["user"]["repositories"]["nodes"];
    var allProjects = { 
      data: [],
      totalCount: data["data"]["user"]["repositories"]["totalCount"]
    };
    
    for (var i = 0; i < allRepos.length; i++) {
      var repo = allRepos[i];
      
      // Skip private repositories
      if (repo["isPrivate"]) continue;
      
      var langobjs = repo["languages"]["nodes"];
      var newLangobjs = [];
      
      // Add primary language first if it exists
      if (repo["primaryLanguage"] && repo["primaryLanguage"]["name"] in languages_icons) {
        newLangobjs.push({
          name: repo["primaryLanguage"]["name"],
          iconifyClass: languages_icons[repo["primaryLanguage"]["name"]],
        });
      }
      
      // Add other languages
      for (var j = 0; j < langobjs.length; j++) {
        const langName = langobjs[j]["name"];
        if (langName in languages_icons && !newLangobjs.some(lang => lang.name === langName)) {
          newLangobjs.push({
            name: langName,
            iconifyClass: languages_icons[langName],
          });
        }
      }
      
      // Create enhanced repo object
      var enhancedRepo = {
        id: repo["id"],
        name: repo["name"],
        createdAt: repo["createdAt"],
        updatedAt: repo["updatedAt"],
        url: repo["url"],
        description: repo["description"] || "No description available",
        isFork: repo["isFork"],
        stargazerCount: repo["stargazerCount"],
        forkCount: repo["forkCount"],
        languages: newLangobjs
      };
      
      allProjects["data"].push(enhancedRepo);
    }

    console.log(`Fetching ALL ${allProjects.data.length} Public Repositories Data.\n`);
    fs.writeFile(
      "./src/shared/opensource/all_projects.json",
      JSON.stringify(allProjects),
      function (err) {
        if (err) {
          console.log(
            "Error occurred in all repositories fetch:",
            JSON.stringify(err)
          );
        }
      }
    );
  })
  .catch((error) =>
    console.log("Error occurred in all repositories fetch:", JSON.stringify(error))
  );
