/*
  Sends the site's forms to the PHP API (api/*.php on the same origin).

  Each form first gets a signed token from /api/token.php. The server only
  accepts a token that is a few seconds old (bots rarely wait), so a submit
  that comes too quickly waits and retries once; an expired token is renewed
  and retried once. Nothing here throws: every outcome comes back as
  { ok, status, data }, with status 0 for a network failure.
*/

const API = `${process.env.PUBLIC_URL || ""}/api`;
const TOKEN_TTL_MS = 110 * 60 * 1000; // the server accepts tokens for 2 hours
const tokens = {};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options) {
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    return { ok: response.ok && Boolean(data && data.ok), status: response.status, data: data || {} };
  } catch (error) {
    return { ok: false, status: 0, data: { error: "network" } };
  }
}

async function fetchToken(form) {
  const result = await request(`${API}/token.php?form=${encodeURIComponent(form)}`, { method: "GET" });
  if (!result.ok || !result.data.token) return null;
  const minAge = typeof result.data.min_age === "number" ? result.data.min_age : 3;
  tokens[form] = { token: result.data.token, at: Date.now(), minAge: minAge * 1000 };
  return tokens[form];
}

/** Starts the token clock early (call when someone starts on the form). */
export function prepareForm(form) {
  const current = tokens[form];
  if (current && Date.now() - current.at < TOKEN_TTL_MS) return Promise.resolve(current);
  return fetchToken(form);
}

/**
 * POSTs `payload` (plus the form token) as JSON to /api/<endpoint>.
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
export async function submitForm(endpoint, form, payload) {
  let attempt = 0;
  let current = await prepareForm(form);
  while (attempt < 3) {
    attempt += 1;
    if (!current) return { ok: false, status: 0, data: { error: "network" } };
    const age = Date.now() - current.at;
    if (age < current.minAge) await wait(current.minAge - age + 150);

    const result = await request(`${API}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...payload, token: current.token }),
    });

    if (result.status === 429 && result.data.error === "too_fast" && attempt < 3) {
      await wait(Math.max(1, Number(result.data.retry_after) || 1) * 1000 + 150);
      continue;
    }
    if (result.status === 403 && result.data.error === "invalid_token" && attempt < 3) {
      current = await fetchToken(form);
      continue;
    }
    if (result.ok) delete tokens[form]; // one token per message
    return result;
  }
  return { ok: false, status: 0, data: { error: "network" } };
}
