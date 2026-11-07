"use strict";
/* The Tally loop faults the review of 5 Nov 2026 reproduced: the result bar
   over the field, double taps on New match and Next point, Back's own
   "tap again", an auto call outliving Back, and an auto call beating a tapped
   one on a sheet merge. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  async function check(name, fn, vp = { width: 390, height: 844 }) {
    const { mobile, ...size } = vp;
    const c = await browser.newContext({ viewport: size, hasTouch: true, isMobile: !!mobile, serviceWorkers: "block" });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
      await p.reload(); await p.waitForFunction(() => typeof S === "object" && S.entered);
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  try {
    for (const vp of [{ width: 375, height: 667 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 390, height: 844 }])
      await check(`no tap on the Tally field lands on the result bar at ${vp.width}x${vp.height}`, async p => {
        const hits = await p.evaluate(() => {
          set({ tab: "tally" }); document.querySelector(".main").scrollTop = 0;
          const f = document.querySelector("#tally-map svg.field").getBoundingClientRect(); let n = 0;
          for (let y = f.top + 2; y < f.bottom - 2; y += 5) for (let x = f.left + 4; x < f.right - 4; x += 15) {
            const e = document.elementFromPoint(x, y); if (e && e.closest(".resultbar")) n++; }
          return n;
        });
        assert.equal(hits, 0);
      }, vp);

    await check("the small-phone field fits after layout and after rotating back", async p => {
      await p.evaluate(() => set({ tab: "tally" }));
      async function fitted(){
        await p.waitForFunction(() => {
          const f = document.querySelector("#tally-map svg.field").getBoundingClientRect(),
                b = document.querySelector(".resultbar").getBoundingClientRect(),
                m = document.querySelector(".main").getBoundingClientRect();
          return f.height >= 170 && f.bottom <= b.top && b.bottom <= m.bottom + 1;
        });
      }
      await fitted();
      await p.setViewportSize({ width: 844, height: 390 });
      await p.waitForFunction(() => document.querySelector(".resultbar").classList.contains("resultbar--flow"));
      assert.ok(await p.evaluate(() => document.querySelector("#tally-map svg.field").getBoundingClientRect().bottom
        <= document.querySelector(".resultbar").getBoundingClientRect().top));
      await p.setViewportSize({ width: 375, height: 667 }); await fitted();
      await p.evaluate(() => { set({ tab: "scout" }); set({ tab: "tally" }); });
      await fitted();
    }, { width: 375, height: 667 });
    await check("a bottom bunker tap opens its sheet without changing the result", async p => {
      await p.evaluate(() => set({ tab: "tally" }));
      await p.waitForFunction(() => !document.querySelector(".resultbar").classList.contains("resultbar--flow"));
      const before = await p.evaluate(() => JSON.stringify({ point: S.point, results: S.results }));
      const target = await p.locator("#tally-map .bnk").evaluateAll(nodes => nodes.map(n => {
        const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }).sort((a, b) => b.y - a.y)[0]);
      await p.mouse.click(target.x, target.y);
      assert.ok(await p.locator("#tally-sheet").isVisible(), "opens the bunker sheet");
      assert.equal(await p.evaluate(() => JSON.stringify({ point: S.point, results: S.results })), before);
    }, { width: 375, height: 667 });
    // Filmed on an iPad, 7 Nov 2026: with nobody named, every tap on the field
    // redrew the screen and smooth-scrolled to a box already in view, and the
    // first tap grew the box — the field lurched under each tap.
    for (const vp of [{ width: 820, height: 1180 }, { width: 390, height: 844 }])
      await check(`taps on the field with no opponent hold the screen still at ${vp.width}x${vp.height}`, async p => {
        await p.evaluate(() => { S.matches = [{ id: "blank", at: Date.now(), layout: "lso" }]; S.matchId = "blank";
          S.right = { name: "" }; S.left = { name: "" }; S.point = 1; save(S); set({ tab: "tally" }); });
        await p.waitForTimeout(300);
        const field = () => p.evaluate(() => Math.round(document.querySelector("#root [data-pick]").getBoundingClientRect().top));
        const boxH = () => p.evaluate(() => Math.round(document.getElementById("tally-opp").getBoundingClientRect().height));
        // The iPad taps the field where it stands, under the box; a phone has to scroll down to it.
        const at = await p.evaluate(phone => { if (phone) document.querySelector("#root [data-pick]").scrollIntoView({ block: "center" });
          const r = document.querySelector("#root [data-pick]").getBoundingClientRect();
          window.__renders = 0; const r0 = window.render; window.render = (...a) => { window.__renders++; return r0(...a); };
          return { x: r.x + r.width * 0.3, y: r.y + r.height * 0.6 }; }, vp.width < 600);
        await p.waitForTimeout(150); const top0 = await field(), h0 = await boxH();
        for (let i = 0; i < 3; i++) { await p.touchscreen.tap(at.x + i * 20, at.y); await p.waitForTimeout(700); }
        assert.equal(await boxH(), h0, "the box is the same height lit or not");
        assert.ok(await p.evaluate(() => S.tallyNudge === true && !S.tallySel));
        assert.match(await p.evaluate(() => document.querySelector("#tally-opp .opp-lede").innerText), /^Name them first/);
        assert.ok(await p.evaluate(() => window.__renders) <= 1, "only the first tap redraws");
        if (vp.width > 600) assert.equal(await field(), top0, "the field stays where it was on an iPad, with the box in view");
        const o = await p.evaluate(() => { const b = document.getElementById("tally-opp").getBoundingClientRect(),
          m = document.querySelector(".main").getBoundingClientRect(); return b.top >= m.top - 1 && b.top < m.bottom; });
        assert.ok(o, "the box is on screen");
      }, vp);

    // Screenshotted on an iPhone, 7 Nov 2026: every field acted on the touch
    // itself, so a swipe that began on the field was a tap — on a phone the
    // field fills the screen and the page could not be scrolled past it.
    for (const where of ["tally", "breakouts"])
      await check(`a swipe on the ${where} field scrolls the page and taps nothing; a tap still taps`, async p => {
        const map = where === "tally" ? "#tally-map" : "#their-map";
        await p.evaluate(w => w === "tally" ? set({ tab: "tally", tallySel: null, tallyDraft: null })
          : set({ tab: "scout", scoutTab: "breakouts", theirPick: [] }), where);
        await p.waitForTimeout(300);
        const state = () => p.evaluate(() => ({ sel: S.tallySel || null, pick: (S.theirPick || []).length, rows: (S.breakouts || []).length }));
        const start = await p.evaluate(m => { const main = document.querySelector(".main"), svg = document.querySelector(m + " svg.field");
          main.scrollTop = Math.max(0, main.scrollTop + svg.getBoundingClientRect().top - 120);
          const r = svg.getBoundingClientRect(); const y = r.top + Math.min(r.height * 0.6, 240), hit = document.elementFromPoint(r.x + r.width / 2, y);
          return { x: r.x + r.width / 2, y, top: main.scrollTop, onField: !!(hit && hit.closest(m + " [data-pick]")) }; }, map);
        assert.ok(start.onField, "the swipe starts on the field itself");
        const before = await state(), cdp = await p.context().newCDPSession(p);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y }] });
        for (let i = 1; i <= 12; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y - i * 25 }] }); await p.waitForTimeout(16); }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await p.waitForTimeout(500);
        assert.deepEqual(await state(), before, "the swipe picked nothing");
        assert.ok(await p.evaluate(() => document.querySelector(".main").scrollTop) > start.top + 100, "the page scrolled");
        const at = await p.evaluate(m => { const svg = document.querySelector(m + " svg.field"); svg.scrollIntoView({ block: "center" });
          const b = curLayout().bunkers[4], q = new DOMPoint(b.x * 2, b.y * 2).matrixTransform(svg.getScreenCTM()); return { x: q.x, y: q.y }; }, map);
        await p.waitForTimeout(200);
        await p.touchscreen.tap(at.x, at.y); await p.waitForTimeout(300);
        const after = await state();
        assert.ok(where === "tally" ? after.sel : after.pick === 1, "a tap still picks the bunker");
      }, { width: 390, height: 844, mobile: true });

    // Screenshotted on an iPhone, 7 Nov 2026: the ends row under the field sat
    // behind the result bar, and a message covered the foot of the field.
    for (const vp of [{ width: 393, height: 780 }, { width: 430, height: 860 }])
      await check(`the ends row clears the result bar and a message clears the field at ${vp.width}x${vp.height}`, async p => {
        await p.evaluate(() => { S.matches = [{ id: "m1", at: Date.now(), vs: "Rejects", layout: S.layoutKey, raceTo: 4 }]; S.matchId = "m1";
          S.right = { name: "Rejects" }; S.point = 2; S.results = [{ m: "m1", pt: 1, won: "them" }]; save(S); set({ tab: "tally" }); });
        await p.waitForFunction(() => { const b = document.querySelector(".resultbar"); return b && !b.classList.contains("resultbar--flow"); });
        await p.waitForTimeout(200);
        const box = () => p.evaluate(() => { const r = e => { const q = e.getBoundingClientRect(); return { top: q.top, bottom: q.bottom }; };
          const fl = document.querySelector("#root .flash");
          return { field: r(document.querySelector("#tally-map svg.field")), ends: r(document.querySelector("#tally-map").nextElementSibling),
                   bar: r(document.querySelector(".resultbar")), flash: fl ? r(fl) : null }; });
        let b = await box();
        assert.ok(b.ends.bottom <= b.bar.top + 1, `ends row ${Math.round(b.ends.bottom)} under the bar at ${Math.round(b.bar.top)}`);
        await p.evaluate(() => flash("Theirs: all 5 placed. Take one off with his \u00d7 under the field, or go on to 2 \u00b7 What happened."));
        b = await box();
        assert.ok(b.flash && b.flash.bottom <= b.field.top + 1, "the message stands clear of the field");
      }, vp);

    // Screenshotted on an iPhone, 7 Nov 2026: "how do we make this more user
    // friendly" and "points sorted out by each team". Bunker stats reads one
    // side and one team, numbers its rings, and a tap reads one bunker.
    await check("Bunker stats splits yours and theirs and each team, and a tap on the field reads a bunker", async p => {
      const ids = await p.evaluate(() => {
        const bl = curLayout().bunkers, L = S.layoutKey;
        S.matches = [{ id: "a", at: Date.now(), vs: "Rejects", layout: L }, { id: "b", at: Date.now(), vs: "Dynasty", layout: L },
                     { id: "w", at: Date.now(), watch: true, home: "Rejects", away: "Dynasty", layout: L }];
        S.matchId = "a"; S.right = { name: "Rejects" };
        const row = (id, m, side, k, alive) => ({ id, m, pt: 1, side, bunker: bl[k].id, alive, layout: L, at: 1 });
        S.breakouts = [row("1", "a", "us", 5, true), row("2", "a", "them", 9, false), row("3", "b", "them", 9, true), row("4", "w", "them", 9, true)];
        save(S); set({ tab: "more", more: "stats" }); return [bl[5].id, bl[9].id, bl[9]];
      });
      const counts = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll(".tbl--stats tbody tr")]
        .map(r => [r.querySelector(".tbl__sub") ? r.querySelector(".tbl__sub").textContent : r.cells[0].innerText.trim(), [+r.cells[1].innerText, +r.cells[2].innerText]])));
      assert.deepEqual(await counts(), { [ids[0]]: [1, 0], [ids[1]]: [2, 1] }, "both sides, every team; the watched game is left out");
      assert.equal(await p.locator("#stats-map .stat-n").count(), 2, "a number on each busy bunker");
      await p.getByRole("button", { name: "Theirs", exact: true }).click();
      assert.deepEqual(await counts(), { [ids[1]]: [2, 1] });
      await p.locator("#root select").filter({ has: p.locator("option", { hasText: "Every team" }) }).selectOption("Dynasty");
      assert.deepEqual(await counts(), { [ids[1]]: [1, 0] }, "theirs against Dynasty");
      const at = await p.evaluate(b => { const svg = document.querySelector("#stats-map svg.field"); svg.scrollIntoView({ block: "center" });
        const q = new DOMPoint(b.x * 2, b.y * 2).matrixTransform(svg.getScreenCTM()); return { x: q.x, y: q.y }; }, ids[2]);
      await p.mouse.click(at.x, at.y);
      assert.equal(await p.evaluate(() => S.statPick), ids[1], "a tap on the field picks the bunker");
      assert.match(await p.evaluate(() => document.querySelector(".stat-pick").innerText), /their men against Dynasty went there 1 time, shot there 0/);
      await p.locator(".tbl__pick").first().click();
      assert.equal(await p.evaluate(() => S.statPick), null, "tapping its row again clears it");
    });

    // "Fix the weak spots", 7 Nov 2026: a job broken from both ends is one
    // bunker, what it won is beside it, and a count under three reads faint.
    await check("Bunker stats turns every point to your end, says what each bunker won, and marks thin counts", async p => {
      const r = await p.evaluate(() => {
        const L = S.layoutKey, bl = curLayout().bunkers, a = bl.find(b => b.x < 60), twin = mirrorBunkerId(a.id);
        S.matches = [{ id: "a", at: Date.now(), vs: "Rejects", layout: L, end: "left", swapEnds: true }];
        S.matchId = "a"; S.right = { name: "Rejects" }; S.point = 5;
        S.results = [1, 2, 3, 4].map(pt => ({ m: "a", pt, won: pt === 4 ? "them" : "us", at: 1 }));
        // Points 1 and 3 broken from the left, 2 and 4 from the right: the same job.
        S.breakouts = [1, 2, 3, 4].map(pt => ({ id: "x" + pt, m: "a", pt, side: "us", bunker: ourEnd(pt, S.matches[0]) === "left" ? a.id : twin, alive: true, layout: L, at: 1 }));
        save(S); set({ tab: "more", more: "stats", statSide: "us" });
        const row = id => { const tr = [...document.querySelectorAll(".tbl--stats tbody tr")].find(t => t.textContent.includes(id)); return tr ? [...tr.cells].map(c => c.innerText.trim()) : null; };
        const shown = shownBunker(a.id), turned = row(shown);
        set({ statAsPlayed: true }); const played = [row(a.id), row(twin)];
        set({ statAsPlayed: false });
        return { turned, played, thinRows: document.querySelectorAll(".tbl--stats tr.thin").length, ends: /Turned to your end/.test(document.getElementById("root").innerText) };
      });
      assert.ok(r.ends, "the ends switch shows once ends have moved");
      assert.deepEqual(r.turned.slice(1), ["4", "0", "3–1"], "one bunker: four breaks, won 3 lost 1");
      assert.deepEqual(r.played.map(x => x && x[1]), ["2", "2"], "as played it is two bunkers");
      assert.equal(r.thinRows, 0, "four logged is not thin");
      const thin = await p.evaluate(() => { S.breakouts = S.breakouts.slice(0, 2); save(S); set({ statAsPlayed: true });
        return { rows: document.querySelectorAll(".tbl--stats tr.thin").length, note: /too few to read/.test(document.getElementById("root").innerText) }; });
      assert.equal(thin.rows, 2); assert.ok(thin.note);
    });
    await check("after a match, the backup nudge speaks for anything logged since the last copy, and a working League sync quiets it", async p => {
      const said = await p.evaluate(() => {
        S.matches = [{ id: "a", at: Date.now(), vs: "Rejects", layout: S.layoutKey, raceTo: 1 }]; S.matchId = "a"; S.right = { name: "Rejects" };
        S.copiedAt = Date.now() - 3 * 3600000; S.results = [{ m: "a", pt: 1, won: "us", at: Date.now() }]; S.point = 2;
        save(S); set({ tab: "tally" });
        const t1 = document.getElementById("root").innerText;
        set({ copiedAt: Date.now() + 1000 }); const t2 = document.getElementById("root").innerText;
        set({ copiedAt: Date.now() - 3 * 3600000, syncOn: true, syncAt: Date.now() + 1000 }); const t3 = document.getElementById("root").innerText;
        return [t1, t2, t3].map(t => /since your last copy \(3 h ago\) is only on this phone/.test(t) || /since your last copy/.test(t));
      });
      assert.deepEqual(said, [true, false, false]);
      assert.equal(await p.locator("#root .copy-nudge").count(), 0);
      await p.evaluate(() => set({ syncOn: false }));
      assert.equal(await p.getByRole("button", { name: "Save now", exact: true }).count(), 1, "one tap saves from the sheet");
      const after = await p.evaluate(async () => { const before = S.copiedAt; await nudgeSave();
        return { saved: S.copiedAt > before, tab: S.tab, gone: !document.querySelector("#root .copy-nudge"), said: /Saved\. Keep the file/.test(document.getElementById("root").innerText) }; });
      assert.deepEqual(after, { saved: true, tab: "tally", gone: true, said: true }, "saved where he is, and the nudge goes");
    });

    await check("a double tap on the winning point does not close the sheet", async p => {
      await p.evaluate(() => { set({ tab: "tally" }); tapResult("us"); _lastEnd.at -= RESULT_GUARD_MS + 1; });
      const mid = await p.evaluate(() => S.matchId);
      await p.evaluate(() => { tapResult("us"); });          // 4–1, race over
      assert.ok(await p.evaluate(() => matchOver()), "race over");
      await p.evaluate(() => tapNewMatch());               // the second tap of the double
      assert.equal(await p.evaluate(() => S.matchId), mid, "the sheet stays open");
      assert.match(await p.evaluate(() => document.getElementById("root").innerText), /Tap New match again/);
      await p.evaluate(() => tapNewMatch());
      assert.notEqual(await p.evaluate(() => S.matchId), mid, "the tap it asks for goes through");
    });
    await check("Next point tapped twice moves one point", async p => {
      const pt = await p.evaluate(() => { set({ tab: "tally" }); const a = S.point; tapNext(); tapNext(); return [a, S.point]; });
      assert.equal(pt[1], pt[0] + 1);
    });
    await check("Back's 'tap again' is taken; the call the result wrote goes with it", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally", script: "snake" }); const pt = S.point;
        tapResult("them"); tapBack(); const refused = S.point; tapBack();
        return { pt, refused, back: S.point, call: (S.calls || []).some(c => c.m === S.matchId && c.pt === pt) };
      });
      assert.equal(got.refused, got.pt + 1); assert.equal(got.back, got.pt);
      assert.equal(got.call, false, "no call left on a point with no result");
    });
    await check("on a merged sheet, the call a coach tapped beats one the result wrote", async p => {
      const got = await p.evaluate(() => {
        const pt = S.point;
        set({ script: "hold" }); logCall(); endPoint("us");
        const copy = sheetPayload(S.matchId);
        backPoint(); S.calls = S.calls.filter(c => !(c.m === S.matchId && c.pt === pt)); save(S);
        set({ script: "snake" }); _lastEnd = null; tapResult("us");
        loadCopy("merge", copy);
        return (S.calls || []).filter(c => c.m === S.matchId && c.pt === pt).map(c => [c.script, !!c.auto]);
      });
      assert.deepEqual(got, [["hold", false]]);
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} tally review checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();
