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
    "When the Team app ships, your players\\u2019 logs and your calls will be shared between phones. In this preview, everything stays on this phone."],
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

  // ---- screens and wording (second audit) ----
  // Never open the tutorial on launch.
  ["no auto tour", "(function(){const K='gridlock_seen_'+EDITION;try{", "(function(){const K='gridlock_seen_'+EDITION;if(EDITION==='player'||EDITION==='team')return;/* never opens by itself */try{"],
  // The ribbon scrolls away; the header is what sticks.
  ["ribbon", "id=\"teaserRibbon\" role=\"note\" style=\"position:sticky;top:0;z-index:9999;", "id=\"teaserRibbon\" role=\"note\" style=\"position:relative;z-index:9999;"],
  // No build stamps, version lines or theme switches the coach app does not have.
  ["no jargon", "<span id=\"buildStamp\" style=\"", "<span id=\"buildStamp\" hidden style=\""],
  ["no jargon", "vd.id='nxVer';", "vd.id='nxVer';vd.hidden=(EDITION==='player'||EDITION==='team');"],
  ["no jargon", "<div class=\"lbl\" style=\"margin-top:10px\">Season archive</div><div id=\"nxArc\"></div>", ""],
  // A note is kept, not sent: there is nothing to send it with.
  ["no send", "id=\"msgGo\">Send</button>", "id=\"msgGo\">Keep</button>"],
  ["no send", "'message your players\\u2026':'message your coach\\u2026'", "'a note for your players\\u2026':'a note for your coach\\u2026'"],
  ["no prices", "<div style=\"font-size:10.5px;color:#6f9cff;margin-top:4px\">Teams on your license: ${teamsAll().length}/${teamLimit()>=99?'\\u221e':teamLimit()}${teamsAll().length>=teamLimit()&&teamLimit()<99?' \\u2014 add another 20% off':''}</div></div>`", "</div>`"],
  // Lanes are white; the left wire is #e5342f; the rings say win green, cost amber.
  ["lanes white", "poly.setAttribute('fill','#ffd34d');", "poly.setAttribute('fill','#ffffff');"],
  ["lanes white", "ln.setAttribute('stroke','#ffd34d');", "ln.setAttribute('stroke','#ffffff');"],
  ["lanes white", "<i class=\"sw\" style=\"background:#ffd34d;border-color:#ffae00\"></i>shot lane", "<i class=\"sw\" style=\"background:#ffffff;border-color:#000000\"></i>shot lane"],
  ["rings", "net>0?'#2ec76b':net<0?'#e0503a'", "net>0?'#3ecf8e':net<0?'#e0a33a'"],
  ["rings", "Green bunkers win points, red lose them.", "A green ring: that bunker wins points. An amber ring: it costs them."],
  // Only the snake beam and the cake have two sources putting them under a standing man's eyes.
  ["heights", "cakes, snake beams, and pins are LOW", "cakes and snake beams are LOW"],
  // Lineups is not in the Player preview, so do not send him there.
  ["no dead ends", "No points logged in this game yet. Set it live and log points in Lineups (Won/Lost).", "No points logged in this game yet.", ["player"]],
  ["no dead ends", "No games yet. Name the two teams, Start a game, then log points in Lineups \\u2014 they show up here to replay.", "No games yet.", ["player"]],
  // In-app questions and messages, never the browser's; never refuse in silence.
  ["no dialogs", "b.onclick=()=>{if(!confirm('Delete this event?'))return;tsSave(tsAll().filter(x=>x.id!==b.dataset.tsdel));if(tsEdit===b.dataset.tsdel)tsEdit=null;renderTsched();}",
    "b.onclick=()=>gChoose('Delete this event?','It comes off the schedule on this phone.',[{label:'Delete',primary:true,run:()=>{tsSave(tsAll().filter(x=>x.id!==b.dataset.tsdel));if(tsEdit===b.dataset.tsdel)tsEdit=null;renderTsched();}},{label:'Cancel',run:()=>{}}])"],
  ["no dialogs", "prompt('Copy this code:',c)", "gAlert('Your code is '+c)"],
  ["say why", "if(t&&navigator.clipboard)navigator.clipboard.writeText(t.code).then(()=>{cp.textContent='Copied!';setTimeout(()=>{cp.textContent='Copy code';},1200);});",
    "if(!t)return;const show=()=>gAlert('Your team code is '+t.code+'. Copy it from here.');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t.code).then(()=>{cp.textContent='Copied!';setTimeout(()=>{cp.textContent='Copy code';},1200);}).catch(show);else show();"],
  ["say why", "const nm=document.getElementById('tmName').value.trim()||'Team';", "const nm=document.getElementById('tmName').value.trim();if(!nm){gAlert('Type your team\\u2019s name first.');return;}"],
  ["say why", "const v=(inp.value||'').trim();if(!v)return;msgSend(", "const v=(inp.value||'').trim();if(!v){gAlert('Type the note first.');return;}msgSend("],
  ["say why", "const v=sanitizeText(inp.value.trim()).slice(0,40);if(!v)return;const t=teamGet();const oldK", "const v=sanitizeText(inp.value.trim()).slice(0,40);if(!v){gAlert('Type your name first.');return;}const t=teamGet();const oldK"],
  ["say why", "const v=sanitizeText(document.getElementById('tmPlayer').value.trim()).slice(0,40);if(!v)return;", "const v=sanitizeText(document.getElementById('tmPlayer').value.trim()).slice(0,40);if(!v){gAlert('Type the player\\u2019s name first.');return;}"],
  ["say why", "const v=document.getElementById('lnNew').value.trim();if(!v)return;", "const v=document.getElementById('lnNew').value.trim();if(!v){gAlert('Name the line first.');return;}"],
  ["say why", "const v=sanitizeText(document.getElementById('lnNewP').value.trim()).slice(0,40);if(!v)return;", "const v=sanitizeText(document.getElementById('lnNewP').value.trim()).slice(0,40);if(!v){gAlert('Type the player\\u2019s name first.');return;}"],
  // Phone fit, finger-sized targets and names for every control.
  ["fit", "</head>", `<style id="previewFit">/* the coach app's rules: 44 px targets, no sideways page, the event picker readable */
  .ld,.tabs button,select,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]),textarea{min-height:44px}
  .ld{min-width:44px}
  .tend button,.tg button,.iqchip,.iqopt{min-height:44px}
  select{max-width:100%;text-overflow:ellipsis}
  #playBreakBtn{display:none}
  .board{overflow-x:auto;max-width:100%}
  @media(max-width:640px){#evsub{display:none}#layoutSel{flex:1 1 auto;min-width:0;max-width:100%}}
  @media(max-width:600px){.matchup{grid-template-columns:1fr}.matchup>.vs{display:none}}
</style>
</head>`],
  ["names", "</body>", `<script id="previewNames">/* a name for every control that only had a placeholder or an icon */
(function(){const W={'\\u2715':'Remove','\\u00d7':'Remove','\\u2039':'Previous','\\u203a':'Next','\\u2192':'Right','\\u2190':'Left','\\u2191':'Up','\\u2193':'Down','\\u2197':'Up and right','\\u2198':'Down and right','\\u2199':'Down and left','\\u2196':'Up and left'};
let q=0;function name(){q=0;document.querySelectorAll('input,textarea,select').forEach(e=>{if(e.hasAttribute('aria-label')||(e.labels&&e.labels.length))return;const p=e.getAttribute('placeholder');if(p)e.setAttribute('aria-label',p);else if(e.id==='layoutSel')e.setAttribute('aria-label','Event');else if(e.id==='playSel')e.setAttribute('aria-label','Call');else if(e.id==='divSel')e.setAttribute('aria-label','Division');else if(e.classList.contains('pickSel'))e.setAttribute('aria-label','Team');});
document.querySelectorAll('button').forEach(b=>{if(b.hasAttribute('aria-label'))return;const t=(b.textContent||'').trim();if(W[t])b.setAttribute('aria-label',W[t]);});}
name();new MutationObserver(()=>{if(!q)q=requestAnimationFrame(name);}).observe(document.body,{childList:true,subtree:true});})();
</script>
</body>`],
  // ---- after the owner looked at the Player app ----
  // A More row reads in the middle of its button.
  ["fit", "style=\"display:flex;justify-content:space-between;width:100%;text-align:left;margin:2px 0;padding:9px 11px;opacity:.55\">", "style=\"display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;margin:2px 0;padding:9px 11px;opacity:.55\">"],
  // The bunker you are standing in is ringed white, as on the coach app.
  ["rings", "if(cl)clears.push(b.n);});el('circle',{cx:X(s.x),cy:Y(s.y),r:3,fill:'none',stroke:'#ffd24d','stroke-width':1.1});", "if(cl)clears.push(b.n);});el('circle',{cx:X(s.x),cy:Y(s.y),r:3,fill:'none',stroke:'#ffffff','stroke-width':1.1});"],
  // Both pits start empty: never put a team in a pit nobody picked.
  ["empty pits", "let Lsel={di:0,ti:0},Rsel={di:0,ti:1};", "let Lsel={di:0,ti:-1},Rsel={di:0,ti:-1};"],
  ["empty pits", "function teamName(s){return DIVS[s.di].t[s.ti][0];}", "function teamName(s){return s&&s.ti>=0&&DIVS[s.di]&&DIVS[s.di].t[s.ti]?DIVS[s.di].t[s.ti][0]:'Nobody yet';}"],
  ["empty pits", "const f=(sel)=>{const d=DIVS[sel.di]", "const f=(sel)=>{if(sel.ti<0)return 'Nobody picked';const d=DIVS[sel.di]"],
  ["empty pits", "function renderSide(side,sel){\n  const box=document.getElementById('side'+side);",
    "function renderSide(side,sel){\n  const box=document.getElementById('side'+side);\n  if(sel.ti<0){if(!box)return;let o='<option value=\"\" selected>Pick a team\\u2026</option>';DIVS.forEach((d,di)=>{o+=`<optgroup label=\"${d.d}\">`+d.t.map((t,ti)=>`<option value=\"${di}:${ti}\">${t[0]}</option>`).join('')+'</optgroup>';});\n    box.innerHTML=`<div><span class=\"nm\">Nobody yet</span></div><span class=\"lbl\">${side==='L'?'Left pit \\u00b7 a team you watch \\u00b7 optional':'Right pit \\u00b7 who you play'}</span><select class=\"pickSel\">${o}</select>`;\n    box.querySelector('.pickSel').onchange=e=>{if(!e.target.value)return;const[di,ti]=e.target.value.split(':').map(Number);if(side==='L')Lsel={di,ti};else Rsel={di,ti};renderScout();};return;}"],
];

