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
  // Independent review: compact tendency buttons need width as well as height.
  ["targets", ".tend button,.tg button,.iqchip,.iqopt{min-height:44px}", ".tend button,.tg button,.iqchip,.iqopt{min-height:44px;min-width:44px}"],
  ["targets", '.stars{font-size:16px;letter-spacing:2px;cursor:pointer;margin-top:4px}.stars b{color:#ffd33a}.stars span{color:#f04a44}',
    '.stars{display:flex;flex-wrap:wrap;gap:2px;margin-top:4px}.stars button{min-width:44px;min-height:44px;padding:0;background:#0b0c0d;border:1px solid #3a3f40;border-radius:6px;color:#ff5a52;font-size:20px;cursor:pointer}.stars button[aria-pressed="true"]{border-color:#efedeb;color:#efedeb}.stars button:focus-visible{outline:2px solid #efedeb;outline-offset:2px}'],
  ["names", '<span data-th="${n}">${n<=r.threat?\'<b>★</b>\':\'☆\'}</span>',
    '<button type="button" data-th="${n}" aria-label="Threat ${n} of 5" aria-pressed="${n===r.threat}">${n<=r.threat?\'★\':\'☆\'}</button>'],
  ["names", "box.querySelectorAll('.stars span').forEach(s=>s.onclick=()=>{r.threat=+s.dataset.th;saveScout();renderSide(side,sel);renderBoard();});",
    "box.querySelectorAll('.stars button').forEach(s=>s.onclick=()=>{const rating=+s.dataset.th;r.threat=rating;saveScout();renderSide(side,sel);renderBoard();box.querySelector('.stars button[data-th=\"'+rating+'\"]').focus();});"],
  ["no dialogs", "B.querySelector('#pbTendClear').onclick=()=>{if(confirm('Clear logged break history for this event?')){pbClearHist();pbClose();renderPlay();}};",
    "{const field=layoutKey;armConfirm(B.querySelector('#pbTendClear'),'Tap again to reset',()=>{if(layoutKey!==field)return;pbClearHist();pbClose();renderPlay();});}"],
  // Nothing leaves the phone. The previews carried an SMS ticket poller and a
  // CRM webhook that a restored backup could switch on with no screen to see
  // or stop it. Polling never starts, the senders send nothing, and a restore
  // drops those settings.
  ["sends nothing", "try{ticBadge();ticPollStart();ticQueueStart();}catch(e){}", "try{ticBadge();}catch(e){}/* previews send nothing */"],
  ["sends nothing", "return fetch(c.webhook,", "return previewSendsNothing(c.webhook,"],
  ["sends nothing", "fetch(c.worker.replace(", "previewSendsNothing(c.worker.replace("],
  ["sends nothing", "throw new Error('not a GRIDLOCK backup');",
    "throw new Error('not a GRIDLOCK backup');['gridlock_ghl','gridlock_crm','gridlock_tickets'].forEach(k=>{delete data.keys[k];});"],
  // A backup belongs to the app that made it: a Team backup restored into Player put the coach's team there.
  ["separate apps", "['gridlock_ghl','gridlock_crm','gridlock_tickets'].forEach(k=>{delete data.keys[k];});const n=",
    "['gridlock_ghl','gridlock_crm','gridlock_tickets'].forEach(k=>{delete data.keys[k];});if(data.app&&data.app!==EDITION)throw new Error('that backup is from the Gridlock '+(data.app==='team'?'Team':data.app==='player'?'Player':'other')+' app, not this one');const n="],
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
  // ---- found by the pre-publish read and the independent check ----
  ["no prices", "Scout license unlocks the full shot card for every bunker \\u2014 all ranges, bearings, and which lanes force you to stand \\u2014 plus copy-to-chat for the pre-game huddle.</div><div class=\"row\" style=\"margin-top:4px\"><button class=\"ld on\" id=\"scBuy\">Unlock Scout</button></div>",
    "The full shot card for every bunker is in the coach app.</div>"],
  // The locked item names the app it is in: the popup's own sentence when it says so.
  ["truthful", "<p>This is in the coach app. The preview does not have it yet.</p></div>`;const buy=",
    "<p>${/Team app|coach app|preview/i.test(body||'')?body:'This is in the coach app. The preview does not have it yet.'}</p></div>`;const buy="],
  ["truthful", "They enter it once to activate their Player app.", "When the Player app ships, they enter it once there."],
  ["no prices", "misses, scouting, break log, readiness, crew sessions, license. One file backs it all up", "scouting, your tally, practice and settings. One file backs it all up"],
  // Nexus in a preview is backup and nothing else: its summary pointed at tabs these apps do not have.
  ["no jargon", "  B.innerHTML=h;\n  const pb=B.querySelector('#nxPrint');",
    "  if(EDITION==='player'||EDITION==='team')h=`<div class=\"lbl\">Nexus</div><div style=\"font-size:12px;color:#ff5a52;margin-bottom:8px\">Back up what this phone holds, or restore a backup.</div>`;\n  B.innerHTML=h;\n  const pb=B.querySelector('#nxPrint');"],
  ["no jargon", "<div class=\"lbl\" style=\"margin-top:10px\">Offline readiness</div><div id=\"nxOffBody\"></div>", ""],
  ["no jargon", ":[['Master build','All features open \\u2014 this is your dev copy.'],['Editions','Officiating and Scout builds gate features for sale.'],['Nexus','Backup, license minting, ref cards, offline status.'],['Ship it','Trace Seffner, swap BUY_URL, go.']];", ":[];"],
  ["sends nothing", "if('serviceWorker' in navigator){try{if(location.protocol", "if(false&&'serviceWorker' in navigator){try{if(location.protocol"],
  // No signing salts in a page anyone can read: nothing in a preview signs or checks a key.
  ["no secrets", "const UPRA_SALT='UPRA-GRIDLOCK-2026-c7';", "const UPRA_SALT='';"],
  ["no secrets", "const KEY_SALT='GRIDKEY-2026-m4',", "const KEY_SALT='',"],
  // Coach colours: secondary type red, the team card neutral.
  ["colours", "<div class=\"iqrow\" style=\"border-color:#4d78e8\">", "<div class=\"iqrow\" style=\"border-color:#3a3f40\">"],
  ["colours", "color:#6f9cff", "color:#ff5a52"],
  // Three rows of 44 px chips fit the quick list without cutting the third in half.
  ["fit", "max-height:120px;overflow:auto", "max-height:156px;overflow:auto"],
  // A name for the controls the first naming pass missed.
  ["names", "else if(e.classList.contains('pickSel'))e.setAttribute('aria-label','Team');",
    "else if(e.classList.contains('pickSel'))e.setAttribute('aria-label','Team');else if(N[e.id])e.setAttribute('aria-label',N[e.id]);"],
  ["names", "let q=0;function name(){", "const N={prSel:'Drill',prDt:'Date',tAt:'Shooting at',tSec:'Seconds',bkTeam:'Team',scEvSel:'Event',tpPick:'Team',tsType:'Type',tsDate:'Date',tsTime:'Time'};let q=0;function name(){"],
  // A shared line code is text from outside: strip anything that could be markup.
  ["safe input", "const o=JSON.parse(upraB64d(p[1]));return {id:'shared',name:o.n||'Shared line',play:o.p||'',arch:o.a||'',spots:(o.s||[]).map(x=>{const sp={player:x[0],bunker:x[1]};",
    "const o=JSON.parse(upraB64d(p[1]));const T=v=>sanitizeText(v==null?'':v).replace(/[\"'`&]/g,'').slice(0,60);return {id:'shared',name:T(o.n)||'Shared line',play:T(o.p),arch:T(o.a),spots:(Array.isArray(o.s)?o.s:[]).map(x=>{const sp={player:T(x[0]),bunker:T(x[1])};"],
  // ---- Walk, as the coach app's: the field shows, a tap picks the bunker ----
  ["walk", "m==='nexus'||m==='walk'||m==='ops'", "m==='nexus'||m==='ops'"],
  ["walk", "function setMode(m){if(SUB_TABS.includes(m)", "function setMode(m){{const ws=document.getElementById('walkStick');if(ws&&m!=='walk')ws.remove();}if(SUB_TABS.includes(m)"],
  ["walk", "</style>\n</head>", `.fieldbox{position:relative}
  .wstick{position:absolute;z-index:3;display:flex;flex-direction:column;gap:6px;overflow:auto;-webkit-overflow-scrolling:touch}
  .wstick__head{display:flex;align-items:center;gap:8px;background:#0b0c0d;border:1px solid #3a3f40;border-radius:8px;padding:0 0 0 10px;color:#efedeb;font-size:13px}
  .wstick__head b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .wstick__head span{color:#ff5a52;font-size:12px;white-space:nowrap;flex:1}
  .wstick__x{min-width:44px;min-height:44px;background:none;border:0;color:#efedeb;font-size:16px;cursor:pointer}
  .wstick__pad{display:flex;flex-direction:column;gap:8px;padding:2px 4px 4px}
  .wnote{background:#efedeb;color:#0b0c0d;border-top:5px solid #ad1515;border-radius:2px 2px 6px 6px;padding:8px 10px 6px;transform:rotate(var(--tilt,0deg))}
  .wnote__text{margin:0;font-size:14px;line-height:1.35;font-weight:600;overflow-wrap:anywhere}
  .wnote__when{display:block;margin-top:4px;font-size:11px;color:#5c0f0d;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  .wnote--empty{background:#1e2121;color:#efedeb;border-top-color:#5c0f0d}
  .wnote--empty .wnote__text{font-weight:500}
  .walk-lede{font-size:13px;color:#ff5a52;margin:2px 0 8px}
  .walk-book{font-size:13px;color:#efedeb;margin:6px 0}
  .walk-add{width:100%;margin-top:8px}
  .walk-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
  .walk-row p{margin:2px 0 0}
</style>
</head>`],
  // Gold highlights in Tally become the coach app's: the picked bunker reads white, a switch that is on is red.
  ["rings", "<div id=\"tSelBlock\" class=\"iqrow\" style=\"border-color:#ffd24d\">", "<div id=\"tSelBlock\" class=\"iqrow\" style=\"border-color:#efedeb\">"],
  ["rings", "${tallyDelay?';background:#e0a41a;border-color:#ffd24d;color:#211900':''}", "${tallyDelay?';background:#ad1515;border-color:#e5252a;color:#ffffff':''}"],
  ["rings", "${tallyTrace?'style=\"background:#e0a41a;border-color:#ffd24d;color:#211900\"':''}", "${tallyTrace?'style=\"background:#ad1515;border-color:#e5252a;color:#ffffff\"':''}"],
  ["rings", "h+='<div class=\"iqrow\" style=\"border-color:#e0a41a;margin-top:8px\">';", "h+='<div class=\"iqrow\" style=\"border-color:#3a3f40;margin-top:8px\">';"],
  ["rings", "<button class=\"ld\" id=\"tPointOver\" style=\"flex:1;border-color:#e0a41a;background:#3a2c08;color:#ffd24d;font-weight:700\">", "<button class=\"ld on\" id=\"tPointOver\" style=\"flex:1;font-weight:700\">"],
  ["rings", "<div class=\"iqrow\" style=\"border-color:#ffd24d66\"><div class=\"row\" style=\"justify-content:space-between;align-items:baseline;gap:6px\">", "<div class=\"iqrow\" style=\"border-color:#3a3f40\"><div class=\"row\" style=\"justify-content:space-between;align-items:baseline;gap:6px\">"],
  ["rings", "${days?`<div style=\"font-size:12px;font-weight:800;color:#ffd24d\">${days}</div>`:''}", "${days?`<div style=\"font-size:12px;font-weight:800;color:#ff5a52\">${days}</div>`:''}"],
  // Coach, Team and Player are three apps: separate saved data, separate backups.
  ["separate apps", "<head>\n", "<head>\n<script id=\"previewStore\">/* each preview keeps its own saved data: a key is stored under this app's own prefix */(function(){var P='gridlock_team_',S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem,f=function(k){k=String(k);return k.indexOf('gridlock_')===0&&k.indexOf(P)!==0?P+k.slice(9):k;};S.getItem=function(k){return g.call(this,f(k));};S.setItem=function(k,v){return s.call(this,f(k),v);};S.removeItem=function(k){return r.call(this,f(k));};})();</script>\n", ["team"]],
  ["separate apps", "<head>\n", "<head>\n<script id=\"previewStore\">/* each preview keeps its own saved data: a key is stored under this app's own prefix */(function(){var P='gridlock_player_',S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem,f=function(k){k=String(k);return k.indexOf('gridlock_')===0&&k.indexOf(P)!==0?P+k.slice(9):k;};S.getItem=function(k){return g.call(this,f(k));};S.setItem=function(k,v){return s.call(this,f(k),v);};S.removeItem=function(k){return r.call(this,f(k));};})();</script>\n", ["player"]],
  ["separate apps", "if(k&&k.indexOf('gridlock_')===0)data.keys[k]=localStorage.getItem(k);", "if(k&&k.indexOf('gridlock_'+EDITION+'_')===0)data.keys['gridlock_'+k.slice(('gridlock_'+EDITION+'_').length)]=localStorage.getItem(k);"],
  ["separate apps", "const data={_gridlock_backup:1,ver:APP_VER,", "const data={_gridlock_backup:1,app:EDITION,ver:APP_VER,"],
  ["separate apps", "a.download='gridlock-backup-'+new Date()", "a.download='gridlock-'+EDITION+'-backup-'+new Date()"],
  ["separate apps", "<button class=\"ld ${sightMode==='ref'?'on':''}\" data-sm=\"ref\">Ref sightlines</button>", "", ["player"]],
  ["truthful copy", "You\\u2019re on your coach\\u2019s team, so your coach can see your Practice tab", "Nothing leaves this phone in this preview, so your coach sees your Practice tab only if you send it"],
  ["no sends", "<a href=\"https://www.youtube.com/watch?v=${v.id}\" target=\"_blank\" rel=\"noopener\" class=\"ld\" style=\"flex:1;display:flex", "<div class=\"ld\" style=\"flex:1;display:flex"],
  ["no sends", "`).join('')}`:''}</span></a>", "`).join('')}`:''}<br><span style=\"font-size:10.5px;color:#ff5a52\">Video links are not in this preview</span></span></div>"],
  ["no sends", "<a href=\"${prEsc(u)}\" target=\"_blank\" rel=\"noopener\" class=\"ld\" style=\"display:flex;gap:8px", "<div class=\"ld\" style=\"display:flex;gap:8px"],
  ["no sends", "<span>${prEsc(t)}</span></a>`).join('');}", "<span>${prEsc(t)}<br><span style=\"font-size:10.5px;color:#ff5a52\">Links are not in this preview</span></span></div>`).join('');}"],
  // Player (owner, 12 Nov 2026): Tally and Scout's Matchup, Breakouts, Layers
  // and Games work as the coach app's do. The code is tools/teaser_coachplay.js.
  ["coach tally", "function renderTally(){if(MODE==='tally')TSCOPE=null;", "function renderTally(){if(MODE==='tally'){cpTally();return;}if(MODE==='tally')TSCOPE=null;", ["player"]],
  ["coach scout", "  if(scView==='log')return renderScoutBreakouts();\n  if(scView==='layers')return renderScoutLayers();\n  if(scView==='games')return renderGames();", "  if(scView==='log')return cpBreakouts();\n  if(scView==='layers')return cpLayers();\n  if(scView==='games')return cpGames();", ["player"]],
  ["coach scout", "const lk=P.querySelector('[data-lickey]');if(lk)lk.onclick=()=>setMode('nexus');}return;}", "const lk=P.querySelector('[data-lickey]');if(lk)lk.onclick=()=>setMode('nexus');cpMatchup(P);}return;}", ["player"]],
  ["coach scout", 'data-scview="matchup">Matchup &amp; Sim<', 'data-scview="matchup">Matchup<', ["player"]],
  ["coach scout", 'data-scview="layers">Historical layers<', 'data-scview="layers">Layers<', ["player"]],
  ["coach scout", 'data-scview="games">Games &amp; replay<', 'data-scview="games">Games<', ["player"]],
  ["coach scout", "Games &amp; replay and Historical layers are open too.", "Breakouts, Layers and Games read the sheets you keep on Tally.", ["player"]],
];

