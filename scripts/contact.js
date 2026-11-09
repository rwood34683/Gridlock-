#!/usr/bin/env node
// Explicit release values. A domain never implies an email inbox.
//
// The default brand's contact lives in site/contact.json and this CLI writes it
// straight into the committed site. Every other brand keeps its own file (named
// in brand/brands.json) and is stamped at build time by scripts/brand.js, which
// reuses the helpers exported here so the two can never drift.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'site/contact.json');
const KEYS = ['domain', 'email', 'appstore', 'play', 'sha256', 'app', 'appleTeam'];
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function readContact(file = CONFIG) {
  const config = Object.fromEntries(KEYS.map(key => [key, null]));
  if (fs.existsSync(file)) Object.assign(config, JSON.parse(fs.readFileSync(file, 'utf8')));
  return config;
}
// Validate every requested value before anything is written. Returns the new
// config; throws one sentence naming the first thing wrong.
function apply(config, args) {
  const next = { ...config };
  if (!args.length) throw new Error('Expected --domain, --email, --appstore, --play, --sha256, --app or --appleTeam followed by a value.');
  for (let n = 0; n < args.length; n += 2) {
    const key = String(args[n]).replace(/^--/, '');
    const value = String(args[n + 1] || '').trim();
    if (!KEYS.includes(key) || !String(args[n]).startsWith('--') || !value || value.startsWith('--')) throw new Error('Expected --domain, --email, --appstore, --play, --sha256, --app or --appleTeam followed by a value.');
    if (key === 'domain' && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)) throw new Error('Domain must be a hostname without a scheme or path.');
    if (key === 'email' && !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(value)) throw new Error('Enter a valid support email address.');
    if (key === 'appstore' && !/^(?:id)?[1-9]\d{4,}$/.test(value)) throw new Error('App Store ID must be the numeric ID assigned by Apple.');
    if (key === 'play') {
      let url;
      try { url = new URL(value); } catch { throw new Error('Use the HTTPS Google Play app-details URL.'); }
      if (url.origin !== 'https://play.google.com' || url.pathname !== '/store/apps/details' || !url.searchParams.get('id')) throw new Error('Use the HTTPS Google Play app-details URL.');
    }
    if (key === 'app') {
      let url;
      try { url = new URL(value); } catch { throw new Error('The app address must be the HTTPS address of the live web app, like https://app.example.com/.'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('The app address must be the HTTPS address of the live web app, like https://app.example.com/.');
    }
    if (key === 'sha256' && !/^(?:[0-9a-f]{2}:){31}[0-9a-f]{2}$/i.test(value)) throw new Error('SHA-256 must contain 32 colon-separated hexadecimal pairs.');
    if (key === 'appleTeam' && !/^[A-Z0-9]{10}$/i.test(value)) throw new Error('Apple Team ID is the 10-character ID in Apple Developer > Membership details.');
    next[key] = key === 'appstore' ? value.replace(/^id/, '') : key === 'domain' ? value.toLowerCase() : key === 'sha256' || key === 'appleTeam' ? value.toUpperCase() : key === 'app' ? new URL(value).href : value;
  }
  return next;
}
function supportBlock(config, short) {
  return config.email
    ? `<p>Email <a href="mailto:${esc(config.email)}">${esc(config.email)}</a>. Include the device, app or browser version, and what happened.</p>`
    : `<p>A support contact has not been configured for this distribution. Contact the person who supplied your copy of ${esc(short)}.</p>`;
}
function stampSupport(text, config, short) {
  return stampSocial(text.replace(/<!-- support-contact:start -->[\s\S]*?<!-- support-contact:end -->/g, `<!-- support-contact:start -->${supportBlock(config, short)}<!-- support-contact:end -->`), config);
}
// Social preview tags need an absolute image URL, so they exist only once a
// domain is configured. The image itself carries no words, so it is the same
// file in every brand. The page's own og:title and description sit outside the
// marker and are brand-transformed like any other text.
function socialBlock(config, page) {
  if (!config.domain) return '';
  const base = `https://${esc(config.domain)}/`;
  return `<meta property="og:url" content="${base}${page}"><meta property="og:image" content="${base}img/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
}
function stampSocial(text, config) {
  const page = /<title>Support/.test(text) ? 'support.html' : /<title>Privacy/.test(text) ? 'privacy.html' : '';
  return text.replace(/<!-- social:start -->[\s\S]*?<!-- social:end -->/, `<!-- social:start -->${socialBlock(config, page)}<!-- social:end -->`);
}
function stampIndex(text, config) {
  text = stampSocial(text, config);
  const stores = [];
  if (config.appstore) stores.push(`<a href="https://apps.apple.com/app/id${config.appstore}">View on the App Store</a>`);
  if (config.play) stores.push(`<a href="${esc(config.play)}">View on Google Play</a>`);
  return text.replace(/<!-- store-links:start -->[\s\S]*?<!-- store-links:end -->/, `<!-- store-links:start -->${stores.join('') || '<span class="store-status">Store downloads are not available in this build.</span>'}<!-- store-links:end -->`);
}
// Where the site's "Open the app" buttons go once it is published: the live web
// app (with accounts) when one is configured, else the offline copy the build
// puts at app/. The committed pages keep href="app.html", so a local preview of
// site/ still opens the single-file copy beside it.
function appHref(config, fallback = 'app/') {
  return config && config.app ? config.app : fallback;
}
function linkApp(text, config, fallback = 'app/') {
  return text.replaceAll('href="app.html"', `href="${esc(appHref(config, fallback))}"`);
}
// Android: app links, and the password a coach saved on the website offered in
// the app (and the other way round) — get_login_creds.
function assetLinks(config, appId) {
  const association = config.sha256 ? [{relation:['delegate_permission/common.handle_all_urls', 'delegate_permission/common.get_login_creds'], target:{namespace:'android_app',package_name:appId,sha256_cert_fingerprints:[config.sha256]}}] : [];
  return JSON.stringify(association, null, 2) + '\n';
}
// iPhone: the password a coach saved on the website, offered by iCloud Keychain
// in the app. It names the app as <Team ID>.<bundle id>; with no Team ID set the
// list is empty, which is valid and simply offers nothing.
function appleAssociation(config, appId) {
  const apps = config.appleTeam ? [`${config.appleTeam}.${appId}`] : [];
  return JSON.stringify({webcredentials: {apps}}, null, 2) + '\n';
}
// The web hosts a coach can have saved a password on: the site's own domain
// and the live web app's. The phone app and both files name the same list.
function credentialHosts(config) {
  const hosts = [];
  if (config.domain) hosts.push(String(config.domain).toLowerCase());
  if (config.app) { try { const h = new URL(config.app).hostname.toLowerCase(); if (!hosts.includes(h)) hosts.push(h); } catch {} }
  return hosts;
}
function defaultShort() {
  try {
    const brands = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand/brands.json'), 'utf8'));
    return brands.brands[brands.default].short;
  } catch { return 'Gridlock'; }
}
function main() {
  const config = readContact();
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log(`${defaultShort()} release contact settings`);
    for (const key of KEYS) console.log(`  ${key.padEnd(10)} ${config[key] || 'not configured'}`);
    return;
  }
  const next = apply(config, args);
  const short = defaultShort();
  const pending = new Map();
  function update(rel, transform) { const file = path.join(ROOT, rel); if (fs.existsSync(file)) pending.set(file, transform(fs.readFileSync(file, 'utf8'))); }
  for (const rel of ['site/support.html', 'site/privacy.html']) update(rel, text => stampSupport(text, next, short));
  update('site/index.html', text => stampIndex(text, next));
  if (next.domain) {
    pending.set(path.join(ROOT, 'site/CNAME'), next.domain + '\n');
    update('android/app/src/main/AndroidManifest.xml', text => require('./configure-native').withAndroidDomain(text, next.domain));
  }
  const appId = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8')).appId;
  pending.set(path.join(ROOT, 'site/.well-known/assetlinks.json'), assetLinks(next, appId));
  pending.set(path.join(ROOT, 'site/.well-known/apple-app-site-association'), appleAssociation(next, appId));
  pending.set(CONFIG, JSON.stringify(next, null, 2) + '\n');
  for (const [file, contents] of pending) fs.writeFileSync(file, contents);
  console.log(`Updated ${pending.size} local files. No registration, mailbox creation, submission or publication was performed.`);
  console.log('Regenerate artifacts and run npm run site:check -- --release before publishing.');
}
if (require.main === module) { try { main(); } catch (err) { console.error(err.message); process.exitCode = 1; } }
module.exports = { appHref, linkApp, KEYS, readContact, apply, supportBlock, stampSupport, stampIndex, stampSocial, assetLinks, appleAssociation, credentialHosts };
