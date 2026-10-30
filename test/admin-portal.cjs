"use strict";
// UI state/contract tests without a browser or live credentials. Override the
// directory containing admin/index.html when running against another checkout.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(process.env.GRIDLOCK_TEST_ROOT || path.join(__dirname, ".."));
const html = fs.readFileSync(path.join(root, "admin/index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);

const ADMIN = "11111111-1111-4111-8111-111111111111";
const caller = { id: ADMIN, email: "admin@example.test" };
const user = { ...caller, email_confirmed_at: "2026-10-01T00:00:00Z", entitlement: { plan: "program", expires_at: null } };
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const auth = () => response({ access_token: "fixture-access-token", refresh_token: "unused-fixture-refresh", expires_in: 3600 });
const overview = (users = [user], more = false) => response({ caller, users, page: 1, per_page: 50, has_more: more });
const season = (label = "cloud-only-fixture") => ({ owner: ADMIN, label, updated_at: "2026-10-29T12:00:00Z", payload: { format: "gridlock.coach.copy", data: { matches: [{ id: "m", layout: "__proto__" }], calls: [{ m: "m", script: "__proto__" }], results: [], pens: [] } } });
function deferred() { let resolve; return { promise: new Promise(r => { resolve = r; }), resolve: value => resolve(value) }; }
function harness(seed = []) {
  const fields = new Map(), storage = new Map(seed), requests = [], timers = new Map();
  let queue = [], timerId = 0, identityRequiresMfa = false;
  const element = id => {
    if (!fields.has(id)) fields.set(id, { value: "", innerHTML: "", textContent: "", disabled: false,
      addEventListener() {}, classList: { add() {}, remove() {} } });
    return fields.get(id);
  };
  const context = vm.createContext({
    window: { addEventListener() {} }, document: { getElementById: element, querySelectorAll: () => [], addEventListener() {}, hidden: false },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
    AbortController, URL, Date, JSON, Math, Set, Map, Object, Array, String, Number, console, confirm: () => true,
    fetch: async (url, options) => {
      requests.push({ url, options });
      if(url.includes('action=identity'))return response({caller,mfa_required:identityRequiresMfa});
      const next = queue.shift();
      if (!next) throw Error("Unexpected fixture request");
      return typeof next === "function" ? next(url, options) : next;
    },
  });
  const run = code => vm.runInContext(code, context);
  run(script);
  return { run, element, storage, requests, timers, requireMfa:()=>{identityRequiresMfa=true;}, enqueue: (...items) => queue.push(...items),
    async login(rows = [user]) { element("cloudEmail").value = caller.email; element("cloudPass").value = "fixture-password"; queue.push(auth(), overview(rows)); await run("signIn()"); },
    rendered: () => element("root").innerHTML,
  };
}
const checks = [];
const check = (name, fn) => checks.push([name, fn]);

check("fixed project config exposes no secret or editable destination", () => {
  const h = harness();
  assert.match(h.rendered(), /Gridlock administration/);
  assert.match(html, /href="\/"/);
  assert(!h.rendered().includes("cloudKey"));
  assert(!h.rendered().includes("Project URL"));
  assert(!/sb_secret_|service_role/.test(html));
  assert.match(h.run("CLOUD.url"), /^https:\/\/[a-z]+\.supabase\.co$/);
});
check("login verifies backend access and does not persist credentials", async () => {
  const h = harness(); await h.login();
  assert.equal(h.run("token"), "fixture-access-token");
  assert.equal(h.run("users.length"), 1);
  assert.equal(h.storage.size, 0);
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[1].options.headers.Authorization, "Bearer fixture-access-token");
  assert.match(h.requests[2].url, /action=overview&page=1&per_page=50$/);
  assert.equal(h.requests[0].options.cache, "no-store");
  assert.equal(h.requests[0].options.credentials, "omit");
});
check("user-controlled account content is escaped", async () => {
  const h = harness(); await h.login([{ ...user, email: '<img src=x onerror="alert(1)">' }]);
  assert(!h.rendered().includes("<img src=x"));
  assert(h.rendered().includes("&lt;img"));
});
check("cloud seasons stay in memory while manual imports persist", async () => {
  const h = harness(); await h.login();
  h.enqueue(response({ caller, seasons: [season()], has_more: false })); await h.run("loadSeasons()");
  assert.equal(h.run("cloudSeasons.length"), 1);
  assert.equal(h.storage.size, 0);
  h.run('addSeason(JSON.stringify({matches:[{id:"manual"}]}),"manual-file")');
  assert.equal(h.run("allSeasons().length"), 2);
  const stored = [...h.storage.values()].join("");
  assert(stored.includes("manual-file"));
  assert(!stored.includes("cloud-only-fixture"));
  assert(!stored.includes("fixture-access-token"));
  assert(!stored.includes("fixture-password"));
  assert(!stored.includes("unused-fixture-refresh"));
});
check("plan writes match the backend contract", async () => {
  const h = harness(); await h.login();
  h.element("plan-0").value = "team"; h.element("expiry-0").value = "";
  h.enqueue(response({ ok: true, entitlement: { user_id: ADMIN, plan: "team", expires_at: null } }));
  await h.run("savePlan(0)");
  assert.deepEqual(JSON.parse(h.requests.at(-1).options.body), { action: "set_entitlement", user_id: ADMIN, plan: "team", expires_at: null });
  assert.equal(h.run("users[0].entitlement.plan"), "team");
});
check("invalid or past expiry is rejected before mutation", async () => {
  const h = harness(); await h.login(); const before = h.requests.length;
  h.element("plan-0").value = "program"; h.element("expiry-0").value = "2000-01-01T00:00";
  await h.run("savePlan(0)");
  assert.equal(h.requests.length, before);
  assert.match(h.rendered(), /Choose a future expiry/);
});
check("user pagination requests the selected page", async () => {
  const h = harness(); await h.login();
  h.enqueue(overview([], false)); await h.run("loadUsers(2)");
  assert.match(h.requests.at(-1).url, /page=2&per_page=50$/);
  assert.equal(h.run("userPage"), 2); assert.equal(h.run("userMore"), false);
  assert.match(h.rendered(), /No users on this page/);
});
check("season pagination deduplicates owners and refresh replaces only cloud rows", async () => {
  const h = harness(); await h.login();
  h.run('addSeason(JSON.stringify({matches:[{id:"manual"}]}),"manual-file")');
  h.enqueue(response({ caller, seasons: [season("first")], has_more: true })); await h.run("loadSeasons()");
  h.enqueue(response({ caller, seasons: [season("updated")], has_more: false })); await h.run("loadSeasons(true)");
  assert.equal(h.run("cloudSeasons.length"), 1); assert.equal(h.run("cloudSeasons[0].label"), "updated");
  assert.match(h.requests.at(-1).url, /page=2&per_page=5$/);
  h.enqueue(response({ caller, seasons: [], has_more: false })); await h.run("loadSeasons(false)");
  assert.equal(h.run("cloudSeasons.length"), 0); assert.equal(h.run("seasons.length"), 1);
});
check("logout drops private records and ignores late user responses", async () => {
  const h = harness(); await h.login();
  h.run('addSeason(JSON.stringify({matches:[{id:"manual"}]}),"manual-file")');
  const later = deferred(); h.enqueue(() => later.promise); const loading = h.run("loadUsers(2)");
  h.run("clearCloud()"); later.resolve(overview()); await loading;
  assert.equal(h.run("users.length"), 0); assert.equal(h.run("cloudSeasons.length"), 0); assert.equal(h.run("token"), "");
  assert.equal(h.run("seasons.length"), 1); assert.match(h.rendered(), /Signed out/);
});
check("non-admin response clears a fresh session", async () => {
  const h = harness(); h.element("cloudEmail").value = caller.email; h.element("cloudPass").value = "fixture-password";
  h.enqueue(auth(), response({ error: "forbidden" }, 403)); await h.run("signIn()");
  assert.equal(h.run("token"), ""); assert.equal(h.run("users.length"), 0);
  assert.match(h.rendered(), /does not have admin access/);
});
check("timeout covers a stalled response body and releases the busy state", async () => {
  const h = harness(); await h.login();
  const bodyStarted = deferred();
  h.enqueue((url, options) => ({ ok: true, status: 200, json: () => {
    bodyStarted.resolve();
    return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => {
      const error = new Error("Fixture body aborted"); error.name = "AbortError"; reject(error);
    }, { once: true }));
  } }));
  const loading = h.run("loadUsers(2)");
  await bodyStarted.promise;
  const timer = [...h.timers.values()].find(item => item.ms === 20000);
  assert(timer, "Request timeout must remain active while JSON is downloading");
  timer.fn(); await loading;
  assert.equal(h.run("busy"), false);
  assert.equal(h.run("pending.size"), 0);
  assert.equal(h.run("userPage"), 1);
  assert.match(h.rendered(), /request timed out/);
});
check("expired session clears credentials and data before another API request", async () => {
  const h = harness(); await h.login(); const before = h.requests.length;
  h.run("expiresAt=Date.now()-1;sessionExpired()");
  assert.equal(h.run("token"), ""); assert.equal(h.run("users.length"), 0);
  assert.equal(h.requests.length, before); assert.match(h.rendered(), /session expired/);
});
check("malformed imports fail safely, nested values cannot crash rendering", () => {
  const h = harness();
  assert(h.run('parseSeason(JSON.stringify({matches:"bad"}),"bad").error'));
  h.run('addSeason(JSON.stringify({format:"gridlock.coach.copy",at:{toString:null},data:{matches:[null,3,{id:{toString:null},layout:{toString:null},vs:{toString:null}}],calls:[{script:"__proto__",layout:{toString:null}},{script:"constructor"}],breakCalls:{constructor:{toString:null}},results:[{m:{toString:null},won:{toString:null}}],pens:[{layout:{toString:null}}]}}),{toString:null})');
  assert.equal(h.run("seasons.length"), 1); assert.equal(h.run("seasons[0].data.matches.length"), 1);
  assert.equal(h.run("seasons[0].data.matches[0].layout"), ""); assert.match(h.rendered(), /Loaded seasons/);
  assert.equal(h.run("dateText({toString:null})"), "—");
});
check("prototype property names are counted without prototype mutation", () => {
  const h = harness();
  h.run('addSeason(JSON.stringify({matches:[{id:"m",layout:"__proto__",vs:"constructor"}],calls:[{m:"m",script:"__proto__"}],results:[{m:"m",won:"us"}]}),"safe")');
  assert.equal(h.run("summarize(allSeasons()).calls['__proto__']"), 1);
  assert.equal(h.run("summarize(allSeasons()).byTeam.constructor.wins"), 1);
});
check("manual timestamps survive persistence and reload", () => {
  const h = harness();
  h.run('addSeason(JSON.stringify({format:COPY_FORMAT,at:1234,data:{matches:[]}}),"epoch")');
  const reloaded = harness([...h.storage]);
  assert.equal(reloaded.run("seasons[0].at"), 1234);
  assert.equal(reloaded.run("seasons[0].label"), "epoch");
});

