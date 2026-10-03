#!/usr/bin/env node
/* The social preview image: 1200×630, three captures — Playbook, Tally,
   Scout — standing on the dark ground with the mark beside them. No words,
   on purpose: the same file serves every brand and the page's own og:title
   carries the name. Reads site/img/shots/, so run it after npm run shots. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const SITE = path.join(__dirname, "..", "site");
(async () => {
  const W = 1200, H = 630, TOP = 36, GAP = 28;
  const shots = ["playbook", "tally", "scout"].map(n => path.join(SITE, "img", "shots", `${n}.png`));
  for (const f of shots) if (!fs.existsSync(f)) throw new Error(`No capture at ${path.relative(process.cwd(), f)}; run npm run shots first.`);
  // Each phone scaled to a common width, then cropped to the frame height so
  // the header, the call and the field are what shows.
  const PW = 300;
  const phones = [];
  for (const f of shots) {
    const buf = await sharp(f).resize({ width: PW }).png().toBuffer();
    const m = await sharp(buf).metadata();
    phones.push(await sharp(buf).extract({ left: 0, top: 0, width: PW, height: Math.min(m.height, H - TOP) }).png().toBuffer());
  }
  const icon = await sharp(path.join(SITE, "img", "icon-512.png")).resize(150, 150).png().toBuffer();
  const left0 = 60;
  const ground = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0b0c0d"/>
    <rect x="0" y="${H - 6}" width="${W}" height="6" fill="#ad1515"/></svg>`);
  const comps = phones.map((p, i) => ({ input: p, left: left0 + i * (PW + GAP), top: TOP }));
  const iconLeft = left0 + 3 * (PW + GAP) + 40;
  comps.push({ input: icon, left: iconLeft, top: Math.round(H / 2) - 75 });
  const out = await sharp(ground).composite(comps).png({ compressionLevel: 9 }).toBuffer();
  const dest = path.join(SITE, "img", "og.png");
  fs.writeFileSync(dest, out);
  console.log(`${path.relative(process.cwd(), dest)}: ${(out.length / 1024).toFixed(0)} KB, ${W}×${H}`);
})().catch(e => { console.error(e.message); process.exit(1); });
