"use strict";
const assert=require("node:assert/strict"),path=require("node:path");
module.exports=async function({check,browser,base,out}){
 async function setup(size,run){
  const c=await browser.newContext({viewport:size,hasTouch:true}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto(base+'/teasers/player/');
   await p.locator('#joinCode').fill('IMPACT-7QX2');await p.locator('#joinGo').click();
   await p.locator('.tabs [data-m="scout"]').click();
   const choice=await p.locator('#sideR .pickSel option').evaluateAll(es=>es.find(e=>e.value).value);
   await p.locator('#sideR .pickSel').selectOption(choice);
   await p.locator('.tabs [data-m="tally"]').click();
   assert.equal(await p.locator('[data-cp="next"]').count(),1,'one No point action');
   assert.equal(await p.getByRole('button',{name:'Next point, no result',exact:true}).count(),0,'no duplicate action under its old label');
   assert.equal(await p.locator('[data-cp="new"]').count(),1,'New match stays available');
   await run(p,choice);
   assert.deepEqual(errors,[]);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways page scroll');
  }finally{await c.close();}
 }
 const snapshot=p=>p.evaluate(()=>({point:SH.point,results:SH.results.length,score:cpScore(SH.matchId)}));
 const expected=(action,n)=>({point:n+1,results:action==='next'?0:n,score:{us:action==='won'?n:0,them:action==='lost'?n:0}});
 for(const [mode,size] of [['mouse',{width:390,height:844}],['touch',{width:768,height:1024}],['keyboard',{width:1024,height:768}]]){
  for(const action of ['next','won','lost'])await check(`Player ${mode}: rapid ${action} counts once; a later action and reload keep both`,()=>setup(size,async p=>{
   const button=p.locator(`[data-cp="${action}"]`).first();
   if(mode==='mouse')await button.dblclick();
   else if(mode==='touch'){await button.tap();await button.tap();}
   else{await button.press('Enter');await button.press('Enter');}
   assert.deepEqual(await snapshot(p),expected(action,1),'rapid duplicate cannot record or advance twice');
   // A real later action must work: do not disable scoring until reload or a new match.
   await p.waitForTimeout(1600);
   if(mode==='touch')await button.tap();else if(mode==='keyboard')await button.press('Space');else await button.click();
   assert.deepEqual(await snapshot(p),expected(action,2),'a later deliberate action works');
   await p.reload();assert.deepEqual(await snapshot(p),expected(action,2),'recorded points survive reload');
   await p.locator('.tabs [data-m="tally"]').click();
   if(action==='next')await p.screenshot({path:path.join(out,`player-point-actions-${mode}.png`),fullPage:true});
  }));
 }
 for(const [first,second] of [['won','next'],['next','won'],['won','lost']])await check(`Player shares the point guard across ${first} then ${second}`,()=>setup({width:390,height:844},async p=>{
  await p.locator(`[data-cp="${first}"]`).first().tap();
  await p.locator(`[data-cp="${second}"]`).first().tap();
  assert.deepEqual(await snapshot(p),expected(first,1));
  await p.locator('.tabs [data-m="scout"]').tap();
  await p.locator('[data-cp="next"]').first().tap();
  assert.deepEqual(await snapshot(p),expected(first,1),'changing tabs cannot bypass the guard');
 }));
 await check('Player can undo and correct a result immediately without losing the sheet',()=>setup({width:390,height:844},async p=>{
  const match=await p.evaluate(()=>SH.matchId);
  await p.locator('[data-cp="won"]').click();
  await p.locator('[data-cp="back"]').first().click();
  assert.deepEqual(await snapshot(p),expected('next',0));
  await p.locator('[data-cp="lost"]').click();
  assert.deepEqual(await snapshot(p),expected('lost',1));
  assert.equal(await p.evaluate(()=>SH.matchId),match);
 }));
 await check('Player new match starts fresh and preserves the old match and result',()=>setup({width:390,height:844},async(p,choice)=>{
  await p.locator('[data-cp="won"]').click();
  const old=await p.evaluate(()=>({id:SH.matchId,result:SH.results[0]}));
  await p.locator('[data-cp="new"]').click();
  assert.equal(await p.evaluate(()=>SH.point),1);
  await p.locator('.tabs [data-m="scout"]').click();
  await p.locator('#sideR .pickSel').selectOption(choice);
  await p.locator('.tabs [data-m="tally"]').click();
  await p.locator('[data-cp="lost"]').click();
  assert.deepEqual(await p.evaluate(()=>({point:SH.point,score:cpScore(SH.matchId),old:SH.results.find(r=>r.m!==SH.matchId),newId:SH.matchId!==SH.matches[0].id})),{point:2,score:{us:0,them:1},old:old.result,newId:true});
 }));
};
