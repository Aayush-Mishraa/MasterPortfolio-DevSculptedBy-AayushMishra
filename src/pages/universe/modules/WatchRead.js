import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchBook, fetchShow, fetchWikiSummary, searchBooks } from "../../../services/universe/sources";
import { Chips, PageHead, Skeletons } from "../lib/kit";
import { useFeed } from "../lib/useFeed";
import "./WatchRead.css";

/* Curated picks. Posters, ratings and summaries are fetched live. */

const FILMS = [
  { q: "The_Social_Network", tag: "startups", why: "Facebook's origin story, told as a courtroom thriller." },
  { q: "The_Imitation_Game", tag: "history", why: "Alan Turing, Enigma and the birth of computing." },
  { q: "Ex_Machina_(film)", tag: "ai", why: "The Turing test as a chamber thriller." },
  { q: "Her_(2013_film)", tag: "ai", why: "The most human film about talking to an AI." },
  { q: "WarGames", tag: "security", why: "1983, and still the best 'shall we play a game?'" },
  { q: "Hackers_(film)", tag: "security", why: "Rollerblades, modems and pure 90s hacker energy." },
  { q: "Sneakers_(1992_film)", tag: "security", why: "A heist movie about breaking cryptography." },
  { q: "The_Matrix", tag: "sci-fi", why: "Red pill, blue pill, and a world made of code." },
  { q: "Hidden_Figures", tag: "history", why: "The human computers who got NASA to orbit." },
  { q: "Pirates_of_Silicon_Valley", tag: "history", why: "Jobs vs Gates, when the PC industry was a garage war." },
  { q: "Tetris_(film)", tag: "games", why: "A Cold War licensing thriller about a puzzle game." },
  { q: "BlackBerry_(film)", tag: "startups", why: "The rise and fall of the phone before the iPhone." },
  { q: "AlphaGo_(film)", tag: "ai", why: "Documentary: DeepMind's AI against a Go legend." },
  { q: "The_Great_Hack", tag: "data", why: "Documentary: data, elections and Cambridge Analytica." },
];

const SHOWS = [
  { q: "Silicon Valley", tag: "startups", why: "Every standup you've ever survived, turned into comedy." },
  { q: "Mr. Robot", tag: "security", why: "The most technically accurate hacking on TV." },
  { q: "Halt and Catch Fire", tag: "history", why: "The 80s PC boom to the early web, told with heart." },
  { q: "Black Mirror", tag: "ethics", why: "What happens when the tech works exactly as designed." },
  { q: "Devs", tag: "sci-fi", why: "Quantum computing, determinism and a very quiet thriller." },
  { q: "Person of Interest", tag: "ai", why: "A procedural that slowly becomes an AI-alignment epic." },
  { q: "The IT Crowd", tag: "comedy", why: "Have you tried turning it off and on again?" },
  { q: "Westworld", tag: "ai", why: "Machine consciousness, one loop at a time." },
  { q: "Severance", tag: "work", why: "Work-life balance, taken literally." },
  { q: "Upload", tag: "sci-fi", why: "A digital afterlife with in-app purchases." },
  { q: "Pantheon", tag: "ai", why: "Animated, sharp and about uploaded intelligence." },
  { q: "Love, Death & Robots", tag: "sci-fi", why: "Short sci-fi episodes, perfect between builds." },
];

