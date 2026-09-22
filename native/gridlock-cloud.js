/* Grind X cloud adapter — reference implementation.
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

  function said(msg) { return { ok: false, said: msg }; }
  function cfg() { return CFG; }

  window.gridlockCloudConfigure = function (url, anonKey) {
    CFG = { url: url, anonKey: anonKey };
    install();
  };

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; }
  }
  function writeSession(s) {
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
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

  // One call to Supabase (GoTrue or PostgREST). A thrown fetch is the network
  // being down — that comes back as {net:false} and the callers turn it into
  // offline. Anything the server answered is a real result.
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

  // A valid access token, refreshing it first if it is within a minute of
  // expiry. With no signal the refresh cannot happen; we return what we have and
  // let RLS refuse if it is truly stale — offline is never a locked door here.
  async function token() {
    var s = readSession();
    if (!s) return null;
    if (s.expires_at && Date.now() < s.expires_at - 60000) return s.access_token;
    var r = await call("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (r.net && r.ok && r.body && r.body.access_token) {
      var ns = sessionFrom(r.body); writeSession(ns); return ns.access_token;
    }
    return s.access_token;
  }

  var api = {
    async signUp(email, pass) {
      var r = await call("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: email, password: pass }) });
      if (!r.net) return OFFLINE;
      if (!r.ok) return said(authError(r.body));
      if (r.body && r.body.access_token) writeSession(sessionFrom(r.body));
      var u = (r.body && (r.body.user || r.body)) || {};
      return { ok: true, user: { id: u.id, email: u.email } };
    },
    async signIn(email, pass) {
      var r = await call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email, password: pass }) });
      if (!r.net) return OFFLINE;
      if (!r.ok) return said(authError(r.body));
      var s = sessionFrom(r.body); writeSession(s);
      return { ok: true, user: s.user };
    },
    async sendReset(email) {
      var r = await call("/auth/v1/recover", { method: "POST", body: JSON.stringify({ email: email }) });
      if (!r.net) return OFFLINE;
      return r.ok ? { ok: true } : said(authError(r.body));
    },
    signOut() {
      var s = readSession();
      if (s && s.access_token) call("/auth/v1/logout", { method: "POST" }, s.access_token).catch(function () {});
      writeSession(null);
    },
    session() {
      var s = readSession();
      return s && s.user ? { user: s.user } : null;
    },

    /* ---- opt-in League sync -------------------------------------------- */
    // One row per coach, keyed on owner and replaced each push, so the admin
    // reads the coach's latest full season. RLS lets him touch only his own row.
    async pushSeason(label, payload) {
      var t = await token();
      var s = readSession();
      if (!t || !(s && s.user && s.user.id)) return said("Sign in before turning on League sync.");
      var data;
      try { data = typeof payload === "string" ? JSON.parse(payload) : payload; } catch (e) { data = payload; }
      var row = {
        owner: s.user.id,
        label: String(label || "").slice(0, 60),
        payload: data,
        updated_at: new Date().toISOString(),
      };
      var r = await call("/rest/v1/seasons?on_conflict=owner", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row),
      }, t);
      if (!r.net) return OFFLINE;
      if (!r.ok) return said(authError(r.body) || "Your league would not accept it.");
      return { ok: true };
    },
    async deleteSeason() {
      var t = await token();
      var s = readSession();
      if (!t || !(s && s.user && s.user.id)) return { ok: true };   // nothing of his is up
      var r = await call("/rest/v1/seasons?owner=eq." + encodeURIComponent(s.user.id), { method: "DELETE" }, t);
      if (!r.net) return OFFLINE;
      if (!r.ok) return said("Your league would not remove it.");
      return { ok: true };
    },
  };

  // Expose it only when configured, so including the file without a project URL
  // and key leaves the app in its no-cloud state.
  function install() { if (cfg() && cfg().url && cfg().anonKey) window.gridlockCloud = api; }
  install();

  // Also usable outside a browser (the test harness) via module.exports.
  if (typeof module !== "undefined" && module.exports) module.exports = { api: api, configure: window.gridlockCloudConfigure };
})();
