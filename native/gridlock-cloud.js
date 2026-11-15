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
 *     teamAccess(action, input)  -> {ok, user, result, said} // prepared; server-gated
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
  var recoverySession = null, updatingPassword = false;
  var securityApproved = null, securityPrompt = null, securityWork = null;
  var previousDevice = null;
  function securityRequired() { return cfg()?.accountSecurity === true; }
  function notifySecurity() { if (window.dispatchEvent && typeof Event !== 'undefined') window.dispatchEvent(new Event('gridlock-security')); }
  function jwtSession(access) { try { return JSON.parse(atob(access.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id || ''; } catch (_) { return ''; } }
  function securityIdentity(s) { return s && s.user.id + ':' + jwtSession(s.access_token); }
  function securityReady() { var s=readSession();return !securityRequired() || !!(s && s.security_approved===securityIdentity(s)); }
  function securityMessage(code) {
    return ({mfa_required:'Verify your authenticator to continue.',device_required:'Choose a place for this device.',
      device_revoked:'This device was removed. Sign in again and approve it.',sign_in_required:'Sign in with your confirmed account.',
      device_changed:'That device changed. Refresh the device list.',invalid_request:'Check the device name and try again.'})[code] || 'Security could not be checked. Reconnect and try again.';
  }
  async function securityRpc(action,input) {
    var s=readSession(),g=generation,t=await token();
    if(!s || !t || recoverySession || g!==generation) return cancelled();
    var id=s.user.id;
    var r=await call('/rest/v1/rpc/gridlock_security_action',{method:'POST',body:JSON.stringify({action:action,input:input||{}})},t);
    var current=readSession();
    if(g!==generation || !current || current.user.id!==id) return cancelled();
    if(!r.net || !r.ok || typeof r.body?.ok!=='boolean') return said('Security could not be checked. Reconnect and try again.');
    var b=r.body;
    // An opt-in client never silently downgrades when the server is unprepared.
    if(securityRequired() && b.required!==true && b.ok) return said('Account protection is not enabled on this server yet.');
    if(b.ok && b.required && (b.user_id!==id||b.session_id!==jwtSession(current.access_token))) return said('The server returned another sign-in. Sign in again.');
    var wasReady=securityReady();
    securityApproved=b.ok?securityIdentity(current):null;
    current.security_approved=securityApproved;writeSession(current);
    if(wasReady!==securityReady())notifySecurity();
    return {...b,said:b.ok?'':securityMessage(b.code)};
  }
  function securityBridge() {
    var owner=readSession()?.user?.id,entry=generation;
    async function auth(path,body) {
      if(entry!==generation || readSession()?.user?.id!==owner) return cancelled();
      var t=await token();if(!t)return cancelled();
      var r=await call('/auth/v1'+path,body===undefined?{}:{method:'POST',body:JSON.stringify(body)},t);
      if(entry!==generation || readSession()?.user?.id!==owner) return cancelled();
      return r.net&&r.ok?{ok:true,data:r.body}:said('Authenticator verification was refused. Check the code and try again.');
    }
    return {
      status:async()=>{var r=await securityRpc('status');return {...r,reuseCurrent:previousDevice?.user===owner&&r.devices?.some(d=>d.id===previousDevice.session)};},claim:async(label,replace)=>{
        if(!replace && previousDevice?.user===owner){
          var state=await securityRpc('status');
          if(state.devices?.some(d=>d.id===previousDevice.session))replace=previousDevice.session;
        }
        var claimed=await securityRpc('claim',{label,...(replace?{replace}:{})});if(claimed.ok)previousDevice=null;return claimed;
      },
      revoke:session_id=>securityRpc('revoke',{session_id}),
      async factors(){var r=await auth('/user');return r.ok&&Array.isArray(r.data?.factors)?{ok:true,factors:r.data.factors}:said('Authenticator settings could not be loaded.');},
      async enroll(){
        var r=await auth('/factors',{factor_type:'totp',friendly_name:'Gridlock '+Date.now(),issuer:'Gridlock'}),d=r.data,raw=d?.totp?.qr_code;
        if(!r.ok)return r;
        if(typeof d.id!=='string'||typeof raw!=='string'||raw.length>65536||typeof d.totp?.secret!=='string')return said('Authenticator setup was not readable.');
        var qr=raw.trim().startsWith('<svg')?'data:image/svg+xml,'+encodeURIComponent(raw):/^data:image\/svg\+xml[;,]/.test(raw)?raw:'';
        return qr?{ok:true,id:d.id,qr,secret:d.totp.secret}:said('Authenticator image was not readable.');
      },
      async verify(factor,code){
        if(!/^[a-f0-9-]{36}$/i.test(factor)||!/^\d{6}$/.test(code))return said('Enter the six-digit authenticator code.');
        var path='/factors/'+encodeURIComponent(factor),c=await auth(path+'/challenge',{});
        if(!c.ok||!c.data?.id)return said('The authenticator challenge was refused.');
        var v=await auth(path+'/verify',{challenge_id:c.data.id,code});
        if(!v.ok)return v;
        if(!v.data?.access_token||v.data.user?.id!==owner||!writeSession(sessionFrom(v.data)))return said('Verification could not be saved. Sign in again.');
        return {ok:true};
      }
    };
  }
  async function ensureSecurity(manage=false) {
    if(!securityRequired())return true;
    if(securityWork)return securityWork;
    var g=generation,id=readSession()?.user?.id;
    if(!id)return false;
    var work=(async()=>{
      var r=await securityRpc('status');
      if(g!==generation||readSession()?.user?.id!==id)return false;
      if(r.ok&&!manage)return true;
      if(typeof window.gridlockSecurityPrompt!=='function')return false;
      var bridge=securityBridge();securityPrompt=bridge;
      try{return !!(await window.gridlockSecurityPrompt(bridge,manage)) && g===generation && readSession()?.user?.id===id && securityReady();}
      finally{if(securityPrompt===bridge)securityPrompt=null;}
    })();
    securityWork=work;try{return await work;}finally{if(securityWork===work)securityWork=null;}
  }
  async function accountToken() {
    if(securityRequired()) {var r=await securityRpc('status');if(!r.ok)return null;}
    return token();
  }
  var MAX_SEASON_BYTES = 2 * 1024 * 1024;
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
  // A checkpoint is evidence of the exact season this device last shared or
  // adopted, not just a revision it happened to read. Never store credentials
  // or another full season here. Scope it to the project and immutable user id.
  function deviceKey(id) { return bindingKey(id) + ":device"; }
  function ownerKey() { return "grindx.cloud.season.owner:" + cfg().url; }
  async function seasonHash(payload) {
    var p = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!window.crypto?.subtle || !p || p.format !== "gridlock.coach.copy" || p.scope !== "all" || !p.data) return null;
    function sorted(v) {
      if (Array.isArray(v)) return v.map(sorted);
      if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])]));
      return v;
    }
    var bytes = new TextEncoder().encode(JSON.stringify(sorted({seasonId:p.seasonId, data:p.data})));
    return Array.from(new Uint8Array(await window.crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2,"0")).join("");
  }

  function said(msg) { return { ok: false, said: msg }; }
  function cfg() { return CFG; }
  function cancelled() { return said("Your sign-in changed. Sign in again before sending or removing a season."); }
  window.gridlockCloudConfigure = function (url, anonKey, redirectTo) {
    ++generation;
    recoverySession = null;
    if (CFG && (CFG.url !== url || CFG.anonKey !== anonKey)) writeSession(null);
    CFG = { url: url, anonKey: anonKey, redirectTo: redirectTo, ...(CFG?.accountSecurity===true?{accountSecurity:true}:{}) };
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
      var p = new URLSearchParams(u.hash.slice(1));
      if (!p.has("access_token") && !p.has("error") && !p.has("error_code")) return null;
      return { url: u, params: p };
    } catch (e) { return null; }
  }
  function clearAuthFragment(u) {
    try {
      if (window.location && window.location.href === u.href && window.history)
        window.history.replaceState(null, "", u.pathname + u.search);
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
      if (typeof res.text === "function") {
        var text = await res.text();
        if (text) { try { body = JSON.parse(text); } catch (e) { body = undefined; } }
      } else { try { body = await res.json(); } catch (e) { body = undefined; } }
    } catch (e) { return { net: false }; }
    finally {if(timer!==null)clearTimeout(timer);}
    // Not the account server answering: a venue's Wi-Fi login page (200 with
    // HTML), the server down (5xx) or rate-limited. None of that is a refusal
    // of this coach, so it reads as no signal and the phone's own copy of the
    // sign-in still opens the app. Only the server's own JSON answer refuses.
    if (body === undefined || res.status >= 500 || res.status === 408 || res.status === 429) return { net: false };
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
        if(s.security_approved===securityIdentity(ns))ns.security_approved=s.security_approved;
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
  function beginAuth() {
    var old=readSession();if(old)previousDevice={user:old.user.id,session:jwtSession(old.access_token)};
    if(securityPrompt?.cancel)securityPrompt.cancel();
    ++generation; recoverySession = null; writeSession(null); return generation;
  }
  function queueSeason(work) {
    var pending = seasonTail.then(work);
    seasonTail = pending.catch(function () {});
    return pending;
  }
  var api = {
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
      if(!await ensureSecurity()) return said('Complete two-factor sign-in and approve this device to continue.');
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
      if(!await ensureSecurity()) return said('Complete two-factor sign-in and approve this device to continue.');
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
        if(!await ensureSecurity())return said('Password changed. Sign in and verify your authenticator to continue.');
        return { ok: true, user: s.user };
      } finally { updatingPassword = false; }
    },
    signOut() {
      var s = readSession();
      securityApproved=null;if(securityPrompt?.cancel)securityPrompt.cancel();
      ++generation; ++seasonVersion;
      recoverySession = null;
      writeSession(null);                       // invalidate before any asynchronous work
      if (s && s.access_token) call("/auth/v1/logout?scope=local", { method: "POST" }, s.access_token).catch(function () {});
      notifySecurity();
    },
    session() {
      var s = readSession();
      return s && s.user && securityReady() ? { user: s.user } : null;
    },
    securityRequired, securityReady, securityBridge,
    verifySecurity:()=>ensureSecurity(),
    manageDevices:()=>ensureSecurity(true),
    async adminSession(){
      var access=await accountToken(),s=readSession();
      return access && s && securityReady() ? {access_token:access,expires_at:s.expires_at,user:s.user} : null;
    },
    // Membership only. Never changes a Coach season, plan, or local preview.
    // No automatic calls, cached permissions, or offline membership grants.
    async teamAccess(action, input) {
      var actions = ["list","create","join","get","invites","invite","revoke","role","remove","leave","transfer"];
      if (!actions.includes(action) || (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))))
        return said("Choose a team action and try again.");
      var body;
      try { body = JSON.stringify({action:action,input:input || {}}); }
      catch (e) { return said("The team request could not be read."); }
      if (body.length > 8192) return said("The team request is too long.");
      readSession();
      var g = generation, t = await accountToken(), s = readSession();
      if (g !== generation) return said("Your sign-in changed. Open your team again.");
      if (!t || !s || recoverySession) return said("Sign in online to open your team.");
      var id = s.user.id;
      var r = await call("/rest/v1/rpc/gridlock_team_action", {method:"POST",body:body}, t);
      var current = readSession();
      if (g !== generation || !current || current.user.id !== id)
        return said("Your sign-in changed. Open your team again.");
      if (!r.net) return said("The team request was not confirmed. Reconnect and check your team before trying again.");
      if (!r.ok || !r.body || typeof r.body.ok !== "boolean") return said("Your team could not be checked. Try again with a signal.");
      if (!r.body.ok) {
        var messages = {
          sign_in_required:"Sign in with a confirmed account to open your team.",
          not_available:"Team accounts are not available for this account yet.",
          owner_required:"Ask the team owner to make that change.",
          invalid_request:"Check the team details and try again.",
          invalid_code:"That team code cannot be used. Ask the owner for a new one.",
          already_member:"You already belong to this team. Ask the owner to change your role.",
          try_later:"Too many code attempts. Wait a minute and try again.",
          limit_reached:"The team limit was reached. Contact support for help.",
          not_found:"That team or member is not available to this account.",
          changed:"The team changed. Open it again before making this change.",
          transfer_first:"Choose another team owner before leaving or removing the owner."
        };
        return {ok:false,code:r.body.code,said:Object.prototype.hasOwnProperty.call(messages,r.body.code) ? messages[r.body.code] : "The team request was refused."};
      }
      // Keep display text untrusted; the consuming UI must render it as text.
      // A result is bound to this account, never written to localStorage.
      return {ok:true,user:s.user,result:r.body};
    },
    // An account grant is read only with that account's verified bearer token.
    // RLS limits the row too; the explicit owner filter never requests peers.
    async getEntitlement() {
      readSession();
      var g = generation, t = await accountToken(), s = readSession();
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
      var g=generation, t=await accountToken(), s=readSession();
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
      if(securityRequired() && !(await securityRpc('status')).ok)return said('Verify two-factor sign-in and this device first. Nothing was deleted.');
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
      if(securityRequired()){
        var claimed=await call('/rest/v1/rpc/gridlock_security_action',{method:'POST',body:JSON.stringify({action:'claim',input:{label:'This device',replace:jwtSession(s.access_token)}})},access);
        if(g!==generation||readSession()!==s)return cancelled();
        if(!claimed.ok||claimed.body?.ok!==true)return said('The new sign-in could not be approved. Nothing was deleted.');
        var next=sessionFrom({...verified.body,user:s.user});next.security_approved=securityIdentity(next);
        if(!writeSession(next))return said('The sign-in could not be saved. Nothing was deleted.');
        s=next;
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
    async deviceSeason(payload) {
      var g = generation, r = await api.getSeason(), s = readSession();
      if (!r.ok) return r;
      if (g !== generation || !s || s.user.id !== r.user.id) return cancelled();
      var hash = null, kept = null, owner = null;
      try {
        hash = await seasonHash(payload);
        kept = JSON.parse(localStorage.getItem(deviceKey(r.user.id)) || "null");
        owner = localStorage.getItem(ownerKey());
      } catch(e) {}
      if (g !== generation || readSession() !== s) return cancelled();
      var known = !!(hash && owner === r.user.id && kept && revision(kept.revision) !== null && /^[a-f0-9]{64}$/.test(kept.hash));
      return {...r, known, unchanged:known && kept.hash === hash, base:known ? kept.revision : null};
    },
    async rememberSeason(payload, userId, value) {
      var g = generation, s = readSession();
      if (!s || s.user.id !== userId || revision(value) === null || seasonRevision(userId) !== value) return false;
      try {
        var hash = await seasonHash(payload);
        if (!hash || g !== generation || readSession() !== s || seasonRevision(userId) !== value) return false;
        var k = deviceKey(userId), text = JSON.stringify({hash, revision:value});
        localStorage.setItem(k, text);
        localStorage.setItem(ownerKey(), userId);
        return localStorage.getItem(k) === text && localStorage.getItem(ownerKey()) === userId;
      } catch(e) { return false; }
    },
    // No direct table writes: one server transaction compares the revision and
    // keeps a deletion marker. An unbound second device starts at revision zero.
    async pushSeason(label, payload) {
      if (deleting) return said("Wait for removal to finish before sending again.");
      var g = generation, v = seasonVersion;
      return queueSeason(async function () {
        if (g !== generation || v !== seasonVersion) return cancelled();
        var t = await accountToken(), s = readSession();
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
        return { ok: true, user:s.user, revision:r.body.revision };
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
          var t = await accountToken(), s = readSession();
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
  // Recheck on return/reconnect and while visible. An offline season remains
  // usable after this browser completed MFA; remote revocation applies online.
  if(securityRequired() && window.addEventListener && typeof document!=='undefined'){
    var securityPolling=false;
    var poll=async function(){
      if(securityPolling||securityWork||!readSession()||document.visibilityState==='hidden'||navigator.onLine===false)return;
      securityPolling=true;try{await securityRpc('status');}finally{securityPolling=false;}
    };
    window.addEventListener('focus',poll);window.addEventListener('online',poll);
    document.addEventListener('visibilitychange',poll);setInterval(poll,30000);
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { api: api, configure: window.gridlockCloudConfigure };
})();
