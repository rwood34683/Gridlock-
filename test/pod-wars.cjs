"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
  const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const browser=await chromium.launch(launchOptions()),url=`http://127.0.0.1:${server.address().port}/`;
  let passed=0,failed=0;
  async function check(name,fn,options={}){
    const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",...options}),p=await c.newPage(),errors=[];
    p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    try{
      await p.goto(url);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(seed));},SEED);
      await p.reload();await p.waitForFunction(()=>typeof podWars==="object");
      await p.evaluate(()=>{S.podBest=999;podWars.open();podWars.seed(11);});
      await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
    }catch(e){failed++;console.error("FAIL "+name+"\n"+e.stack);}
    finally{await c.close();}
  }
  async function shot(p,name){if(!process.env.GRIDLOCK_TEST_SHOTS)return;fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,name+".png")});}
  // Play the real engine: wait for an exposed mask, fire, then tuck for return paint.
  function runArcade(stopStage=4){
    podWars.mode("arcade");podWars.play();cancelAnimationFrame(pod.raf);pod.raf=0;
    const sent=new WeakSet();
    for(let i=0;i<8000&&pod.g.phase==="play"&&pod.g.stage<stopStage;i++){
      const g=pod.g,e=g.enemies.find(e=>!sent.has(e)&&e.age>170&&e.age<e.fireAt-240);
      g.held=!e;podAdvance(g,16);
      if(e&&!g.tucked&&!sent.has(e)){
        for(let n=0;n<(e.boss?3:1);n++)podTapAt(g,e.x,e.y);
        sent.add(e);g.held=true;
      }
    }
    podDraw();return {phase:pod.g.phase,stage:pod.g.stage,score:pod.g.score,hits:pod.g.hits,shots:pod.g.shots,boss:pod.g.bossHp,best:S.podBest};
  }
  try{
    await check("arcade can be won through real shots, all three stages, and the shielded boss",async p=>{
      const before=await p.evaluate(()=>copyPayload("all"));
      const state=await p.evaluate(runArcade);
      assert.deepEqual(state,{phase:"won",stage:3,score:9,hits:11,shots:11,boss:0,best:999});
      assert.match(await p.locator("#pod-say").textContent(),/POD ROYALTY/);
      const after=await p.evaluate(()=>copyPayload("all"));
      assert.deepEqual(JSON.parse(after).data,JSON.parse(before).data,"the game does not edit a season");
      await shot(p,"pod-wars-victory");
      await p.getByRole("button",{name:"Run it back",exact:true}).click();
      assert.deepEqual(await p.evaluate(()=>[pod.g.phase,pod.g.stage,pod.g.score,pod.g.bossHp]),["play",1,0,3]);
    });
    await check("arcade loses honestly, pauses without advancing, and restarts cleanly",async p=>{
      await p.getByRole("button",{name:"Arcade",exact:true}).click();await shot(p,"pod-wars-title");
      await p.getByRole("button",{name:"Start arcade"}).click();
      await p.getByRole("button",{name:"Pause game"}).click();
      assert.equal(await p.evaluate(()=>pod.g.phase),"paused");
      const before=await p.evaluate(()=>pod.g.t);await p.evaluate(()=>podWars.step(4000));assert.equal(await p.evaluate(()=>pod.g.t),before);
      await p.getByRole("button",{name:"Resume",exact:true}).click();
      await p.evaluate(()=>{cancelAnimationFrame(pod.raf);pod.raf=0;for(let i=0;i<2000&&pod.g.phase==="play";i++)podAdvance(pod.g,16);podDraw();});
      assert.equal(await p.evaluate(()=>pod.g.phase),"out");assert.match(await p.locator("#pod-say").textContent(),/SPECTATOR MODE/);
      await p.getByRole("button",{name:"Play again",exact:true}).click();assert.equal(await p.evaluate(()=>pod.g.stage),1);
    });
    await check("a boss keeps damaged shields after ducking and returning",async p=>{
      await p.evaluate(runArcade,3);
      const result=await p.evaluate(()=>{
        const g=pod.g;g.held=true;
        for(let i=0;i<300;i++){podAdvance(g,16);if(g.enemies[0]?.age>200)break;}
        const first=g.enemies[0];g.held=false;podAdvance(g,16);podTapAt(g,first.x,first.y);g.held=true;
        for(let i=0;i<16;i++)podAdvance(g,16);
        const hp=g.bossHp;
        for(let i=0;i<200;i++){podAdvance(g,16);if(g.enemies[0]&&g.enemies[0]!==first)break;}
        podDraw();return {hp,after:g.bossHp,newMask:g.enemies[0]!==first,phase:g.phase};
      });
      assert.deepEqual(result,{hp:2,after:2,newMask:true,phase:"play"});await shot(p,"pod-wars-boss");
    });
    await check("Tuck and reload block a shot immediately, before another frame",async p=>{
      const result=await p.evaluate(()=>{
        podWars.play();cancelAnimationFrame(pod.raf);pod.raf=0;
        podWars.tuck(true);podWars.tap(80,150);const held=pod.g.hopper;
        podWars.tuck(false);podWars.tap(80,150);podWars.reload();podWars.tap(80,150);
        return {held,hopper:pod.g.hopper,pods:pod.g.pods,reload:pod.g.reload};
      });assert.deepEqual(result,{held:20,hopper:19,pods:2,reload:700});
    });
    await check("keyboard aiming, shooting, reload and pause work without touching the coach app",async p=>{
      await p.evaluate(()=>{podWars.play();podWars.step(1200);});
      await p.keyboard.press("ArrowRight");assert.equal(await p.evaluate(()=>document.activeElement.id),"pod-canvas");
      await p.keyboard.press("Enter");await p.evaluate(()=>podWars.step(250));assert.equal(await p.evaluate(()=>pod.g.score),1);
      await p.keyboard.press("r");assert.equal(await p.evaluate(()=>pod.g.reload),700);
      await p.evaluate(()=>{pod.g.drop={x:160,y:410,life:3000};});
      await p.keyboard.press("g");assert.deepEqual(await p.evaluate(()=>[pod.g.drop,pod.g.pods]),[null,3]);
      await p.keyboard.press("p");assert.equal(await p.evaluate(()=>pod.g.phase),"paused");
      await p.keyboard.press("Escape");assert.equal(await p.locator("#podwars").count(),0);assert.equal(await p.evaluate(()=>document.getElementById("root").inert),false);
    });
    await check("sound starts only after opt-in and is stopped on pause, mute and close",async p=>{
      await p.evaluate(()=>{
        window.__audio={made:0,resumed:0,suspended:0,closed:0};
        const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
        window.AudioContext=class {constructor(){__audio.made++;this.state="suspended";this.currentTime=0;this.destination={};}resume(){this.state="running";__audio.resumed++;return Promise.resolve();}suspend(){this.state="suspended";__audio.suspended++;return Promise.resolve();}close(){__audio.closed++;return Promise.resolve();}createGain(){return{gain:param(),connect(){},disconnect(){}};}createOscillator(){return{frequency:param(),connect(){},disconnect(){},start(){},stop(){}};}};
      });
      assert.equal(await p.evaluate(()=>__audio.made),0);
      await p.getByRole("button",{name:"Sound off. Turn sound on",exact:true}).click();assert.equal(await p.evaluate(()=>__audio.made),1);
      await p.getByRole("button",{name:"Play",exact:true}).click();await p.evaluate(()=>podWars.tap(90,150));
      await p.getByRole("button",{name:"Pause game"}).click();assert.equal(await p.evaluate(()=>pod.voices.size),0);
      await p.getByRole("button",{name:"Sound on. Mute sound",exact:true}).click();
      await p.getByRole("button",{name:"Close",exact:true}).click();
      assert.ok(await p.evaluate(()=>__audio.suspended>=2&&__audio.closed===1));
    });
    await check("reduced motion keeps the same playable game without trails or flying splashes",async p=>{
      assert.equal(await p.evaluate(()=>pod.motion),false);const state=await p.evaluate(runArcade);assert.equal(state.phase,"won");
    },{reducedMotion:"reduce"});
    await check("stadium art is reused across frames and a closed game stops drawing",async p=>{
      await p.evaluate(()=>{podWars.play();podWars.step(16);podFit();});await p.waitForTimeout(100);
      const result=await p.evaluate(()=>{
        const cached=pod.ground.cv,cv=document.getElementById("pod-canvas"),rect=cv.getBoundingClientRect();
        let reused=true;pod.g.held=true;
        for(let i=0;i<600;i++){podAdvance(pod.g,16);podDraw();reused=reused&&pod.ground.cv===cached;}
        return {reused,splats:pod.g.splats.length,pixels:cv.width,display:rect.width,phase:pod.g.phase};
      });
      assert.equal(result.reused,true);assert.equal(result.phase,"play");assert.ok(result.splats<=32);
      assert.ok(result.pixels<=result.display*2+1,"high-density screens cap the canvas at 2×");
      await p.evaluate(()=>{window.__podFrames=0;const original=podDraw;podDraw=function(){__podFrames++;return original();};podWars.close();});
      await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>__podFrames),0);
    },{deviceScaleFactor:3});
    for(const [width,height]of [[320,568],[375,667],[390,844],[844,390],[820,1180],[1180,820]]){
      await check(`four game modes fit ${width}×${height}, with the break clock and usable controls`,async p=>{
        await p.evaluate(()=>{podWars.close();S.clockEnd=Date.now()+60000;podWars.open();});
        for(const mode of ["solo","arcade","duel","h2h"]){
          await p.locator(`[data-mode="${mode}"]`).click();await p.waitForTimeout(100);
          const bounds=await p.evaluate(()=>[...document.querySelectorAll("#podwars button,#podwars input,#pod-canvas")].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
          for(const b of bounds){assert.ok(b.left>=-1&&b.right<=width+1&&b.top>=-1&&b.bottom<=height+1,JSON.stringify(b));if(b.id!=="pod-canvas")assert.ok(b.width>=43&&b.height>=39,JSON.stringify(b));}
        }
        await p.locator('[data-mode="arcade"]').click();await shot(p,`pod-wars-${width}x${height}`);
      },{viewport:{width,height},hasTouch:true});
    }
  }finally{await browser.close();server.close();console.log(`${passed}/${passed+failed} Pod Wars checks passed.`);if(failed)process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
