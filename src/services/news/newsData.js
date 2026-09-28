import { cachedJSON } from "../github/githubClient";

/**
 * Free, key-less, CORS-enabled tech news sources:
 *  - Hacker News via the Algolia search API
 *  - DEV Community (dev.to) public articles API
 *  - GitHub search, for repositories gaining stars this week
 * Every story is normalised to the same shape so the UI can mix sources.
 */

const HN = "https://hn.algolia.com/api/v1";
const DEVTO = "https://dev.to/api/articles";
const TEN_MIN = 10 * 60 * 1000;

export const NEWS_TOPICS = [
  { id: "all", label: "Everything", hn: "", devto: "" },
  { id: "ai", label: "AI & Agents", hn: "AI", devto: "ai" },
  { id: "testing", label: "Testing & QA", hn: "testing", devto: "testing" },
  { id: "devops", label: "DevOps & Cloud", hn: "kubernetes", devto: "devops" },
  { id: "security", label: "Security", hn: "security", devto: "security" },
  { id: "web", label: "Web & JS", hn: "javascript", devto: "javascript" },
];

export const NEWS_SOURCES = [
  { id: "hn", label: "Hacker News", icon: "fa-brands fa-hacker-news" },
  { id: "devto", label: "DEV Community", icon: "fa-brands fa-dev" },
  { id: "github", label: "Rising on GitHub", icon: "fa-brands fa-github" },
];

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
};

const fromHN = (hit) => ({
  id: `hn-${hit.objectID}`,
  title: hit.title || hit.story_title || "Untitled",
  url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
  discussion: `https://news.ycombinator.com/item?id=${hit.objectID}`,
  domain: hostOf(hit.url) || "news.ycombinator.com",
  author: hit.author,
  score: hit.points || 0,
  comments: hit.num_comments || 0,
  date: hit.created_at,
  tags: [],
  source: "hn",
});

const fromDevto = (article) => ({
  id: `devto-${article.id}`,
  title: article.title,
  url: article.url,
  discussion: article.url,
  domain: "dev.to",
  author: article.user?.name || article.user?.username,
  score: article.public_reactions_count || 0,
  comments: article.comments_count || 0,
  date: article.published_timestamp || article.published_at,
  tags: article.tag_list || [],
  cover: article.cover_image || article.social_image || null,
  summary: article.description || "",
  readMinutes: article.reading_time_minutes || null,
  source: "devto",
});

const fromGithub = (repo) => ({
  id: `gh-${repo.id}`,
  title: repo.full_name,
  url: repo.html_url,
  discussion: repo.html_url,
  domain: "github.com",
  author: repo.owner?.login,
  score: repo.stargazers_count || 0,
  comments: repo.forks_count || 0,
  date: repo.created_at,
  tags: (repo.topics || []).slice(0, 3),
  summary: repo.description || "",
  language: repo.language,
  source: "github",
});

export const fetchHackerNews = (topic) => {
  const url = topic?.hn
    ? // Popular stories on the topic from the last 7 days.
      `${HN}/search?tags=story&query=${encodeURIComponent(topic.hn)}&numericFilters=created_at_i>${
        Math.floor(Date.now() / 1000) - 7 * 86400
      },points>40&hitsPerPage=24`
    : `${HN}/search?tags=front_page&hitsPerPage=24`;
  // The timestamp in the URL changes every second, so cache by topic instead.
  return cachedJSON(topic?.hn ? `${HN}/search?tags=story&query=${encodeURIComponent(topic.hn)}&w=7d` : url, {
    ttl: TEN_MIN,
    fetchUrl: url,
  }).then((data) =>
    (data.hits || [])
      .filter((hit) => hit.title)
      .map(fromHN)
      .sort((a, b) => b.score - a.score)
  );
};

export const fetchDevto = (topic) => {
  const tag = topic?.devto ? `&tag=${encodeURIComponent(topic.devto)}` : "";
  return cachedJSON(`${DEVTO}?per_page=24&top=7${tag}`, { ttl: TEN_MIN }).then((data) =>
    (Array.isArray(data) ? data : []).map(fromDevto)
  );
};

/** Repositories created in the last week, ranked by stars: GitHub's own "trending". */
export const fetchRisingRepos = (topic) => {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
  const topicQuery = topic?.devto ? `+topic:${encodeURIComponent(topic.devto)}` : "";
  return cachedJSON(
    `https://api.github.com/search/repositories?q=created:>${since}${topicQuery}&sort=stars&order=desc&per_page=18`,
    { ttl: 30 * 60 * 1000 }
  ).then((data) => (data.items || []).map(fromGithub));
};

export const fetchNews = (sourceId, topic) =>
  ({ hn: fetchHackerNews, devto: fetchDevto, github: fetchRisingRepos }[sourceId] || fetchHackerNews)(topic);
