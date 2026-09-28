/**
 * Tech Universe data sources. Every endpoint here is free, needs no API key
 * and sends CORS headers, so the static site can call it straight from the
 * browser. Each fetcher returns a small, already-shaped object; the page-level
 * cache (useFeed) stores that shape rather than the raw payload.
 */

const json = (url, init) =>
  fetch(url, init).then((response) => {
    if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
    return response.json();
  });

const DAY_S = 86400;
const nowS = () => Math.floor(Date.now() / 1000);

/* ------------------------------------------------------------------ */
/* Hacker News (Algolia)                                               */
/* ------------------------------------------------------------------ */

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www./, "");
  } catch (error) {
    return "";
  }
};

const hnStory = (hit) => ({
  id: `hn-${hit.objectID}`,
  source: "hn",
  domain: hostOf(hit.url) || "news.ycombinator.com",
  title: (hit.title || "").replace(/^Show HN:\s*/i, ""),
  url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
  discussion: `https://news.ycombinator.com/item?id=${hit.objectID}`,
  points: hit.points || 0,
  comments: hit.num_comments || 0,
  author: hit.author,
  date: hit.created_at,
});

export const fetchShowHN = () =>
  json(
    `https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=created_at_i>${nowS() - 7 * DAY_S},points>20&hitsPerPage=30`
  ).then((data) => data.hits.map(hnStory).sort((a, b) => b.points - a.points));

/** Popular stories on a topic from the last week; no topic means the live front page. */
export const fetchHNTopic = (query) =>
  query
    ? json(
        `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(query)}&numericFilters=created_at_i>${
          nowS() - 7 * DAY_S
        },points>30&hitsPerPage=30`
      ).then((data) => data.hits.filter((hit) => hit.title).map(hnStory).sort((a, b) => b.points - a.points))
    : fetchHNFront();

export const fetchDevArticles = (tag) =>
  json(`https://dev.to/api/articles?per_page=30&top=7${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`).then((list) =>
    (Array.isArray(list) ? list : []).map((article) => ({
      id: `dev-${article.id}`,
      source: "devto",
      title: article.title,
      url: article.url,
      discussion: article.url,
      domain: "dev.to",
      points: article.public_reactions_count || 0,
      comments: article.comments_count || 0,
      author: article.user?.name || article.user?.username,
      date: article.published_timestamp || article.published_at,
      cover: article.cover_image || null,
      tags: article.tag_list || [],
      readMinutes: article.reading_time_minutes || null,
      summary: article.description || "",
    }))
  );

export const fetchHNFront = () =>
  json("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30").then((data) =>
    data.hits.map(hnStory).sort((a, b) => b.points - a.points)
  );

/* ------------------------------------------------------------------ */
/* Hugging Face                                                        */
/* ------------------------------------------------------------------ */

export const fetchTrendingModels = (pipeline = "") =>
  json(
    `https://huggingface.co/api/models?sort=trendingScore&limit=36${pipeline ? `&pipeline_tag=${encodeURIComponent(pipeline)}` : ""}`
  ).then((models) =>
    models.map((model) => ({
      id: model.id,
      org: model.id.split("/")[0],
      name: model.id.split("/").slice(1).join("/") || model.id,
      likes: model.likes || 0,
      downloads: model.downloads || 0,
      trending: model.trendingScore || 0,
      pipeline: model.pipeline_tag || null,
      library: model.library_name || null,
      license: (model.tags || []).find((tag) => tag.startsWith("license:"))?.slice(8) || null,
      createdAt: model.createdAt,
      url: `https://huggingface.co/${model.id}`,
    }))
  );

export const fetchTrendingSpaces = () =>
  json("https://huggingface.co/api/spaces?sort=trendingScore&limit=30&full=true").then((spaces) =>
    spaces.map((space) => ({
      id: space.id,
      title: space.cardData?.title || space.id.split("/")[1],
      emoji: space.cardData?.emoji || "🚀",
      from: space.cardData?.colorFrom || "indigo",
      to: space.cardData?.colorTo || "pink",
      sdk: space.sdk || space.cardData?.sdk || "",
      likes: space.likes || 0,
      mcp: (space.tags || []).includes("mcp-server"),
      author: space.author || space.id.split("/")[0],
      url: `https://huggingface.co/spaces/${space.id}`,
      createdAt: space.createdAt,
    }))
  );

