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
  check(`${kind}: never says the banned word`, !/gunz/i.test(h));
  check(`${kind}: no link to a missing admin page`, !h.includes("gridlock_admin.html"));
  check(`${kind}: never touches a coach's season keys`, !h.includes("gridlock.coach."));
}
const coach = ["web/index.html", "site/index.html", "scripts/build.js", "scripts/build-app-artifact.js"];
check("the coach app, site and builds never load the previews", coach.every(f => !rd(f).includes("teasers/")));
const site = rd("site/index.html");
check("the landing page teases both apps", /id="coming"/.test(site) && site.includes("Gridlock Team") && site.includes("Gridlock Player"));
check("the tease says they are not available yet", /Not available yet/.test(site));
process.exit(fail ? 1 : 0);
