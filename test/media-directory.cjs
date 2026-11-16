"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),seed=require("../scripts/seed");
const base=process.env.APP_URL || "http://localhost:5173/";
(async()=>{
  const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
  async function check(name,fn,size={width:390,height:844}){
    const ctx=await browser.newContext({viewport:size,serviceWorkers:"block"}),p=await ctx.newPage(),errors=[],remote=[];
    p.on("pageerror",e=>errors.push(e.message));
    await ctx.route("**/*",route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin){remote.push(u.href);return route.abort();}return route.continue();});
    p.on("dialog",d=>d.accept());
    try{
      await p.goto(base);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
      await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;S.syncOn=false;set({tab:"more",more:"media"});});
      await fn(p,ctx);assert.deepEqual(errors,[]);assert.deepEqual(remote,[],"directory sends no network requests");
      passed++;console.log("PASS "+name);
    }catch(e){failed++;console.error("FAIL "+name+"\n"+e.stack);}finally{await ctx.close();}
  }
  async function add(p,name="Example photo crew",kind="Photo"){
    await p.getByRole("button",{name:"Add contact",exact:true}).click();
    await p.getByLabel("Photographer or crew name",{exact:true}).fill(name);
    await p.locator("#media-kind").selectOption(kind);
    await p.getByLabel("Location (optional)",{exact:true}).fill("Central Florida");
    await p.getByLabel("Event (optional)",{exact:true}).fill("Practice weekend");
    await p.getByLabel("Contact details (optional)",{exact:true}).fill("crew@example.test");
    await p.getByLabel("Portfolio or social link (optional)",{exact:true}).fill("https://portfolio.example.test/crew");
    await p.getByRole("button",{name:"Save contact",exact:true}).click();
  }
  const records=p=>p.evaluate(()=>JSON.stringify([S.matches,S.matchId,S.point,S.results,S.tally,S.breakouts,S.scout,S.roster]));
  try{
    await check("Media starts empty, is on Home/More, and photographer search finds it",async p=>{
      assert.match(await p.locator(".main").innerText(),/No contacts saved yet/);
      assert.equal(await p.locator("[data-media-card]").count(),0);
      await p.getByRole("button",{name:"Home",exact:true}).click();
      await p.locator(".home-tool").filter({has:p.locator("b",{hasText:/^Media$/})}).click();
      assert.equal(await p.evaluate(()=>S.more),"media");
      await p.getByRole("button",{name:"‹ More",exact:true}).click();
      await p.getByLabel("Find a tool",{exact:true}).fill("photographer");
      assert.equal(await p.locator('[data-tool="media"]:visible').count(),1);
      await p.locator('[data-tool="media"]').click();
      assert.ok(await p.evaluate(()=>HELP[helpKey()]));
    });
    await check("add, edit and reload keep contacts without changing a match",async p=>{
      const before=await records(p);await add(p);
      assert.equal(await p.locator("[data-media-card]").count(),1);
      await p.getByRole("button",{name:"Edit Example photo crew",exact:true}).click();
      await p.getByLabel("Notes (optional)",{exact:true}).fill("Ask about pit coverage.");
      await p.getByRole("button",{name:"Save contact",exact:true}).click();
      await p.reload();await p.evaluate(()=>set({tab:"more",more:"media"}));
      assert.match(await p.locator("[data-media-card]").innerText(),/Ask about pit coverage/);
      assert.equal(await records(p),before);
      const link=p.getByRole("link",{name:"Open portfolio or social page for Example photo crew"});
      assert.equal(await link.getAttribute("href"),"https://portfolio.example.test/crew");
      assert.equal(await link.getAttribute("target"),"_blank");assert.equal(await link.getAttribute("rel"),"noopener noreferrer");
    });
    await check("search and coverage combine and leave the contact draft alone",async p=>{
      await add(p);await add(p,"Example video crew","Video");
      await p.getByLabel("Find a photographer or crew",{exact:true}).fill("Florida weekend");
      await p.locator("#media-filter").selectOption("Video");
      assert.equal(await p.locator("[data-media-card]:visible").count(),1);
      assert.match(await p.locator("[data-media-card]:visible").innerText(),/Example video crew/);
      await p.getByRole("button",{name:"Add contact",exact:true}).click();
      await p.getByLabel("Photographer or crew name",{exact:true}).fill("Not saved yet");
      await p.getByLabel("Find a photographer or crew",{exact:true}).fill("Missing location");
      assert.equal(await p.getByLabel("Photographer or crew name",{exact:true}).inputValue(),"Not saved yet");
      assert.match(await p.locator("#media-count").innerText(),/^0 of 2/);
      assert.equal(await p.locator("#media-no-match").isVisible(),true);
      await p.evaluate(()=>render());
      assert.equal(await p.getByLabel("Photographer or crew name",{exact:true}).inputValue(),"Not saved yet");
      assert.equal(await p.evaluate(()=>JSON.parse(copyPayload("all")).data.mediaContacts.length),2);
    });
    await check("invalid links, blank names and duplicate contacts cannot be saved",async p=>{
      await p.getByRole("button",{name:"Add contact",exact:true}).click();
      await p.getByRole("button",{name:"Save contact",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),0);
      await p.getByLabel("Photographer or crew name",{exact:true}).fill("Photo crew");
      for(const u of ["http://example.test","https://user:pass@example.test","javascript:alert(1)","data:text/html,test","https://example.test/\ntrack"]){
        await p.evaluate(u=>mediaDraft("website",u),u);await p.getByRole("button",{name:"Save contact",exact:true}).click();
        assert.equal(await p.evaluate(()=>S.mediaContacts.length),0,u);
      }
      await p.getByRole("button",{name:"Cancel",exact:true}).click();await add(p);await add(p);
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),1);
      assert.match(await p.locator("#root").innerText(),/already saved/);
    });
    await check("contact text is escaped and unsafe imported contacts are refused",async p=>{
      const hostile='<img src=x onerror=alert(1)>';
      await add(p,hostile);assert.equal(await p.locator(".media-contact img").count(),0);
      assert.match(await p.locator(".media-contact").innerText(),/<img src=x/);
      const results=await p.evaluate(()=>{
        const c=S.mediaContacts[0], test=c=>readCopy(JSON.stringify({format:COPY_FORMAT,v:1,scope:"all",data:{mediaContacts:[c]}})).error;
        return [test({...c,website:"javascript:alert(1)"}),test({...c,id:"');alert(1)//"}),test({...c,note:{html:"x"}}),test({...c,name:"x".repeat(81)}),test({...c,kind:"Verified"})];
      });assert.ok(results.every(Boolean));
    });
    await check("full backup restores and merges contacts once; squad and match shares omit them",async p=>{
      await add(p);const copy=await p.evaluate(()=>copyPayload("all"));
      assert.match(await p.evaluate(()=>copySummary(JSON.parse(copyPayload("all")).data)),/1 media contact/);
      assert.equal(await p.evaluate(()=>"mediaContacts" in JSON.parse(copyPayload("squad")).data),false);
      assert.equal(await p.evaluate(()=>"mediaContacts" in JSON.parse(sheetPayload(S.matchId)).data),false);
      await p.evaluate(copy=>{S.mediaContacts=[];loadCopy("replace",copy);set({tab:"more",more:"media"});},copy);
      assert.equal(await p.locator("[data-media-card]").count(),1);
      await p.evaluate(copy=>{loadCopy("merge",copy);loadCopy("merge",copy);},copy);
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),1);
      assert.equal(await p.evaluate(()=>copyDataError(JSON.parse(copyPayload("all")).data)),"");
    });
    await check("remove asks first; a merged old copy does not bring the contact back",async p=>{
      await add(p);const copy=await p.evaluate(()=>copyPayload("all"));
      await p.evaluate(()=>{window.confirm=()=>false;});
      await p.getByRole("button",{name:"Remove Example photo crew",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),1);
      await p.evaluate(()=>{window.confirm=()=>true;});
      await p.getByRole("button",{name:"Remove Example photo crew",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),0);
      await p.evaluate(copy=>loadCopy("merge",copy),copy);
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),0);
      await p.evaluate(copy=>loadCopy("replace",copy),copy);
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),1,"an intentional full restore takes the backed-up season");
    });
    await check("stale edits and account changes cannot write into the new context",async p=>{
      await add(p);await p.getByRole("button",{name:"Edit Example photo crew",exact:true}).click();
      await p.getByLabel("Notes (optional)",{exact:true}).fill("Stale draft");
      await p.evaluate(()=>{S.mediaContacts[0].note="Newer work";});
      await p.getByRole("button",{name:"Save contact",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.mediaContacts[0].note),"Newer work");
      await p.evaluate(()=>{S.email="other@example.test";saveMedia();});
      assert.equal(await p.evaluate(()=>S.mediaContacts[0].note),"Newer work");
      assert.equal(await p.evaluate(()=>S.mediaView.draft),null);
    });
    await check("legacy seasons still open with an empty directory",async p=>{
      const copy=await p.evaluate(()=>{const c=JSON.parse(copyPayload("all"));delete c.data.mediaContacts;return JSON.stringify(c);});
      await add(p);await p.evaluate(copy=>{loadCopy("replace",copy);set({tab:"more",more:"media"});},copy);
      assert.equal(await p.locator("[data-media-card]").count(),0);
      assert.equal(await p.evaluate(()=>copyDataError(JSON.parse(copyPayload("all")).data)),"");
    });
    await check("saving shows and focuses the contact even when an old search hid it",async p=>{
      await p.getByLabel("Find a photographer or crew",{exact:true}).fill("Missing town");
      await p.locator("#media-filter").selectOption("Video");await add(p);
      assert.equal(await p.locator("[data-media-card]:visible").count(),1);
      assert.equal(await p.getByLabel("Find a photographer or crew",{exact:true}).inputValue(),"");
      assert.equal(await p.locator("#media-filter").inputValue(),"");
      assert.equal(await p.evaluate(()=>document.activeElement.matches("[data-media-card]")),true);
    });
    await check("a contact changed during confirmation is not removed",async p=>{
      await add(p);await p.evaluate(()=>{window.confirm=()=>{S.mediaContacts[0].note="Newer note";return true;};});
      await p.getByRole("button",{name:"Remove Example photo crew",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),1);
      assert.equal(await p.evaluate(()=>S.mediaContacts[0].note),"Newer note");
    });
    await check("signed-out and expired paid builds cannot save a stale contact editor",async p=>{
      await add(p);await p.getByRole("button",{name:"Edit Example photo crew",exact:true}).click();
      await p.getByLabel("Notes (optional)",{exact:true}).fill("Not authorized");
      await p.evaluate(()=>{S.entered=false;saveMedia();});
      assert.equal(await p.evaluate(()=>S.mediaContacts[0].note),"");
      await p.evaluate(()=>{S.entered=true;window.webPassLocked=()=>true;saveMedia();removeMedia(S.mediaContacts[0].id);});
      assert.equal(await p.evaluate(()=>S.mediaContacts.length),1);
      assert.equal(await p.evaluate(()=>S.mediaContacts[0].note),"");
    });
    for(const [name,width,height] of [["phone",390,844],["tablet",768,1024],["landscape-tablet",1024,768],["laptop",1440,900]]){
      await check(name+" directory fits, has named touch controls and a usable form",async p=>{
        await add(p);await add(p,"Example video crew","Video");
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth || [...document.querySelectorAll(".main,.media-contact")].some(x=>x.scrollWidth>x.clientWidth+1)),false);
        const small=await p.locator(".main button,.main input,.main select,.main a.btn").evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.width>0 && r.height>0 && (r.width<44 || r.height<44);}).map(e=>e.outerHTML));
        assert.deepEqual(small,[]);
        const unnamed=await p.locator(".main button,.main input,.main select,.main a.btn").evaluateAll(es=>es.filter(e=>!e.textContent.trim() && !e.getAttribute("aria-label") && !e.labels?.length).map(e=>e.outerHTML));
        assert.deepEqual(unnamed,[]);
        if(process.env.GRIDLOCK_TEST_SHOTS){fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS,{recursive:true});await p.evaluate(()=>toMainTop());await p.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,"media-"+name+".png")});}
        await p.getByRole("button",{name:"Add contact",exact:true}).click();
        await p.getByLabel("Photographer or crew name",{exact:true}).fill("Keyboard crew");
        await p.getByLabel("Photographer or crew name",{exact:true}).press("Enter");
        assert.equal(await p.locator("[data-media-card]").count(),3);
      },{width,height});
    }
  }finally{await browser.close();}
  console.log(`${passed}/${passed+failed} media-directory checks passed.`);process.exitCode=failed?1:0;
})();
