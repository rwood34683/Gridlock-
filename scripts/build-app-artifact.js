#!/usr/bin/env node
/* Produce a single-file build of the app itself, for the Artifact host.
 *
 *   node scripts/build-app-artifact.js
 *
 * The app is already one self-contained page — the only external reference is
 * native.js, which no-ops in a browser — so this inlines that and strips the
 * document shell the host supplies itself. Nothing about the app changes:
 * web/index.html stays the single source of truth.
 *
 * This is for putting the real thing in someone's hands in a browser. It is not
 * the store build; that goes through Capacitor from web/ unchanged. */
const fs = require("fs");
const path = require("path");

const WEB = path.join(__dirname, "..", "web");
const OUT = path.join(__dirname, "..", "site", "build", "app.html");

let html = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
const native = fs.readFileSync(path.join(WEB, "native.js"), "utf8");

const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
const title = /<title>[\s\S]*?<\/title>/.exec(head)[0];
const style = /<style>[\s\S]*?<\/style>/.exec(head)[0];
let body = html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>"));

// The one file the page pulls in. In a browser it only sets a class and
// defines the share helper; on device Capacitor is there and it does more.
const before = body;
body = body.replace('<script src="native.js"></script>', `<script>\n${native}\n</script>`);
if (body === before) { console.error("native.js was not referenced — check web/index.html"); process.exit(1); }

// The host paints its own ground behind the page, so the app's own full-height
// shell needs the root elements sized explicitly rather than inherited.
const fit = `<style>
  html,body{height:100%;margin:0;background:#0b0c0d;overscroll-behavior:none}
  #root{height:100%}
</style>`;

const page = `${title}\n${style}\n${fit}\n${body}`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`app → ${OUT} (${(Buffer.byteLength(page) / 1024).toFixed(0)} KB, no external requests)`);
