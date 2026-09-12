#!/usr/bin/env node
// Portable resizing and palette optimization of real screenshot captures.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const dir = path.resolve(__dirname, '../site/img/shots');
async function main() {
  if (!fs.existsSync(dir)) throw new Error('No screenshots found. Run npm run shots with the app server running.');
  const files = fs.readdirSync(dir).filter(file=>file.endsWith('.png')).sort();
  if (!files.length) throw new Error('No PNG screenshots found. Run scripts/capture-shots.js first.');
  let bytes = 0;
  for (const file of files) {
    const target = path.join(dir, file);
    const output = await sharp(fs.readFileSync(target)).resize({width:640,withoutEnlargement:true}).png({palette:true,colours:256,compressionLevel:9}).toBuffer();
    fs.writeFileSync(target, output);
    bytes += output.length;
    console.log(`${file.padEnd(20)} ${(output.length/1024).toFixed(0)} KB`);
  }
  console.log(`Total: ${(bytes/1024).toFixed(0)} KB`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