export const fetchDailyPapers = (date) =>
  json(`https://huggingface.co/api/daily_papers?limit=50${date ? `&date=${date}` : ""}`).then((papers) =>
    papers
      .map((item) => ({
        id: item.paper.id,
        title: item.paper.title || item.title,
        summary: item.paper.ai_summary || item.paper.summary || item.summary || "",
        abstract: item.paper.summary || "",
        upvotes: item.paper.upvotes || 0,
        comments: item.numComments || 0,
        authors: (item.paper.authors || []).map((author) => author.name).filter(Boolean),
        org: item.organization?.fullname || item.paper.organization?.fullname || null,
        thumbnail: item.thumbnail || null,
        github: item.paper.githubRepo || null,
        stars: item.paper.githubStars || 0,
        keywords: item.paper.ai_keywords || [],
        date: item.publishedAt || item.paper.publishedAt,
        url: `https://huggingface.co/papers/${item.paper.id}`,
        arxiv: `https://arxiv.org/abs/${item.paper.id}`,
        pdf: `https://arxiv.org/pdf/${item.paper.id}`,
      }))
      .sort((a, b) => b.upvotes - a.upvotes)
  );

/* ------------------------------------------------------------------ */
/* OpenRouter model catalogue (public, no key)                         */
/* ------------------------------------------------------------------ */