const BOOKS = [
  { title: "Clean Code", author: "Robert C. Martin", tag: "craft", why: "Naming, functions and code that explains itself." },
  { title: "The Pragmatic Programmer", author: "David Thomas", tag: "craft", why: "Career-long habits of effective developers." },
  { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", tag: "systems", why: "The systems-design book everyone ends up reading." },
  { title: "Accelerate", author: "Nicole Forsgren", tag: "devops", why: "The research behind high-performing delivery teams." },
  { title: "Continuous Delivery", author: "Jez Humble", tag: "devops", why: "Deployment pipelines, explained from first principles." },
  { title: "Agile Testing", author: "Lisa Crispin", tag: "testing", why: "How testers fit in and lead on agile teams." },
  { title: "Lessons Learned in Software Testing", author: "Cem Kaner", tag: "testing", why: "293 hard-won lessons, one page each." },
  { title: "Explore It!", author: "Elisabeth Hendrickson", tag: "testing", why: "Exploratory testing as a real, teachable skill." },
  { title: "Test Driven Development", author: "Kent Beck", tag: "testing", why: "Red, green, refactor, from the person who named it." },
  { title: "Growing Object-Oriented Software, Guided by Tests", author: "Steve Freeman", tag: "testing", why: "TDD at the scale of a whole system." },
  { title: "Refactoring", author: "Martin Fowler", tag: "craft", why: "Changing code safely, one small step at a time." },
  { title: "AI Engineering", author: "Chip Huyen", tag: "ai", why: "Building real applications on foundation models." },
  { title: "The Phoenix Project", author: "Gene Kim", tag: "devops", why: "A DevOps novel that reads like a thriller." },
  { title: "The Mythical Man-Month", author: "Frederick P. Brooks", tag: "history", why: "Why adding people to a late project makes it later." },
  { title: "Code: The Hidden Language of Computer Hardware and Software", author: "Charles Petzold", tag: "history", why: "From Morse code to CPUs, beautifully explained." },
  { title: "Hackers: Heroes of the Computer Revolution", author: "Steven Levy", tag: "history", why: "The people and ethic that started it all." },
];

const TABS = [
  { id: "films", label: "Films", icon: "fa-solid fa-film" },
  { id: "series", label: "Series", icon: "fa-solid fa-tv" },
  { id: "books", label: "Books", icon: "fa-solid fa-book-open" },
];

const loadFilms = () =>
  Promise.allSettled(FILMS.map((film) => fetchWikiSummary(film.q))).then((results) =>
    results.map((result, index) => ({
      ...FILMS[index],
      id: FILMS[index].q,
      ...(result.status === "fulfilled" ? result.value : { title: FILMS[index].q.replace(/_\(.*\)$/, "").replace(/_/g, " "), summary: "", image: null, url: `https://en.wikipedia.org/wiki/${FILMS[index].q}` }),
    }))
  );

const loadShows = () =>
  Promise.allSettled(SHOWS.map((show) => fetchShow(show.q))).then((results) =>
    results.map((result, index) => ({
      ...SHOWS[index],
      id: SHOWS[index].q,
      ...(result.status === "fulfilled" ? result.value : { title: SHOWS[index].q, summary: "", image: null }),
    }))
  );

const loadBooks = () =>
  Promise.allSettled(BOOKS.map((book) => fetchBook(book))).then((results) =>
    results.map((result, index) => ({
      ...BOOKS[index],
      id: BOOKS[index].title,
      ...((result.status === "fulfilled" && result.value) || { url: `https://openlibrary.org/search?q=${encodeURIComponent(BOOKS[index].title)}` }),
      title: BOOKS[index].title,
      author: (result.status === "fulfilled" && result.value && result.value.author) || BOOKS[index].author,
    }))
  );

const LOADERS = { films: loadFilms, series: loadShows, books: loadBooks };

const Poster = ({ image, title, icon }) => (
  <span className="wr-poster">
    {image ? <img src={image} alt="" loading="lazy" /> : <i className={icon} aria-hidden="true" />}
    <span className="wr-poster-title">{!image && title}</span>
  </span>
);

const Item = ({ item, tab, highlight, index }) => {
  const year = item.year || (item.description && (item.description.match(/\b(19|20)\d{2}\b/) || [])[0]) || "";
  const rating = item.rating ? (tab === "books" ? `★ ${item.rating}/5` : `★ ${item.rating}/10`) : null;
  const url = item.url || "#";
  return (
    <a
      id={`wr-${tab}-${index}`}
      className={`wr-item ${highlight ? "is-picked" : ""}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ "--i": Math.min(index, 14) }}
    >
      <Poster image={item.image || item.cover} title={item.title} icon={TABS.find((t) => t.id === tab).icon} />
      <span className="wr-body">
        <span className="wr-tags">
          <span className="uv-tag uv-tag--muted">{item.tag}</span>
          {rating && <span className="wr-rating">{rating}</span>}
        </span>
        <strong>{item.title}</strong>
        <span className="wr-sub">
          {[year, item.author, item.network, item.ended ? `ended ${item.ended}` : null].filter(Boolean).join(" · ")}
        </span>
        <em>{item.why}</em>
        {item.summary && <span className="wr-summary uv-clamp-3">{item.summary}</span>}
      </span>
    </a>
  );
};

const BookSearch = () => {
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: false, results: null, error: null });
  const request = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setState({ loading: false, results: null, error: null });
      return undefined;
    }
    const id = ++request.current;
    setState((previous) => ({ ...previous, loading: true }));
    const timer = setTimeout(() => {
      searchBooks(term)
        .then((results) => id === request.current && setState({ loading: false, results, error: null }))
        .catch((error) => id === request.current && setState({ loading: false, results: null, error: error.message }));
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="uv-panel wr-search">
      <label className="uv-search">
        <i className={state.loading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-magnifying-glass"} aria-hidden="true" />
        <input
          className="uv-input"
          type="search"
          value={query}
          placeholder="Search 20M+ books on Open Library: try “kubernetes”, “machine learning”, “selenium”…"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search books"
        />
      </label>
      {state.error && <p className="wr-note">Search is unavailable right now ({state.error}).</p>}
      {state.results && (
        <div className="wr-results">
          {state.results.length ? (
            state.results.map((book) => (
              <a key={book.key} href={book.url} target="_blank" rel="noopener noreferrer" className="wr-result">
                {book.cover ? <img src={book.cover} alt="" loading="lazy" /> : <span className="wr-result-blank"><i className="fa-solid fa-book" aria-hidden="true" /></span>}
                <span>
                  <strong className="uv-clamp-2">{book.title}</strong>
                  <small>{[book.author, book.year].filter(Boolean).join(" · ")}</small>
                </span>
              </a>
            ))
          ) : (
            <p className="wr-note">No books found for “{query}”.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function WatchRead() {
  const [tab, setTab] = useState("films");
  const [tag, setTag] = useState("all");
  const [picked, setPicked] = useState(null);
  const feed = useFeed(`screen:${tab}`, LOADERS[tab], { ttl: 7 * 24 * 60 * 60 * 1000 });
  const items = feed.data || [];

  const tags = useMemo(() => {
    const counts = {};
    items.forEach((item) => (counts[item.tag] = (counts[item.tag] || 0) + 1));
    return [{ id: "all", label: "All" }, ...Object.entries(counts).map(([id, count]) => ({ id, label: id, count }))];
  }, [items]);

  const shown = items.filter((item) => tag === "all" || item.tag === tag);

  const pick = () => {
    if (!shown.length) return;
    const index = Math.floor(Math.random() * shown.length);
    setPicked(shown[index].id);
    setTimeout(() => {
      const node = document.getElementById(`wr-${tab}-${index}`);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  return (
    <div className="wr">
      <PageHead kicker="Watch & Read" title="Tech stories *worth your evening*">
        Hand-picked films, series and books about hackers, founders, AI and the craft of building software, each with one
        line on why it's worth your time.
      </PageHead>

      <div className="uv-toolbar wr-bar">
        <Chips items={TABS} value={tab} onChange={(id) => { setTab(id); setTag("all"); setPicked(null); }} label="Format" />
        <button type="button" className="uv-btn uv-btn--primary" onClick={pick} disabled={!shown.length}>
          <i className="fa-solid fa-wand-sparkles" aria-hidden="true" /> Pick something for me
        </button>
      </div>
      {tags.length > 2 && (
        <div className="uv-toolbar">
          <Chips items={tags} value={tag} onChange={setTag} label="Theme" />
        </div>
      )}

      {!feed.data ? (
        <Skeletons count={8} />
      ) : (
        <div className="wr-grid" key={`${tab}-${tag}`}>
          {shown.map((item, index) => (
            <Item key={item.id} item={item} tab={tab} index={index} highlight={picked === item.id} />
          ))}
        </div>
      )}

      {tab === "books" && (
        <section className="uv-block">
          <BookSearch />
        </section>
      )}

      <p className="wr-note">
        Data: Wikipedia (films), TVmaze (series, CC BY-SA) and Open Library (books and covers). The editorial picks are my own.
      </p>
    </div>
  );
}
