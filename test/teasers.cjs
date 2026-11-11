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
  check(`${kind}: no price or licence for sale`, !/\$\d+\/(season|yr)|Get a license'\)|Free tier<|subscription/i.test(h));
  check(`${kind}: never polls or posts anywhere`, !/ticPollStart\(\);ticQueueStart|return fetch\(c\.webhook|fetch\(c\.worker/.test(h));
  check(`${kind}: no rule bank or call sheet in Nexus`, !/Rule bank audit<\/div><div id="nxAu"|id="nxPrint"|UPRA Ref Card \\u2014 signed readiness<\/div>/.test(h));
  check(`${kind}: the control is called Shot lanes`, !/guns up/i.test(h));
}
const coach = ["web/index.html", "site/index.html", "scripts/build.js", "scripts/build-app-artifact.js"];
check("the coach app, site and builds never load the previews", coach.every(f => !rd(f).includes("teasers/")));
const site = rd("site/index.html");
check("the landing page teases both apps", /id="coming"/.test(site) && site.includes("Gridlock Team") && site.includes("Gridlock Player"));
check("the tease says they are not available yet", /Not available yet/.test(site));
process.exit(fail ? 1 : 0);
