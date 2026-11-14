"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser");
const SEED = require("../scripts/seed");
(async () => {
  const browser = await chromium.launch(launchOptions());
  let passed = 0, failed = 0;
  async function check(name, run) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    try {
      await page.goto(process.env.APP_URL);
      await page.evaluate(seed => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(seed)); }, SEED);
      await page.reload();
      await run(page);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.stack); }
    finally { await context.close(); }
  }
  try {
    await check("current-point status ignores historic rows while match summaries retain them", async p => {
      const got=await p.evaluate(()=>{
        S.matches=[{id:"perf",vs:"Other",layout:S.layoutKey,size:5}];S.matchId="perf";S.point=401;
        const bunker=curLayout().bunkers[0].id;
        S.breakouts=Array.from({length:401},(_,i)=>({id:"b"+i,m:"perf",pt:i+1,side:"us",layout:S.layoutKey,bunker,player:"Reyes",alive:true,at:i+1}));
        S.playerChecks=S.breakouts.map(b=>({...b,id:"c"+b.id,breakoutId:b.id,alive:b.pt===401,shooting:b.pt===401}));S.tally=[];
        const original=playerObservationRowsFresh,points=[];
        playerObservationRowsFresh=(...args)=>{points.push(args[3]);return original(...args);};
        try{
          _lastPointMemo=new Map();
          const status=playerStatusText("us","Reyes","b400"), shares=pointPercentages("us");
          const scoped=points.slice();
          const history=playerMatchPercentages({m:"perf",side:"us",player:"Reyes"});
          S.point=400;_lastPointMemo=new Map();
          const previous=playerStatusText("us","Reyes","b399");
          return {status,shares,scoped,history,previous};
        }finally{playerObservationRowsFresh=original;_lastPointMemo=null;}
      });
      assert.equal(got.status,"Alive · Shooting");assert.match(got.shares,/1 of 5 · 20%/);
      assert.deepEqual(got.scoped,[401]);assert.match(got.history,/401 logged points/);
      assert.match(got.history,/400 of 401/);assert.equal(got.previous,"Dead");
    });
    await check("a repeated expired notice and a partially painted field are restored", async p => {
      await p.clock.install();
      await p.evaluate(() => flash("Same notice"));
      assert.equal(await p.locator(".flash").textContent(), "Same notice");
      await p.clock.runFor(3700);
      assert.equal(await p.locator(".flash").count(), 0);
      await p.evaluate(() => flash("Same notice"));
      assert.equal(await p.locator(".flash").textContent(), "Same notice");
      assert.equal(await p.evaluate(() => {
        set({tab:"playbook",t:1});
        const expected = document.querySelector("g.live").innerHTML;
        S.t = 0; paintField();
        const moved = document.querySelector("g.live").innerHTML !== expected;
        S.t = 1; render();
        return moved && document.querySelector("g.live").innerHTML === expected;
      }), true);
    });
    await check("Sightlines builds footprints once per draw and refreshes after a field edit", async p => {
      const result = await p.evaluate(() => {
        const originalLayout = curLayout, originalBoxes = bunkerBoxes, previous = _lastPointMemo;
        const list = [
          {id:"from",x:0,y:0,w:2,h:2}, {id:"to",x:20,y:0,w:2,h:2},
          {id:"block",x:10,y:0,w:2,h:2}, {id:"aside",x:10,y:12,w:2,h:2}
        ];
        let calls = 0;
        curLayout = () => ({bunkers:list});
        bunkerBoxes = b => { calls++; return originalBoxes(b); };
        try {
          _lastPointMemo = new Map();
          const first = sightLines("from",2,2), again = sightLines("from",2,2);
          const blocked = first.lines.find(l => l.to.id === "to");
          const built = calls;
          _lastPointMemo = null;
          list[2].y = 12;
          const cleared = sightLines("from",2,2).lines.find(l => l.to.id === "to");
          return {built, count:list.length, same:JSON.stringify(first) === JSON.stringify(again),
            blockers:blocked.by.map(b=>b.id), distance:blocked.ft, clear:!cleared.blocked};
        } finally { curLayout = originalLayout; bunkerBoxes = originalBoxes; _lastPointMemo = previous; }
      });
      assert.equal(result.built, result.count);
      assert.equal(result.same, true);
      assert.deepEqual(result.blockers, ["block"]);
      assert.equal(result.distance, 20);
      assert.equal(result.clear, true);
    });
    await check("a changed Tally read does not parse the same field drawing again", async p => {
      const result = await p.evaluate(() => {
        set({tab:"tally",tallyRead:""});
        const before = document.querySelector("#tally-map svg.field").outerHTML;
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
        let parsed = 0;
        Object.defineProperty(Element.prototype, "innerHTML", {...descriptor, set(html){
          if(String(html).includes('<svg class="field"')) parsed++;
          descriptor.set.call(this, html);
        }});
        try { set({tallyRead:"right"}); }
        finally { Object.defineProperty(Element.prototype, "innerHTML", descriptor); }
        return {parsed, same:before === document.querySelector("#tally-map svg.field").outerHTML,
          chosen:[...document.querySelectorAll("button.on")].some(b=>b.textContent.includes("Right read"))};
      });
      assert.equal(result.parsed, 0);
      assert.equal(result.same, true);
      assert.equal(result.chosen, true);
    });
    await check("cached fields match fresh parsing, refresh changed drawings and cannot be dirtied by a live copy", async p => {
      const result = await p.evaluate(() => {
        const original = '<section><svg class="field" viewBox="0 0 100 100"><g><circle cx="5" cy="6" r="3"/></g><text>A &amp; B</text></svg><button onclick="set({tab:\'more\'})">Menu</button></section>';
        const changed = original.replace('cx="5"','cx="15"').replace('A &amp; B','New name');
        const expected = document.createElement("template"); expected.innerHTML = original;
        const first = screenPage(original);
        const same = first.isEqualNode(expected.content);
        first.querySelector("circle").setAttribute("cx","999");
        first.querySelector("text").textContent = "live edit";
        const pristine = screenPage(original).isEqualNode(expected.content);
        expected.innerHTML = changed;
        const updated = screenPage(changed).isEqualNode(expected.content);
        for(let i=0;i<30;i++) screenPage(original.replace('cx="5"',`cx="${i}"`));
        const bounded = _fieldNodes.size <= 12 && _fieldNodeChars <= 300000;
        const huge = original.replace('A &amp; B', 'x'.repeat(300001));
        const large = screenPage(huge).querySelector("text").textContent.length;
        return {same,pristine,updated,bounded,large,keptLarge:[..._fieldNodes.keys()].some(k=>k.length>300000)};
      });
      assert.equal(result.same,true); assert.equal(result.pristine,true); assert.equal(result.updated,true);
      assert.equal(result.bounded,true); assert.equal(result.large,300001); assert.equal(result.keptLarge,false);
    });
    await check("changing the call redraws its paths without reparsing unchanged bunkers", async p => {
      const result = await p.evaluate(() => {
        set({tab:"playbook",script:"hold",t:1});
        const before = document.querySelector("g.live").innerHTML;
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype,"innerHTML");
        let rebuilt = 0;
        Object.defineProperty(Element.prototype,"innerHTML",{...descriptor,set(html){
          if(String(html).includes('<g class="bnk"')) rebuilt++;
          descriptor.set.call(this,html);
        }});
        try { set({script:"flood"}); }
        finally { Object.defineProperty(Element.prototype,"innerHTML",descriptor); }
        const expected=document.createElement("template"); expected.innerHTML=fieldSVG({});
        return {rebuilt,changed:before !== document.querySelector("g.live").innerHTML,
          bunkers:document.querySelector(".field [filter]").isEqualNode(expected.content.querySelector("[filter]"))};
      });
      assert.equal(result.rebuilt,0); assert.equal(result.changed,true); assert.equal(result.bunkers,true);
    });
    await check("returning to an unchanged screen reuses its controls with fresh field and input copies", async p => {
      const result = await p.evaluate(() => {
        const html = '<section data-screen-test><input value="Kept"/><svg class="field"><text>First</text></svg></section>';
        const first = screenPage(html);
        first.querySelector("input").value = "Not saved";
        first.querySelector("input").setAttribute("value", "Changed live");
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
        let parsed = 0;
        Object.defineProperty(Element.prototype, "innerHTML", {...descriptor, set(markup){
          if(String(markup).includes("data-screen-test")) parsed++;
          descriptor.set.call(this, markup);
        }});
        let next;
        try { screenPage('<section>Another screen</section>'); next = screenPage(html.replace("First", "Second")); }
        finally { Object.defineProperty(Element.prototype, "innerHTML", descriptor); }
        return {parsed, value:next.querySelector("input").value, field:next.querySelector("text").textContent,
          separate:first.querySelector("input") !== next.querySelector("input")};
      });
      assert.deepEqual(result, {parsed:0, value:"Kept", field:"Second", separate:true});
    });
    await check("screen reuse stays bounded and changed content is never taken from an older page", async p => {
      const result = await p.evaluate(() => {
        const expected = document.createElement("template");
        let same = true;
        for(let i=0;i<20;i++){
          const html = `<section><p>Point ${i}</p><input value="${i}"/></section>`;
          expected.innerHTML = html;
          same = same && screenPage(html).isEqualNode(expected.content);
        }
        const huge = '<section>' + 'x'.repeat(150001) + '</section>';
        return {same, size:_screenPages.size, chars:_screenPageChars,
          large:screenPage(huge).textContent.length, keptLarge:_screenPages.has(huge)};
      });
      assert.equal(result.same,true); assert.ok(result.size <= 3); assert.ok(result.chars <= 150000);
      assert.equal(result.large,150001); assert.equal(result.keptLarge,false);
    });
    await check("sign-out discards cached drawings and screens and keeps the saved season", async p => {
      await p.evaluate(() => set({tab:"tally"}));
      assert.ok(await p.evaluate(() => _fieldNodes.size > 0 && _screenPages.size > 0));
      p.once("dialog", d => d.accept());
      await p.evaluate(() => askSignOut());
      const after = await p.evaluate(() => ({entered:S.entered,drawings:_fieldNodes.size,chars:_fieldNodeChars,
        pages:_screenPages.size,pageChars:_screenPageChars,
        matches:S.matches.length,stored:JSON.parse(localStorage.getItem("gridlock.coach.v2")).matches.length}));
      assert.equal(after.entered,false); assert.equal(after.drawings,0); assert.equal(after.chars,0);
      assert.equal(after.pages,0); assert.equal(after.pageChars,0);
      assert.ok(after.matches>0); assert.equal(after.matches,after.stored);
    });
    await check("route search keeps the shortest clear path around a wall", async p => {
      const route = await p.evaluate(() => {
        const from = [10,60], to = [140,60], wall = {x:75,y:60,hw:10,hh:20,ids:new Set(["wall"])};
        const via = routeClear(from, to, "target", [wall]);
        const points = [from, ...via, to];
        return { clear: points.slice(1).every((q,i) => !segHitsBox(...points[i], ...q, wall.x, wall.y, wall.hw, wall.hh)),
          length: points.slice(1).reduce((n,q,i) => n + Math.hypot(q[0]-points[i][0],q[1]-points[i][1]), 0), via };
      });
      assert.equal(route.clear, true);
      assert.equal(route.via.length, 2);
      assert.ok(Math.abs(route.length - (2*Math.hypot(53.6,21.4)+22.8)) < 1e-9);
    });
    await check("a direct state edit is rendered even when the screen does not change", async p => {
      assert.equal(await p.evaluate(() => {
        set({tab:"playbook"}); S.t = 0; render();
        const before = document.querySelector("g.live").innerHTML;
        S.t = 1; render();
        return document.querySelector("g.live").innerHTML !== before;
      }), true);
    });
    await check("same-screen taps retain the scroller and do not measure layout", async p => {
      assert.equal(await p.evaluate(() => {
        set({ tab: "more", more: "assess" });
        const main = document.querySelector(".main"); main.scrollTop = 100;
        const top = main.scrollTop;
        Object.defineProperty(main, "scrollTop", { configurable: true, get() { throw Error("synchronous layout read"); }, set() { throw Error("synchronous layout write"); } });
        let assertSame;
        try { render(); assertSame = document.querySelector(".main") === main; }
        finally { delete main.scrollTop; }
        return assertSame && main.scrollTop === top;
      }), true);
    });
    await check("switching tabs starts the new scroller at the top", async p => {
      assert.equal(await p.evaluate(() => {
        set({ tab: "playbook" });
        const main = document.querySelector(".main");
        main.scrollTop = 120;
        set({ tab: "scout" });
        return document.querySelector(".main") !== main && document.querySelector(".main").scrollTop === 0;
      }), true);
    });
    await check("patched markup matches a fresh screen after added rows, removals and changed SVG", async p => {
      assert.equal(await p.evaluate(() => {
        const current = document.createElement("div"), next = document.createElement("div");
        current.innerHTML = '<p id="old">old</p><svg><g><circle cx="1"/></g></svg><i>remove</i>';
        for (const html of ['<p class="new">new <b>row</b></p><svg><g><path d="M0 0L2 2"/></g></svg>', '<svg><g><circle cx="3"/></g></svg><button onclick="window.__patchedTap=1">tap</button><span>added</span>']) {
          next.innerHTML = html; patchScreen(current, next);
          if (!current.isEqualNode(next)) return false;
        }
        document.body.appendChild(current); current.querySelector("button").click();
        return window.__patchedTap === 1 && current.querySelector("circle").namespaceURI === "http://www.w3.org/2000/svg";
      }), true);
    });
    await check("same-screen updates refresh edited control values and accessible labels", async p => {
      assert.equal(await p.evaluate(() => {
        set({ tab: "more", more: "team" });
        const old = document.querySelector("#root input:not([type=file])");
        if (!old) throw Error("team input missing");
        const value = old.value; old.value = "unsaved edit";
        const select = document.querySelector("#root select"), selected = select && select.selectedIndex;
        if(select) select.selectedIndex = -1;
        render();
        return old.isConnected && old.value === value && (!select || select.selectedIndex === selected) && [...document.querySelectorAll(".fld > label")].every(l => {
          const c = l.nextElementSibling;
          return !c || !/^(SELECT|INPUT|TEXTAREA)$/.test(c.tagName) || c.hasAttribute("aria-label") || c.getAttribute("aria-labelledby") === l.id;
        });
      }), true);
    });
    await check("moving layer matches the full field without building static bunkers", async p => {
      assert.equal(await p.evaluate(() => {
        set({ tab: "playbook" });
        const original = bunkerShape;
        for (const opts of [{}, { both: true }, { edit: true }, { show: "them", both: true }, { sightFrom: curLayout().bunkers[0].id }]) {
          for (const t of [0, .5, 1]) {
            S.t = t;
            const box = document.createElement("div"); box.innerHTML = fieldSVG(opts);
            const expected = box.querySelector("g.live").innerHTML;
            let calls = 0; bunkerShape = (...args) => { calls++; return original(...args); };
            let actual;
            try { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.innerHTML = fieldRunners(opts); actual = svg.innerHTML; }
            finally { bunkerShape = original; }
            if (calls || expected !== actual || _lastPointMemo !== null) return false;
          }
        }
        return true;
      }), true);
    });
    await check("a sideline tap still persists its result and recovery copy before it returns", async p => {
      const result = await p.evaluate(() => {
        set({ tab: "tally" });
        const before = (S.tally || []).length;
        markOut("us", "Performance test");
        const stored = JSON.parse(localStorage.getItem("gridlock.coach.v2"));
        return { added: stored.tally.length - before, copy: localStorage.getItem(TAB_COPY + TAB_ID).includes("Performance test") };
      });
      assert.equal(result.added, 1); assert.equal(result.copy, true);
    });
    await check("save serializes each large list once and journals the current in-place edit", async p => {
      const result = await p.evaluate(() => {
        S.tally = Array.from({length:2000}, (_,i) => ({m:S.matchId,pt:i+1,side:"us",name:'Player "'+i+'"',at:i}));
        let visits = 0;
        S.tally.toJSON = function(){ visits++; return this; };
        const equivalent = seasonText(S) === seasonText(S, new Map());
        const rounds = [];
        for(const name of ["First save", "Edited in place"]){
          S.tally[0].name = name; visits = 0; save(S);
          const traversals = visits, stored = JSON.parse(localStorage.getItem("gridlock.coach.v2")), journal = JSON.parse(localStorage.getItem(TAB_COPY + TAB_ID));
          const exported = JSON.parse(copyPayload("all"));
          rounds.push({traversals, name:stored.tally[0].name, journalName:journal.data.tally[0].name,
            journal:journal.data, exported:exported.data, id:journal.journalId===stored.saveId});
        }
        return {equivalent, rounds};
      });
      assert.equal(result.equivalent, true);
      for(const [i,r] of result.rounds.entries()){
        assert.equal(r.traversals, 1); assert.equal(r.id, true);
        assert.equal(r.name, i ? "Edited in place" : "First save");
        assert.equal(r.journalName, r.name); assert.deepEqual(r.journal, r.exported);
      }
    });
  } finally {
    await browser.close();
    console.log(`${passed}/${passed + failed} rendering checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();