export const fetchOpenRouterModels = () =>
  json("https://openrouter.ai/api/v1/models").then((payload) =>
    (payload.data || [])
      .map((model) => {
        const prompt = Number(model.pricing?.prompt);
        const completion = Number(model.pricing?.completion);
        return {
          id: model.id,
          name: model.name || model.id,
          provider: model.id.split("/")[0],
          created: (model.created || 0) * 1000,
          context: model.context_length || 0,
          // USD per million tokens; negative prices mark routers with dynamic pricing.
          input: prompt >= 0 ? prompt * 1e6 : null,
          output: completion >= 0 ? completion * 1e6 : null,
          free: prompt === 0 && completion === 0,
          inputs: model.architecture?.input_modalities || [],
          outputs: model.architecture?.output_modalities || [],
          tools: (model.supported_parameters || []).includes("tools"),
          reasoning: (model.supported_parameters || []).includes("reasoning"),
          description: (model.description || "")
            .split("\n")[0]
            .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) → text
            .replace(/[<>*_`]/g, "")
            .slice(0, 220),
        };
      })
      .filter((model) => model.input !== null)
  );

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */

export const fetchRisingRepos = (topic) => {
  const since = new Date(Date.now() - 7 * DAY_S * 1000).toISOString().slice(0, 10);
  const query = `created:>${since}${topic ? ` topic:${topic}` : ""}`;
  return json(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=24`).then(
    (data) =>
      (data.items || []).map((repo) => ({
        id: `gh-${repo.id}`,
        source: "github",
        title: repo.full_name,
        domain: "github.com",
        points: repo.stargazers_count || 0,
        comments: repo.forks_count || 0,
        date: repo.created_at,
        summary: repo.description || "",
        name: repo.full_name,
        description: repo.description || "",
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        language: repo.language,
        url: repo.html_url,
        avatar: repo.owner?.avatar_url,
        createdAt: repo.created_at,
      }))
  );
};

export const fetchStarterIssues = ({ language, label }) => {
  const parts = [`label:"${label}"`, "state:open", "is:issue", "no:assignee", "archived:false"];
  if (language) parts.push(`language:${language}`);
  return json(
    `https://api.github.com/search/issues?q=${encodeURIComponent(parts.join(" "))}&sort=created&order=desc&per_page=80`
  ).then((data) => {
    // At most two issues per repository, so one bot-heavy repo can't flood the list.
    const perRepo = {};
    return (data.items || [])
      .filter((issue) => {
        const repo = issue.repository_url.split("/").slice(-2).join("/");
        perRepo[repo] = (perRepo[repo] || 0) + 1;
        return perRepo[repo] <= 2;
      })
      .map((issue) => {
      const repo = issue.repository_url.split("/").slice(-2).join("/");
      return {
        id: issue.id,
        title: issue.title,
        url: issue.html_url,
        repo,
        number: issue.number,
        comments: issue.comments || 0,
        labels: (issue.labels || []).map((item) => ({ name: item.name, color: item.color })).slice(0, 4),
        createdAt: issue.created_at,
        author: issue.user?.login,
        body: (issue.body || "").replace(/[#>*`_[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 200),
      };
    });
  });
};

/* ------------------------------------------------------------------ */
/* npm registry + download counts                                      */
/* ------------------------------------------------------------------ */

export const fetchDownloadHistory = (packages) =>
  Promise.all(
    packages.map((name) =>
      Promise.all([
        json(`https://api.npmjs.org/downloads/range/last-year/${name}`),
        json(`https://registry.npmjs.org/${name.replace("/", "%2f")}/latest`).catch(() => null),
      ]).then(([range, latest]) => {
        // Collapse daily numbers into whole weeks (drop the partial first week).
        const days = range.downloads || [];
        const offset = days.length % 7;
        const weeks = [];
        for (let i = offset; i < days.length; i += 7) {
          weeks.push({
            start: days[i].day,
            count: days.slice(i, i + 7).reduce((sum, day) => sum + day.downloads, 0),
          });
        }
        return { name, weeks, version: latest?.version || null };
      })
    )
  );

/* ------------------------------------------------------------------ */
/* Status pages (Atlassian Statuspage v2)                              */
/* ------------------------------------------------------------------ */

export const STATUS_SERVICES = [
  { id: "github", name: "GitHub", url: "https://www.githubstatus.com", group: "Dev platforms" },
  { id: "npm", name: "npm", url: "https://status.npmjs.org", group: "Dev platforms" },
  { id: "docker", name: "Docker", url: "https://www.dockerstatus.com", group: "Dev platforms" },
  { id: "atlassian", name: "Atlassian", url: "https://status.atlassian.com", group: "Dev platforms" },
  { id: "hashicorp", name: "HashiCorp", url: "https://status.hashicorp.com", group: "Dev platforms" },
  { id: "cloudflare", name: "Cloudflare", url: "https://www.cloudflarestatus.com", group: "Cloud & edge" },
  { id: "vercel", name: "Vercel", url: "https://www.vercel-status.com", group: "Cloud & edge" },
  { id: "netlify", name: "Netlify", url: "https://www.netlifystatus.com", group: "Cloud & edge" },
  { id: "digitalocean", name: "DigitalOcean", url: "https://status.digitalocean.com", group: "Cloud & edge" },
  { id: "openai", name: "OpenAI", url: "https://status.openai.com", group: "AI APIs" },
  { id: "anthropic", name: "Anthropic", url: "https://status.claude.com", group: "AI APIs" },
  { id: "discord", name: "Discord", url: "https://discordstatus.com", group: "Community" },
  { id: "reddit", name: "Reddit", url: "https://www.redditstatus.com", group: "Community" },
];

export const fetchStatus = (service) =>
  json(`${service.url}/api/v2/summary.json`).then((data) => ({
    ...service,
    indicator: data.status?.indicator || "none",
    description: data.status?.description || "Unknown",
    updatedAt: data.page?.updated_at,
    degraded: (data.components || [])
      .filter((component) => !component.group && component.status !== "operational")
      .map((component) => ({ name: component.name, status: component.status })),
    components: (data.components || []).filter((component) => !component.group).length,
    incidents: (data.incidents || []).map((incident) => ({
      id: incident.id,
      name: incident.name,
      impact: incident.impact,
      status: incident.status,
      url: incident.shortlink,
      update: incident.incident_updates?.[0]?.body || "",
      updatedAt: incident.updated_at,
    })),
  }));

export const fetchAllStatus = () =>
  Promise.allSettled(STATUS_SERVICES.map(fetchStatus)).then((results) =>
    results.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : { ...STATUS_SERVICES[index], indicator: "unknown", description: "Status page unreachable", degraded: [], incidents: [] }
    )
  );

/* ------------------------------------------------------------------ */
/* Wikipedia: on this day                                              */
/* ------------------------------------------------------------------ */

const TECH_WORDS = /comput|software|internet|web\b|website|google|apple|microsoft|intel\b|ibm|linux|unix|video game|nintendo|sony|sega|atari|facebook|twitter|amazon\.com|netflix|youtube|wikipedia|satellite|spacecraft|space probe|space station|rocket|spaceflight|orbit|nasa|robot|programming|electronic|transistor|microprocessor|telephone|television|radio broadcast|smartphone|iphone|android|email|e-mail|browser|patent|artificial intelligence|chess|encryption|hacker|bitcoin|cryptocurrency/i;

// People are matched by what they did, so TV hosts and DJs don't slip in via "television" or "electronic".
const TECH_PEOPLE = /computer|software|programmer|engineer|inventor|mathematician|physicist|astronaut|cryptograph|hacker|video game|game designer|internet pioneer|web |founder of|co-founder|entrepreneur|scientist|roboticist/i;
const NOT_TECH_PEOPLE = /political scientist|social scientist|televangelist|actor|actress|singer|footballer|television host/i;
const COMPUTING_PEOPLE = /computer|software|programmer|internet|web |hacker|video game|cryptograph/i;

export const fetchOnThisDay = (date = new Date()) => {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return json(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${mm}/${dd}`).then((data) => {
    const shape = (event) => ({
      year: event.year,
      text: event.text,
      url: event.pages?.[0]?.content_urls?.desktop?.page || null,
      image: event.pages?.find((page) => page.thumbnail)?.thumbnail?.source || null,
    });
    const pool = [...(data.selected || []), ...(data.events || [])];
    const seen = new Set();
    const tech = pool.filter((event) => {
      if (!TECH_WORDS.test(event.text) || seen.has(event.text)) return false;
      seen.add(event.text);
      return true;
    });
    // Computing pioneers first, then other scientists and engineers.
    const births = (data.births || [])
      .filter((person) => TECH_PEOPLE.test(person.text) && !NOT_TECH_PEOPLE.test(person.text))
      .map((person) => ({ person, rank: COMPUTING_PEOPLE.test(person.text) ? 1 : 0 }))
      .sort((a, b) => b.rank - a.rank || b.person.year - a.person.year)
      .map(({ person }) => person)
      .slice(0, 6);
    return {
      tech: tech.sort((a, b) => b.year - a.year).map(shape),
      selected: (data.selected || []).slice(0, 8).map(shape),
      births: births.map(shape),
    };
  });
};

/* ------------------------------------------------------------------ */
/* Watch & read: TVmaze, Wikipedia summaries, Open Library             */
/* ------------------------------------------------------------------ */

export const fetchShow = (query) =>
  json(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`).then((show) => ({
    id: show.id,
    title: show.name,
    year: show.premiered ? show.premiered.slice(0, 4) : "",
    ended: show.ended ? show.ended.slice(0, 4) : null,
    rating: show.rating?.average || null,
    genres: show.genres || [],
    image: show.image?.medium || null,
    summary: (show.summary || "").replace(/<[^>]+>/g, ""),
    network: show.network?.name || show.webChannel?.name || "",
    url: show.officialSite || show.url,
  }));

export const fetchWikiSummary = (title) =>
  json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`).then((page) => {
    if (page.type === "disambiguation") throw new Error(`"${title}" is ambiguous`);
    return {
    title: page.title.replace(/ \((\d{4} )?film\)$/, ""),
    description: page.description || "",
    summary: page.extract || "",
    image: page.thumbnail?.source || null,
    url: page.content_urls?.desktop?.page,
  };
  });

const bookShape = (doc) => ({
  key: doc.key,
  title: doc.title,
  author: (doc.author_name || []).slice(0, 2).join(", "),
  year: doc.first_publish_year || null,
  rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null,
  cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
  url: `https://openlibrary.org${doc.key}`,
});

const BOOK_FIELDS = "key,title,author_name,cover_i,first_publish_year,ratings_average";

export const fetchBook = ({ title, author }) =>
  json(
    `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${
      author ? `&author=${encodeURIComponent(author)}` : ""
    }&fields=${BOOK_FIELDS}&limit=1`
  ).then((data) => (data.docs?.[0] ? bookShape(data.docs[0]) : null));

export const searchBooks = (query) =>
  json(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${BOOK_FIELDS}&limit=18`).then(
    (data) => (data.docs || []).map(bookShape)
  );

/* ------------------------------------------------------------------ */
/* Radio                                                               */
/* ------------------------------------------------------------------ */

export const fetchSomaChannels = () =>
  json("https://somafm.com/channels.json").then((data) =>
    (data.channels || []).map((channel) => ({
      id: channel.id,
      title: channel.title,
      description: channel.description,
      genre: (channel.genre || "").split("|").join(" · "),
      image: channel.xlimage || channel.largeimage || channel.image,
      listeners: Number(channel.listeners) || 0,
      lastPlaying: channel.lastPlaying || "",
      stream: `https://ice1.somafm.com/${channel.id}-128-mp3`,
      source: "SomaFM",
    }))
  );

