"use strict";
/* What the site says once it sends coaches to the live app.
 *
 * The committed pages in site/ describe the offline build: no server, an
 * account that is a lock on the phone, nothing that can be looked up or reset.
 * That is still true of the offline copy (site/app.html, the Claude preview
 * package, and the Grind X and Lockdown builds, which have no account server),
 * so the committed text stays as it is.
 *
 * The published Gridlock site sends "Open the app" to the live app named in
 * contact.json ("app"), which signs in against the account server. Saying
 * "there is no server" beside that button would be false, so `npm run build`
 * swaps each marked passage for the text below when a live app is configured:
 *
 *     <!-- live:name -->offline text<!-- /live -->
 *
 * Every claim here is what the live build actually does — docs/SERVER.md (what
 * goes up and what stays), docs/ADMIN-PORTAL.md (what administrators see),
 * native/gridlock-cloud.js (the calls the adapter makes) and the app's own
 * Nexus copy. Change one of those and change this in the same commit.
 */
const LIVE = {
  "index.html": {
    "no-bars": `<p>The coaching tools work without signal after the app has loaded. Your working season is saved on this device. If you turn on League sync, a full-season copy is kept with your account on our account server, where Gridlock PB LLC's administrators can review it. Keep a file before each event for a backup you control.</p>`,
    "keep": `<p>No signal needed on the field. Your Gridlock account signs in through our account server, but rosters, field walks, lineups, grades and clinic sign-ins live on this device. Messages and league notices are local records; share a copy through your own apps when you need to reach the squad.</p><p>Use <strong>More → Nexus → Save a copy</strong> before a tournament or a device change. Your account follows you to a new phone; your season does not, unless you load a copy or turn on League sync, which keeps one current copy with your account.</p>`,
  },
  "support.html": {
    "account": `<details><summary>Do I need an account?</summary><p>Yes, a Gridlock account: your email and a password, made in the app. Our account server checks the password, confirms your email and can send you a reset link, so the same account signs in on any phone and at the web app. After you have signed in once on a device, it opens there with no signal. Your season is not kept inside the account: it stays on the device where you logged it, so a new phone starts empty until you load a copy or restore your League sync copy. Signing a clinic sheet from a class link needs no account.</p></details>`,
    "empty": `<details><summary>Why is the app empty on another phone?</summary><p>Your account follows you; your season does not. Use Save a copy on the original device and Load a copy on the new one. If you turned on League sync, sign in and use More → Nexus → Review or restore cloud season instead. A different browser, or the app at a different web address, has its own separate storage: if you used the app at gridlockpb.com/app before, open it there, Save a copy, and load it in the app you use now.</p></details>`,
    "recovery": `In a browser, restore your own saved copy. If you had League sync on, sign in and review the cloud copy in Nexus before restoring it. Otherwise there is no copy of your season anywhere but the files you saved.`,
    "signal": `<details><summary>Can I use Gridlock without signal?</summary><p>Yes, once you are signed in on that device. The coaching tools calculate and save locally. You need a signal to create an account, sign in on a new device, reset a password or use League sync. A browser needs to load the app first; offline availability depends on the browser keeping the installed or cached copy. Export a backup before relying on the device at an event.</p></details>`,
    "delete": `<details><summary>Can I delete my account?</summary><p>Yes. In the app, More → Nexus → Delete account asks for your password and permanently deletes your Gridlock login and your League sync copy. The season on your devices and any files you saved or shared stay where they are, so delete those too if you want them gone.</p></details>`,
  },
  "privacy.html": {
    "og": `<meta property="og:description" content="What stays on your device, what your Gridlock account keeps on our account server, and what leaves only when you say so.">`,
    "date": `<p class="eyebrow">Privacy notice · November 3, 2026</p>`,
    "lead": `<p class="lead">This notice describes Gridlock Coach as served by the web app these pages open, and the installed apps built from it. It has no analytics, advertising SDK or tracking service. Your account is kept on our account server; your season is not, unless you turn on League sync.</p>`,
    "account": `<h2>Your account</h2><p>You sign in with a Gridlock account. Our account server, hosted by Supabase, keeps your email address, a hash of your password (never the password itself), an account id, whether your email is confirmed, when you last signed in, and your plan (Free, Team or Program) and when it ends. It uses them to sign you in, confirm your email, send password-reset links and give you the plan you have. <span data-company>Gridlock PB LLC</span>'s administrators can see the list of accounts with those details and can change a plan; they cannot see your password.</p>`,
    "stores": `<p>Information you enter is saved locally: your roster, scouting observations and voice-log transcripts, matches and point sheets, field notes, lineups, player grades, messages, class details and participant responses, league groups and notices, and app settings. The app also keeps your email and a salted hash of your password on the device, so you can sign in with no signal. None of these records are sent to the account server unless you turn on League sync.</p>`,
    "sync": `<h2>League sync (optional)</h2><p>League sync is off until you switch it on. The app asks once, right after you first sign in, and nothing is sent unless you say yes; you can turn it on or off any time under Nexus &rsaquo; League sync. When you turn it on, the app uploads your full season &mdash; the same as Save a copy: roster, tallies and results, your scouting on other teams, your names for bunkers and calls, your own plays, and class sign-ins and contacts you entered &mdash; and keeps one current copy with your account on our account server, labelled with your team name or email. Your account password is never included. <span data-company>Gridlock PB LLC</span>'s administrators can review uploaded seasons, and other teams' data you have scouted goes up with it. You can pause the sync, review or restore the copy, or delete what you sent, from the same screen. Pausing stops new sends; it does not delete a copy already sent.</p>`,
    "requests": `<p>The coaching calculations do not require a remote service. Opening the website or web app still asks its host to deliver files; the host may receive ordinary connection information such as an IP address and request logs. Signing in, creating an account, confirming your email, resetting a password, checking your plan and League sync contact the account server, which receives the same kind of connection information. The supplied pages do not include analytics or third-party fonts. If you follow an external store or support link, its provider handles that visit under its own policy.</p>`,
    "clinic": `The person holding that device controls its records. Gridlock has no copy to inspect or edit on their behalf unless the coach turned on League sync, which uploads them with the season.`,
    "delete": `Clearing one device does not remove copies you previously shared. To delete your account, use More &rsaquo; Nexus &rsaquo; Delete account in the app: it permanently deletes your Gridlock login and your League sync copy. Delete under League sync removes only the uploaded season and keeps the account.`,
  },
};

