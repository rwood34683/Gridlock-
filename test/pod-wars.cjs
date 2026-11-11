"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
  const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const browser=await chromium.launch(launchOptions()),url=`http://127.0.0.1:${server.address().port}/`;
  let passed=0,failed=0;
  async function check(name,fn,options={}){
    const {game="solo",...contextOptions}=options;
    const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",...contextOptions}),p=await c.newPage(),errors=[];
    p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    try{
      await p.goto(url);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(seed));},SEED);
      await p.reload();await p.waitForFunction(()=>typeof podWars==="object");
      await p.evaluate(game=>{S.podBest=999;podWars.open();podWars.seed(11);if(game!=="pickup")podWars.mode(game);},game);
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
    await check("seven secret taps open Grab pods, with 64 pods, no menu entry and no automatic timer",async p=>{
      await p.evaluate(()=>{podWars.close();for(let i=0;i<6;i++)podTap();});assert.equal(await p.locator("#podwars").count(),0);
      await p.evaluate(()=>podTap());
      assert.deepEqual(await p.evaluate(()=>[pod.mode,pod.g.pile.length,pod.g.phase,pod.g.started,pod.g.score]),["pickup",64,"ready",null,0]);
      assert.equal(await p.locator('#root #podwars').count(),0);
      assert.equal(await p.locator('#pod-pod').isVisible(),false);assert.equal(await p.locator('#pod-tuck').isVisible(),false);
      await shot(p,"pod-pickup-ready");
    },{game:"pickup"});
    await check("rapid pointer taps each count once, holding and right-clicking do not, and the pile stays full",async p=>{
      await p.getByRole("button",{name:"Start · 45 seconds",exact:true}).click();
      await p.locator('#pod-canvas').click({position:{x:50,y:130}});assert.equal(await p.evaluate(()=>pod.g.score),1);
      const result=await p.evaluate(()=>{
        const cv=document.getElementById('pod-canvas'),r=cv.getBoundingClientRect(),event=(type,id=1,button=0)=>cv.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,button,clientX:r.left+20,clientY:r.top+30}));
        for(let i=0;i<150;i++){event('pointerdown',i);event('pointerup',i);}
        event('pointerdown',500);for(let i=0;i<50;i++)event('pointermove',500);event('pointerup',500);event('pointerdown',501,2);
        podDraw();return {score:pod.g.score,pile:pod.g.pile.length,pops:pod.g.pops.length};
      });assert.equal(result.score,152);assert.equal(result.pile,64);assert.ok(result.pops<=12);await shot(p,"pod-pickup-playing");
    },{game:"pickup"});
    await check("the exact 45-second boundary rejects a late tap even before a delayed frame",async p=>{
      const result=await p.evaluate(()=>{
        let now=100;Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
        podWars.play();cancelAnimationFrame(pod.raf);pod.raf=0;
        now=45099;podWars.tap(10,10);const before=pod.g.score;
        now=45100;podWars.tap(10,10);podDraw();
        now=90000;podWars.tap(10,10);podAdvance(pod.g,16);
        return {before,score:pod.g.score,phase:pod.g.phase,elapsed:pod.g.elapsed,rows:pod.pickupScores.length,best:S.podPickupBest};
      });assert.deepEqual(result,{before:1,score:1,phase:"out",elapsed:45000,rows:1,best:1});
    },{game:"pickup"});
    await check("blur and hide stop rendering; resuming after the deadline ends the same round without extra time",async p=>{
      const result=await p.evaluate(()=>{
        window.__podNow=100;Object.defineProperty(performance,'now',{configurable:true,value:()=>__podNow});podWars.play();podWars.tap(80,300);
        window.dispatchEvent(new Event('blur'));const paused=pod.g.phase==='paused'&&!pod.raf;
        podWars.tap(80,300);__podNow+=46000;podWars.play();
        return {paused,score:pod.g.score,phase:pod.g.phase,turn:pod.pickupTurn,running:!!pod.raf};
      });assert.deepEqual(result,{paused:true,score:1,phase:"out",turn:1,running:false});
      assert.match(await p.locator('#pod-go').textContent(),/Next player · 2/);
      await p.getByRole('button',{name:'Next player · 2',exact:true}).click();
      await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.deepEqual(await p.evaluate(()=>[pod.g.phase,!!pod.raf]),['paused',false]);
      assert.match(await p.locator('#pod-say').textContent(),/clock keeps running/);
    },{game:"pickup"});
    await check("passing the phone ranks completed rounds, handles ties and keeps a separate local best without season data",async p=>{
      const before=await p.evaluate(()=>JSON.parse(copyPayload('all')).data);
      await p.evaluate(()=>{for(const n of [12,20,20]){podWars.play();for(let i=0;i<n;i++)podWars.tap(180,280);podWars.step(45000);}});
      assert.deepEqual(await p.evaluate(()=>[pod.pickupScores,S.podPickupBest,S.podBest]),[[{player:2,score:20},{player:3,score:20},{player:1,score:12}],20,999]);
      assert.match(await p.locator('#pod-say').textContent(),/Top score tied · 20/);await shot(p,"pod-pickup-results");
      assert.deepEqual(await p.evaluate(()=>JSON.parse(copyPayload('all')).data),before);
      assert.equal(await p.evaluate(()=>JSON.stringify(JSON.parse(copyPayload('squad')).data).includes('podPickupBest')),false);
      await p.evaluate(()=>podWars.close());await p.reload();assert.equal(await p.evaluate(()=>S.podPickupBest),20);
      await p.evaluate(()=>podWars.open());assert.deepEqual(await p.evaluate(()=>[pod.pickupTurn,pod.pickupScores.length,pod.g.player]),[0,0,1]);
    },{game:"pickup"});
    await check("keyboard taps count once, repeat is ignored and sound buttons do not pick up pods",async p=>{
      await p.getByRole('button',{name:'Start · 45 seconds',exact:true}).click();
      assert.equal(await p.evaluate(()=>document.activeElement.id),'pod-canvas');
      await p.keyboard.press('Space');await p.keyboard.press('Enter');
      await p.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:' ',repeat:true,bubbles:true,cancelable:true})));
      assert.equal(await p.evaluate(()=>pod.g.score),2);
      await p.getByRole('button',{name:'Sound off. Turn sound on',exact:true}).focus();await p.keyboard.press('Space');
      assert.equal(await p.evaluate(()=>pod.g.score),2);
      await p.locator('#pod-canvas').dispatchEvent('click',{detail:0});assert.equal(await p.evaluate(()=>pod.g.score),3);
      await p.keyboard.press('Escape');assert.equal(await p.locator('#podwars').count(),0);
    },{game:"pickup"});
    await check("abandoning a round saves no partial best, and a refused best save is stated honestly",async p=>{
      await p.evaluate(()=>{podWars.play();podWars.tap(100,200);podWars.close();});assert.equal(await p.evaluate(()=>Number(S.podPickupBest)||0),0);
      await p.evaluate(()=>{podWars.open();podWars.play();podWars.tap(100,200);const write=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Full phone');};podWars.step(45000);Storage.prototype.setItem=write;});
      assert.match(await p.locator('#pod-say').textContent(),/Best could not be saved/);
      assert.equal(await p.evaluate(()=>Number(S.podPickupBest)||0),0);assert.equal(await p.evaluate(()=>pod.g.best),false);
    },{game:"pickup"});
    await check("reduced motion removes pickup effects; many rounds keep only five scores and Close stops drawing",async p=>{
      await p.evaluate(()=>{for(let round=0;round<20;round++){podWars.play();for(let n=0;n<round;n++)podWars.tap(50,200);podWars.step(45000);}});
      assert.deepEqual(await p.evaluate(()=>[pod.g.pops.length,pod.g.pile.length,pod.pickupScores.length,pod.pickupTurn]),[0,64,5,20]);
      await p.evaluate(()=>{window.__podFrames=0;const original=podDraw;podDraw=function(){__podFrames++;return original();};podWars.close();});
      await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>__podFrames),0);
    },{game:"pickup",reducedMotion:"reduce"});
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
      await check(`five game modes fit ${width}×${height}, with the break clock and usable controls`,async p=>{
        await p.evaluate(()=>{podWars.close();S.clockEnd=Date.now()+60000;podWars.open();});
        for(const mode of ["pickup","solo","arcade","duel","h2h"]){
          await p.locator(`[data-mode="${mode}"]`).click();await p.waitForTimeout(100);
          const bounds=await p.evaluate(()=>[...document.querySelectorAll("#podwars button,#podwars input,#pod-canvas")].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
          for(const b of bounds){assert.ok(b.left>=-1&&b.right<=width+1&&b.top>=-1&&b.bottom<=height+1,JSON.stringify(b));if(b.id!=="pod-canvas")assert.ok(b.width>=43&&b.height>=39,JSON.stringify(b));}
        }
        await p.locator('[data-mode="arcade"]').click();await shot(p,`pod-wars-${width}x${height}`);
        await p.locator('[data-mode="pickup"]').click();await shot(p,`pod-pickup-${width}x${height}`);
        await p.getByRole('button',{name:'Start · 45 seconds',exact:true}).click();
        await p.locator('#pod-canvas').tap();await p.locator('#pod-canvas').tap();
        assert.equal(await p.evaluate(()=>pod.g.score),2,'two real touch taps collect two pods');
        const field=await p.locator('#pod-canvas').boundingBox();
        assert.ok(field.width>100&&field.height>100&&field.x>=0&&field.y>=0&&field.x+field.width<=width+1&&field.y+field.height<=height+1,JSON.stringify(field));
        await shot(p,`pod-pickup-playing-${width}x${height}`);
      },{viewport:{width,height},hasTouch:true});
    }
  }finally{await browser.close();server.close();console.log(`${passed}/${passed+failed} Pod Wars checks passed.`);if(failed)process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
