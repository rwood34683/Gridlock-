#!/usr/bin/env node
// A valid standalone document, also used by the static companion site.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
// One self-contained HTML document from a web directory: scripts inlined,
// linked images and styles turned into data URIs. scripts/brand.js bundles a
// transformed copy the same way, so the logic lives here once.
function bundle(web = WEB) {
  let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
  html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/g, (tag, rel) => {
    if (/^[a-z]+:/i.test(rel)) throw new Error(`External script cannot be bundled: ${rel}`);
    if (/^(?:pwa|register-sw|offline)\.js$/.test(rel)) return '<!-- Offline caching is provided by the full web build. -->';
    const file = path.resolve(web, rel);
    if (!file.startsWith(web + path.sep)) throw new Error('Script path escapes web directory');
    return `<script>\n${fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`;
  });
  html = html.replace(/<link\b[^>]*rel="manifest"[^>]*>/g, '');
  html = html.replace(/(<link\b[^>]*href=")([^"\s]+)("[^>]*>)/g, (tag, before, rel, after) => {
    if (/^(?:data:|https?:)/i.test(rel)) return tag;
    const file = path.join(web, rel);
    if (!fs.existsSync(file)) throw new Error(`Missing linked asset: ${rel}`);
    const mime = {'.svg':'image/svg+xml','.png':'image/png','.css':'text/css'}[path.extname(file)];
    if (!mime) return tag;
    return `${before}data:${mime};base64,${fs.readFileSync(file).toString('base64')}${after}`;
  });
  return html;
}
if (require.main === module) {
  const html = bundle();
  for (const rel of ['site/app.html', 'site/build/app.html']) {
    const file = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, html);
    console.log(`${rel}: ${(Buffer.byteLength(html)/1024).toFixed(0)} KB`);
  }
}
module.exports = { bundle };
