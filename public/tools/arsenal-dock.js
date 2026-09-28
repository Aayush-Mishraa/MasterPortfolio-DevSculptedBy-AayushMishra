/*
 * Arsenal dock — a small floating navigator shared by every case-study page in /tools.
 * Adds "back to the arsenal" plus previous/next case study, so no page is a dead end.
 *
 * Rendered in Shadow DOM so each page's own (very different) styles can't touch it.
 * Keep TOOLS in the same order as GRID_ORDER in src/pages/automationArsenal/arsenalData.js
 * so the "03 / 10" counter matches the card numbers on the arsenal page.
 */
(function () {
  "use strict";

  var TOOLS = [
    { id: "neuralforge", name: "NeuralForge", path: "/tools/neuralforge.html", accent: "#14B8A6" },
    { id: "nova-act", name: "Amazon Nova Act", path: "/tools/nova-act.html", accent: "#FF9900" },
    { id: "playwright", name: "Playwright", path: "/tools/playwright.html", accent: "#2EAD33" },
    { id: "agentops", name: "AgentOps Architecture", path: "/tools/Engineering-OS-Architecture-Interactive.html", accent: "#D97757" },
    { id: "selenium", name: "Selenium", path: "/tools/selenium.html", accent: "#43B02A" },
    { id: "testng", name: "TestNG", path: "/tools/testng-selenium.html", accent: "#E8702A" },
    { id: "github-actions", name: "GitHub Actions", path: "/tools/github-actions.html", accent: "#2088FF" },
    { id: "postman", name: "Postman", path: "/tools/postman.html", accent: "#FF6C37" },
    { id: "browser-use", name: "Browser Use AI", path: "/tools/browser-use.html", accent: "#8B5CF6" },
    { id: "kane-ai", name: "Kane AI", path: "/tools/kane-ai.html", accent: "#6E56CF" },
  ];

  if (window.__arsenalDock) return;
  window.__arsenalDock = true;

  var here = decodeURIComponent(window.location.pathname).toLowerCase();
  var index = -1;
  for (var i = 0; i < TOOLS.length; i += 1) {
    if (here === TOOLS[i].path.toLowerCase()) index = i;
  }
  if (index === -1) return;

  var current = TOOLS[index];
  var prev = TOOLS[(index - 1 + TOOLS.length) % TOOLS.length];
  var next = TOOLS[(index + 1) % TOOLS.length];
  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };

  var css =
    ":host{all:initial}" +
    "*{box-sizing:border-box}" +
    ".dock{position:fixed;left:16px;bottom:16px;z-index:9500;display:flex;align-items:center;gap:4px;padding:5px;" +
    "border-radius:999px;background:rgba(10,14,26,.84);border:1px solid rgba(255,255,255,.12);" +
    "box-shadow:0 18px 40px -16px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.25);" +
    "backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);" +
    "font:500 13px/1 Inter,'Segoe UI',system-ui,sans-serif;color:#e2e8f0;cursor:auto;" +
    "transform:translateY(0);opacity:1;transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .3s ease}" +
    ".dock.is-hidden{transform:translateY(140%);opacity:0}" +
    ".dock .more{display:flex;align-items:center;gap:4px;max-width:420px;" +
    "transition:max-width .45s cubic-bezier(.22,1,.36,1),opacity .3s ease}" +
    ".dock.is-compact:not(:hover):not(:focus-within) .more{max-width:0;opacity:0;overflow:hidden}" +
    "a{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:999px;color:inherit;" +
    "text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .2s ease,color .2s ease}" +
    "a:hover{background:rgba(255,255,255,.1);color:#fff}" +
    "a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    ".home{background:#f8fafc;color:#0f172a;font-weight:600}" +
    ".home:hover{background:#fff;color:#0f172a}" +
    ".step{width:38px;padding:0;justify-content:center;position:relative}" +
    ".now{display:flex;align-items:center;gap:8px;padding:0 10px 0 6px;font:500 12px/1 'JetBrains Mono',ui-monospace,Consolas,monospace;" +
    "letter-spacing:.04em;color:#94a3b8}" +
    ".now b{color:#fff;font-weight:500}" +
    ".dot{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent)}" +
    ".tip{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translate(-50%,4px);padding:6px 10px;border-radius:8px;" +
    "background:#0f172a;border:1px solid rgba(255,255,255,.12);color:#fff;font-size:12px;white-space:nowrap;opacity:0;" +
    "pointer-events:none;transition:opacity .2s ease,transform .2s ease}" +
    ".step:hover .tip,.step:focus-visible .tip{opacity:1;transform:translate(-50%,0)}" +
    "svg{width:16px;height:16px;flex:none}" +
    "@media (max-width:560px){.label,.now .name{display:none}.home{padding:0 12px}}" +
    "@media (prefers-reduced-motion:reduce){.dock{transition:none}}" +
    "@media print{.dock{display:none}}";

  var arrow = function (d) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      d +
      '"/></svg>'
    );
  };

  var html =
    '<nav class="dock" aria-label="Automation Arsenal navigation" style="--accent:' + current.accent + '">' +
    '<a class="home" href="/automation-arsenal#tool-' + current.id + '">' +
    arrow("M11 5l-7 7 7 7M4 12h16") +
    '<span class="label">Arsenal</span></a>' +
    '<span class="more">' +
    '<a class="step" href="' + prev.path + '" aria-label="Previous case study: ' + prev.name + '">' +
    arrow("M15 18l-6-6 6-6") +
    '<span class="tip">' + prev.name + "</span></a>" +
    '<span class="now"><span class="dot"></span><span><b>' + pad(index + 1) + "</b> / " + pad(TOOLS.length) +
    '</span><span class="name">' + current.name + "</span></span>" +
    '<a class="step" href="' + next.path + '" aria-label="Next case study: ' + next.name + '">' +
    arrow("M9 18l6-6-6-6") +
    '<span class="tip">' + next.name + "</span></a>" +
    "</span></nav>";

  var mount = function () {
    var host = document.createElement("div");
    host.setAttribute("data-arsenal-dock", "");
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    root.innerHTML = "<style>" + css + "</style>" + html;
    document.body.appendChild(host);

    // Compact at the top (so it never competes with a page's hero), tucked away while reading
    // downwards, and fully expanded on any upward scroll or near the end.
    var dock = root.querySelector(".dock");
    var last = window.pageYOffset;
    dock.classList.toggle("is-compact", last < 240);
    var ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          var y = window.pageYOffset;
          var nearEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 160;
          var hide = y > last + 4 && y > 240 && !nearEnd;
          if (y < last - 4 || nearEnd || y < 240) hide = false;
          if (Math.abs(y - last) > 4) dock.classList.toggle("is-hidden", hide);
          dock.classList.toggle("is-compact", y < 240 && !nearEnd);
          last = y;
          ticking = false;
        });
      },
      { passive: true }
    );
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