export const fetchSomaSongs = (id) =>
  json(`https://somafm.com/songs/${id}.json`).then((data) =>
    (data.songs || []).slice(0, 8).map((song) => ({
      title: song.title,
      artist: song.artist,
      album: song.album,
      date: Number(song.date) * 1000,
    }))
  );

export const fetchLofiStations = () =>
  json(
    "https://de1.api.radio-browser.info/json/stations/search?tagList=lofi&order=clickcount&reverse=true&hidebroken=true&limit=60"
  ).then((stations) =>
    stations
      // An https page can only play https streams.
      .filter((station) => (station.url_resolved || "").startsWith("https://"))
      .slice(0, 18)
      .map((station) => ({
        id: station.stationuuid,
        title: station.name.trim(),
        description: [station.country, station.codec, station.bitrate ? `${station.bitrate}kbps` : ""].filter(Boolean).join(" · "),
        genre: (station.tags || "").split(",").slice(0, 3).join(" · "),
        image: station.favicon || null,
        listeners: station.clickcount || 0,
        lastPlaying: "",
        stream: station.url_resolved,
        source: "Radio Browser",
      }))
  );

/** Last-week downloads, one request per package (scoped names can't be bulk-queried). */
export const fetchWeeklyDownloads = (packages) =>
  Promise.all(
    packages.map((name) =>
      json(`https://api.npmjs.org/downloads/point/last-week/${name}`)
        .then((data) => ({ name, downloads: data.downloads || 0 }))
        .catch(() => ({ name, downloads: 0 }))
    )
  ).then((list) => list.sort((a, b) => b.downloads - a.downloads));

