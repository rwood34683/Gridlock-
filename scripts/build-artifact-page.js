#!/usr/bin/env node
// Bundle landing, support, privacy and the app into a single working file.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '../site');
const mime = {'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
function inline(rel) {
  let html = fs.readFileSync(path.join(SITE, rel), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (_, css) => `<style>${fs.readFileSync(path.join(SITE, css), 'utf8')}</style>`);
  html = html.replace(/\b(src|href)="([^"\s]+\.(?:png|svg|jpg))"/g, (tag, attr, file) => {
    if (/^(?:data:|https?:)/i.test(file)) return tag;
    return `${attr}="data:${mime[path.extname(file)]};base64,${fs.readFileSync(path.join(SITE, file)).toString('base64')}"`;
  });
  return html;
}
const pages = Object.fromEntries(['index.html','support.html','privacy.html','app.html'].map(name => [name, inline(name)]));
const payload = JSON.stringify(pages).replace(/</g, '\\u003c');
const output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GRIDLOCK Coach</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;background:#0b0c0d}iframe{display:block}</style></head><body><iframe id="view" title="GRIDLOCK Coach"></iframe><script>const pages=${payload};const view=document.getElementById('view');function show(name,anchor){if(!pages[name])return;view.srcdoc=pages[name];view.onload=()=>{const doc=view.contentDocument;doc.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const href=link.getAttribute('href')||'';const parts=href.split('#');if(pages[parts[0]]){event.preventDefault();show(parts[0],parts[1]);}});if(anchor)doc.getElementById(anchor)?.scrollIntoView();};}show('index.html');<\/script></body></html>`;
const out = path.join(SITE, 'build/artifact.html');
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, output);
console.log(`site/build/artifact.html: ${(Buffer.byteLength(output)/1048576).toFixed(2)} MB; four embedded pages`);
