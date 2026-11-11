#!/usr/bin/env node
// Render the app's ball mark and the variants' neutral mark locally.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const source = path.join(__dirname, 'icon.svg');
const foreground = path.join(__dirname, 'foreground.svg');
const nativeOnly = process.argv.includes('--native-only');
const brandFlag = process.argv.indexOf('--brand');
const brands = require('./brands.json');
const nativeBrand = brandFlag < 0 ? brands.default : process.argv[brandFlag + 1];
if (!brands.brands[nativeBrand]) throw new Error('Unknown icon brand');
const shared = path.join(__dirname, 'shared-icons');
const canonical = path.join(__dirname, 'native-gridlock');
const digest = data => require('node:crypto').createHash('sha256').update(data).digest('hex');
const nativeFiles = [];
function remember(file) { if (/^(ios|android)\//.test(path.relative(ROOT,file).replace(/\\/g,'/'))) nativeFiles.push(file); }
let written = 0;
async function render(svg, file, w, h = w, background = '#0b0c0d') {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  let pipeline = sharp(svg).resize(w, h, {fit:'contain', background:background || {r:0,g:0,b:0,alpha:0}});
  if (background) pipeline = pipeline.flatten({background});
  await pipeline.png({palette:true,colors:256,effort:10}).toFile(file);
  remember(file);
  written++;
}
async function main() {
  // A brand switch copies the reviewed pixels. Re-encoding a palette PNG on
  // another OS can change its bytes, even with the same Sharp version.
  if (nativeOnly && nativeBrand === brands.default) {
    const manifest = JSON.parse(fs.readFileSync(path.join(canonical,'manifest.json'),'utf8'));
    if (manifest.sourceSha !== digest(fs.readFileSync(path.join(__dirname,'logo-gridlock.png')))) throw new Error('Run npm run icons after changing the ball artwork');
    for (const [rel,hash] of Object.entries(manifest.files)) {
      if (!/^(ios\/App\/App\/Assets\.xcassets|android\/app\/src\/main\/res)\/[\w@./-]+\.png$/.test(rel) || rel.includes('..')) throw new Error('Invalid canonical icon path');
      const bytes=fs.readFileSync(path.join(canonical,rel));
      if (digest(bytes)!==hash) throw new Error('Canonical icon changed: '+rel);
      const file=path.join(ROOT,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);
    }
    console.log(`Restored ${Object.keys(manifest.files).length} canonical Gridlock native assets.`);return;
  }
  const ball = await sharp(path.join(__dirname, 'logo-gridlock.png')).resize(512,512).png({palette:true,colors:256,effort:10}).toBuffer();
  const art = (size, background) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><title>Gridlock ball</title>${background ? '<rect width="1024" height="1024" fill="#0b0c0d"/>' : ''}<image x="${(1024-size)/2}" y="${(1024-size)/2}" width="${size}" height="${size}" href="data:image/png;base64,${ball.toString('base64')}"/></svg>\n`);
  // The visible ball is inside the central 80% circle for maskable web icons,
  // and the smaller 66% Android adaptive safe area. Nothing clips its lettering.
  const appIcon = art(900,true), adaptive = art(740,false), splash = art(520,true);
  const nativeIcon = nativeBrand === brands.default ? appIcon : source;
  const nativeForeground = nativeBrand === brands.default ? adaptive : foreground;
  const nativeSplash = nativeBrand === brands.default ? splash : path.join(__dirname,'splash.svg');
  if (!nativeOnly) {
    fs.mkdirSync(shared,{recursive:true});
    fs.copyFileSync(source,path.join(shared,'icon.svg'));
    for (const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]) {
      await render(source,path.join(shared,name),size);
      await render(appIcon,path.join(ROOT,'web',name),size);
    }
    fs.writeFileSync(path.join(ROOT,'web/icon.svg'),appIcon);
    fs.writeFileSync(path.join(ROOT,'web/logo-gridlock.png'),ball);
    await render(appIcon,path.join(OUT,'app-store-icon-1024.png'),1024);
    await render(appIcon,path.join(OUT,'play-store-icon-512.png'),512);
    await render(appIcon,path.join(OUT,'icon-1024.png'),1024);
    await render(adaptive,path.join(OUT,'icon-foreground-1024.png'),1024,1024,null);
    await render(splash,path.join(OUT,'splash-2732.png'),2732);
    await render(splash,path.join(OUT,'splash-portrait.png'),1284,2778);
    await render(splash,path.join(OUT,'splash-landscape.png'),2778,1284);
    fs.mkdirSync(path.join(ROOT,'site/img'),{recursive:true});
    fs.copyFileSync(source,path.join(ROOT,'site/img/icon.svg'));
  }
  const ios = path.join(ROOT, 'ios/App/App/Assets.xcassets');
  if (fs.existsSync(ios)) {
    await render(nativeIcon, path.join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'), 1024);
    const splashSet = path.join(ios, 'Splash.imageset');
    if (fs.existsSync(splashSet)) {
      let names = ['splash-2732x2732.png'];
      const contents = path.join(splashSet, 'Contents.json');
      if (fs.existsSync(contents)) names = [...new Set(JSON.parse(fs.readFileSync(contents,'utf8')).images.map(i=>i.filename).filter(Boolean))];
      for (const name of names) await render(nativeSplash, path.join(splashSet, name), 2732);
    }
  }
  const android = path.join(ROOT, 'android/app/src/main/res');
  if (fs.existsSync(android)) for (const [density, scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
    const dir = path.join(android, `mipmap-${density}`);
    await render(nativeIcon, path.join(dir, 'ic_launcher.png'), Math.round(48*scale));
    const size = Math.round(48*scale);
    const round = await sharp(nativeIcon).resize(size,size).composite([{input:Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`),blend:'dest-in'}]).png().toBuffer();
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), round);remember(path.join(dir,'ic_launcher_round.png')); written++;
    await render(nativeForeground, path.join(dir,'ic_launcher_foreground.png'), Math.round(108*scale), Math.round(108*scale), null);
    await render(nativeSplash, path.join(android,`drawable-port-${density}/splash.png`), Math.round(320*scale), Math.round(480*scale));
    await render(nativeSplash, path.join(android,`drawable-land-${density}/splash.png`), Math.round(480*scale), Math.round(320*scale));
  }
  if (fs.existsSync(android)) await render(nativeSplash,path.join(android,'drawable/splash.png'),480,800);
  if (!nativeOnly && nativeBrand === brands.default) {
    const files={};
    for (const file of nativeFiles) {
      const rel=path.relative(ROOT,file).replace(/\\/g,'/'),bytes=fs.readFileSync(file),dest=path.join(canonical,rel);
      fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);files[rel]=digest(bytes);
    }
    fs.writeFileSync(path.join(canonical,'manifest.json'),JSON.stringify({sourceSha:digest(fs.readFileSync(path.join(__dirname,'logo-gridlock.png'))),files},null,2)+'\n');
  }
  console.log(`Rendered ${written} PNG assets. Native icons: ${nativeBrand}.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
