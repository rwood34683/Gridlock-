"use strict";
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{launchOptions}=require('./browser'),{createServer}=require('./serve');
const seed=require('./seed');
(async()=>{
 const out=path.resolve(process.argv[2]||'work/layout-shots');fs.mkdirSync(out,{recursive:true});
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(launchOptions()),results=[];
 try{for(const [name,viewport]of [['header-clock',{width:402,height:874}],['scout-landscape',{width:667,height:375}]]){
  const c=await browser.newContext({viewport,deviceScaleFactor:2}),p=await c.newPage();await p.goto(`http://127.0.0.1:${server.address().port}/`);
  await p.evaluate(seed=>localStorage.setItem('gridlock.coach.v2',JSON.stringify(seed)),seed);await p.reload();
  // Arial is the app's generic sans-serif fallback on hosts without the named
  // system fonts. Windows' Segoe UI alone does not reproduce either report.
  await p.addStyleTag({content:':root{--sans:Arial,sans-serif}'});
  if(name==='header-clock')await p.evaluate(()=>{S.matches=S.matches.map(m=>m.id===S.matchId?{...m,raceTo:7}:m);S.results=Array.from({length:11},(_,i)=>({m:S.matchId,pt:i+1,won:i%2?'us':'them',at:1}));S.point=12;S.clockEnd=Date.now()+90000;render();});
  else await p.getByRole('button',{name:'Scout',exact:true}).click();
  const metric=await p.evaluate(name=>{
   if(name==='header-clock')return{name,viewport:innerWidth,chips:[...document.querySelectorAll('.hdr__top > *')].map(e=>({text:e.textContent.trim(),right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})),pass:[...document.querySelectorAll('.hdr__top > *')].every(e=>!e.getBoundingClientRect().width||e.getBoundingClientRect().right<=innerWidth+1)};
   let worst={ch:0};for(const el of document.querySelectorAll('.main p,.main li,.main .note,.main td')){if(el.children.length)continue;const text=el.textContent.trim();if(text.length<70)continue;const r=document.createRange();r.selectNodeContents(el);const lines=new Set([...r.getClientRects()].map(x=>Math.round(x.top))).size||1,ch=Math.round(text.length/lines);if(ch>worst.ch)worst={ch,text};}
   const el=[...document.querySelectorAll('.main p,.main li,.main .note,.main td')].find(e=>e.textContent.trim()===worst.text);if(el)el.scrollIntoView({block:'center'});
   return{name,...worst,pass:worst.ch<=80};
  },name);results.push(metric);await p.screenshot({path:path.join(out,name+'.png')});await c.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
