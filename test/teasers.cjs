// The Team and Player previews are separate apps: kept out of the coach app
// and the site build, marked as previews, and free of the word the house
// rules ban.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const rd = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
let fail = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) fail++; };
for (const [kind, name] of [["team", "Team"], ["player", "Player"]]) {
  const f = `teasers/${kind}/index.html`;
  check(`${f} exists`, fs.existsSync(path.join(ROOT, f)));
  const h = rd(f);
  check(`${kind}: titled as a preview`, h.includes(`<title>Gridlock ${name} · preview</title>`));
  check(`${kind}: carries the coming-soon ribbon`, /id="teaserRibbon"[^>]*>PREVIEW · COMING SOON — the Gridlock /.test(h));
  check(`${kind}: never says the banned word`, !/gunz\s*up/i.test(h));
  check(`${kind}: no link to a missing admin page`, !h.includes("gridlock_admin.html"));
  check(`${kind}: never touches a coach's season keys`, !h.includes("gridlock.coach."));
}
const { execFileSync } = require("child_process");
for (const kind of ["team", "player"]) {
  const h = rd(`teasers/${kind}/index.html`);
  check(`${kind}: on the coach app's black ground`, /body\{margin:0;background:#0b0c0d/.test(h) && !h.includes("#06091a"));
  check(`${kind}: the field is dark, not green turf`, h.includes("fill:'#101111'") && !h.includes("#1c4a28"));
  check(`${kind}: clear lanes white, blocked grey`, h.includes("cl?'#ffffff':'#8d9092'"));
  check(`${kind}: no purple bunker paint`, !/#6f1c63|#9a4a8c/.test(h));
  check(`${kind}: no UPRA badge picture`, !h.includes('alt="UPRA Official"'));
  check(`${kind}: no PBLeagues event line or season points`, !/PBLeagues event 93\d\d|season points|const SNAP='CIN/.test(h));
  check(`${kind}: none of July's fields`, !/RAW_(CIN|SEF|TEX|EUR)|LAYOUTS=\{cin:/.test(h));
  check(`${kind}: opens on the World Cup's measured field`, h.includes("const FREE_LAYOUT='nwc';") && h.includes('"nwc":{"name":"NXL World Cup · Kissimmee"'));
  check(`${kind}: the theme tool finds nothing left to change`,
    execFileSync("python3", ["-I", path.join(ROOT, "tools/teaser_theme.py"), "--check", path.join(ROOT, `teasers/${kind}/index.html`)]).toString().includes("already themed"));
}
// Fails when a measured field, a plant or the board changes in the coach app
// and the previews were not regenerated: node tools/teaser_fields.js.
let fieldsOk = true;
try { execFileSync("node", [path.join(ROOT, "tools/teaser_fields.js"), "--check"]); } catch (e) { fieldsOk = false; }
check("both previews carry the coach app's fields, plants and board", fieldsOk);
let rulesOk = true;
try { execFileSync("node", [path.join(ROOT, "tools/teaser_rules.js"), "--check"]); } catch (e) { rulesOk = false; }
check("both previews pass the house-rule fixes (tools/teaser_rules.js)", rulesOk);
for (const kind of ["team", "player"]) {
  const h = rd(`teasers/${kind}/index.html`);
  check(`${kind}: no price or licence for sale`, !/\$\d+\/(season|yr)|Get a license','11px'|Free tier<|subscription/i.test(h));
  check(`${kind}: never polls or posts anywhere`, !/ticPollStart\(\);ticQueueStart|return fetch\(c\.webhook|fetch\(c\.worker/.test(h));
  check(`${kind}: no fetch or other network-send API remains in the bundle`, !/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\s*\(|\bEventSource\b/.test(h));
  check(`${kind}: no hidden referee rule text remains`, h.includes('const REFS=[];') && h.includes('const REFPH={};') && !h.includes('Per the published rulebook') && !h.includes('Rule 1.2.3'));
  check(`${kind}: no native confirmation call remains`, !/\b(?:window\.)?(?:confirm|prompt|alert)\s*\(\s*['"`]/.test(h));
  check(`${kind}: no rule bank or call sheet in Nexus`, !/Rule bank audit<\/div><div id="nxAu"|id="nxPrint"|UPRA Ref Card \\u2014 signed readiness<\/div>/.test(h));
  check(`${kind}: the control is called Shot lanes`, !/guns up/i.test(h));
  check(`${kind}: the tour never opens by itself`, h.includes("if(EDITION==='player'||EDITION==='team')return;/* never opens by itself */"));
  check(`${kind}: no browser dialogs`, !/[^.\w]confirm\('Delete this event|prompt\('Copy this code/.test(h));
  check(`${kind}: a note is kept, never sent`, !/id="msgGo">Send</.test(h));
  { // every inline script still parses: one stray apostrophe in a reworded string blanks the app
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m, bad = "";
    while ((m = re.exec(h))) { try { new Function(m[1]); } catch (e) { bad = e.message; break; } }
    check(`${kind}: every script parses${bad ? " — " + bad : ""}`, !bad);
  }
  check(`${kind}: no referee rule bank, salts or offensive sample codes shipped`, h.includes("const IQ_Q=[];") && h.includes("const KEY_SALT=''") && h.includes("const UPRA_SALT='';") && !/s-hitler|s-immigrant|stab X person/.test(h));
  check(`${kind}: no service worker, no dev-copy tour, no shot-card paywall`, !/if\('serviceWorker' in navigator\)\{try\{if\(location/.test(h) && !/this is your dev copy|Unlock Scout|20% off/.test(h));
  check(`${kind}: Walk is the coach app's (notes on the field, lanes from here)`, h.includes("coachwalk:begin") && !h.includes("3D field walk is coming") && h.includes("id=\"wkLanes\""));
  check(`${kind}: no gold selection rings or highlights`, !/fill:'none',stroke:'#ffd24d'[^}]*\}\)/.test(h.replace(/el\('circle',\{cx:6,[^}]*\}/g,'')) && !/border-color:#(ffd24d|e0a41a)/.test(h));
  check(`${kind}: both pits start empty`, h.includes("let Lsel={di:0,ti:-1},Rsel={di:0,ti:-1};") && h.includes("if(sel.ti<0){if(!box)return;"));
  check(`${kind}: the bunker you stand in is ringed white`, h.includes("r:3,fill:'none',stroke:'#ffffff','stroke-width':1.1"));
  check(`${kind}: 44 px targets and names for every control`, h.includes('id="previewFit"') && h.includes('id="previewNames"'));
}
const coach = ["web/index.html", "site/index.html", "scripts/build.js", "scripts/build-app-artifact.js"];
// Coach, Team and Player are three apps (audit of 12 Nov 2026).
for (const [kind, name] of [["team", "Team"], ["player", "Player"]]) {
  const h = rd(`teasers/${kind}/index.html`), other = kind === "team" ? "player" : "team";
  check(`${kind}: saved data is kept under this app's own prefix`, h.includes(`<script id="previewStore">`) && h.includes(`var P='gridlock_${kind}_'`) && !h.includes(`var P='gridlock_${other}_'`));
  check(`${kind}: a backup says which app made it, and another app's is refused`, h.includes("{_gridlock_backup:1,app:EDITION,") && h.includes("if(data.app&&data.app!==EDITION)throw new Error(") && h.includes("a.download='gridlock-'+EDITION+'-backup-'"));
  check(`${kind}: a backup holds only this app's keys`, h.includes("k.indexOf('gridlock_'+EDITION+'_')===0") && !h.includes("if(k&&k.indexOf('gridlock_')===0)data.keys[k]"));
  check(`${kind}: installs under its own home-screen name`, h.includes(`<meta name="apple-mobile-web-app-title" content="GL ${name}"/>`)
    && JSON.parse(Buffer.from(/href="data:application\/manifest\+json;base64,([A-Za-z0-9+/=]+)"/.exec(h)[1], "base64").toString("utf8")).short_name === `GL ${name}`);
  // Only the owner's explicit Rules references may leave the preview. Video,
  // course and arbitrary links remain forbidden; there are still no sends.
  const official = require("../docs/rulebooks.json").map(b=>b.url).sort();
  const external = [...h.matchAll(/<a\b[^>]*\bhref="(https?:[^"\s]+)"/gi)].map(m=>m[1]).sort();
  check(`${kind}: only the three official rulebook links can open outside the preview`, JSON.stringify(external)===JSON.stringify(official) && !h.includes('<a href="${prEsc(u)}"'));
}
{
  const h = rd("teasers/player/index.html");
  check("player: no referee sightline tool, which pointed at a locked tab", !h.includes('data-sm="ref"'));
  check("player: does not claim the coach can see Practice", !/your coach can see your Practice tab/.test(h) && h.includes("Nothing leaves this phone in this preview"));
}
check("the coach app, site and builds never load the previews", coach.every(f => !rd(f).includes("teasers/")));
const site = rd("site/index.html");
check("the landing page teases both apps", /id="coming"/.test(site) && site.includes("Gridlock Team") && site.includes("Gridlock Player"));
check("the tease says they are not available yet", /Not available yet/.test(site));
process.exit(fail ? 1 : 0);
