import React from "react";
import ReactDOM from "react-dom";
import { BaseProvider, LightTheme } from "baseui";
import { Provider as StyletronProvider } from "styletron-react";
import { Client as Styletron } from "styletron-engine-atomic";

import "./index.css";
// import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

const engine = new Styletron();
const root = document.getElementById("root");

const app = (
  <StyletronProvider value={engine}>
    <BaseProvider theme={LightTheme}>
      <App />
    </BaseProvider>
  </StyletronProvider>
);

// A prerendered page (scripts/prerender) is already complete HTML. React adopts
// it (hydrate) when it is the HTML of this very URL in the default theme, so
// nothing is rebuilt or repainted; otherwise (the 404 page under another URL,
// /splash, a visitor's own theme) the app renders over it. Either way the
// HTML paints first: without the wait, a fast device runs the bundle before
// the first paint.
const html = document.documentElement;
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const adopt = html.getAttribute("data-prerendered") === path && !html.classList.contains("theme-pending");
const start = () => (adopt ? ReactDOM.hydrate(app, root) : ReactDOM.render(app, root));

if (root.hasChildNodes() && typeof window.requestAnimationFrame === "function") {
  window.requestAnimationFrame(() => setTimeout(start, 0));
} else {
  start();
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