// Regex steps: [rule, pattern, replacement].
const REGEX = [
  // Remove disabled networking code too: previews never ship an outbound path.
  ["sends nothing", /^const SW_SRC=.*;$/gm, "const SW_SRC='';"],
  ["sends nothing", /^   \{if\(UPDATE_URL&&navigator\.onLine\)\{fetch[^\n]*$/gm, ""],
  // The hidden referee screen still bundled rule text after its bank was removed.
  ["no rulebook", /const REFS=\[\n[\s\S]*?\];\nconst REFPH=\{\n[\s\S]*?\};/, "const REFS=[];\nconst REFPH={};"],
  ["no rulebook", /function renderRef\(\)\{\n[\s\S]*?\n\}\n(?=\n\/\* ---------- MODE: SCOUT)/, "function renderRef(){field();document.getElementById('panel').textContent='Not in this preview.';}\n"],
  // Every selection ring is white, as on the coach app; gold stays only where it means primary.
  ["rings", /(el\('circle',\{cx:X\((?:b|ln)\.[a-z]+\),cy:Y\((?:b|ln)\.[a-z]+\),r:[0-9.]+,fill:'none',stroke:)'#ffd24d'/g, "$1'#ffffff'"],
  // The July build's sample code words included two that must never ship.
  ["decency", /\n \{id:'s-(?:hitler|immigrant)',[^\n]*\}, ?(?=\n)/g, ""],
  ["no prices", /upsellPop\('Add another team \\u2014 20% off',[^;]*?,'coach2'\)/g, "gAlert('This preview holds one team.')"],
  // The league's rulebook does not ship: the referee question bank, its levels,
  // the call cards, the find list, the scenario brain and the printed call sheet.
  ["no rulebook", /const IQ_Q=\[\n[\s\S]*?\n\];/, "const IQ_Q=[];"],
  ["no rulebook", /const IQ_LVL=\[[^\]]*\];/, "const IQ_LVL=[];"],
  ["no rulebook", /const IQ_CALLS=\[\n[\s\S]*?\n\];/, "const IQ_CALLS=[];"],
  ["no rulebook", /const IQ_FIND=\[\n[\s\S]*?\n\];/, "const IQ_FIND=[];"],
  ["no rulebook", /const SCEN=\[\n[\s\S]*?\n\];/, "const SCEN=[];"],
  ["no rulebook", /function printSheet\(\)\{const S=document\.getElementById\('printsheet'\);[\s\S]*?\n\}\n/, "function printSheet(){}\n"],
  // The left pit's wire is #e5342f wherever a team, path or runner is drawn;
  // #e5252a stays the accent (tabs, buttons) and the end of the aggression scale.
  ["wires", /'#e5252a'(?!\])/g, "'#e5342f'"],
  ["wires", /(background:)#e5252a("><\/i>)/g, "$1#e5342f$2"],
  ["wires", /(width:\$\{lp\}%;background:)#e5252a/g, "$1#e5342f"],
  ["wires", /(<marker id="aL"[^>]*><path d="[^"]*" fill=")#e5252a/g, "$1#e5342f"],
  // No links to paid courses from a preview.
  ["no prices", /,\n\s*page:\['[^'\n]*','https:\/\/www\.(?:bkipaintball|mlpbplus)\.com[^'\n]*'\]/g, ""],
];

// The Walk tab lives in tools/teaser_walk.js, between markers, like the fields.
const WALK = fs.readFileSync(path.join(__dirname, "teaser_walk.js"), "utf8").trimEnd();
const W0 = "/* coachwalk:begin \u2014 generated from tools/teaser_walk.js, never hand-edit */", W1 = "/* coachwalk:end */";
function walkBlock(src) {
  const a = src.indexOf(W0), b = src.indexOf(W1), block = W0 + "\n" + WALK + "\n" + W1;
  if (a >= 0 && b > a) return src.slice(0, a) + block + src.slice(b + W1.length);
  const old = /function renderWalk\(\)\{const B=document\.getElementById\('walkbox'\);if\(!B\)return;\n  B\.innerHTML=`<div class="lbl">Walk the field<\/div>[^\n]*\n\}/;
  return old.test(src) ? src.replace(old, () => block) : src;
}

// The coach app's Tally and Scout (Player only), between markers too.
const PLACE = fs.readFileSync(path.join(__dirname, "teaser_coachplay.js"), "utf8").trimEnd();
const P0 = "/* coachplay:begin \u2014 generated from tools/teaser_coachplay.js, never hand-edit */", P1 = "/* coachplay:end */";
function placeBlock(src, kind) {
  if (kind !== "player") return src;
  const a = src.indexOf(P0), b = src.indexOf(P1), block = P0 + "\n" + PLACE + "\n" + P1 + "\n";
  if (a >= 0 && b > a) return src.slice(0, a) + block + src.slice(b + P1.length + 1);
  const at = src.indexOf("function tallyClick(e){try{");
  return at < 0 ? src : src.slice(0, at) + block + src.slice(at);
}

function apply(src, kind) {
  src = walkBlock(src);
  src = placeBlock(src, kind);
  for (const [, rx, to] of REGEX) src = src.replace(rx, to);
  // A step applies wherever what it looks for is still in the file. A step whose
  // result contains what it looks for is skipped once that result is there, or
  // it would apply again on every run.
  for (const [, from, to, only] of STEPS) {
    if (only && !only.includes(kind)) continue;
    if (!from || !src.includes(from)) continue;
    if (to && to.includes(from)) {
      // Applied already when the first line it adds is there. Later steps may
      // edit the rest of what it added, so the whole result is not the test.
      const i = to.indexOf(from), added = i > 0 ? to.slice(0, i) : to.slice(from.length);
      const mark = added.split("\n").find(l => l.trim()) || added;
      if (mark && src.includes(mark)) continue;
    }
    src = src.split(from).join(to);
  }
  return require("./rulebook-links").preview(src);
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
