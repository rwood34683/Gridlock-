#!/usr/bin/env node
/* Where the five plant, for every break on every measured field.
 *
 *   node tools/plants.js            # print the block
 *   node tools/plants.js --write    # write it into web/index.html
 *
 * A break is written as the bunker each player plants on, never as a typed
 * coordinate, so the call stays true to the field if the map is re-digitized.
 * Typing five bunker ids per break per layout is 60 ids for twelve breaks and
 * three fields, and every one of them is a chance to name a bunker at the wrong
 * end — which has already happened once here.
 *
 * So the call is written the way a coach says it: how many men on which wire,
 * and how far up the field. This reads that off the measured layout and picks
 * the bunker that actually sits there. Add a field and its plants come out of
 * the same rule; move a bunker on the map and the plant follows it.
 *
 * The rule
 *   1. Five slots, each a wire band and a depth. Depth 0 is the back tape,
 *      1 is the fifty.
 *   2. For each slot take the free bunker in that band nearest that depth.
 *   3. Never two men on the snake: the sections are one structure a player
 *      crawls, not nine bunkers to share out.
 *   4. Never a second man inside a taken bunker's own footprint — that is one
 *      man behind that paint, not two.
 *   5. Never a bunker with another standing over it — the route in clips the
 *      one on top whatever way he comes, so it is not a place to be sent.
 *   6. Some calls are about lanes rather than ground, so a break may prefer
 *      the bunkers you stand and shoot from over the ones you hide behind.
 *
 * What the rule cannot know is what a walk would tell you. A coach who has
 * walked the field should drag the paths; Edit path saves it per layout, per
 * break, per player, over the top of this.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FIELDS = [
  ["lso", "nxl_2026_lone_star.json"],
  ["tby", "nxl_2026_tampa_bay_open.json"],
  ["mwo", "nxl_2026_midwest_open.json"],
];

// The same five bands the app labels a job with, off the same y.
const BANDS = ["snake wire", "snake side", "centre", "dorito side", "dorito wire"];
const bandOf = y => y > 88 ? "snake wire" : y > 66 ? "snake side"
                  : y > 44 ? "centre" : y > 24 ? "dorito side" : "dorito wire";

// The bunkers you stand up and shoot from, rather than the ones you get behind.
const LANE_BUNKERS = ["brick", "temple", "maya_temple", "giant_brick", "mini_w", "cylinder"];

const SW = "snake wire", SS = "snake side", C = "centre", DS = "dorito side", DW = "dorito wire";

/* The twelve calls. Each is five slots of [band, depth], and depth is how far
 * up the home half the man goes: 0 at the back tape, 1 at the fifty. `prefer`
 * tips a slot toward the bunkers you shoot from when two are equally close. */
const SHAPES = {
  hold:     {slots: [[SW,.40],[SS,.45],[C,.45],[DS,.15],[DW,.30]]},
  base:     {slots: [[SW,.65],[SS,.45],[C,.70],[DS,.60],[DW,.50]]},
  snake:    {slots: [[SW,.81],[SW,.73],[SS,.94],[SS,1.0],[DS,.60]]},
  flood:    {slots: [[DW,.90],[DW,.69],[DW,.50],[DS,.60],[C,.45]]},
  blitz:    {slots: [[SW,.81],[SS,.94],[C,.94],[DS,.81],[DW,.90]]},
  // ---- the seven the spec named that were never built ----
  conserve: {slots: [[SW,.20],[SS,.22],[C,.32],[DS,.20],[DW,.20]]},
  counter:  {slots: [[C,.85],[SW,.55],[DW,.55],[SS,.32],[DS,.32]]},
  split:    {slots: [[SW,.72],[SS,.55],[DW,.72],[DS,.55],[C,.22]]},
  tower:    {slots: [[C,.95],[C,.58],[SS,.45],[DS,.45],[SW,.28]]},
  trade:    {slots: [[SW,.62],[SS,.64],[C,.66],[DS,.64],[DW,.62]], prefer: true},
  contain:  {slots: [[SW,.85],[DW,.85],[C,.30],[SS,.24],[DS,.24]]},
  lock:     {slots: [[SW,.28],[SS,.32],[C,.34],[DS,.32],[DW,.28]], prefer: true},
};

