"use strict";
const assert=require("node:assert/strict"),path=require("node:path");
module.exports=async function({check,browser,base,out}){
 async function setup(viewport,run){
  const c=await browser.newContext({viewport}),p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  try{
   await p.goto(base+"/teasers/player/");await p.locator("#joinCode").fill("IMPACT-7QX2");await p.locator("#joinGo").click();
   await p.locator('.tabs [data-m="scout"]').click();
   const values=await p.locator('#sideR .pickSel option').evaluateAll(es=>es.filter(e=>e.value).slice(0,3).map(e=>e.value));
   await p.locator('#sideL .pickSel').selectOption(values[1]);await p.locator('#sideR .pickSel').selectOption(values[0]);
   await p.locator('#sideR .notes').fill('Keep this scouting note');await p.locator('#sideR .notes').blur();
   await p.evaluate(()=>localStorage.setItem('gridlock_practice',JSON.stringify({d:[],e:[{id:'practice-kept',v:7}]})));
   const stored=()=>p.evaluate(()=>JSON.stringify([teamGet(),localStorage.getItem('gridlock_scout'),localStorage.getItem('gridlock_practice')]));
   const before=await stored();await run(p,values,stored,before);
   assert.deepEqual(errors,[]);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no sideways scroll');
  }finally{await c.close();}
 }
 for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768}]){
  await check(`Player clears selected teams, cancels and preserves history at ${viewport.width}x${viewport.height}`,()=>setup(viewport,async(p,values,stored,before)=>{
   const left=p.getByRole('button',{name:'Clear left team',exact:true});
   await left.click();assert.equal(await p.evaluate(()=>Lsel.ti>=0),true,'first tap keeps selection');
   await p.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await p.evaluate(()=>Lsel.ti>=0),true,'cancel keeps selection');
   await left.click();await left.click();assert.equal(await p.evaluate(()=>Lsel.ti),-1);assert.equal(await p.locator('#sideL .pickSel').inputValue(),'');
   assert.equal(await p.locator('#sideR .pickSel').inputValue(),values[0],'left clear leaves right selected');
   await p.locator('.tabs [data-m="tally"]').click();
   const modern=await p.evaluate(()=>typeof cpEnd==='function');
   if(modern)await p.evaluate(()=>{cpPlace(BUN.find(b=>b.x<75).id);cpEnd('us');cpRedraw();});
   const history=modern?await p.evaluate(()=>JSON.stringify({m:cpMatch(),rows:SH.rows,results:SH.results,theirs:SH.theirs})):null;
   const clear=p.getByRole('button',{name:'Clear opponent team',exact:true});
   assert(await clear.isVisible());const r=await clear.boundingBox();assert(r.width>=44&&r.height>=44);
   await p.screenshot({path:path.join(out,`player-clear-team-${viewport.width}-before.png`),fullPage:true});
   await clear.click();await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>Rsel.ti>=0),true);
   await clear.click();await clear.click();assert.equal(await p.evaluate(()=>Rsel.ti),-1);
   assert.equal(await stored(),before,'joined team, notes and practice stay');
   if(modern){
    const old=JSON.parse(history);assert.deepEqual(await p.evaluate(id=>({m:SH.matches.find(m=>m.id===id),rows:SH.rows,results:SH.results,theirs:SH.theirs}),old.m.id),old);
    assert.deepEqual(await p.evaluate(()=>({vs:cpVs(),point:SH.point,score:cpScore(SH.matchId)})),{vs:'',point:1,score:{us:0,them:0}});
    await p.evaluate(()=>{cpEnd('us');cpPlace(BUN[0].id);});assert.equal(await p.evaluate(()=>cpLogged(SH.matchId)),false,'blank sheet refuses scoring/charting');
    await p.reload();assert.equal(await p.evaluate(()=>cpMatch().vs),'','clear survives reload');
    assert.deepEqual(await p.evaluate(()=>SH.results),old.results);
   }
   await p.locator('.tabs [data-m="scout"]').click();assert.equal(await p.locator('#sideR .pickSel').inputValue(),'');
   await p.screenshot({path:path.join(out,`player-clear-team-${viewport.width}-after.png`),fullPage:true});
   await p.locator('#sideR .pickSel').selectOption(values[0]);assert.equal(await p.locator('#sideR .notes').inputValue(),'Keep this scouting note');
  }));
 }
 await check('Player clear confirmation belongs to the selected team and current sheet',()=>setup({width:390,height:844},async(p,values)=>{
  await p.getByRole('button',{name:'Clear opponent team',exact:true}).click();
  await p.locator('#sideR .pickSel').selectOption(values[2]);
  const b=p.getByRole('button',{name:'Clear opponent team',exact:true});await b.click();
  assert.equal(await p.locator('#sideR .pickSel').inputValue(),values[2],'a new selection needs its own confirmation');
  if(await p.evaluate(()=>typeof cpEnd==='function')){
   await p.evaluate(()=>cpEnd('us'));await b.click();assert.equal(await p.locator('#sideR .pickSel').inputValue(),values[2],'a new point needs its own confirmation');
  }
  await p.getByRole('button',{name:'Cancel',exact:true}).click();
 }));
 // These cases become active when the separate coach-style Player sheets land.
 const probe=await browser.newPage();await probe.goto(base+'/teasers/player/');const modern=await probe.evaluate(()=>typeof cpEnd==='function');await probe.close();
 if(modern)await check('Player keeps the selected opponent and sheet if saving a clear is refused',()=>setup({width:390,height:844},async(p,values)=>{
  await p.locator('.tabs [data-m="tally"]').click();await p.evaluate(()=>{cpEnd('us');cpRedraw();});
  const before=await p.evaluate(()=>JSON.stringify(SH));
  await p.evaluate(()=>{const write=localStorage.setItem.bind(localStorage);localStorage.setItem=(k,v)=>{if(k===CP_KEY)throw Error('test refused save');return write(k,v);};});
  const b=p.getByRole('button',{name:'Clear opponent team',exact:true});await b.click();await b.click();
  assert.equal(await p.evaluate(()=>JSON.stringify(SH)),before);assert.equal(await p.evaluate(()=>Rsel.di+':'+Rsel.ti),values[0]);
  assert.match(await p.locator('body').innerText(),/Could not save the change/);
 }));
};