const MARK = /<!-- live:([a-z0-9-]+) -->([\s\S]*?)<!-- \/live -->/g;

// The marker names on a page, in order.
function marks(text) { return [...text.matchAll(MARK)].map(m => m[1]); }

// Swap every marked passage on `page` for its live text. Throws, naming the
// page and passage, when a passage has no live text or a live text has no
// passage: a copy edit that drops a marker must fail the build, not ship the
// offline claim beside the live app's button.
function stampLive(text, page) {
  const copy = LIVE[page];
  if (!copy) return text;
  const seen = marks(text);
  for (const name of Object.keys(copy)) {
    const n = seen.filter(s => s === name).length;
    if (n !== 1) throw new Error(`${page}: the live-app passage "${name}" must be marked exactly once (found ${n}).`);
  }
  for (const name of seen) if (!copy[name]) throw new Error(`${page}: the marked passage "${name}" has no live-app text in scripts/site-live.js.`);
  return text.replace(MARK, (_, name) => `<!-- live:${name} -->${copy[name]}<!-- /live -->`);
}

// What the published pages must never say beside a live app's button.
const OFFLINE_ONLY = [
  /no server/i, /no cloud service/i, /does not sync through a server/i, /no remote recovery/i,
  /cloud database/i, /not a cloud login/i, /lock on the device/i, /league, not Gridlock/i,
  /endpoint your league operates/i, /not send those records to a Gridlock server/i,
  /build supplied with these pages/i,
];

module.exports = { LIVE, MARK, marks, stampLive, OFFLINE_ONLY };

