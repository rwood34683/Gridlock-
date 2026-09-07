#!/usr/bin/env node
/* Produce the Artifact build of the landing page.

   The Artifact host blocks external images and wraps the file in its own
   <!doctype>/<head>/<body>, so this strips the document shell and inlines
   every local asset as a data: URI. site/index.html stays the source. */
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "site");
const OUT = path.join(__dirname, "..", "site", "build", "artifact.html");

const MIME = { ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };

let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");

// Keep <title>, <style> and the Google Fonts link; drop the rest of the shell.
const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
const title = /<title>[\s\S]*?<\/title>/.exec(head)[0];
const fonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/.exec(head)[0];
const style = /<style>[\s\S]*?<\/style>/.exec(head)[0];
const body = html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>"));

let page = `${title}\n${fonts}\n${style}\n${body}`;

// Inline every local asset the page references.
let inlined = 0;
page = page.replace(/(src|href)="((?!https?:|data:|#)[^"]+\.(?:png|svg|jpg))"/g, (m, attr, rel) => {
  const file = path.join(SITE, rel);
  if (!fs.existsSync(file)) {
    console.warn("  missing:", rel);
    return m;
  }
  const mime = MIME[path.extname(file).toLowerCase()];
  inlined++;
  return `${attr}="data:${mime};base64,${fs.readFileSync(file).toString("base64")}"`;
});

// Sibling pages (privacy, support) are real files on the static host but do not
// exist inside a single-file artifact, so neutralise those links rather than
// shipping a preview with dead ones.
let neutralised = 0;
page = page.replace(/<a href="((?!https?:|data:|#)[^"]+\.html)">([\s\S]*?)<\/a>/g, (m, rel, text) => {
  neutralised++;
  return `<span title="${rel} — on the deployed site" style="color:var(--dim)">${text}</span>`;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`  neutralised ${neutralised} link(s) to sibling pages`);
console.log(`inlined ${inlined} assets → ${OUT} (${(Buffer.byteLength(page) / 1048576).toFixed(2)} MB)`);
