#!/usr/bin/env node
// Bundle landing, support, privacy and the app into a single working file.
//
//   node scripts/build-artifact-page.js                         the committed site → site/build/artifact.html
//   node scripts/build-artifact-page.js --root dist/brand/grindx --out dist/brand/grindx/artifact.html
//
// A branded build (npm run brand build <brand>) is a complete site directory,
// so pointing --root at it bundles that brand; the title is read off its own
// index.html rather than typed here.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const SITE = path.resolve(ROOT, opt('--root') || 'site');
const OUT = path.resolve(ROOT, opt('--out') || 'site/build/artifact.html');
if (!SITE.startsWith(ROOT + path.sep) || !OUT.startsWith(ROOT + path.sep)) throw new Error('The site and output paths must be inside the repository.');
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
// A built site links the app as app/ rather than app.html; the bundle carries it inline either way.
pages['index.html'] = pages['index.html'].replaceAll('href="app/"', 'href="app.html"');
const title = (/<title>([^<]*?)(?: — [^<]*)?<\/title>/.exec(pages['index.html']) || [, 'Gridlock Coach'])[1].trim();
const payload = JSON.stringify(pages).replace(/</g, '\\u003c');
const output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;background:#0b0c0d}iframe{display:block}</style></head><body><iframe id="view" title="${title}"></iframe><script>const pages=${payload};const view=document.getElementById('view');function show(name,anchor){if(!pages[name])return;view.srcdoc=pages[name];view.onload=()=>{const doc=view.contentDocument;doc.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const href=link.getAttribute('href')||'';const parts=href.split('#');if(pages[parts[0]]){event.preventDefault();show(parts[0],parts[1]);}});if(anchor)doc.getElementById(anchor)?.scrollIntoView();};}show('index.html');<\/script></body></html>`;
fs.mkdirSync(path.dirname(OUT), {recursive:true});
fs.writeFileSync(OUT, output);
console.log(`${path.relative(ROOT, OUT)}: ${(Buffer.byteLength(output)/1048576).toFixed(2)} MB; four embedded pages (${title})`);
