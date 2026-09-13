#!/usr/bin/env node
// Explicit release values. A domain never implies an email inbox.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'site/contact.json');
const keys = ['domain', 'email', 'appstore', 'play', 'sha256'];
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('GRIDLOCK release contact settings');
    for (const key of keys) console.log(`  ${key.padEnd(10)} ${config[key] || 'not configured'}`);
    return;
  }
  // Validate all requested values before writing any file.
  for (let n = 0; n < args.length; n += 2) {
    const key = args[n].replace(/^--/, '');
    const value = (args[n + 1] || '').trim();
    if (!keys.includes(key) || !args[n].startsWith('--') || !value || value.startsWith('--')) throw new Error('Expected --domain, --email, --appstore, --play or --sha256 followed by a value.');
    if (key === 'domain' && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)) throw new Error('Domain must be a hostname without a scheme or path.');
    if (key === 'email' && !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(value)) throw new Error('Enter a valid support email address.');
    if (key === 'appstore' && !/^(?:id)?[1-9]\d{4,}$/.test(value)) throw new Error('App Store ID must be the numeric ID assigned by Apple.');
    if (key === 'play') {
      const url = new URL(value);
      if (url.origin !== 'https://play.google.com' || url.pathname !== '/store/apps/details' || !url.searchParams.get('id')) throw new Error('Use the HTTPS Google Play app-details URL.');
    }
    if (key === 'sha256' && !/^(?:[0-9a-f]{2}:){31}[0-9a-f]{2}$/i.test(value)) throw new Error('SHA-256 must contain 32 colon-separated hexadecimal pairs.');
    config[key] = key === 'appstore' ? value.replace(/^id/, '') : key === 'domain' ? value.toLowerCase() : key === 'sha256' ? value.toUpperCase() : value;
  }
  const pending = new Map();
  function update(rel, transform) { const file = path.join(ROOT, rel); if (fs.existsSync(file)) pending.set(file, transform(fs.readFileSync(file, 'utf8'))); }
  const contact = config.email ? `<p>Email <a href="mailto:${esc(config.email)}">${esc(config.email)}</a>. Include the device, app or browser version, and what happened.</p>` : '<p>A support contact has not been configured for this distribution. Contact the person who supplied your copy of GRIDLOCK.</p>';
  for (const rel of ['site/support.html', 'site/privacy.html']) update(rel, text => text.replace(/<!-- support-contact:start -->[\s\S]*?<!-- support-contact:end -->/g, `<!-- support-contact:start -->${contact}<!-- support-contact:end -->`));
  const stores = [];
  if (config.appstore) stores.push(`<a href="https://apps.apple.com/app/id${config.appstore}">View on the App Store</a>`);
  if (config.play) stores.push(`<a href="${esc(config.play)}">View on Google Play</a>`);
  update('site/index.html', text => text.replace(/<!-- store-links:start -->[\s\S]*?<!-- store-links:end -->/, `<!-- store-links:start -->${stores.join('') || '<span class="store-status">Store downloads are not available in this build.</span>'}<!-- store-links:end -->`));
  if (config.domain) {
    pending.set(path.join(ROOT, 'site/CNAME'), config.domain + '\n');
    update('android/app/src/main/AndroidManifest.xml', text => require('./configure-native').withAndroidDomain(text, config.domain));
  }
  const appId = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8')).appId;
  const association = config.sha256 ? [{relation:['delegate_permission/common.handle_all_urls'], target:{namespace:'android_app',package_name:appId,sha256_cert_fingerprints:[config.sha256]}}] : [];
  pending.set(path.join(ROOT, 'site/.well-known/assetlinks.json'), JSON.stringify(association, null, 2) + '\n');
  pending.set(CONFIG, JSON.stringify(config, null, 2) + '\n');
  for (const [file, contents] of pending) fs.writeFileSync(file, contents);
  console.log(`Updated ${pending.size} local files. No registration, mailbox creation, submission or publication was performed.`);
  console.log('Regenerate artifacts and run npm run site:check -- --release before publishing.');
}
try { main(); } catch (err) { console.error(err.message); process.exitCode = 1; }
