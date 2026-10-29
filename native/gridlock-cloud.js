/* Gridlock cloud adapter — reference implementation.
 *
 * This is the shim docs/SERVER.md and docs/ADMIN-PORTAL.md describe. It fills in
 * window.gridlockCloud with account sign-in (Supabase Auth) and the opt-in
 * League sync (pushSeason / deleteSeason against a `seasons` table under RLS).
 *
 * IT IS DELIBERATELY NOT PART OF THE APP BUNDLE. web/index.html contains no
 * fetch, and every suite proves it; that is what makes the app work on a field
 * with no signal. Include THIS file only in a cloud-enabled build — the native
 * shell injects it, or a network web build adds its own <script> tag — never in
 * web/ and never inlined into site/app.html. With the file absent, or present
 * but unconfigured, window.gridlockCloud is simply not set and the app behaves
 * exactly as the offline build does.
 *
 * Configure before it loads:
 *     window.GRIDLOCK_CLOUD = { url: "https://YOUR.supabase.co", anonKey: "…" };
 * or after, from the shell:
 *     window.gridlockCloudConfigure(url, anonKey);
 *
 * Only the anon (public) key ever appears here. Row-level security is what keeps
 * one coach out of another's row; the service key never ships in any build.
 *
 * Contract (matches web/index.html):
 *     signUp/signIn(email, pass) -> {ok, user, said, offline}
 *     sendReset(email)           -> {ok, said, offline}
 *     signOut()                  -> void
 *     session()                  -> {user} | null
 *     pushSeason(label, payload) -> {ok, said, offline}   // opt-in League sync
 *     deleteSeason()             -> {ok, said, offline}
 *
 * offline:true means the network failed, not that the coach is wrong — the app
 * then falls through to the copy on the phone and says nothing about it.
 */
