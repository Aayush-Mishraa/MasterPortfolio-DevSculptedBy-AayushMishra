/* Field guide — shared behaviour for the shorter case-study pages. */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.FG = {
    reduced: reduced,
    sleep: function (ms) {
      return new Promise(function (resolve) {
        setTimeout(resolve, reduced ? 0 : ms);
      });
    },
    escape: function (text) {
      return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
  };

  /* ---------- Reveal on scroll ---------- */
  var revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealables.forEach(function (node) {
      io.observe(node);
    });
  } else {
    revealables.forEach(function (node) {
      node.classList.add("in");
    });
  }

  /* ---------- Tiny syntax highlighter ---------- */
  var KEYWORDS = {
    js: "const let var function return if else await async new import from export default true false null undefined of for",
    ts: "const let var function return if else await async new import from export default true false null undefined of for type interface",
    py: "import from as async await def return if else for in with True False None print",
    yaml: "true false on",
    sh: "npm npx install run",
  };

  var highlight = function (code, lang) {
    var comment = lang === "js" || lang === "ts" ? "\\/\\/[^\\n]*" : "#[^\\n]*";
    var pattern = new RegExp(
      "(" + comment + ")" +
        "|(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)" +
        "|(\\b\\d+(?:\\.\\d+)?\\b)" +
        "|(\\b[A-Za-z_$][\\w$]*(?=\\())" +
        "|(\\b[A-Za-z_$][\\w$-]*\\b)",
      "g"
    );
    var words = (KEYWORDS[lang] || "").split(" ");
    var out = "";
    var last = 0;
    var match;
    while ((match = pattern.exec(code))) {
      out += FG.escape(code.slice(last, match.index));
      var token = FG.escape(match[0]);
      if (match[1]) out += '<span class="tk-c">' + token + "</span>";
      else if (match[2]) out += '<span class="tk-s">' + token + "</span>";
      else if (match[3]) out += '<span class="tk-n">' + token + "</span>";
      else if (match[4] && words.indexOf(match[4]) === -1) out += '<span class="tk-f">' + token + "</span>";
      else if (words.indexOf(match[0]) !== -1) out += '<span class="tk-k">' + token + "</span>";
      else out += token;
      last = pattern.lastIndex;
    }
    return out + FG.escape(code.slice(last));
  };

  window.FG.highlight = highlight;

  document.querySelectorAll("code[data-lang]").forEach(function (node) {
    node.innerHTML = highlight(node.textContent.replace(/^\n/, ""), node.getAttribute("data-lang"));
  });

  /* ---------- Tabs + copy ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll("[role=tab]"));
    var panels = Array.prototype.slice.call(group.querySelectorAll("[role=tabpanel]"));
    var select = function (index, focus) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute("aria-selected", i === index ? "true" : "false");
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(i);
      });
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        var step = event.key === "ArrowRight" ? 1 : -1;
        select((i + step + tabs.length) % tabs.length, true);
      });
    });
    select(0);

    var copy = group.querySelector(".fg-copy");
    if (copy) {
      copy.addEventListener("click", function () {
        var open = panels.filter(function (panel) {
          return !panel.hidden;
        })[0];
        var text = open ? open.querySelector("code").textContent : "";
        var done = function (label) {
          copy.textContent = label;
          setTimeout(function () {
            copy.textContent = "Copy";
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              done("Copied ✓");
            },
            function () {
              done("Press Ctrl+C");
            }
          );
        } else {
          done("Press Ctrl+C");
        }
      });
    }
  });
})();
