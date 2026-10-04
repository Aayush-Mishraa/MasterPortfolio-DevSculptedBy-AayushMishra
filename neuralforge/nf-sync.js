/*
  F30: NeuralForge progress sync. Loaded into the NeuralForge page on its
  subdomain (scripts/neuralforge/build.mjs injects it). The app keeps its
  state in localStorage "neuralforge.v1"; this script

    · adds a small "Sync" panel: sign in by email (magic link, no password),
    · on sign-in and on every load, merges the saved copy with this browser's
      (union of completed levels, labs, notes…; reloads once if it changed),
    · pushes every change a few seconds after the app saves it.

  Everything still works signed out: progress then stays in this browser.
*/
(function () {
  "use strict";

  var STATE_KEY = "neuralforge.v1";
  var SESSION_KEY = "neuralforge.session";
  var EMAIL_KEY = "neuralforge.email";
  var API = new URL("api/nf.php", document.baseURI.replace(/[?#].*$/, "").replace(/[^/]*$/, "")).href;

  var store = window.localStorage;
  var get = function (key) {
    try {
      return store.getItem(key);
    } catch (e) {
      return null;
    }
  };
  var set = function (key, value) {
    try {
      if (value == null) store.removeItem(key);
      else originalSet.call(store, key, value);
    } catch (e) {}
  };
  var originalSet = Storage.prototype.setItem;

  function call(method, body, query) {
    var headers = { Accept: "application/json" };
    var session = get(SESSION_KEY);
    // Not Authorization: that header may carry a Basic login (staging).
    if (session) headers["X-NF-Session"] = session;
    if (body) headers["Content-Type"] = "application/json";
    return fetch(API + (query || ""), { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" })
      .then(function (response) {
        return response.json().then(
          function (data) {
            return { status: response.status, data: data || {} };
          },
          function () {
            return { status: response.status, data: {} };
          }
        );
      })
      .catch(function () {
        return { status: 0, data: {} };
      });
  }

  /* ---------------- merging ---------------- */

  function union(a, b) {
    var out = (Array.isArray(a) ? a : []).slice();
    (Array.isArray(b) ? b : []).forEach(function (item) {
      if (out.indexOf(item) === -1) out.push(item);
    });
    return out;
  }

  function mergeObjects(remote, local) {
    var out = {};
    var key;
    for (key in remote || {}) out[key] = remote[key];
    for (key in local || {}) {
      if (out[key] && typeof out[key] === "object" && !Array.isArray(out[key]) && typeof local[key] === "object") out[key] = mergeObjects(out[key], local[key]);
      else out[key] = local[key];
    }
    return out;
  }

  function merge(remote, local) {
    if (!remote) return local;
    if (!local) return remote;
    var out = mergeObjects(remote, local);
    ["completed", "labs", "mastered", "projects"].forEach(function (key) {
      out[key] = union(remote[key], local[key]);
    });
    out.streak = Math.max(remote.streak || 0, local.streak || 0);
    out.lastActive = [remote.lastActive, local.lastActive].filter(Boolean).sort().pop() || null;
    out.name = local.name || remote.name || "";
    return out;
  }

  var readLocal = function () {
    try {
      return JSON.parse(get(STATE_KEY) || "null");
    } catch (e) {
      return null;
    }
  };

  /* ---------------- push on save ---------------- */

  var timer = null;
  var pushing = false;
  function schedulePush() {
    if (!get(SESSION_KEY)) return;
    clearTimeout(timer);
    timer = setTimeout(push, 3000);
  }
  function push() {
    var state = readLocal();
    if (!state || pushing) return;
    pushing = true;
    setStatus("Saving…");
    call("POST", { action: "save", progress: state }).then(function (result) {
      pushing = false;
      if (result.status === 401) return signedOut();
      setStatus(result.data.ok ? "Synced" : "Not synced yet");
    });
  }
  Storage.prototype.setItem = function (key, value) {
    originalSet.call(this, key, value);
    if (this === store && key === STATE_KEY) schedulePush();
  };

  /* ---------------- pull + merge ---------------- */

  function apply(remote) {
    var local = readLocal();
    var merged = merge(remote, local);
    var before = JSON.stringify(local);
    var after = JSON.stringify(merged);
    if (after !== before) {
      set(STATE_KEY, after);
      push();
      // The app read its state at start-up: reload once to show the merged progress.
      if (!sessionStorage.getItem("nf-merged")) {
        try {
          sessionStorage.setItem("nf-merged", "1");
        } catch (e) {}
        setTimeout(function () {
          location.reload();
        }, 400);
        return;
      }
    } else if (JSON.stringify(remote) !== after) {
      // This browser has progress the saved copy doesn't.
      push();
    }
    try {
      sessionStorage.removeItem("nf-merged");
    } catch (e) {}
    setStatus("Synced");
  }

  function pull() {
    if (!get(SESSION_KEY)) return;
    call("GET", null, "?action=progress").then(function (result) {
      if (result.status === 401) return signedOut();
      if (result.data.ok) apply(result.data.progress);
    });
  }

  function signedOut() {
    set(SESSION_KEY, null);
    render();
    setStatus("Signed out. Progress stays in this browser.");
  }

  /* ---------------- the panel ---------------- */

  var css =
    ".nfs{position:fixed;right:16px;bottom:16px;z-index:9999;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#e7e7ea}" +
    ".nfs__toggle{min-height:44px;padding:0 16px;border:1px solid #34343c;border-radius:999px;background:#17171b;color:inherit;font:inherit;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}" +
    ".nfs__panel{position:absolute;right:0;bottom:56px;width:min(92vw,330px);padding:16px;border:1px solid #34343c;border-radius:14px;background:#111114;box-shadow:0 20px 50px rgba(0,0,0,.5)}" +
    ".nfs__panel h2{margin:0 0 6px;font-size:16px}.nfs__panel p{margin:0 0 10px;color:#a1a1aa}" +
    ".nfs__panel input{width:100%;min-height:44px;margin:0 0 8px;padding:0 12px;border:1px solid #34343c;border-radius:10px;background:#0b0b0d;color:inherit;font:inherit;box-sizing:border-box}" +
    ".nfs__panel button{min-height:40px;margin:0 6px 6px 0;padding:0 14px;border:1px solid #34343c;border-radius:10px;background:#1f1f25;color:inherit;font:inherit;cursor:pointer}" +
    ".nfs__panel .nfs__primary{background:#a78bfa;border-color:#a78bfa;color:#111}" +
    ".nfs__status{font-size:12px;color:#a1a1aa}.nfs :focus-visible{outline:2px solid #a78bfa;outline-offset:2px}" +
    ".nfs__trap{position:absolute;left:-10000px}";

  var root;
  var open = false;
  var formToken = null;
  var formTokenAt = 0;

  function setStatus(text) {
    var el = root && root.querySelector(".nfs__status");
    if (el) el.textContent = text;
  }

  function render() {
    var signedIn = Boolean(get(SESSION_KEY));
    var email = get(EMAIL_KEY) || "";
    root.innerHTML =
      '<button type="button" class="nfs__toggle" aria-expanded="' + open + '" aria-controls="nfs-panel">' +
      (signedIn ? "✓ Synced" : "☁ Save progress") +
      "</button>" +
      '<div class="nfs__panel" id="nfs-panel" role="region" aria-label="Progress sync"' + (open ? "" : " hidden") + ">" +
      (signedIn
        ? "<h2>Progress sync is on</h2><p>Signed in as <strong></strong>. Your progress follows you to any device.</p>" +
          '<button type="button" data-act="sync">Sync now</button><button type="button" data-act="logout">Sign out</button>' +
          '<button type="button" data-act="delete">Delete my account</button>'
        : "<h2>Keep your progress everywhere</h2><p>Free. Sign in with your email: we send a one-time link, no password.</p>" +
          '<form><label for="nfs-email" style="display:block;margin-bottom:4px">Email</label>' +
          '<input id="nfs-email" type="email" autocomplete="email" required maxlength="254">' +
          '<div class="nfs__trap" aria-hidden="true"><input tabindex="-1" autocomplete="off" name="website"></div>' +
          '<button type="submit" class="nfs__primary">Email me a sign-in link</button></form>') +
      '<p class="nfs__status" role="status" aria-live="polite"></p></div>';
    if (signedIn) root.querySelector(".nfs__panel strong").textContent = email;
    root.querySelector(".nfs__toggle").addEventListener("click", function () {
      open = !open;
      render();
      if (open) {
        var first = root.querySelector("#nfs-email") || root.querySelector("[data-act]");
        if (first) first.focus();
        if (!signedIn) getFormToken();
      }
    });
    var form = root.querySelector("form");
    if (form) form.addEventListener("submit", requestLink);
    Array.prototype.forEach.call(root.querySelectorAll("[data-act]"), function (button) {
      button.addEventListener("click", function () {
        var act = button.getAttribute("data-act");
        if (act === "sync") pull();
        if (act === "logout")
          call("POST", { action: "logout" }).then(function () {
            signedOut();
          });
        if (act === "delete" && window.confirm("Delete your NeuralForge account and the synced progress? This browser keeps its own copy."))
          call("POST", { action: "delete" }).then(function () {
            set(EMAIL_KEY, null);
            signedOut();
          });
      });
    });
  }

  function getFormToken() {
    if (formToken && Date.now() - formTokenAt < 100 * 60 * 1000) return Promise.resolve(formToken);
    return call("GET", null, "?action=token").then(function (result) {
      if (result.data.token) {
        formToken = result.data.token;
        formTokenAt = Date.now();
      }
      return formToken;
    });
  }

  function requestLink(event) {
    event.preventDefault();
    var input = root.querySelector("#nfs-email");
    var trap = root.querySelector('[name="website"]');
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("That email address doesn't look right.");
      input.focus();
      return;
    }
    setStatus("Sending…");
    getFormToken().then(function (token) {
      var wait = Math.max(0, 3200 - (Date.now() - formTokenAt));
      setTimeout(function () {
        call("POST", { action: "request", email: email, token: token, website: trap ? trap.value : "" }).then(function (result) {
          if (result.data.ok) {
            set(EMAIL_KEY, email);
            formToken = null;
            setStatus("Check " + email + " for the sign-in link (it works for 30 minutes).");
          } else {
            setStatus(result.data.message || "That didn't work. Please try again.");
          }
        });
      }, wait);
    });
  }

  /* ---------------- start ---------------- */

  function start() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    root = document.createElement("div");
    root.className = "nfs";
    document.body.appendChild(root);
    render();

    var params = new URLSearchParams(location.search);
    var code = params.get("nf_login");
    if (code) {
      params.delete("nf_login");
      history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : "") + location.hash);
      open = true;
      render();
      setStatus("Signing you in…");
      call("POST", { action: "verify", login: code }).then(function (result) {
        if (result.data.ok && result.data.session) {
          set(SESSION_KEY, result.data.session);
          set(EMAIL_KEY, result.data.email);
          render();
          apply(result.data.progress);
        } else {
          setStatus(result.data.message || "This sign-in link didn't work. Ask for a new one.");
        }
      });
      return;
    }
    pull();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