/* ------------------------------------------------------------------ */
/* Music: Audius (open, artist-owned streaming; no key, app_name only) */
/* ------------------------------------------------------------------ */

const AUDIUS = "https://api.audius.co/v1";
const APP = "app_name=TechUniverse";

const audiusTrack = (track) => ({
  id: `au-${track.id}`,
  kind: "track",
  audiusId: track.id,
  title: track.title,
  artist: track.user?.name || "Unknown artist",
  artwork: track.artwork?.["480x480"] || track.artwork?.["150x150"] || null,
  artworkLarge: track.artwork?.["1000x1000"] || track.artwork?.["480x480"] || null,
  mirrors: track.artwork?.mirrors || [],
  duration: track.duration || 0,
  bpm: track.bpm ? Math.round(track.bpm) : null,
  key: track.musical_key || null,
  mood: track.mood || null,
  genre: track.genre || null,
  plays: track.play_count || 0,
  favorites: track.favorite_count || 0,
  url: track.permalink ? `https://audius.co${track.permalink}` : "https://audius.co",
  stream: `${AUDIUS}/tracks/${track.id}/stream?${APP}`,
});

// Only tracks anyone can stream: not gated, long enough to be a song.
const playable = (track) =>
  track && track.is_streamable !== false && !track.is_stream_gated && track.access?.stream !== false && (track.duration || 0) >= 60;

export const fetchAudiusTrending = (genre) =>
  json(`${AUDIUS}/tracks/trending?time=week&limit=40${genre ? `&genre=${encodeURIComponent(genre)}` : ""}&${APP}`).then((data) =>
    (data.data || []).filter(playable).map(audiusTrack)
  );

export const searchAudius = (query) =>
  json(`${AUDIUS}/tracks/search?query=${encodeURIComponent(query)}&limit=40&${APP}`).then((data) =>
    (data.data || []).filter(playable).map(audiusTrack)
  );

export const liveStation = (channel) => ({
  id: `soma-${channel.id}`,
  kind: "live",
  title: channel.title,
  artist: "SomaFM live radio",
  artwork: channel.image,
  artworkLarge: channel.image,
  duration: 0,
  bpm: null,
  key: null,
  mood: null,
  genre: channel.genre,
  listeners: channel.listeners,
  url: `https://somafm.com/${channel.id}/`,
  stream: channel.stream,
  somaId: channel.id,
});
