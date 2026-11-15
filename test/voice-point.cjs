"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
function speechDouble(){
  window.voiceMics=[];
  window.SpeechRecognition=class {
    constructor(){window.voiceMics.push(this);this.rows=[];}
    start(){queueMicrotask(()=>this.onstart?.());}
    abort(){this.onend?.();}
    emit(text){const row=[{transcript:text}];row.isFinal=true;this.rows.push(row);this.onresult?.({results:this.rows});}
  };
}
(async()=>{
  const browser=await chromium.launch(launchOptions()),results=[];
  async function check(name,fn,viewport={width:390,height:844}){
    const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
    await c.addInitScript(speechDouble);p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    try{
      await p.goto(process.env.APP_URL);
      await p.evaluate(()=>{S.entered=true;S.role="staff";S.fmtDone=true;S.fmtAsk=false;S.tab="tally";S.layoutKey="mwo";
        openSheet({vs:"Voice fixture"});S.right={name:"Voice fixture"};S.scout={"Voice fixture":{players:[{num:"7",name:"Alex"},{num:"12",name:"Jordan"}]}};
        S.bunkerCalls={mwo:{"GW#1":"Home","C#4":"Camp"}};S.results=[];S.point=1;render();});
      await fn(p);assert.deepEqual(errors,[]);results.push(true);console.log("PASS "+name);
    }catch(e){results.push(false);console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
  }
  const start=async p=>{await p.waitForFunction(()=>_voiceUI.availability?.available);await p.getByRole("button",{name:"Start listening",exact:true}).click();await p.getByRole("button",{name:"Stop listening",exact:true}).waitFor();};
  const typed=async(p,text)=>{await p.locator("#voice-manual").fill(text);await p.getByRole("button",{name:"Record text",exact:true}).click();};
  try{
    await check("Tally opens a recap of the scored point without moving Tally or opening a microphone",async p=>{
      await p.evaluate(()=>endPoint("us"));await p.getByRole("button",{name:"Talk about point 1",exact:true}).click();
      assert.deepEqual(await p.evaluate(()=>[voiceContext().pt,S.point,matchScore().us,voiceMics.length]),[1,2,1,0]);
      await typed(p,"Alex moved to Home");
      const e=await p.evaluate(()=>S.voiceEvents.at(-1));assert.equal(e.pt,1);assert.equal(e.bunker,"GW#1");assert.equal(e.team,"Voice fixture");
      assert.equal(await p.evaluate(()=>S.point),2);assert.equal(await p.evaluate(()=>S.tally.length),0);
      await p.getByRole("button",{name:"Current point · 2",exact:true}).click();assert.equal(await p.locator("#voice-point").inputValue(),"2");
      await p.getByRole("button",{name:"Back to Tally",exact:true}).click();assert.equal(await p.evaluate(()=>S.point),2);
    });
    await check("a finished match recaps its winning point, never the preceding point",async p=>{
      await p.evaluate(()=>{setRaceTo(2);endPoint("us");endPoint("us");});
      await p.getByRole("button",{name:"Talk about point 2",exact:true}).click();assert.equal(await p.evaluate(()=>voiceContext().pt),2);
      await p.evaluate(()=>{S.calls.push({m:S.matchId,pt:3,at:Date.now()});pickVoicePoint(3);});
      assert.equal(await p.evaluate(()=>voiceContext().pt),2,"a stray row after the winning point cannot open a nonexistent next point");
    });
    await check("a spoken team call is tied to the selected point and late speech cannot cross points",async p=>{
      await p.evaluate(()=>{endPoint("us");openPointVoice(1);});await start(p);
      await p.evaluate(()=>voiceMics.at(-1).emit("Alex moved to Home"));
      assert.deepEqual(await p.evaluate(()=>[S.voiceEvents[0].pt,S.voiceEvents[0].player,S.voiceEvents[0].bunker]),[1,"number:7","GW#1"]);
      await p.locator("#voice-point").fill("2");await p.locator("#voice-point").press("Tab");
      await p.evaluate(()=>voiceMics[0].emit("Jordan moved to Camp"));
      assert.equal(await p.evaluate(()=>S.voiceEvents.length),1);assert.equal(await p.evaluate(()=>!!_voiceUI.session),false);
      await start(p);await p.evaluate(()=>voiceMics.at(-1).emit("Jordan moved to Camp"));
      assert.equal(await p.evaluate(()=>S.voiceEvents.at(-1).pt),2);
    });
    await check("unknown and repeated bunker calls remain review items and never invent a route",async p=>{
      await p.evaluate(()=>{S.bunkerCalls.mwo["C#4"]="Home";openPointVoice(1);});
      await typed(p,"Alex moved to Home");await typed(p,"Jordan moved to Secret tower");
      assert.equal(await p.evaluate(()=>S.voiceEvents.every(e=>e.review&&!e.bunker)),true);
      assert.equal(await p.evaluate(()=>S.arrivalSightings.length),0);
    });
    await check("point changes reject stale typed drafts and invalid point numbers",async p=>{
      await p.evaluate(()=>{endPoint("us");openPointVoice(1);});await p.locator("#voice-manual").fill("Alex is out");
      await p.getByRole("button",{name:"Current point · 2",exact:true}).click();await p.getByRole("button",{name:"Record text",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.voiceEvents.length),0);assert.match(await p.locator("#voice-status").innerText(),/earlier selection/);
      for(const value of [0,-5,1.5,1e100,3,"not-a-point"]){await p.evaluate(v=>pickVoicePoint(v),value);assert.equal(await p.evaluate(()=>voiceContext().pt),2);}
    });
    await check("point recap includes the team's players and review flags, excluding another point and team",async p=>{
      await p.evaluate(()=>{S.point=2;openPointVoice(1);window.gridlockShare=undefined;});
      await typed(p,"Alex moved to Home");await typed(p,"Jordan might be out");
      await p.evaluate(()=>{S.voiceEvents.push({...S.voiceEvents[0],id:"other-point",pt:2,text:"WRONG POINT"});S.voiceEvents.push({...S.voiceEvents[0],id:"other-team",team:"Other fixture",text:"WRONG TEAM"});setVoice({player:"number:7"});});
      await start(p);await p.evaluate(()=>{window.gridlockShare=async()=>"shared";});
      await p.getByRole("button",{name:"Share this point's notes",exact:true}).click();
      assert.equal(await p.getByRole("button",{name:"Stop listening",exact:true}).count(),0,"sharing stops the mic and updates its control even when the native share succeeds");
      assert.equal(await p.evaluate(()=>!!_voiceUI.session),false);
      await p.evaluate(()=>{window.gridlockShare=undefined;});
      await p.getByRole("button",{name:"Share this point's notes",exact:true}).click();
      const text=await p.locator("#handoff-text").inputValue();assert.match(text,/Voice fixture · Point 1/);assert.match(text,/Alex/);assert.match(text,/Jordan/);assert.match(text,/Needs review/);assert.doesNotMatch(text,/WRONG POINT|WRONG TEAM/);
      assert.equal(await p.evaluate(()=>S.point),2);assert.equal(await p.evaluate(()=>S.results.length),0);
    });
    await check("a new match, advancing Tally, restore and reload cannot retain a stale recap selection",async p=>{
      await p.evaluate(()=>{S.point=3;openPointVoice(1);set({point:4});});assert.equal(await p.evaluate(()=>voiceContext().pt),4);
      await p.evaluate(()=>{pickVoicePoint(1);openSheet({vs:"Second fixture"});render();});assert.equal(await p.evaluate(()=>voiceContext().pt),1);
      await p.evaluate(()=>{S.point=3;openPointVoice(1);S.results=[...S.results];render();});assert.equal(await p.evaluate(()=>voiceContext().pt),3);
      await p.evaluate(()=>{pickVoicePoint(1);save(S);});await p.reload();assert.equal(await p.evaluate(()=>voiceContext().pt),3);assert.equal(await p.evaluate(()=>voiceMics.length),0);
    });
    for(const [label,viewport] of [["phone",{width:375,height:667}],["tablet",{width:820,height:1180}],["laptop",{width:1366,height:768}]]){
      await check(label+" shows mic help, field calls and the point without sideways scrolling",async p=>{
        await p.evaluate(()=>{endPoint("us");openPointVoice(1);});
        await p.waitForTimeout(100);
        const mic=await p.getByRole("button",{name:"Start listening",exact:true}).boundingBox();
        assert(mic.y>=0 && mic.y+mic.height<viewport.height,"Start listening must be on screen after opening from Tally");
        const out=path.resolve("work/voice-point");fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,label+".png")});
        await p.getByText("Set up your microphone",{exact:true}).click();
        assert.match(await p.locator("main").innerText(),/Connect or pair your microphone/);
        assert.equal(await p.evaluate(()=>voiceMics.length),0,"help never requests microphone access");
        await p.getByText("Bunker calls for this field",{exact:true}).click();
        assert.match(await p.locator("main").innerText(),/Home/);
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await p.screenshot({path:path.join(out,label+"-help.png")});
      },viewport);
    }
  }finally{await browser.close();}
  console.log(`${results.filter(Boolean).length}/${results.length} voice point checks passed.`);if(results.some(x=>!x))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
