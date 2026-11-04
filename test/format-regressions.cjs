"use strict";
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright-core'),{launchOptions}=require('../scripts/browser');
const {createServer}=require('../scripts/serve');
(async()=>{
 const server=createServer({root:process.env.FORMAT_WEB_ROOT||path.resolve(__dirname,'../web')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions()),results=[];
 async function check(name,fn){const c=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());try{
  await p.goto(url);await p.evaluate(async()=>{S.entered=true;S.role='staff';S.fmtDone=true;S.fmtAsk=false;S.tab='more';S.more='format';save(S);render();if(typeof _localSaveTail!=='undefined')await _localSaveTail;});
  await fn(p);assert.deepEqual(errors,[]);results.push({name,passed:true});console.log('PASS '+name);
 }catch(e){results.push({name,passed:false,error:e.message});console.error('FAIL '+name+': '+e.message);}finally{await c.close();}}
 try{
  await check('rulebook presets apply to a fresh sheet and survive reload',async p=>{
   for(const [div,time,mercy,size]of [['Semi-Pro',15,5,5],['Division 2',15,5,5],['Division 3',12,4,5],['Division 4',12,4,5],['Division 5',10,3,5],['3v3 Amateur',6,3,3],['3v3 Intermediate',6,3,3]]){
    const got=await p.evaluate(async div=>{setFmt('div',div);save(S);if(typeof _localSaveTail!=='undefined')await _localSaveTail;return{time:S.fmt.time,mercy:S.fmt.mercy,size:sideSize(),clock:S.fmt.clock,race:S.fmt.raceTo};},div);
    assert.deepEqual(got,{time,mercy,size,clock:120,race:0});
   }
   await p.reload();assert.equal(await p.evaluate(()=>S.fmt.div),'3v3 Intermediate');assert.equal(await p.evaluate(()=>S.fmt.time),6);
  });
  await check('saved split-deck override survives use, reload and a new sheet',async p=>{
   const got=await p.evaluate(async()=>{setFmt('div','Division 3');setFmt('clock',60);document.getElementById('fmtName').value='D3 split deck';saveFmt();const id=S.fmts[0].id;setFmt('div','Division 5');useFmt(id);save(S);if(typeof _localSaveTail!=='undefined')await _localSaveTail;return S.fmt;});
   assert.equal(got.time,12);assert.equal(got.clock,60);assert.equal(got.mercy,4);await p.reload();
   const match=await p.evaluate(()=>{openSheet({vs:'Format fixture'});return curMatch();});assert.equal(match.breakClock,60);assert.equal(match.mercy,4);assert.equal(match.div,'Division 3');
  });
  await check('overwriting a preset with legacy custom answers clears the old game time',async p=>{
   const got=await p.evaluate(()=>{setFmt('div','Division 3');document.getElementById('fmtName').value='My event';saveFmt();const id=S.fmts[0].id;S.fmt={div:'Pro',game:'xball',raceTo:7,mercy:0,clock:90};render();document.getElementById('fmtName').value='My event';saveFmt();useFmt(id);return{fmt:S.fmt,count:S.fmts.length};});
   assert.equal(got.count,1);assert.equal(got.fmt.div,'Pro');assert.equal(got.fmt.time,undefined,'custom answers must not inherit an old divisional game time');
  });
  await check('changing division preserves points and the size of an already played match',async p=>{
   const got=await p.evaluate(()=>{setFmt('div','Division 3');const id=S.matchId;S.results=[{m:id,pt:1,won:'us',at:1}];S.point=2;save(S);setFmt('div','3v3 Amateur');return{points:S.results,oldSize:sideSize(),nextGame:S.fmt.game,message:S.flash};});
   assert.equal(got.points.length,1);assert.equal(got.points[0].won,'us');assert.equal(got.oldSize,5);assert.equal(got.nextGame,'3');assert.match(got.message,/keeps 5 a side/);
  });
  await check('backup and repeated restore retain the format, presets and point records',async p=>{
   const raw=await p.evaluate(()=>{setFmt('div','Semi-Pro');setFmt('clock',45);document.getElementById('fmtName').value='Semi split';saveFmt();S.results=[{m:S.matchId,pt:1,won:'them',at:1}];showCopy('all');return S.copyText;});
   assert(raw);const restored=await p.evaluate(async raw=>{const ok=loadCopy('replace',raw);if(typeof _localSaveTail!=='undefined')await _localSaveTail;return{ok,time:S.fmt.time,clock:S.fmt.clock,presets:S.fmts.length,points:S.results.length};},raw);
   assert.deepEqual(restored,{ok:true,time:15,clock:45,presets:1,points:1});await p.reload();assert.equal(await p.evaluate(()=>S.fmts[0].clock),45);
  });
  await check('mercy 6 can be picked and ends the match at a six-point lead, not before',async p=>{
   await p.evaluate(()=>setFmt('div','Other'));
   await p.getByRole('button',{name:'6 points',exact:true}).click();
   const picked=await p.evaluate(()=>({fmt:S.fmt.mercy,on:[...document.querySelectorAll('[aria-label="Mercy rule"] button.on')].map(b=>b.textContent)}));
   assert.deepEqual(picked,{fmt:6,on:['6 points']});
   const got=await p.evaluate(()=>{openSheet({vs:'Mercy fixture'});const m=curMatch(),id=m.id;const score=n=>{S.results=Array.from({length:n},(_,i)=>({m:id,pt:i+1,won:'us',at:i+1}));S.point=n+1;};
    score(5);const at5=!!matchOver(id),mp5=!!matchPoint();score(6);return{mercy:m.mercy,at5,mp5,at6:!!matchOver(id)};});
   assert.deepEqual(got,{mercy:6,at5:false,mp5:true,at6:true});
   await p.reload();assert.equal(await p.evaluate(()=>S.fmt.mercy),6);
  });
  await check('every division in the owner\'s NXL format table fills in its clock, mercy and race',async p=>{
   const want={
    'Pro':['xball',15,6,0,5],'WNXL':['xball',15,5,0,5],'Semi-Pro':['xball',15,5,0,5],'Division 2':['xball',15,5,0,5],
    'Division 3':['xball',12,4,0,5],'Division 4':['xball',12,4,0,5],'Division 5':['xball',10,3,0,5],'Masters':['xball',10,3,0,5],
    'Pro 3-player':['3',7,3,0,3],'3v3 Amateur':['3',6,3,0,3],'3v3 Intermediate':['3',6,3,0,3],
    '3v3':['3',3,0,0,3],'5v5':['5',5,0,0,5],'7v7':['7',7,0,0,7],'10v10':['10',10,0,0,10],'Classic 5v5':['5',5,0,0,5],
    'College X-Ball':['xball',15,0,5,5]};
   for(const [div,[game,time,mercy,race,size]] of Object.entries(want)){
    const got=await p.evaluate(div=>{openSheet({vs:'Fixture '+div});setFmt('div',div);const m=curMatch();return{game:S.fmt.game,time:S.fmt.time,mercy:S.fmt.mercy,race:S.fmt.raceTo,size:sideSize(),mMercy:mercy(),mRace:raceTo(),text:document.getElementById('root').innerText};},div);
    assert.deepEqual([got.game,got.time,got.mercy,got.race,got.size],[game,time,mercy,race,size],div);
    assert.equal(got.mMercy,mercy,div+' mercy on the sheet');assert.equal(got.mRace,race,div+' race on the sheet');
    if(!['Semi-Pro','Division 2','Division 3','Division 4','Division 5','3v3 Amateur','3v3 Intermediate'].includes(div))assert.match(got.text,/from the NXL format reference \(4 Nov 2026\), not the divisional rulebook/,div);
   }
  });
  await check('the game clock row sits under Race to and above Mercy rule, and is kept',async p=>{
   const order=await p.evaluate(()=>['Race to','Game clock','Mercy rule'].map(l=>{const el=document.querySelector(`[aria-label="${l}"]`);return el?el.getBoundingClientRect().top:null;}));
   assert(order.every(Boolean),JSON.stringify(order));assert(order[0]<order[1]&&order[1]<order[2],JSON.stringify(order));
   await p.evaluate(()=>setFmt('div','Pro'));
   assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('[aria-label="Game clock"] button.on')].map(b=>b.textContent.trim())),['15 min']);
   await p.getByRole('button',{name:'12 min',exact:true}).click();
   assert.equal(await p.evaluate(()=>S.fmt.time),12);
   assert.match(await p.evaluate(()=>fmtSummary()),/12-min game/);
   await p.reload();assert.equal(await p.evaluate(()=>S.fmt.time),12);
   await p.getByRole('button',{name:'Off',exact:true}).first().click();
   assert.equal(await p.evaluate(()=>S.fmt.time),0);
  });
  await check('conventional 3v3 and 3-player X-Ball are separate groups, and the timed formats show their bracket',async p=>{
   const groups=await p.evaluate(()=>[...document.querySelectorAll('.seg[aria-label]')].map(el=>[el.getAttribute('aria-label'),[...el.querySelectorAll('button')].map(b=>b.textContent.trim())]).filter(([l])=>/X-Ball|Timed|Race to$/.test(l)));
   const g=Object.fromEntries(groups);
   assert.deepEqual(g['3-player X-Ball · game clock and mercy'],['Pro · World Cup','Amateur','Intermediate']);
   assert.deepEqual(g['Timed games · one clock, no mercy'],['3v3','5v5','7v7','10v10','Classic 5v5']);
   await p.evaluate(()=>setFmt('div','7v7'));
   assert.match(await p.evaluate(()=>document.getElementById('root').innerText),/win or go home\. That is the bracket, not the points in a game/);
  });
  await check('format screen fits phone and tablet with rule and custom choices',async p=>{
   for(const viewport of [{width:375,height:667},{width:820,height:1180}]){await p.setViewportSize(viewport);for(const div of ['Division 3','Other']){await p.evaluate(div=>setFmt('div',div),div);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}}
  });
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 if(process.env.FORMAT_RESULTS)fs.writeFileSync(process.env.FORMAT_RESULTS,JSON.stringify(results,null,2)+'\n');
 console.log(`${results.filter(x=>x.passed).length}/${results.length} format regression checks passed.`);if(results.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
