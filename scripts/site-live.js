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
    "no-bars": `<p>Gridlock does not need them. It works with no signal once you are signed in, and your season stays on your phone, where nobody else reads your scouting unless you turn on League sync. Keep a copy and carry it to the next phone.</p>`,
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
    "account": `<h2>Your account</h2><p>You sign in with a Gridlock account. Our account server, hosted by Supabase, keeps your email address, a hash of your password (never the password itself), an account id, whether your email is confirmed, when you last signed in, and your plan (Free, Team or Program) and when it ends. It uses them to sign you in, confirm your email, send password-reset links and give you the plan you have. Gridlock's administrators can see the list of accounts with those details and can change a plan; they cannot see your password.</p>`,
    "stores": `<p>Information you enter is saved locally: your roster, scouting observations and voice-log transcripts, matches and point sheets, field notes, lineups, player grades, messages, class details and participant responses, league groups and notices, and app settings. The app also keeps your email and a salted hash of your password on the device, so you can sign in with no signal. None of these records are sent to the account server unless you turn on League sync.</p>`,
    "sync": `<h2>League sync (optional)</h2><p>League sync is off until you switch it on in the app, under Nexus &rsaquo; League sync. When you turn it on, the app uploads your full season &mdash; the same as Save a copy: roster, tallies and results, your scouting on other teams, your names for bunkers and calls, your own plays, and class sign-ins and contacts you entered &mdash; and keeps one current copy with your account on our account server, labelled with your team name or email. Your account password is never included. Gridlock's administrators can review uploaded seasons, and other teams' data you have scouted goes up with it. You can pause the sync, review or restore the copy, or delete what you sent, from the same screen. With League sync off, nothing about your season leaves the device except by Save a copy.</p>`,
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
