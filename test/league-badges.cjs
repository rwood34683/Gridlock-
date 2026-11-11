"use strict";
// No league logo or event badge ships: not in web/, not in the native shells,
// not in the one-file app, not in the offline cache, not in a cloud build.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const ROOT=path.resolve(__dirname,"..");
const BADGES=["event-nxl-worldcup.jpg","event-usxbl-gp.jpg","event-wcppl-champ.jpg"];
const REF=/event-(?:nxl|usxbl|wcppl|mlpb)[\w-]*\.(?:jpe?g|png|svg|webp|gif)|\bevLogo\b|\bEVENT_LOGO\b|class="evlogo/i;
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+"\n"+e.stack);}}
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const outputs=[path.join(ROOT,"web"),path.join(ROOT,"ios/App/App/public"),path.join(ROOT,"android/app/src/main/assets/public")];
test("no badge file is in web/ or either native shell",()=>{
 for(const dir of outputs)for(const f of walk(dir)){assert.ok(!BADGES.includes(path.basename(f)),"ships "+f);assert.ok(!/^event-/i.test(path.basename(f)),"an event image ships: "+f);}
});
test("no app file, shell copy or the one-file app names a badge",()=>{
 const files=[...outputs.flatMap(walk).filter(f=>/\.(?:html|js|json|webmanifest)$/.test(f)),path.join(ROOT,"site/app.html")];
 for(const f of files){const t=fs.readFileSync(f,"utf8");assert.ok(!REF.test(t),"badge reference in "+path.relative(ROOT,f)+": "+(t.match(REF)||[])[0]);}
});
test("the offline cache lists no image but the app's own icons and logo",()=>{
 const sw=fs.readFileSync(path.join(ROOT,"web/sw.js"),"utf8"),files=JSON.parse(sw.match(/const FILES = (\[[^\]]*\])/)[1]),opt=JSON.parse(sw.match(/const OPTIONAL = (\[[^\]]*\])/)[1]);
 const images=[...files,...opt].filter(f=>/\.(?:jpe?g|png|svg|webp|gif)$/.test(f)).sort();
 assert.deepEqual(images,["apple-touch-icon.png","icon-192.png","icon-512.png","icon.svg","logo-gridlock.png"]);
});
test("a cloud build carries no badge and names none",()=>{
 const {build}=require("../scripts/cloud-build");const out=path.join(ROOT,"dist","badge-check");
 try{
  build({url:"https://fixture.supabase.co",anonKey:"sb_publishable_abcdefghijklmnopqrstuvwxyz",redirectTo:"https://app.example.test/",outDir:out});
  const files=walk(out);assert.ok(files.length>10);
  for(const f of files){assert.ok(!/^event-/i.test(path.basename(f)),"cloud build ships "+f);if(/\.(?:html|js|json|webmanifest)$/.test(f))assert.ok(!REF.test(fs.readFileSync(f,"utf8")),"badge reference in "+f);}
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
console.log(`League badges: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
