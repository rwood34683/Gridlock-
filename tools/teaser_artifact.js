#!/usr/bin/env node
/* Turn a preview app into a page for the Artifact host.
 *
 *   node tools/teaser_artifact.js player   ->  dist/teaser-artifact/gridlock-player.html
 *   node tools/teaser_artifact.js team     ->  dist/teaser-artifact/gridlock-team.html
 *
 * The host wraps the page in its own <!doctype>, <head> and <body> and pads the
 * page clear of a phone's system bars, so this drops the preview's own wrapper
 * tags and viewport meta, keeps everything else in order, names the page, fixes
 * it to its single dark look, and keeps the sticky header under the status bar.
 * The app itself is untouched: run tools/teaser_rules.js on the preview first.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const kind = process.argv[2] || "player";
const NAME = { player: "Gridlock Player Preview", team: "Gridlock Team Preview" }[kind];
if (!NAME) { console.error("Say player or team."); process.exit(1); }

let src = fs.readFileSync(path.join(ROOT, `teasers/${kind}/index.html`), "utf8");
const strip = [
  [/<!DOCTYPE html>\s*/i, ""],
  [/<html[^>]*>\s*/i, ""],
  [/<\/html>\s*$/i, ""],
  [/<head>\s*/i, ""],
  [/<\/head>\s*/i, ""],
  [/<body[^>]*>\s*/i, ""],
  [/<\/body>\s*/i, ""],
  [/<meta charset="utf-8"\/>\s*/i, ""],
  [/<meta name="viewport"[^>]*\/>\s*/i, ""],
  [/<title>[^<]*<\/title>/i, `<title>${NAME}</title>`],
];
for (const [rx, to] of strip) {
  if (!rx.test(src)) { console.error(`Expected ${rx} in teasers/${kind}/index.html`); process.exit(1); }
  src = src.replace(rx, to);
}
// One dark look, chosen: the coach app's. The host pads the page clear of the
// status bar, so the header sticks below it and the band above is painted.
const host = `<style id="artifactHost">
:root{color-scheme:dark}
html,body{background:#0b0c0d}
header{padding-top:12px!important;top:env(safe-area-inset-top,0px)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:#0b0c0d}
</style>\n`;
src = src.replace(`<title>${NAME}</title>`, `<title>${NAME}</title>\n${host}`);

const out = path.join(ROOT, "dist/teaser-artifact", `gridlock-${kind}.html`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, src);
console.log(`${path.relative(ROOT, out)}: ${src.length} bytes`);