// Regex steps: [rule, pattern, replacement].
const REGEX = [
  // The left pit's wire is #e5342f wherever a team, path or runner is drawn;
  // #e5252a stays the accent (tabs, buttons) and the end of the aggression scale.
  ["wires", /'#e5252a'(?!\])/g, "'#e5342f'"],
  ["wires", /(background:)#e5252a("><\/i>)/g, "$1#e5342f$2"],
  ["wires", /(width:\$\{lp\}%;background:)#e5252a/g, "$1#e5342f"],
  ["wires", /(<marker id="aL"[^>]*><path d="[^"]*" fill=")#e5252a/g, "$1#e5342f"],
  // No links to paid courses from a preview.
  ["no prices", /,\n\s*page:\['[^'\n]*','https:\/\/www\.(?:bkipaintball|mlpbplus)\.com[^'\n]*'\]/g, ""],
];

function apply(src, kind) {
  for (const [, rx, to] of REGEX) src = src.replace(rx, to);
  // A step whose result is already there has been applied (its result can
  // contain what it looks for, so looking alone would apply it twice).
  for (const [, from, to, only] of STEPS) {
    if (only && !only.includes(kind)) continue;
    if (from && src.includes(from) && !(to && src.includes(to))) src = src.split(from).join(to);
  }
  return src;
}

const check = process.argv.includes("--check");
let stale = 0;
for (const f of FILES) {
  const rel = path.relative(ROOT, f), before = fs.readFileSync(f, "utf8"), after = apply(before, path.basename(path.dirname(f)));
  if (after !== before) stale++;
  if (!check && after !== before) fs.writeFileSync(f, after);
  console.log(`${rel}: ${after === before ? "up to date" : check ? "out of date — run node tools/teaser_rules.js" : "written"}`);
}
if (check && stale) process.exit(1);
module.exports = { STEPS, REGEX };