check("revised manual import replaces older results after confirmation",async()=>{
  const h=harness();
  h.run('addSeason(JSON.stringify({matches:[{id:"m"}],results:[{m:"m",pt:1,won:"us"}]}),"Coach.json")');
  h.run('addSeason(JSON.stringify({matches:[{id:"m"}],results:[{m:"m",pt:1,won:"us"},{m:"m",pt:2,won:"them"}]}),"Coach.json")');
  assert.equal(h.run('seasons.length'),1);assert.equal(h.run('summarize(allSeasons()).played'),2);
});
check("identical manual and cloud season are not double counted",async()=>{
  const h=harness();await h.login();const row=season();
  h.run('addSeason('+JSON.stringify(JSON.stringify(row.payload))+',"manual")');
  h.enqueue(response({caller,seasons:[row],has_more:false}));await h.run('loadSeasons()');
  assert.equal(h.run('allSeasons().length'),1);
});
async function startMfa(h,factors){
  h.requireMfa();h.element('cloudEmail').value=caller.email;h.element('cloudPass').value='fixture-password';
  h.enqueue(auth(),response({id:ADMIN,factors}));await h.run('signIn()');
}
check("password-only sign-in waits for MFA before loading users",async()=>{
  const h=harness();await startMfa(h,[{id:'factor',factor_type:'totp',status:'verified'}]);
  assert.equal(h.run('users.length'),0);assert.equal(h.run('mfaPending.factorId'),'factor');
  assert(!h.rendered().includes('id="usersTab"'));assert(!h.rendered().includes('id="cloudSeasons"'));
  assert(!h.requests.some(r=>r.url.includes('action=overview')));assert.equal(h.storage.size,0);
});
check("valid authenticator exchanges token before loading users",async()=>{
  const h=harness();await startMfa(h,[{id:'factor',factor_type:'totp',status:'verified'}]);
  h.element('mfaCode').value='123456';h.enqueue(response({id:'challenge'}),response({access_token:'mfa-fixture',expires_in:3600}),overview());
  await h.run('verifyMfa()');assert.equal(h.run('token'),'mfa-fixture');assert.equal(h.run('users.length'),1);assert.equal(h.run('mfaPending'),null);assert.equal(h.storage.size,0);
  assert.equal(h.requests.at(-1).options.headers.Authorization,'Bearer mfa-fixture');
});
check("refused authenticator cannot load users",async()=>{
  const h=harness();await startMfa(h,[{id:'factor',factor_type:'totp',status:'verified'}]);
  h.element('mfaCode').value='123456';h.enqueue(response({id:'challenge'}),response({},400));await h.run('verifyMfa()');
  assert.equal(h.run('users.length'),0);assert(h.run('mfaPending'));assert(!h.requests.some(r=>r.url.includes('action=overview')));
});
check("authenticator enrollment secrets are in memory only and cleared on logout",async()=>{
  const h=harness();await startMfa(h,[]);
  h.enqueue(response({id:'factor',totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg"></svg>',secret:'FIXTURE-TOTP-SECRET'}}));await h.run('enrollMfa()');
  assert(h.rendered().includes('data:image/svg+xml'));assert.equal(h.storage.size,0);h.run('clearCloud()');
  assert.equal(h.run('mfaPending'),null);assert(!h.rendered().includes('FIXTURE-TOTP-SECRET'));
});
check("late authenticator challenge cannot restore a signed-out admin",async()=>{
  const h=harness();await startMfa(h,[{id:'factor',factor_type:'totp',status:'verified'}]);const gate=deferred();
  h.element('mfaCode').value='123456';h.enqueue(()=>gate.promise);const pending=h.run('verifyMfa()');await Promise.resolve();h.run('clearCloud()');
  gate.resolve(response({id:'challenge'}));await pending;assert.equal(h.run('token'),'');assert.equal(h.run('users.length'),0);
});

(async () => {
  for (const [name, fn] of checks) { await fn(); console.log("PASS " + name); }
  console.log(`${checks.length} admin portal checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
