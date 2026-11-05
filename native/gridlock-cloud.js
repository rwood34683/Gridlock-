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
 *     getEntitlement()           -> {ok, user, entitlement, said, offline}
 *     pushSeason(label, payload) -> {ok, said, offline}   // opt-in League sync
 *     deleteSeason()             -> {ok, said, offline}
 *     providers()                -> ["google", "apple"]  // only those the owner switched on
 *     startProvider(p, mode)     -> {ok, opened, said}    // mode "signin" or "link"
 *     authUrlKind(raw)           -> "email" | "signin" | "link" | null
 *
 * Google and Apple sign-in use Supabase's PKCE code flow: this file makes the
 * code verifier, sends only its SHA-256 challenge to /authorize, and on the
 * way back exchanges the one-time ?code= with the verifier it kept. A callback
 * that arrives without a verifier this phone made — someone else's link, a
 * second tab, a reload — is refused. The account server's own checks (closed
 * signups for the beta, identity, plans, administrators) decide who gets in;
 * a callback is never proof of anything by itself. No provider secret is in
 * here or in the generated config: the Google client secret and the Apple
 * signing key live only in the Supabase dashboard. docs/SOCIAL-SIGN-IN.md.
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
  var recoverySession = null, updatingPassword = false;
  var MAX_SEASON_BYTES = 2 * 1024 * 1024;
  var PROVIDERS = ["google", "apple"], PENDING_KEY = "grindx.cloud.oauth", PENDING_MS = 10 * 60 * 1000;
  var seasonRevisions = Object.create(null);
  function revision(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
  function bindingKey(id) { return "grindx.cloud.season.v2:" + cfg().url + ":" + id; }
  function seasonRevision(id) {
    if(Object.prototype.hasOwnProperty.call(seasonRevisions,id)) return seasonRevisions[id];
    try { var n = JSON.parse(localStorage.getItem(bindingKey(id)) || "0"); seasonRevisions[id]=revision(n)===null?0:n;return seasonRevisions[id]; }
    catch(e) { return 0; }
  }
  function saveRevision(id, value) {
    if(revision(value) === null) return false;
    try { var k=bindingKey(id), v=JSON.stringify(value);localStorage.setItem(k,v);if(localStorage.getItem(k)!==v)return false;seasonRevisions[id]=value;return true; }
    catch(e) { return false; }
  }

  function said(msg) { return { ok: false, said: msg }; }
  function cfg() { return CFG; }
  function cancelled() { return said("Your sign-in changed. Sign in again before sending or removing a season."); }
  window.gridlockCloudConfigure = function (url, anonKey, redirectTo) {
    ++generation;
    recoverySession = null;
    if (CFG && (CFG.url !== url || CFG.anonKey !== anonKey)) writeSession(null);
    CFG = { url: url, anonKey: anonKey, redirectTo: redirectTo };
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
  function entitlementExpiry(value) {
    if (value === null) return 0;
    if (typeof value !== "string") return NaN;
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 ||
        +m[3] > new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate() ||
        +m[4] > 23 || +m[5] > 59 || +m[6] > 59 || (m[7] && (+m[8] > 23 || +m[9] > 59))) return NaN;
    return Date.parse(value);
  }
  // Keep the callback on this build's exact screen; never forward credentials
  // to a destination supplied by the email URL itself.
  function redirectUrl() {
    var c = cfg(), target = c && c.redirectTo;
    var explicit = !!target;
    if (!target && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
      target = "gridlock://auth/callback";
    if (!target && window.location) target = window.location.href;
    try {
      var u = new URL(target);
      if (u.username || u.password) return null;
      if (explicit && (u.search || u.hash || /[\s\\]/.test(target))) return null;
      if (u.protocol !== "https:" && !(u.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)) &&
          !(/^(gridlock|grindx|lockdown):$/.test(u.protocol) && u.host === "auth" && u.pathname === "/callback")) return null;
      u.search = ""; u.hash = "";
      return u.href;
    } catch (e) { return null; }
  }
  function authPath(path) {
    var redirect = redirectUrl();
    return path + (redirect ? "?redirect_to=" + encodeURIComponent(redirect) : "");
  }
  function authUrl(raw) {
    try {
      var u = new URL(raw), target = redirectUrl();
      if (!target || u.username || u.password) return null;
      var base = new URL(u.href); base.hash = ""; base.search = "";
      if (base.href !== target) return null;
      var p = new URLSearchParams(u.hash.slice(1)), q = new URLSearchParams(u.search);
      // A provider sign-in comes back with ?code= (PKCE); its errors may sit
      // in the query or the fragment.
      if (q.has("code") || ((q.has("error") || q.has("error_code")) && pendingFlow()))
        return { url: u, params: q.has("code") ? q : (q.has("error") || q.has("error_code") ? q : p), code: true };
      if (!p.has("access_token") && !p.has("error") && !p.has("error_code")) return null;
      if ((p.has("error") || p.has("error_code")) && !p.has("access_token") && pendingFlow()) return { url: u, params: p, code: true };
      return { url: u, params: p };
    } catch (e) { return null; }
  }
  function clearAuthFragment(u) {
    try {
      if (window.location && window.location.href === u.href && window.history)
        window.history.replaceState(null, "", u.pathname);
    } catch (e) {}
  }
  async function call(path, opts, token) {
    var c = cfg();
    if (!c || !c.url || !c.anonKey) return { net: false };
    opts = opts || {};
    var headers = { apikey: c.anonKey, "Content-Type": "application/json" };
    for (var k in (opts.headers || {})) headers[k] = opts.headers[k];
    if (token) headers.Authorization = "Bearer " + token;
    var res, body=null;
    var controller=typeof AbortController!=="undefined"?new AbortController():null;
    var timer=controller?setTimeout(function(){controller.abort();},20000):null;
    try {
      res = await fetch(c.url.replace(/\/+$/, "") + path, {
        method: opts.method || "GET", headers: headers, body: opts.body,
        ...(controller?{signal:controller.signal}:{}),
      });
      try{body=await res.json();}catch(e){if(controller?.signal.aborted)return {net:false};}
    } catch (e) { return { net: false }; }
    finally {if(timer!==null)clearTimeout(timer);}
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
      if (r.net && [400, 401, 403].includes(r.status)) {
        ++generation; writeSession(null);
        return null;
      }
      // Offline: the old token may still work, but only for the same session.
      return s.access_token;
    })();
    var entry = { generation: g, promise: work };
    refreshing = entry;
    try { return await work; }
    finally { if (refreshing === entry) refreshing = null; }
  }
  function beginAuth() { ++generation; recoverySession = null; writeSession(null); return generation; }
  function queueSeason(work) {
    var pending = seasonTail.then(work);
    seasonTail = pending.catch(function () {});
    return pending;
  }
  /* ---- Google and Apple (PKCE) ------------------------------------------ */
  function configuredProviders() {
    var c = cfg(), list = c && Array.isArray(c.providers) ? c.providers : [];
    return PROVIDERS.filter(function (p) { return list.indexOf(p) >= 0; });
  }
  function nativeShell() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  // A provider page opened inside the app's own web view is refused by Google
  // and is no way to sign in with Apple; a native build offers these buttons
  // only when its shell can open the system browser (window.gridlockOpenAuth).
  function canOpen() {
    if (nativeShell()) return typeof window.gridlockOpenAuth === "function";
    return !!(window.location && /^https?:$/.test(window.location.protocol));
  }
  function pendingFlow() {
    try {
      var f = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (!f || typeof f.v !== "string" || PROVIDERS.indexOf(f.p) < 0 || ["signin", "link"].indexOf(f.mode) < 0) return null;
      if (typeof f.at !== "number" || Date.now() - f.at > PENDING_MS || Date.now() < f.at - 60000) return null;
      return f;
    } catch (e) { return null; }
  }
  function dropFlow() { try { localStorage.removeItem(PENDING_KEY); } catch (e) {} }
  function verifier() {
    var a = new Uint32Array(56); crypto.getRandomValues(a);
    return Array.from(a, function (n) { return ("0" + n.toString(16)).slice(-2); }).join("");
  }
  async function challenge(v) {
    var d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))), b = "";
    for (var i = 0; i < d.length; i++) b += String.fromCharCode(d[i]);
    return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function providerWord(p) { return p === "apple" ? "Apple" : "Google"; }
  function oauthError(params, p) {
    var code = String(params.get("error_code") || params.get("error") || ""), text = String(params.get("error_description") || "");
    if (/access_denied|cancel/i.test(code + " " + text)) return "Sign-in with " + providerWord(p) + " was cancelled. Nothing changed.";
    if (/signup.*(disabled|not allowed)|not allowed for this instance/i.test(code + " " + text))
      return "That " + providerWord(p) + " account is not on the beta list yet. Use the email you were invited with, or ask Gridlock PB LLC for an invite.";
    if (/identity.*(already|exists)|already linked/i.test(code + " " + text))
      return "That " + providerWord(p) + " account already belongs to a different Gridlock account. Nothing was linked.";
    if (/manual.?linking/i.test(code + " " + text)) return "Linking is not switched on for this account server yet. Nothing changed.";
    return "That sign-in expired or was refused. Start again.";
  }
  var api = {
    providers() { return canOpen() ? configuredProviders() : []; },
    authUrlKind(raw) {
      var link = authUrl(raw);
      if (!link) return null;
      if (!link.code) return "email";
      var f = pendingFlow();
      return f ? f.mode : "signin";
    },
    // Starts Google or Apple: "signin" from the welcome page, "link" from
    // Nexus to add the provider to the account signed in now.
    async startProvider(provider, mode) {
      mode = mode === "link" ? "link" : "signin";
      if (configuredProviders().indexOf(provider) < 0 || !canOpen()) return said(providerWord(provider) + " sign-in is not set up on this build.");
      var redirect = redirectUrl(), c = cfg();
      if (!redirect) return said("This build has no sign-in return address. Nothing changed.");
      if (!(typeof crypto !== "undefined" && crypto.subtle && crypto.getRandomValues)) return said("This address is not a secure one, so sign-in cannot start here.");
      var s = readSession(), g = generation, v = verifier(), ch = await challenge(v);
      if (g !== generation || readSession() !== s) return cancelled();
      if (mode === "link" && !(s && s.user && s.user.id)) return said("Sign in first, then link " + providerWord(provider) + ".");
      var flow = { v: v, p: provider, mode: mode, at: Date.now(), r: redirect, uid: mode === "link" ? s.user.id : "" };
      try { localStorage.setItem(PENDING_KEY, JSON.stringify(flow)); if (localStorage.getItem(PENDING_KEY) !== JSON.stringify(flow)) throw 0; }
      catch (e) { return said("This phone could not save the sign-in step. Free some space and try again."); }
      var query = "provider=" + encodeURIComponent(provider) + "&redirect_to=" + encodeURIComponent(redirect) +
                  "&code_challenge=" + encodeURIComponent(ch) + "&code_challenge_method=s256";
      var target;
      if (mode === "link") {
        var t = await token();
        if (g !== generation || readSession() !== s || !t) { dropFlow(); return cancelled(); }
        var r = await call("/auth/v1/user/identities/authorize?" + query + "&skip_http_redirect=true", {}, t);
        if (g !== generation || readSession() !== s) { dropFlow(); return cancelled(); }
        if (!r.net) { dropFlow(); return OFFLINE; }
        if (!r.ok || !r.body || typeof r.body.url !== "string") { dropFlow(); return said(oauthError(new URLSearchParams({ error_description: authError(r.body) }), provider)); }
        target = r.body.url;
      } else {
        target = c.url.replace(/\/+$/, "") + "/auth/v1/authorize?" + query;
      }
      try {
        var u = new URL(target);
        if (u.protocol !== "https:" || u.username || u.password) { dropFlow(); return said("The account server sent a sign-in address this app will not open."); }
      } catch (e) { dropFlow(); return said("The account server sent a sign-in address this app will not open."); }
      if (nativeShell()) window.gridlockOpenAuth(target); else window.location.assign(target);
      return { ok: true, opened: true };
    },
    async signUp(email, pass) {
      var g = beginAuth();
      var r = await call(authPath("/auth/v1/signup"), { method: "POST", body: JSON.stringify({ email: email, password: pass }) });
      readSession();
      if (g !== generation) return cancelled();
      if (!r.net) return OFFLINE;
      if (!r.ok) return said(authError(r.body));
      var u = (r.body && (r.body.user || r.body)) || {};
      if (!u.id || typeof u.email !== "string") return said("The server did not return an account. Please try again.");
      if (!r.body.access_token) return { ok: true, pendingConfirmation: true };
      if (!writeSession(sessionFrom(r.body)))
        return said("This phone could not save your sign-in. Free some space and sign in again.");
      return { ok: true, user: { id: u.id, email: u.email } };
    },
    async signIn(email, pass) {
      var g = beginAuth();
      var r = await call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email, password: pass }) });
      readSession();
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
      var r = await call(authPath("/auth/v1/recover"), { method: "POST", body: JSON.stringify({ email: email }) });
      if (!r.net) return OFFLINE;
      return r.ok ? { ok: true } : said(authError(r.body));
    },
    isAuthUrl(raw) { return !!authUrl(raw); },
    async handleAuthUrl(raw) {
      var link = authUrl(raw);
      if (!link) return null;
      clearAuthFragment(link.url); // remove bearer tokens before any await or redraw
      if (link.code) return api.finishProvider(link.params);
      var g = beginAuth(), p = link.params;
      if (p.has("error") || p.has("error_code")) return said("That email link has expired or was refused. Ask for a new one.");
      var type = p.get("type"), access = p.get("access_token"), refresh = p.get("refresh_token");
      if (!["signup", "recovery", "invite"].includes(type) || !access || !refresh)
        return said("That email link is incomplete. Ask for a new one.");
      // An email, ID or expiry embedded in the link is not proof of identity.
      var r = await call("/auth/v1/user", {}, access);
      readSession();
      if (g !== generation) return cancelled();
      if (!r.net) return said("The account server could not be reached. Open the email link again when you are online.");
      if (!r.ok || !r.body || typeof r.body.id !== "string" || typeof r.body.email !== "string")
        return said("That email link has expired or was refused. Ask for a new one.");
      var seconds = Number(p.get("expires_in"));
      if (!Number.isFinite(seconds) || seconds <= 0) seconds = 3600;
      var s = sessionFrom({access_token: access, refresh_token: refresh, expires_in: Math.min(seconds, 3600), user: r.body});
      if (type === "signup") return { ok: true, confirmed: true, user: s.user };
      recoverySession = s;
      return { ok: true, recovery: true, user: s.user };
    },
    // The way back from Google or Apple. The verifier this phone kept is used
    // once and thrown away first, so a reload or a second tab cannot replay it.
    async finishProvider(params) {
      var f = pendingFlow(); dropFlow();
      if (!f) return said("That sign-in was not started on this phone, or it took too long. Start again.");
      if (params.has("error") || params.has("error_code")) return said(oauthError(params, f.p));
      var code = params.get("code");
      if (!code || code.length > 512) return said("That sign-in link is incomplete. Start again.");
      var linking = f.mode === "link", before = readSession();
      if (linking && !(before && before.user && before.user.id === f.uid)) return said("You signed out before " + providerWord(f.p) + " finished. Nothing was linked.");
      var g = linking ? generation : beginAuth();
      var r = await call("/auth/v1/token?grant_type=pkce", { method: "POST", body: JSON.stringify({ auth_code: code, code_verifier: f.v }) });
      readSession();
      if (g !== generation) return cancelled();
      if (!r.net) return said("The account server could not be reached. Start the sign-in again when you are online.");
      if (!r.ok || !r.body || !r.body.access_token || !r.body.user || typeof r.body.user.id !== "string")
        return said(oauthError(new URLSearchParams({ error_description: authError(r.body) }), f.p));
      // The exchange is checked against the account server once more: what the
      // server says about this token is the identity, not the redirect.
      var who = await call("/auth/v1/user", {}, r.body.access_token);
      readSession();
      if (g !== generation) return cancelled();
      if (!who.net) return said("The account server could not be reached. Start the sign-in again when you are online.");
      if (!who.ok || !who.body || who.body.id !== r.body.user.id) return said("That sign-in was refused. Start again.");
      if (linking) {
        var now = readSession();
        if (!now || now.user.id !== f.uid || who.body.id !== f.uid)
          return said("That " + providerWord(f.p) + " account belongs to a different Gridlock account. Nothing was linked, and you are still signed in as before.");
        return { ok: true, linked: true, provider: f.p, user: now.user };
      }
      var s = sessionFrom({ access_token: r.body.access_token, refresh_token: r.body.refresh_token, expires_in: r.body.expires_in, user: { id: who.body.id, email: typeof who.body.email === "string" ? who.body.email : "" } });
      if (!s.refresh_token || !writeSession(s)) return said("This phone could not save your sign-in. Free some space and try again.");
      return { ok: true, oauth: true, provider: f.p, user: s.user };
    },
    cancelRecovery() { ++generation; recoverySession = null; },
    async updatePassword(pass) {
      if (updatingPassword) return said("Your password is already being saved.");
      var s = recoverySession, g = generation;
      if (!s || Date.now() >= s.expires_at) { recoverySession = null; return said("Open a fresh password-reset link from your email first."); }
      if (typeof pass !== "string" || pass.length < 6) return said("Use a password of six characters or more.");
      updatingPassword = true;
      try {
        var r = await call("/auth/v1/user", { method: "PUT", body: JSON.stringify({password: pass}) }, s.access_token);
        readSession();
        if (g !== generation || recoverySession !== s) return cancelled();
        if (!r.net) return OFFLINE;
        if (!r.ok) return said(authError(r.body));
        if (!r.body || r.body.id !== s.user.id) return said("The server did not confirm your password change. Sign in to check it.");
        recoverySession = null;
        if (!writeSession(s)) return said("Your password was changed, but this phone could not save your sign-in. Sign in with the new password.");
        return { ok: true, user: s.user };
      } finally { updatingPassword = false; }
    },
    signOut() {
      var s = readSession();
      ++generation; ++seasonVersion;
      recoverySession = null;
      writeSession(null);                       // invalidate before any asynchronous work
      if (s && s.access_token) call("/auth/v1/logout", { method: "POST" }, s.access_token).catch(function () {});
    },
    session() {
      var s = readSession();
      return s && s.user ? { user: s.user } : null;
    },
    // An account grant is read only with that account's verified bearer token.
    // RLS limits the row too; the explicit owner filter never requests peers.
    async getEntitlement() {
      readSession();
      var g = generation, t = await token(), s = readSession();
      if (g !== generation) return cancelled();
      if (!t || !(s && s.user && s.user.id)) return said("Sign in to check your account access.");
      var id = s.user.id;
      var r = await call("/rest/v1/entitlements?user_id=eq." + encodeURIComponent(id) + "&select=user_id,plan,expires_at&limit=1", {}, t);
      var current = readSession();
      if (g !== generation || !current || current.user.id !== id) return cancelled();
      if (!r.net) return OFFLINE;
      if (!r.ok || !Array.isArray(r.body)) return said("Your account access could not be checked. Try again with a signal.");
      var row = r.body[0], grant = { plan: "free", exp: 0, source: "account" };
      if (row) {
        if (row.user_id !== id || !["free", "team", "program"].includes(row.plan))
          return said("The server returned invalid account access.");
        var expiry = entitlementExpiry(row.expires_at);
        if (!Number.isFinite(expiry) || expiry < 0) return said("The server returned invalid account access.");
        if (row.expires_at === null || expiry > Date.now()) grant = { plan: row.plan, exp: expiry, source: "account" };
      }
      return { ok: true, user: s.user, entitlement: grant };
    },
    async getSeason() {
      var g=generation, t=await token(), s=readSession();
      if(g!==generation) return cancelled();
      if(!t || !s) return said("Sign in to review your cloud copy.");
      var id=s.user.id;
      var r=await call("/rest/v1/seasons?owner=eq."+encodeURIComponent(id)+"&select=label,payload,revision,deleted_at,updated_at&limit=1",{},t);
      if(g!==generation || readSession()!==s) return cancelled();
      if(!r.net) return OFFLINE;
      if(!r.ok || !Array.isArray(r.body)) return said("Your cloud copy could not be loaded.");
      var row=r.body[0];
      if(!row) return {ok:true,revision:0,missing:true,user:s.user};
      if(revision(row.revision)===null) return said("The season service needs its safety update before syncing.");
      return {ok:true,user:s.user,revision:row.revision,removed:!!row.deleted_at,label:row.label,payload:row.payload,updated_at:row.updated_at};
    },
    async deleteAccount(password, confirmation, code) {
      var g=generation, s=readSession();
      if(!s) return said("Sign in online before deleting your account.");
      if(confirmation!=="DELETE MY ACCOUNT") return said("Type DELETE MY ACCOUNT to confirm.");
      var auth=await call("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email:s.user.email,password:password})});
      if(g!==generation || readSession()!==s) return cancelled();
      if(!auth.net) return OFFLINE;
      if(!auth.ok || auth.body?.user?.id!==s.user.id || !auth.body.access_token) return said("Your password was not confirmed. Nothing was deleted.");
      var access=auth.body.access_token;
      var factor=(auth.body.user.factors||[]).find(function(f){return f.factor_type==="totp"&&f.status==="verified";});
      if(factor){
        if(!/^\d{6}$/.test(code||"")) return said("Enter the six-digit code from your authenticator. Nothing was deleted.");
        var path="/auth/v1/factors/"+encodeURIComponent(factor.id);
        var challenge=await call(path+"/challenge",{method:"POST",body:"{}"},access);
        if(g!==generation || readSession()!==s) return cancelled();
        if(!challenge.ok || !challenge.body?.id) return said("The authenticator challenge failed. Nothing was deleted.");
        var verified=await call(path+"/verify",{method:"POST",body:JSON.stringify({challenge_id:challenge.body.id,code:code})},access);
        if(g!==generation || readSession()!==s) return cancelled();
        if(!verified.ok || !verified.body?.access_token) return said("The authenticator code was refused. Nothing was deleted.");
        access=verified.body.access_token;
      }
      var removed=await call("/functions/v1/gridlock-account",{method:"POST",body:JSON.stringify({confirmation:confirmation})},access);
      if(g!==generation || readSession()!==s) return cancelled();
      if(!removed.net) return said("Deletion was not confirmed. Check your connection, then sign in to check your account.");
      if(!removed.ok || removed.body?.ok!==true) return said(authError(removed.body)||"Deletion was not confirmed.");
      ++generation;++seasonVersion;writeSession(null);recoverySession=null;
      return {ok:true};
    },
    acceptSeason(userId, value) {
      var s=readSession();
      return !!(s && s.user.id===userId && saveRevision(userId,value));
    },
    // No direct table writes: one server transaction compares the revision and
    // keeps a deletion marker. An unbound second device starts at revision zero.
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
        if(!data || typeof data!=="object" || data.format!=="gridlock.coach.copy" || !data.data || typeof data.data!=="object") return said("Choose a complete Gridlock season copy.");
        var row = { expected_revision:seasonRevision(s.user.id), season_label:String(label || "").slice(0,60), season_payload:data, remove_season:false };
        var body=JSON.stringify(row);
        if(new TextEncoder().encode(body).byteLength > MAX_SEASON_BYTES) return said("This season is too large for cloud sync. Save a copy on this phone; cloud copies must be under 2 MB.");
        var r = await call("/rest/v1/rpc/gridlock_write_season", {method:"POST",body:body},t);
        var current=readSession();
        if (g !== generation || !current || current.user.id!==s.user.id) return cancelled();
        // A removal on this device waits for this response. Keep its acknowledged
        // version even when the upload's UI result has been invalidated.
        var acknowledged=r.net&&r.ok&&r.body?.ok===true&&saveRevision(s.user.id,r.body.revision);
        if(v!==seasonVersion)return cancelled();
        if (!r.net) return OFFLINE;
        if (!r.ok) return said("Your season could not be sent. The server must support safe season sync.");
        if(r.body && r.body.conflict) return {ok:false,conflict:true,said:"Another device changed or removed your cloud copy. Review the cloud copy before sending again. Your phone's season is unchanged."};
        if(!acknowledged) return said("Your upload could not be safely acknowledged. Review the cloud copy before sending again.");
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
          var expected=seasonRevision(s.user.id);
          // A new device may explicitly remove the current copy. Read its version
          // first; a concurrent upload still causes a conflict at the server.
          if(!expected){
            var latest=await api.getSeason();
            if(g!==generation || !latest || !latest.ok) return latest || cancelled();
            expected=latest.revision;
          }
          var r = await call("/rest/v1/rpc/gridlock_write_season", {method:"POST",body:JSON.stringify({expected_revision:expected,season_label:null,season_payload:null,remove_season:true})},t);
          if (g !== generation) return cancelled();
          if (!r.net) return OFFLINE;
          if (!r.ok) return said("Your league would not remove it.");
          if(r.body && r.body.conflict) return {ok:false,conflict:true,said:"Another device changed your cloud copy. Review it before removing it. Nothing was removed."};
          if(!r.body || r.body.ok!==true || !saveRevision(s.user.id,r.body.revision)) return said("Removal could not be safely acknowledged. Review the cloud copy before retrying.");
          return { ok: true };
        });
      } finally { deleting = false; }
    },
  };
  function install() { if (cfg() && cfg().url && cfg().anonKey) {window.gridlockCloud = api;var s=readSession();if(s)seasonRevision(s.user.id);} }
  install();
  if (typeof module !== "undefined" && module.exports) module.exports = { api: api, configure: window.gridlockCloudConfigure };
})();
