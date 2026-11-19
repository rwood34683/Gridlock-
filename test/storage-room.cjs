"use strict";
// Real browser quota, synthetic seasons only. No account or network service.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");
const { unzipSync, strFromU8 } = require("fflate");
const STORE = "gridlock.coach.v2", PREFIX = STORE + ".tab.";
let pass=0, fail=0;
(async () => {
  const browser = await chromium.launch(launchOptions());
  async function test(name, run){
    const ctx = await browser.newContext({viewport:{width:390,height:844}}), p=await ctx.newPage(), errors=[];
    p.on("pageerror", e=>errors.push(e.message));
    try{
      await p.goto(process.env.APP_URL || "http://localhost:5173/");
      await p.evaluate(() => { S.entered=true; S.role="staff"; S.tab="more"; S.more="nexus"; save(S); render(); });
      await run(p,ctx); assert.deepEqual(errors,[]); pass++; console.log("PASS "+name);
    }catch(e){fail++;console.log("FAIL "+name+"\n"+e.stack);}
    finally{await ctx.close();}
  }
  async function copy(p, key="closed", extra={}){
    return p.evaluate(({key,extra})=>{
      const c={format:COPY_FORMAT,v:COPY_VERSION,scope:"all",at:"2026-01-01T00:00:00Z",data:{codes:[{word:"Keep  two spaces",meaning:"line one\nline two \\\""}],...extra}};
      const text=JSON.stringify(c,null,8); localStorage.setItem(TAB_COPY+key,text); return text;
    },{key,extra});
  }
  await test("real full storage recovers space with every season and code preserved",async p=>{
    await copy(p,"old-one",{games:Array.from({length:3000},(_,i)=>({id:"game"+i,d:"2026-11-15",h:"Team A",a:"Team B"}))});
    await copy(p,"old-two",{codes:[{word:"Older code",meaning:"Keep this too"}]});
    const before=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(TAB_COPY)&&k!==TAB_COPY+TAB_ID).map(k=>[k,localStorage.getItem(k)])));
    const failed=await p.evaluate(()=>{
      // Fill the real quota, then make a season edit larger than the headroom.
      let pad=""; for(const n of [65536,4096,256,16,1]) for(;;){try{localStorage.setItem("unrelated-test-data",pad+"x".repeat(n));pad+="x".repeat(n);}catch(e){break;}}
      S.codes=[{word:"Saved code",meaning:"Must survive"},{word:"New code",meaning:"New meaning"}];
      S.messages=["new note ".repeat(400)]; save(S);render(); return !!_storeFails.season;
    });
    assert.equal(failed,true,"the real quota refuses the edit first");
    await p.getByRole("button",{name:"Make room without deleting data",exact:true}).click();
    await p.waitForFunction(()=>!_storageRepairBusy);
    const after=await p.evaluate(()=>({copies:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(TAB_COPY)&&k!==TAB_COPY+TAB_ID).map(k=>[k,localStorage.getItem(k)])),season:JSON.parse(localStorage.getItem(STORE_KEY)),failed:_storeFail,pad:localStorage.getItem("unrelated-test-data").length}));
    assert.equal(after.failed,""); assert.ok(after.pad>0,"other storage untouched");
    assert.deepEqual(Object.keys(after.copies).sort(),Object.keys(before).sort());
    for(const [k,v] of Object.entries(before)){assert.deepEqual(JSON.parse(after.copies[k]),JSON.parse(v));assert.ok(after.copies[k].length<v.length);}
    assert.equal(after.season.codes[1].meaning,"New meaning");
    await p.reload(); assert.deepEqual(await p.evaluate(()=>S.codes),after.season.codes);
  });
  await test("compaction preserves string whitespace, escapes and exact number tokens",async p=>{
    // Use independently valid strings rather than a parser/stringifier that rounds numbers.
    const input=JSON.stringify({format:"gridlock.coach.copy",v:1,data:{text:'  a \\" \n\t end  '}},null,8).replace('"v": 1','"v": 1, "large": 9007199254740993, "small": 1e-100, "neg": -0');
    const result=await p.evaluate(t=>compactCopyText(t),input);
    assert.deepEqual(JSON.parse(result),JSON.parse(input));
    for(const token of ["9007199254740993","1e-100","-0"])assert.ok(result.includes(token));
    assert.ok(result.length<input.length); assert.equal(await p.evaluate(t=>compactCopyText(t),result),result);
  });
  await test("an open owner with a missing heartbeat keeps its exact copy",async(p,ctx)=>{
    const other=await ctx.newPage();await other.goto(process.env.APP_URL);
    const key=await other.evaluate(()=>TAB_COPY+TAB_ID);
    const text=await copy(p,key.slice(PREFIX.length));
    await p.evaluate(k=>localStorage.removeItem(k.replace(".tab.",".live.")),key);
    await p.evaluate(()=>makeStorageRoom()); assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),text);
  });
  for(const mode of ["heartbeat","no-locks","refused-lock","changed"])await test(mode+" never rewrites a copy it cannot safely claim",async p=>{
    const text=await copy(p);
    const out=await p.evaluate(async mode=>{
      const key=TAB_COPY+"closed", request=navigator.locks.request.bind(navigator.locks);
      if(mode==="heartbeat")localStorage.setItem(TAB_LIVE+"closed",String(Date.now()));
      if(mode==="no-locks")Object.defineProperty(navigator,"locks",{value:undefined,configurable:true});
      if(mode==="refused-lock")navigator.locks.request=()=>Promise.reject(new Error("not allowed"));
      if(mode==="changed")navigator.locks.request=(name,opts,fn)=>{localStorage.setItem(key,localStorage.getItem(key)+"\n");return request(name,opts,fn);};
      await makeStorageRoom(); return localStorage.getItem(key);
    },mode);
    assert.equal(out,text+(mode==="changed"?"\n":""));
  });
  await test("unreadable, newer-format and this tab's copies remain untouched",async p=>{
    const expected=await p.evaluate(()=>{
      const copies={[TAB_COPY+"broken"]:'{"unfinished":',[TAB_COPY+"newer"]:'{ "format":"gridlock.coach.copy", "v":2, "data":{} }'};
      for(const[k,v]of Object.entries(copies))localStorage.setItem(k,v);
      return copies;
    });
    await p.evaluate(()=>makeStorageRoom());
    for(const[k,v]of Object.entries(expected))assert.equal(await p.evaluate(k=>localStorage.getItem(k),k),v);
  });
  await test("a refused replacement never removes the original or clears the warning",async p=>{
    const before=await copy(p);
    await p.evaluate(async()=>{
      const set=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException("full","QuotaExceededError");};
      S.codes=[{word:"Not yet saved",meaning:"Keep in memory"}];save(S);
      await makeStorageRoom();Storage.prototype.setItem=set;
    });
    assert.equal(await p.evaluate(k=>localStorage.getItem(k),PREFIX+"closed"),before);
    assert.match(await p.locator("#root").innerText(),/Some changes are still not saved/);
    assert.equal(await p.evaluate(()=>S.codes[0].word),"Not yet saved");
  });
  await test("navigation refusal does not claim the saved season was lost",async p=>{
    const out=await p.evaluate(()=>{
      S.codes=[{word:"Held",meaning:"Saved"}];save(S);
      const before=localStorage.getItem(STORE_KEY), set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k===HERE_KEY)throw new DOMException("full","QuotaExceededError");return set.call(this,k,v);};
      S.tab="scout";save(S);render();
      const said=document.getElementById("root").textContent,failSeason=!!_storeFails.season,warn=unsavedWork();
      Storage.prototype.setItem=set;save(S);render();
      return{before,after:localStorage.getItem(STORE_KEY),said,failSeason,warn,final:_storeFail};
    });
    assert.equal(out.after,out.before);assert.equal(out.failSeason,false);assert.equal(out.warn,false);
    assert.match(out.said,/Your season is saved/);assert.doesNotMatch(out.said,/Nothing you tap is being saved/);assert.equal(out.final,"");
  });
  await test("recovery ZIP downloads every original copy without changing storage",async p=>{
    const text=await copy(p), keys=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(TAB_COPY)).sort().map(k=>[k,localStorage.getItem(k)])));
    await p.evaluate(()=>render());
    const download=p.waitForEvent("download");await p.getByRole("button",{name:"Save recovery files",exact:true}).click();
    const zip=unzipSync(fs.readFileSync(await(await download).path()));
    assert.equal(JSON.parse(strFromU8(zip["current-season.json"])).format,"gridlock.coach.copy");
    Object.values(keys).forEach((v,i)=>assert.equal(strFromU8(zip["recovery-"+(i+1)+".json"]),v));
    for(const[k,v]of Object.entries(keys))assert.equal(await p.evaluate(k=>localStorage.getItem(k),k),v);
    assert.ok(text.length>0);
  });
  await browser.close();console.log(`\n${pass} passed, ${fail} failed`);if(fail)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