const BACK = 10, FIFTY = 72;          // the depth scale, in feet up the home half

// A bunker with another bunker standing over it is not somewhere a man can be
// sent: the route in clips the one on top, whatever way he comes. On the
// Midwest map a snake section sits inside the wing beside it, and planting
// there walled the runner in and drew him straight through the wing.
function reachable(b, all) {
  const pad = 0.9;                       // players run within a foot of paint
  return !all.some(o => o !== b && o.n !== b.n
    && Math.abs(o.x - b.x) < o.w / 2 + pad && Math.abs(o.y - b.y) < o.h / 2 + pad);
}

function plantsFor(bunkers, shape) {
  const free = bunkers.filter(b => b.x < 76 && reachable(b, bunkers));
  const taken = [];
  const usedSnake = () => taken.some(b => b.n === "SB");

  return shape.slots.map(([band, depth]) => {
    const want = BACK + depth * (FIFTY - BACK);
    // Nearest band first, then out to its neighbours if that one is spent.
    const order = [band, ...BANDS.filter(x => x !== band)
      .sort((p, q) => Math.abs(BANDS.indexOf(p) - BANDS.indexOf(band))
                    - Math.abs(BANDS.indexOf(q) - BANDS.indexOf(band)))];
    for (const b of order) {
      const pick = free
        .filter(x => !taken.includes(x))
        .filter(x => x.band === b)
        .filter(x => !(x.n === "SB" && usedSnake()))
        .filter(x => !taken.some(t => Math.abs(t.x - x.x) < t.w / 2 + 1
                                   && Math.abs(t.y - x.y) < t.h / 2 + 1))
        .map(x => ({ x, cost: Math.abs(x.x - want)
                      - (shape.prefer && LANE_BUNKERS.includes(x.type) ? 8 : 0) }))
        .sort((p, q) => p.cost - q.cost)[0];
      if (pick) { taken.push(pick.x); return pick.x.id; }
    }
    throw new Error("nowhere left to plant");
  });
}

const out = {};
const report = [];
for (const [key, file] of FIELDS) {
  const ev = JSON.parse(fs.readFileSync(path.join(ROOT, "layouts", "events", file), "utf8"));
  const seen = {};
  const bunkers = ev.bunkers.map(b => {
    seen[b.name] = (seen[b.name] || 0) + 1;
    return { id: `${b.name}#${seen[b.name]}`, n: b.name, type: b.type,
             x: b.x_ft, y: b.y_ft, w: b.w_ft, h: b.h_ft, band: bandOf(b.y_ft) };
  });
  out[key] = {};
  for (const [script, shape] of Object.entries(SHAPES)) {
    out[key][script] = plantsFor(bunkers, shape);
    report.push([key, script, out[key][script]]);
  }
}

const js = "const BREAK_PLANTS = {\n"
  + Object.entries(out).map(([k, v]) =>
      `  ${k}: {\n` + Object.entries(v).map(([s, ids]) =>
        `    ${(s + ":").padEnd(10)}[${ids.map(i => `"${i}"`).join(",")}]`).join(",\n")
      + "\n  }").join(",\n")
  + "\n};";

if (process.argv.includes("--write")) {
  const file = path.join(ROOT, "web", "index.html");
  const html = fs.readFileSync(file, "utf8");
  const next = html.replace(/const BREAK_PLANTS = \{[\s\S]*?\n\};/, js);
  if (next === html) { console.error("BREAK_PLANTS block not found"); process.exit(1); }
  fs.writeFileSync(file, next);
  console.log(`web/index.html: ${report.length} calls planted`);
} else {
  console.log(js);
}
