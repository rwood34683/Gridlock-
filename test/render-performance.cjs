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
