#!/usr/bin/env node
// Structural checks run locally; --release also requires operator-owned details.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const rows = [];
const warnings = [];
const ok = (name, pass, detail = '') => rows.push({name, pass:!!pass, detail});
const release = process.argv.includes('--release');
const read = rel => fs.readFileSync(path.join(SITE, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(SITE, rel));
const pages = ['index.html', 'privacy.html', 'support.html', 'app.html'];
for (const page of pages) {
  if (!exists(page)) { ok(`${page} exists`, false, page === 'app.html' ? 'run npm run app:artifact' : 'missing'); continue; }
  const html = read(page);
  ok(`${page} has a complete document`, /<!doctype html>/i.test(html) && /<html[^>]*lang="en"/i.test(html) && /<title>.+?<\/title>/i.test(html) && /name="viewport"/.test(html));
  const broken = [];
  // Inline app code includes dynamically generated href attributes; inspect its shell only.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const match of markup.matchAll(/\b(?:href|src)="([^"\s]+)"/g)) {
    const ref = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\$\{)/i.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = path.resolve(SITE, clean);
    if (!target.startsWith(SITE + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) broken.push(clean);
  }
  ok(`${page} local assets and links exist`, broken.length === 0, [...new Set(broken)].join(', '));
  if (page !== 'app.html') ok(`${page} has no remote fonts or scripts`, !/<(?:script|link)[^>]+(?:src|href)="https?:/i.test(html));
}
ok('Static styles and favicon exist', exists('styles.css') && exists('img/icon.svg'));
ok('Dot-directory is retained on static hosts', exists('.nojekyll'));
let config = {};
try { config = JSON.parse(read('contact.json')); ok('Contact configuration is valid', true); } catch (err) { ok('Contact configuration is valid', false, err.message); }
let associations;
try { associations = JSON.parse(read('.well-known/assetlinks.json')); ok('App-link association is valid JSON array', Array.isArray(associations)); } catch (err) { ok('App-link association is valid JSON array', false, err.message); }
for (const [key, label] of [['domain','Owned domain'], ['email','Monitored support email'], ['appstore','App Store listing ID'], ['play','Google Play listing URL'], ['sha256','Android release signing fingerprint']]) {
  if (!config[key]) { if (release) ok(label, false, 'not configured'); else warnings.push(`${label} is not configured.`); }
}
if (config.domain) ok('CNAME agrees with configured domain', exists('CNAME') && read('CNAME').trim() === config.domain);
if (config.email) for (const file of ['support.html','privacy.html']) ok(`${file} uses configured support email`, read(file).includes(`mailto:${config.email.replace(/&/g,'&amp;').replace(/'/g,'&#39;')}`));
if (config.sha256) {
  const appId = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8')).appId;
  ok('App links match app ID and signing fingerprint', associations?.some(item => item.target?.package_name === appId && item.target.sha256_cert_fingerprints?.includes(config.sha256)));
}
console.log('GRIDLOCK site check' + (release ? ' (release)' : ' (local)'));
for (const row of rows) console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.name}${row.detail ? ': '+row.detail : ''}`);
for (const warning of warnings) console.log(`PENDING ${warning}`);
console.log(`${rows.filter(row => row.pass).length}/${rows.length} checks passed. Release ownership and publication remain manual.`);
process.exitCode = rows.some(row => !row.pass) ? 1 : 0;