(function () {
  "use strict";
  var CFG = window.GRIDLOCK_CLOUD || null;
  var SESSION_KEY = "grindx.cloud.session";
  var OFFLINE = { ok: false, offline: true };
  var generation = 0, seasonVersion = 0;
  var loaded = false, currentSession = null, sessionText = null, refreshing = null;
  var seasonTail = Promise.resolve(), deleting = false;

  function said(msg) { return { ok: false, said: msg }; }
  function cfg() { return CFG; }
  function cancelled() { return said("Your sign-in changed. Sign in again before sending or removing a season."); }
  window.gridlockCloudConfigure = function (url, anonKey) {
    ++generation;
    if (CFG && (CFG.url !== url || CFG.anonKey !== anonKey)) writeSession(null);
    CFG = { url: url, anonKey: anonKey };
    install();
  };
  function readSession() {
    try {
      var text = localStorage.getItem(SESSION_KEY);
      if (!loaded || text !== sessionText) {
        if (loaded) ++generation;               // another tab changed the session
        loaded = true; sessionText = text; currentSession = null;
        var s = JSON.parse(text || "null");
        if (s && typeof s.access_token === "string" && s.user && typeof s.user.id === "string") currentSession = s;
      }
    } catch (e) {}
    return currentSession;
  }
  function writeSession(s) {
    loaded = true;
    currentSession = null;                     // failed storage never keeps a live session
    try {
      var text = s ? JSON.stringify(s) : null;
      s ? localStorage.setItem(SESSION_KEY, text) : localStorage.removeItem(SESSION_KEY);
      sessionText = localStorage.getItem(SESSION_KEY);
      if (sessionText !== text) return false;
      currentSession = s;
      return true;
    } catch (e) {
      // Do not reload a credential whose removal this tab could not persist.
      try { sessionText = localStorage.getItem(SESSION_KEY); } catch (ignored) {}
      return false;
    }
  }
  function sessionFrom(body) {
    return {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: Date.now() + ((body.expires_in || 3600) * 1000),
      user: body.user ? { id: body.user.id, email: body.user.email }
                       : (body.access_token ? { id: body.user_id, email: body.email } : null),
    };
  }
  function authError(body) {
    return (body && (body.msg || body.error_description || body.error_message || body.error || body.message))
      || "That was refused by the server.";
  }
  async function call(path, opts, token) {
    var c = cfg();
    if (!c || !c.url || !c.anonKey) return { net: false };
    opts = opts || {};
    var headers = { apikey: c.anonKey, "Content-Type": "application/json" };
    for (var k in (opts.headers || {})) headers[k] = opts.headers[k];
    if (token) headers.Authorization = "Bearer " + token;
    var res;
    try {
      res = await fetch(c.url.replace(/\/+$/, "") + path, {
        method: opts.method || "GET", headers: headers, body: opts.body,
      });
    } catch (e) { return { net: false }; }
    var body = null;
    try { body = await res.json(); } catch (e) {}
    return { net: true, ok: res.ok, status: res.status, body: body };
  }

  // Share a refresh, and accept its result only in the session that asked for it.
  async function token() {
    var s = readSession();
    if (!s) return null;
    if (s.expires_at && Date.now() < s.expires_at - 60000) return s.access_token;
    var g = generation;
    if (refreshing && refreshing.generation === g) return refreshing.promise;
    var work = (async function () {
      var r = await call("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (g !== generation || readSession() !== s) return null;
      if (r.net && r.ok && r.body && r.body.access_token) {
        var ns = sessionFrom(r.body);
        if (!ns.user || ns.user.id !== s.user.id || !writeSession(ns)) return null;
        return ns.access_token;
      }
      // Offline: the old token may still work, but only for the same session.
      return s.access_token;
    })();
    var entry = { generation: g, promise: work };
    refreshing = entry;
    try { return await work; }
    finally { if (refreshing === entry) refreshing = null; }
  }
  function beginAuth() { ++generation; writeSession(null); return generation; }
  function queueSeason(work) {
    var pending = seasonTail.then(work);
    seasonTail = pending.catch(function () {});
    return pending;
  }
  var api = {
    async signUp(email, pass) {
      var g = beginAuth();
      var r = await call("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: email, password: pass }) });
      if (g !== generation) return cancelled();
      if (!r.net) return OFFLINE;
      if (!r.ok) return said(authError(r.body));
      if (r.body && r.body.access_token && !writeSession(sessionFrom(r.body)))
        return said("This phone could not save your sign-in. Free some space and sign in again.");
      var u = (r.body && (r.body.user || r.body)) || {};
      return { ok: true, user: { id: u.id, email: u.email } };
    },
    async signIn(email, pass) {
      var g = beginAuth();
      var r = await call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email, password: pass }) });
      if (g !== generation) return cancelled();
      if (!r.net) return OFFLINE;
      if (!r.ok) return said(authError(r.body));
      if (!r.body || !r.body.access_token || !r.body.user || !r.body.user.id)
        return said("The server did not return a sign-in. Please try again.");
      var s = sessionFrom(r.body);
      if (!writeSession(s)) return said("This phone could not save your sign-in. Free some space and try again.");
      return { ok: true, user: s.user };
    },
    async sendReset(email) {
      var r = await call("/auth/v1/recover", { method: "POST", body: JSON.stringify({ email: email }) });
      if (!r.net) return OFFLINE;
      return r.ok ? { ok: true } : said(authError(r.body));
    },
    signOut() {
      var s = readSession();
      ++generation; ++seasonVersion;
      writeSession(null);                       // invalidate before any asynchronous work
      if (s && s.access_token) call("/auth/v1/logout", { method: "POST" }, s.access_token).catch(function () {});
    },
    session() {
      var s = readSession();
      return s && s.user ? { user: s.user } : null;
    },
    // One owner row per coach. Serialize writes so removal is the final request.
    async pushSeason(label, payload) {
      if (deleting) return said("Wait for removal to finish before sending again.");
      var g = generation, v = seasonVersion;
      return queueSeason(async function () {
        if (g !== generation || v !== seasonVersion) return cancelled();
        var t = await token(), s = readSession();
        if (g !== generation || v !== seasonVersion) return cancelled();
        if (!t || !(s && s.user && s.user.id)) return said("Sign in before turning on League sync.");
        var data;
        try { data = typeof payload === "string" ? JSON.parse(payload) : payload; } catch (e) { data = payload; }
        var row = { owner: s.user.id, label: String(label || "").slice(0, 60), payload: data, updated_at: new Date().toISOString() };
        var r = await call("/rest/v1/seasons?on_conflict=owner", {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row),
        }, t);
        if (g !== generation || v !== seasonVersion) return cancelled();
        if (!r.net) return OFFLINE;
        if (!r.ok) return said(authError(r.body) || "Your league would not accept it.");
        return { ok: true };
      });
    },
    async deleteSeason() {
      if (deleting) return said("Removal is already in progress.");
      deleting = true;
      var g = generation;
      ++seasonVersion;                          // queued uploads are obsolete
      try {
        return await queueSeason(async function () {
          if (g !== generation) return cancelled();
          var t = await token(), s = readSession();
          if (g !== generation) return cancelled();
          if (!t || !(s && s.user && s.user.id)) return said("Sign in before removing what you sent.");
          // This runs after any upload already sent, so it cannot recreate the row.
          var r = await call("/rest/v1/seasons?owner=eq." + encodeURIComponent(s.user.id), { method: "DELETE" }, t);
          if (g !== generation) return cancelled();
          if (!r.net) return OFFLINE;
          if (!r.ok) return said("Your league would not remove it.");
          return { ok: true };
        });
      } finally { deleting = false; }
    },
  };
  function install() { if (cfg() && cfg().url && cfg().anonKey) window.gridlockCloud = api; }
  install();
  if (typeof module !== "undefined" && module.exports) module.exports = { api: api, configure: window.gridlockCloudConfigure };
})();
