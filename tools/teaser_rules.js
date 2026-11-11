#!/usr/bin/env node
/* Hold the Team and Player previews to the coach app's house rules (CLAUDE.md).
 *
 *   node tools/teaser_rules.js            apply
 *   node tools/teaser_rules.js --check    say whether anything is left to apply
 *
 * The previews are an older July build. An audit against the coach app's rules
 * found what this fixes; each step names the rule. Every step looks for what it
 * changes first, so a second run does nothing, and a step whose text is not in
 * a file is skipped (the two previews share most, not all, of their code).
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const FILES = ["player", "team"].map(k => path.join(ROOT, `teasers/${k}/index.html`));

// [rule, find, replace] — plain text, every occurrence.
const STEPS = [
  // Nothing leaves the phone. The previews carried an SMS ticket poller and a
  // CRM webhook that a restored backup could switch on with no screen to see
  // or stop it. Polling never starts, the senders send nothing, and a restore
  // drops those settings.
  ["sends nothing", "try{ticBadge();ticPollStart();ticQueueStart();}catch(e){}", "try{ticBadge();}catch(e){}/* previews send nothing */"],
  ["sends nothing", "return fetch(c.webhook,", "return previewSendsNothing(c.webhook,"],
  ["sends nothing", "fetch(c.worker.replace(", "previewSendsNothing(c.worker.replace("],
  ["sends nothing", "throw new Error('not a GRIDLOCK backup');",
    "throw new Error('not a GRIDLOCK backup');['gridlock_ghl','gridlock_crm','gridlock_tickets'].forEach(k=>{delete data.keys[k];});"],
  ["sends nothing", "function LICF(f){", "function previewSendsNothing(){return Promise.reject(new Error('This preview sends nothing.'));}\nfunction LICF(f){"],
  // No price, licence or subscription is sold from a preview, and nothing a
  // pasted key unlocks prints a modelled win percentage.
  ["no prices", "const PRICES={refpro:'Ref Pro — $24/yr',crew:'Crew License — $199/season (15 refs)',scout:'Scout — $79/season/team',coach2:'Add a team — 20% off ($63/season)'};", "const PRICES={};"],
  ["no prices", "function LICF(f){if(typeof DEV_OPEN", "function LICF(f){if(EDITION==='player'||EDITION==='team')return false;if(typeof DEV_OPEN"],
  ["no prices", "<div class=\"iqcat\" style=\"color:#ff5a52\">LICENSED FEATURE</div>", "<div class=\"iqcat\" style=\"color:#ff5a52\">NOT IN THIS PREVIEW</div>"],
  ["no prices", "function upsell(title,body,tier){const buy=", "function upsell(title,body,tier){if(EDITION==='player'||EDITION==='team')return `<div class=\"iqrow\" style=\"border-color:#3a3f40;background:#161818\"><div class=\"iqcat\" style=\"color:#ff5a52\">NOT IN THIS PREVIEW</div><b>${title}</b><p>This is in the coach app. The preview does not have it yet.</p></div>`;const buy="],
  ["no prices", " Games &amp; replay and Historical layers are open too; the season license adds the opponent win% simulation and counter-picker.", " Games &amp; replay and Historical layers are open too."],
  ["no prices", "hdr('COACH OR TEAM SUBSCRIPTION')", "hdr('IN THE TEAM APP')"],
  ["no prices", "hdr('COACH SUBSCRIPTION')", "hdr('IN THE COACH APP')"],
  ["no prices", "`<div class=\"chip\">Free tier</div> `+buyBtnHTML('Get a license','11px')", "`<div class=\"chip\">Preview</div>`"],
  ["no prices", "Free tier holds 10 breaks. The season license removes the cap and keeps photo evidence attached all weekend.", "The preview holds 10 breaks."],
  ["no prices", "what+' unlocks when your coach buys a coach subscription or the team buys a team subscription.'",
    "what+' is in the Team app, which is on the way. It is not in this preview.'"],
  ["no prices", "'This is a coach tool. It isn\\u2019t available without a coach\\u2019s subscription. Your coach unlocks it for the team.'",
    "'This is a coach tool. It is in the coach app, not in this preview.'"],
  ["no prices", "/* player tabs that need a coach or team subscription */", "/* player tabs that are in the Team app, not this preview */"],
  // Nexus in a preview is backup and offline status: no ref-card signing, no
  // licence, no rule-bank audit (the bank is the league's rulebook as Q&A).
  ["no rulebook", "<div class=\"lbl\" style=\"margin-top:10px\">Rule bank audit</div><div id=\"nxAu\"></div>", ""],
  ["no prices", "<div class=\"lbl\" style=\"margin-top:10px\">License</div><div id=\"nxLic\"></div>", ""],
  ["no rulebook", "<div class=\"lbl\" style=\"margin-top:10px\">UPRA Ref Card \\u2014 signed readiness</div><div id=\"nxRC\"></div>", ""],
  ["no rulebook", "h+=`<div class=\"row\" style=\"margin-top:16px\"><button class=\"ld\" id=\"nxPrint\" style=\"font-weight:800\">\\ud83d\\udda8 Print / laminate call sheet</button></div>`;", ""],
  ["no rulebook", "rule content paraphrases the published divisional X‑Ball ruleset for training only. ", ""],
  // Label that control Shot lanes.
  ["Shot lanes", "id=\"gunsBtn\">Guns up: on</button>", "id=\"gunsBtn\">Shot lanes: on</button>"],
  ["Shot lanes", "id=\"gunsBtn2\">Guns up: on</button>", "id=\"gunsBtn2\">Shot lanes: on</button>"],
  ["Shot lanes", "b.textContent='Guns up: '+(on?'on':'off')", "b.textContent='Shot lanes: '+(on?'on':'off')"],
  ["Shot lanes", "</i>guns up</span>", "</i>shot lanes</span>"],
  ["Shot lanes", "</i>shooting lane (guns up)</span>", "</i>shot lane</span>"],
  // Say what happens. Nothing syncs between phones in a preview.
  ["truthful", "['You\\u2019re on the team','Your coach\\u2019s calls and messages come straight to you \\u2014 nothing leaves the app.']",
    "['A preview','The Player app is on the way. What you log here stays on this phone.']"],
  ["truthful", "['Team tools','Team, My Line and Messages live under More \\u2014 they unlock with a coach or team subscription.']",
    "['Team tools','Team, My Line and Messages are listed under More. They are not in this preview yet.']"],
  ["truthful", "Players log their own reps and messages \\u2192 you see all of it here. You call plays and share reads \\u2192 players see their piece. One team, one shared picture.",
    "When the Team app ships, players' logs and your calls will be shared between phones. In this preview, everything stays on this phone."],
  ["truthful", "Mark one \\u201con deck\\u201d and it pushes to every player \\u2014 grab pods and go.", "Mark one \\u201con deck\\u201d \\u2014 grab pods and go."],
  ["truthful", "'Everything sent between you and your players \\u2014 full log, kept inside GRIDLOCK.'", "'Messages you write here stay on this phone in this preview.'"],
  ["truthful", "['One team, one picture','Create your team, share the code, manage your roster \\u2014 everyone\\u2019s data in one place.'],['Players join','Each player enters the code once to activate their app.'],['Stay in touch','Team messages keep everyone on the same page.']]",
    "['A preview','The Team app is on the way. What you set up here stays on this phone.'],['Your team','Create your team, share its code and manage your roster.'],['Game day','Lineups, the schedule and tournament prep are here to try.']]"],
  ["truthful", "YOUR COACH CAN SEE YOUR PRACTICE TAB</div><div style=\"font-size:12px;color:#efedeb\">Send your progress so your coach sees your growth</div>",
    "SHARE YOUR PRACTICE</div><div style=\"font-size:12px;color:#efedeb\">Make a code and send it to your coach yourself</div>"],
  ["truthful", "Create your team. Players use the code to activate their app \\u2014 their data then filters up to you.",
    "Create your team and share its code with your players. In this preview, everything stays on this phone."],
  ["truthful", "Create your team. Players use the code to activate their app — their data then filters up to you.",
    "Create your team and share its code with your players. In this preview, everything stays on this phone."],
];

// Regex steps: [rule, pattern, replacement].
const REGEX = [
  // No links to paid courses from a preview.
  ["no prices", /,\n\s*page:\['[^'\n]*','https:\/\/www\.(?:bkipaintball|mlpbplus)\.com[^'\n]*'\]/g, ""],
];

function apply(src) {
  for (const [, rx, to] of REGEX) src = src.replace(rx, to);
  // A step whose result is already there has been applied (its result can
  // contain what it looks for, so looking alone would apply it twice).
  for (const [, from, to] of STEPS) if (from && src.includes(from) && !(to && src.includes(to))) src = src.split(from).join(to);
  return src;
}

const check = process.argv.includes("--check");
let stale = 0;
for (const f of FILES) {
  const rel = path.relative(ROOT, f), before = fs.readFileSync(f, "utf8"), after = apply(before);
  if (after !== before) stale++;
  if (!check && after !== before) fs.writeFileSync(f, after);
  console.log(`${rel}: ${after === before ? "up to date" : check ? "out of date — run node tools/teaser_rules.js" : "written"}`);
}
if (check && stale) process.exit(1);
module.exports = { STEPS, REGEX };
