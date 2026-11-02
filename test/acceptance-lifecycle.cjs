"use strict";
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{launchOptions}=require('../scripts/browser.js');
const root=process.env.GRIDLOCK_TEST_ARTIFACT_DIR||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gridlock-lifecycle-'));fs.mkdirSync(root,{recursive:true});
const variants=[[process.env.ACCEPTANCE_LABEL||'app',process.env.APP_URL||'http://localhost:5173/']];
const results=[];
async function settled(p){await p.evaluate(async()=>{if(typeof _localSaveTail!=='undefined')await _localSaveTail;});}
async function open(ctx,url){const p=await ctx.newPage();p.on('dialog',d=>d.accept());p.on('pageerror',e=>{throw e;});await p.goto(url);await settled(p);return p;}
async function seed(p){await p.evaluate(async()=>{S.entered=true;S.role='staff';S.fmtDone=true;S.fmtAsk=false;S.tab='more';S.more='nexus';S.results=[];S.roster=[];save(S);render();if(typeof _localSaveTail!=='undefined')await _localSaveTail;});}
async function test(variant,name,fn){try{await fn();results.push({variant,name,passed:true});console.log('PASS '+variant+' '+name);}catch(e){results.push({variant,name,passed:false,error:e.message});console.error('FAIL '+variant+' '+name+' '+e.message);}}
function holdStorage(){const add=window.addEventListener.bind(window);window.__holdStorage=false;window.__heldStorage=[];window.addEventListener=(name,fn,opts)=>add(name,name==='storage'?(e=>{if(window.__holdStorage)window.__heldStorage.push(()=>fn(e));else fn(e);}):fn,opts);}
(async()=>{
 for(const [variant,url]of variants){
  await test(variant,'both edits survive closing every tab before delayed storage events run',async()=>{
   const profile=fs.mkdtempSync(path.join(root,variant+'-cold-'));let c;
   try{
    c=await chromium.launchPersistentContext(profile,launchOptions({viewport:{width:390,height:844},serviceWorkers:'block'}));await c.addInitScript(holdStorage);
    const a=await open(c,url);await seed(a);const b=await open(c,url);const baseline=await b.evaluate(()=>localStorage.getItem('gridlock.coach.v2'));
    for(const p of [a,b])await p.evaluate(()=>{window.__holdStorage=true;});
    await a.evaluate(()=>{S.results.push({m:S.matchId,pt:1,won:'us',at:1});save(S);});await settled(a);
    await b.evaluate(base=>{const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){return k==='gridlock.coach.v2'?base:get.call(this,k);};try{S.roster.push({name:'Cold restart player',num:7,p:'',s:''});save(S);}finally{Storage.prototype.getItem=get;}},baseline);
    await c.close();c=null;
    c=await chromium.launchPersistentContext(profile,launchOptions({serviceWorkers:'block'}));const p=await open(c,url);
    const records=await p.evaluate(()=>{const rows=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k==='gridlock.coach.v2'||k.startsWith('gridlock.coach.v2.tab.')){try{const d=JSON.parse(localStorage.getItem(k));rows.push(d.data||d);}catch(e){}}else if(k.startsWith('gridlock.coach.v2.tab-copy.')){try{rows.push(JSON.parse(localStorage.getItem(k)));}catch(e){}}}return rows;});
    assert(records.some(d=>d.results?.some(r=>r.pt===1&&r.won==='us')),'the point must survive browser shutdown');
    assert(records.some(d=>d.roster?.some(r=>r.name==='Cold restart player')),'the roster edit must survive browser shutdown');
   }finally{if(c)await c.close();}
  });
  const browser=await chromium.launch(launchOptions());
  try{
   await test(variant,'full exported backup restores map, long names and 200 points without merge duplicates',async()=>{
    const c=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});let d;
    try{
     const p=await open(c,url);await seed(p);
     const expected=await p.evaluate(async()=>{
      document.getElementById('field-name').value='Backup fixture';newField();const key=S.fieldEdit.key;
      const canvas=document.createElement('canvas');canvas.width=40;canvas.height=20;const g=canvas.getContext('2d');g.fillStyle='blue';g.fillRect(0,0,40,20);await fieldMapLoad(key,canvas.toDataURL('image/png'));
      S.roster=[{name:'Alexandria Longname Player',num:17,p:'snake',s:'centre'}];S.messages=['Backup test note'];
      const template=S.matches[0];S.matches=Array.from({length:10},(_,i)=>({...template,id:'acceptance-match-'+i,vs:'Long Opponent Team Name '+i}));S.matchId=S.matches[0].id;
      S.results=S.matches.flatMap(m=>Array.from({length:20},(_,i)=>({m:m.id,pt:i+1,won:i%2?'us':'them',at:i+1})));save(S);if(typeof _localSaveTail!=='undefined')await _localSaveTail;
      return {map:mapOf(fieldOf(key)),key,roster:S.roster[0].name};
     });
     const download=p.waitForEvent('download');await p.evaluate(()=>saveCopy('all'));const file=await download;const dest=path.join(root,variant+'-backup.json');await file.saveAs(dest);const raw=fs.readFileSync(dest,'utf8');assert.equal(JSON.parse(raw).data.results.length,200);
     d=await browser.newContext({serviceWorkers:'block'});const q=await open(d,url);await seed(q);
     const loaded=await q.evaluate(async text=>{const ok=loadCopy('replace',text);if(typeof _localSaveTail!=='undefined')await _localSaveTail;return{ok,status:S.copyStatus,points:S.results.length,roster:S.roster[0]?.name,map:mapOf(fieldOf(S.fields[0]?.key))};},raw);
     assert.equal(loaded.ok,true,loaded.status);assert.equal(loaded.points,200);assert.equal(loaded.roster,expected.roster);assert.equal(loaded.map,expected.map);
     await q.evaluate(async text=>{loadCopy('merge',text);loadCopy('merge',text);if(typeof _localSaveTail!=='undefined')await _localSaveTail;},raw);assert.equal(await q.evaluate(()=>S.results.length),200);
     await q.reload();assert.equal(await q.evaluate(()=>S.results.length),200);
    }finally{if(d)await d.close();await c.close();}
   });
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(root,'lifecycle-'+(process.env.ACCEPTANCE_VARIANT||'both')+'.json'),JSON.stringify(results,null,2)+'\n');
 if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
