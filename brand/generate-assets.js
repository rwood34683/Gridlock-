#!/usr/bin/env node
// Render the source SVGs locally; no OS-specific image tools or network needed.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const source = path.join(__dirname, 'icon.svg');
const foreground = path.join(__dirname, 'foreground.svg');
let written = 0;
async function render(svg, file, w, h = w, background = '#0b0c0d') {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  let pipeline = sharp(svg).resize(w, h, {fit:'contain', background:background || {r:0,g:0,b:0,alpha:0}});
  if (background) pipeline = pipeline.flatten({background});
  await pipeline.png().toFile(file);
  written++;
}
async function main() {
  await render(source, path.join(OUT, 'app-store-icon-1024.png'), 1024);
  await render(source, path.join(OUT, 'play-store-icon-512.png'), 512);
  for (const size of [192,512]) await render(source, path.join(ROOT, `web/icon-${size}.png`), size);
  await render(source, path.join(ROOT, 'web/apple-touch-icon.png'), 180);
  await render(path.join(__dirname, 'splash.svg'), path.join(OUT, 'splash-portrait.png'), 1284, 2778);
  await render(path.join(__dirname, 'splash.svg'), path.join(OUT, 'splash-landscape.png'), 2778, 1284);
  fs.mkdirSync(path.join(ROOT, 'site/img'), {recursive:true});
  fs.copyFileSync(source, path.join(ROOT, 'site/img/icon.svg'));
  const ios = path.join(ROOT, 'ios/App/App/Assets.xcassets');
  if (fs.existsSync(ios)) {
    await render(source, path.join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'), 1024);
    const splashSet = path.join(ios, 'Splash.imageset');
    if (fs.existsSync(splashSet)) {
      let names = ['splash-2732x2732.png'];
      const contents = path.join(splashSet, 'Contents.json');
      if (fs.existsSync(contents)) names = [...new Set(JSON.parse(fs.readFileSync(contents,'utf8')).images.map(i=>i.filename).filter(Boolean))];
      for (const name of names) await render(path.join(__dirname, 'splash.svg'), path.join(splashSet, name), 2732);
    }
  }
  const android = path.join(ROOT, 'android/app/src/main/res');
  if (fs.existsSync(android)) for (const [density, scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
    const dir = path.join(android, `mipmap-${density}`);
    await render(source, path.join(dir, 'ic_launcher.png'), Math.round(48*scale));
    const size = Math.round(48*scale);
    const round = await sharp(source).resize(size,size).composite([{input:Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`),blend:'dest-in'}]).png().toBuffer();
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), round); written++;
    await render(foreground, path.join(dir,'ic_launcher_foreground.png'), Math.round(108*scale), Math.round(108*scale), null);
    await render(path.join(__dirname,'splash.svg'), path.join(android,`drawable-port-${density}/splash.png`), Math.round(320*scale), Math.round(480*scale));
    await render(path.join(__dirname,'splash.svg'), path.join(android,`drawable-land-${density}/splash.png`), Math.round(480*scale), Math.round(320*scale));
  }
  console.log(`Rendered ${written} PNG assets; copied the site SVG. Native directories are updated when present.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