"use strict";
// Confirmed wording for the LIVE website only. Offline site/ and preview keep
// their own copy. This creates a reviewable export; it does not publish it.
const fs = require("node:fs"), path = require("node:path");
const { pageUrls } = require("./cloud-build");
const ROOT = path.resolve(__dirname, "..");
const ACCOUNT = "The account server is hosted by Supabase. It keeps your email, a password hash, an account id, email confirmation, last sign-in, and your plan (Free, Team or Program) with its end date.";
const SYNC = "League sync is off until you turn it on. The app asks once after you first sign in; nothing is sent unless you say yes. When on, it uploads your full season and keeps one current copy with your account on that account server. Gridlock PB LLC's administrators can review uploaded seasons. In Nexus you can pause sending, review or restore the copy, or delete what you sent. Pausing does not delete a copy already sent. Nexus → Delete account deletes your login and the League sync copy. Files you have shared and local copies on other devices stay there.";
const OFFLINE = "The coaching tools work without signal after the app has loaded. Your working season is saved on this device. If you turn on League sync, a full-season copy is kept with your account on our account server, where Gridlock PB LLC's administrators can review it. Keep a file before each event for a backup you control.";
// Prepared paid-launch copy. It is exported for preview/review; merging does
// not publish it or enable checkout. See docs/WEB-PAYMENTS.md's launch gate.
const WEB_PAYMENTS = {
  title: "Gridlock Coach — $19.97 USD per account",
  offer: "All Coach tools until midnight Eastern (America/New_York) on the purchase date.",
  renewal: "One-time payment. No automatic renewal.",
  existing: "Existing admin and beta access stays the same.",
  purchase: "Create an account, confirm your email and sign in to the app. Buy the pass for that account through Stripe checkout.",
  expiry: "The pass ends at midnight Eastern, not 24 hours later. Your saved season, backups and exports stay available after it ends.",
  offline: "Check your active pass online before the event. It then works without a signal until its recorded expiry; a new phone needs an online check.",
  refund: "We refund duplicate charges and purchases where access could not be provided. For other requests, email support@gridlockpb.com.",
  help: "Charged but still waiting for access? Choose Check access in the app. Contact support with your account email and receipt reference before paying again. Never send a password or card number.",
  privacy: "Stripe processes payments. We send your account email, internal account and order IDs, and purchase details to Stripe. Gridlock keeps account-linked order, payment, expiry, refund and dispute records to provide access and handle support. We do not store card numbers or security codes.",
  deletion: "Deleting your Gridlock account removes your login and League sync copy and unlinks our payment ledger from that account. It does not delete payment records Stripe keeps."
};
function grokCopy() {
  return "// Generated by scripts/site-live.js --grok-copy; keep live app and site wording aligned.\nexport const CLOUD_COPY = " + JSON.stringify({account:ACCOUNT,sync:SYNC,offline:OFFLINE,payments:WEB_PAYMENTS},null,2) + " as const;\n";
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function buildSite() {
  const contact = JSON.parse(fs.readFileSync(path.join(ROOT, "site/contact.json"), "utf8"));
  const pages = pageUrls(contact.domain);
  const app = new URL(contact.cloud?.redirectTo);
  if (app.protocol !== "https:" || app.username || app.password || app.search || app.hash || app.pathname !== "/") throw new Error("Live app must be an HTTPS origin without credentials.");
  const out = path.join(ROOT, "dist/site-live");
  if(fs.existsSync(out) && fs.lstatSync(out).isSymbolicLink()) throw new Error("Live site output must not be a symbolic link.");
  const templates = Object.fromEntries(["index", "privacy", "support"].map(name => [name, stampLive(fs.readFileSync(path.join(ROOT, `site/${name}.html`), "utf8"), name + ".html")]));
  const account = `<h2>Your account</h2><p>${esc(ACCOUNT)}</p>`;
  const sync = `<h2>League sync: your choice</h2><p>${esc(SYNC)}</p>`;
  const help = `<h2>Sign in or reset a password</h2><ol><li>Open <a href="${esc(app.href)}">the Gridlock app</a> and choose Sign in.</li><li>Use the email on your invited account. For a forgotten password, choose Forgot password and open the newest reset email.</li><li>Enter your new password in the app, then sign in. Do not send passwords or authenticator codes to support.</li></ol><p>For help, email <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a> with your device, screen and what happened. Administrators cannot read your password.</p>`;
  templates.index = templates.index.replace(/There is no server and no signal needed\.[\s\S]*?There is no cloud service to sync or recover your season for you\./, "The coaching tools work without signal after the app has loaded. Your working season is saved on this device. League sync is optional: it uploads a full-season copy kept with your account on our account server, where Gridlock PB LLC's administrators can review it.</p><p>Use <strong>More → Nexus → Save a copy</strong> before an event to keep a backup you control. Review or restore the current server copy in Nexus if you turned League sync on.");
  templates.privacy = templates.privacy.replace(/<main\b[\s\S]*?<\/main>/, `<main id="main" class="document wrap"><p class="eyebrow">Privacy notice</p><h1>Your season.<br>Your choice to sync.</h1><p class="lead">Your working season is saved on your device. Account sign-in uses our account server. Optional League sync sends a full-season copy there.</p>${account}${sync}<h2>What is in a season</h2><p>Rosters, tallies and results, scouting on other teams, field notes, your words for bunkers and calls, your plays and other records saved in the season go with the full copy. Your account password is not part of that upload.</p><h2>Local storage and shared files</h2><p>Clearing browser data, resetting a device or removing the app can remove local work. Save a copy keeps a file you control. People you send it to can read it. Deleting your account does not delete those files.</p><h2>Voice and website requests</h2><p>Optional voice recognition uses your browser or device provider, which may send audio to its servers under its own policies. The app saves the resulting text with the season. Opening the app or website sends ordinary connection details to its host.</p><h2>Other people's information</h2><p>Enter only names and contact details you have a reason and permission to keep. They are included when you upload or share a full season.</p><h2>Contact</h2><p>Questions or requests: <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>. See <a href="/support">Support</a> for sign-in and recovery steps.</p></main>`);
  templates.support = templates.support.replace(/<p class="lead">[^<]*<\/p>/, '<p class="lead">Save a file before every event. If you turned on League sync, you can also review or restore the current server copy in Nexus.</p>')
    .replace(/<h2>Common questions<\/h2>[\s\S]*?<h2>Contact<\/h2>/, help + account + sync + '<h2>Contact</h2>');
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(path.join(ROOT, "site/img"), path.join(out, "img"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "site/styles.css"), path.join(out, "styles.css"));
  for(const [name, template] of Object.entries(templates)) {
    const html = template.replaceAll('href="app.html"', `href="${esc(app.href)}"`).replaceAll('href="index.html"','href="/"')
      .replaceAll('href="support.html', 'href="/support').replaceAll('href="privacy.html"','href="/privacy"')
      .replace(/content="Your season stays on your device\.[^"]*"/g, 'content="Your working season is saved on your device. Optional League sync uploads a copy to your account server for administrator review."')
      .replace(/https:\/\/[^"<>\s]+\/(privacy|support)\.html/g, (_, page) => pages[page + "Url"]);
    fs.writeFileSync(path.join(out, name + ".html"), html);
    if(name !== "index") {
      fs.mkdirSync(path.join(out, name), { recursive: true });
      fs.writeFileSync(path.join(out, name, "index.html"), html.replaceAll('href="styles.css"','href="/styles.css"').replaceAll('src="img/','src="/img/').replaceAll('href="img/','href="/img/'));
    }
  }
  return out;
}
Object.assign(module.exports, { buildSite, ACCOUNT, SYNC, WEB_PAYMENTS, grokCopy });
if(require.main === module) { try {
  if(process.argv.includes("--grok-copy")) {
    const file=path.join(ROOT,"marketing/grok/src/cloud-copy.ts");
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,grokCopy());console.log("Updated marketing/grok/src/cloud-copy.ts");
  }else console.log(`Live website review export: ${buildSite()}`);
} catch(e) { console.error(e.message); process.exitCode=1; } }
