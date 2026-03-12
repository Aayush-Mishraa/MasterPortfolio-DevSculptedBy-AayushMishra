import React from "react";
import { useHistory } from "react-router-dom";
import "./ThreeOrbitSplash.css";

function ThreeOrbitSplash() {
  const history = useHistory();
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data === "portfolio-cinematic:enter") {
        setExiting(true);
        setTimeout(() => history.push("/home"), 600);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [history]);

  return (
    <section
      className={`cinematic-splash${exiting ? " cinematic-splash--exiting" : ""}`}
      aria-label="Portfolio cinematic splash"
    >
      <iframe
        className="cinematic-splash__frame"
        title="Portfolio Cinematic Splash"
        src="/portfolio-cinematic.html"
      />
    </section>
  );
}

export default ThreeOrbitSplash;