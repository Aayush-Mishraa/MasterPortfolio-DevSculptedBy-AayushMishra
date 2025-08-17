import React, { useRef, useEffect } from "react";
import "./SimpleChromaGrid.css";

export const SimpleChromaGrid = ({
  items,
  className = "",
  radius = 300,
  columns = 3,
}) => {
  const rootRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });

  const demo = [
    {
      image: "https://i.pravatar.cc/300?img=8",
      title: "Alex Rivera",
      subtitle: "Full Stack Developer",
      handle: "@alexrivera",
      borderColor: "#4F46E5",
      gradient: "linear-gradient(145deg, #4F46E5, #000)",
      url: "https://github.com/",
    },
    {
      image: "https://i.pravatar.cc/300?img=11",
      title: "Jordan Chen",
      subtitle: "DevOps Engineer",
      handle: "@jordanchen",
      borderColor: "#10B981",
      gradient: "linear-gradient(210deg, #10B981, #000)",
      url: "https://linkedin.com/in/",
    },
  ];
  const data = items?.length ? items : demo;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    el.style.setProperty("--x", `${pos.current.x}px`);
    el.style.setProperty("--y", `${pos.current.y}px`);
  }, []);

  const handleMove = (e) => {
    const r = rootRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    rootRef.current.style.setProperty("--x", `${x}px`);
    rootRef.current.style.setProperty("--y", `${y}px`);
  };

  const handleCardClick = (url) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCardMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={rootRef}
      className={`simple-chroma-grid ${className}`}
      style={
        {
          "--r": `${radius}px`,
          "--cols": columns,
        }
      }
      onPointerMove={handleMove}
    >
      {data.map((c, i) => (
        <article
          key={i}
          className="simple-chroma-card"
          onMouseMove={handleCardMove}
          onClick={() => handleCardClick(c.url)}
          style={
            {
              "--card-border": c.borderColor || "transparent",
              "--card-gradient": c.gradient,
              cursor: c.url ? "pointer" : "default",
            }
          }
        >
          <div className="simple-chroma-img-wrapper">
            <img src={c.image} alt={c.title} loading="lazy" />
          </div>
          <footer className="simple-chroma-info">
            {c.certTitle && <h2 className="cert-body-title">{c.certTitle}</h2>}
            <h3 className="name">{c.title}</h3>
            <p className="role">{c.subtitle}</p>
            {c.handle && <span className="handle">{c.handle}</span>}
            {c.location && <span className="location">{c.location}</span>}
          </footer>
        </article>
      ))}
      <div className="simple-chroma-overlay" />
    </div>
  );
};

export default SimpleChromaGrid;
