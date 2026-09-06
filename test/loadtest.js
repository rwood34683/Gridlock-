#!/usr/bin/env node
/* GRIDLOCK load and stress harness.
 *
 * There is no backend: the app makes zero network calls and keeps everything
 * in localStorage. So "10,000 downloads" puts no load on a server — there
 * isn't one. What CAN fall over is the device: render cost per interaction,
 * the animation loop, and the 5 MB localStorage quota.
 *
 * This measures those. Run the dev server first (npm run serve).
 */
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright-core"));

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = process.env.APP_URL || "http://localhost:5173/";

// A season, not a demo: what a busy league actually accumulates.
const SEASON = {
  points: 400,          // ~8 events x 50 points
  classResponses: 600,  // 12 clinics x 50 sign-ins
  leagueMembers: 300,   // ops, refs, registration, vendors across a season
  blasts: 500,
  messages: 800,
  moves: 1200,          // ~3 logged rotations a point
  grades: 500,          // a grade or two a point
};

const results = [];
const row = (name, value, unit, verdict) => results.push({ name, value, unit, verdict });
const ms = n => Math.round(n * 10) / 10;

function pct(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  // Throttle to something like a mid-range phone, not a datacentre CPU.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); // ≈ a mid-range phone

  await page.goto(URL, { waitUntil: "networkidle" });

  console.log("GRIDLOCK load test");
  console.log("==================");
  console.log(`CPU throttled 4x (mid-range phone). Season volume:`,
    Object.entries(SEASON).map(([k, v]) => `${v} ${k}`).join(", "));
  console.log();

  // ---------- 1. Cold start ----------
  const cold = await page.evaluate(() => {
    const t = performance.getEntriesByType("navigation")[0];
    return { dcl: t.domContentLoadedEventEnd - t.startTime, load: t.loadEventEnd - t.startTime };
  });
  row("Cold start to interactive", ms(cold.dcl), "ms", cold.dcl < 1000 ? "pass" : "slow");

  // ---------- 2. Seed a full season ----------
  await page.evaluate(S => {
    const st = {
      entered: true, role: "staff", email: "coach@team.com", tab: "playbook",
      script: "snake", layoutKey: "tbo", faceOn: true, shotOn: true, t: 0.5,
      point: S.points, tips: { pb: 1, tally: 1, scout: 1, sl: 1, class: 1, lg: 1 },
      left: { name: "Blast Camp", tend: "Balanced", threat: 5, pts: 200, notes: "x".repeat(400) },
      right: { name: "Rejects", tend: "Snake", threat: 4, pts: 186, notes: "x".repeat(400) },
      matchState: "Even", scoutTab: "matchup",
      roster: Array.from({ length: 12 }, (_, i) => ({ name: "Player " + i, num: i + 1, p: "snake MW", s: "GP" })),
      tally: [], classes: [], responses: [], groups: [], blasts: [], messages: [],
      moves: [], assessments: [], direct: {}, bunkerCalls: {},
    };
    // A season of bunker traffic, directions and grades on the digitized field.
    const ids = LAYOUTS.mwo.bunkers.map(b => b.id);
    for (let m = 0; m < S.moves; m++)
      st.moves.push({ pt: 1 + (m % S.points), who: "Player " + (m % 5), layout: "mwo",
                      from: ids[m % ids.length], to: ids[(m * 7 + 3) % ids.length], at: Date.now() });
    for (let g = 0; g < S.grades; g++)
      st.assessments.push({ who: "Player " + (g % 5), score: 1 + (g % 5), note: "held the corner", pt: 1 + (g % S.points), at: Date.now() });
    ["hold", "base", "snake", "flood", "blitz"].forEach(k => {
      for (let i = 1; i <= 5; i++)
        st.direct["mwo|" + k + "|" + i] = { face: [-135, -90, -45, 0, 45][i % 5], shot: ids[(i * 11) % ids.length], role: i % 2 ? "P" : "S" };
    });
    LAYOUTS.mwo.bunkers.slice(0, 20).forEach((b, i) => {
      st.bunkerCalls.mwo = st.bunkerCalls.mwo || {};
      st.bunkerCalls.mwo[b.id] = "Call " + i;
    });
    for (let p = 1; p <= S.points; p++)
      for (let k = 0; k < 5; k++)
        st.tally.push({ pt: p, side: k % 2 ? "us" : "them", name: "Player " + k, at: Date.now() });
    for (let c = 0; c < 12; c++) st.classes.push({ id: "GL-" + c, code: "GL-" + c, title: "Clinic " + c, open: true });
    for (let r = 0; r < S.classResponses; r++)
      st.responses.push({ code: "GL-" + (r % 12), name: "Signup " + r, contact: "555-0100",
                          exp: "Rec", wire: "Snake", notes: "note" });
    ["Ops", "Refs", "Registration", "Vendors"].forEach((n, gi) => st.groups.push({
      id: "g" + gi, name: n,
      members: Array.from({ length: Math.round(S.leagueMembers / 4) }, (_, i) => ({ name: n + " " + i, phone: "555010" + i })),
    }));
    for (let b = 0; b < S.blasts; b++) st.blasts.push({ at: new Date().toISOString(), n: 300, body: "Pit gate opens 8:00 — blast " + b });
    for (let m = 0; m < S.messages; m++) st.messages.push("Squad note " + m);
    localStorage.setItem("gridlock.coach.v2", JSON.stringify(st));
    return JSON.stringify(st).length;
  }, SEASON);

  const bytes = await page.evaluate(() => localStorage.getItem("gridlock.coach.v2").length);
  const quotaPct = (bytes / (5 * 1024 * 1024)) * 100;
  row("A full season in storage", Math.round(bytes / 1024), "KB", "info");
  row("Share of the 5 MB quota", Math.round(quotaPct * 10) / 10, "%", quotaPct < 60 ? "pass" : "risk");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // ---------- 3. Render cost per tab, with a season loaded ----------
  for (const [key, label] of [["playbook", "Playbook"], ["tally", "Tally"], ["scout", "Scout"],
                              ["sightlines", "Sightlines"], ["more", "More"]]) {
    const samples = [];
    for (let i = 0; i < 12; i++) {
      const t = await page.evaluate(k => {
        const t0 = performance.now();
        window.set({ tab: k, more: null });
        return performance.now() - t0;
      }, key);
      samples.push(t);
    }
    const p95 = pct(samples, 0.95);
    row(`Render ${label} (p95)`, ms(p95), "ms", p95 < 100 ? "pass" : p95 < 250 ? "slow" : "fail");
  }

  // ---------- 4. The heaviest single screen ----------
  for (const [key, label] of [["movement", "Movement"], ["assess", "Assess"], ["stats", "Bunker stats"]]) {
    const samples = [];
    for (let i = 0; i < 8; i++)
      samples.push(await page.evaluate(k => { const t0 = performance.now(); window.set({ tab: "more", more: k }); return performance.now() - t0; }, key));
    const p95 = pct(samples, 0.95);
    row(`Render ${label} (p95)`, ms(p95), "ms", p95 < 250 ? "pass" : p95 < 500 ? "slow" : "fail");
  }
  await page.evaluate(() => window.set({ tab: "playbook", more: null }));

  const heavy = [];
  for (let i = 0; i < 10; i++) {
    heavy.push(await page.evaluate(() => {
      const t0 = performance.now();
      window.set({ tab: "scout", scoutTab: "board" });
      return performance.now() - t0;
    }));
  }
  row("Render division board (p95)", ms(pct(heavy, 0.95)), "ms", pct(heavy, 0.95) < 150 ? "pass" : "slow");

  // ---------- 5. The animation loop ----------
  await page.evaluate(() => window.set({ tab: "playbook" }));
  const fps = await page.evaluate(() => new Promise(res => {
    const frames = [];
    let last = performance.now();
    const onFrame = () => {
      const now = performance.now();
      frames.push(now - last); last = now;
      if (now - start < 2400) requestAnimationFrame(onFrame);
      else res(frames);
    };
    const start = performance.now();
    window.playPath();
    requestAnimationFrame(onFrame);
  }));
  const mean = fps.reduce((a, b) => a + b, 0) / fps.length;
  const worst = Math.max(...fps);
  row("Break animation, mean frame", ms(mean), "ms", mean < 22 ? "pass" : mean < 34 ? "slow" : "fail");
  row("Break animation, worst frame", ms(worst), "ms", worst < 60 ? "pass" : "slow");
  row("Break animation, effective", Math.round(1000 / mean), "fps", 1000 / mean > 45 ? "pass" : "slow");

  // ---------- 6. Sustained interaction: a whole match ----------
  const matchStart = Date.now();
  const taps = [];
  for (let i = 0; i < 120; i++) {
    taps.push(await page.evaluate(i => {
      const t0 = performance.now();
      if (i % 4 === 0) window.set({ tab: "tally" });
      else if (i % 4 === 1) window.markOut("us", "Player " + (i % 5));
      else if (i % 4 === 2) window.set({ tab: "playbook", script: ["hold", "base", "snake", "flood", "blitz"][i % 5] });
      else window.set({ tab: "scout" });
      return performance.now() - t0;
    }, i));
  }
  row("120 sideline taps, p50", ms(pct(taps, 0.5)), "ms", pct(taps, 0.5) < 80 ? "pass" : "slow");
  row("120 sideline taps, p95", ms(pct(taps, 0.95)), "ms", pct(taps, 0.95) < 200 ? "pass" : "slow");
  row("120 taps, wall clock", Math.round((Date.now() - matchStart) / 1000), "s", "info");

  // ---------- 7. Memory after the match ----------
  const mem = await page.evaluate(() => performance.memory
    ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
  if (mem !== null) row("JS heap after a full match", mem, "MB", mem < 120 ? "pass" : "risk");

  // ---------- 8. Storage quota: where does it actually break ----------
  const quota = await page.evaluate(() => {
    let mb = 0;
    const chunk = "x".repeat(256 * 1024);
    try {
      for (; mb < 40; mb++) localStorage.setItem("__probe" + mb, chunk);
    } catch (e) {
      for (let i = 0; i < mb; i++) localStorage.removeItem("__probe" + i);
      return mb * 0.25;
    }
    for (let i = 0; i < mb; i++) localStorage.removeItem("__probe" + i);
    return mb * 0.25;
  });
  row("localStorage headroom on top", quota, "MB", quota > 2 ? "pass" : "risk");

  // ---------- report ----------
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("MEASUREMENT", 34), pad("VALUE", 12), "VERDICT");
  console.log("-".repeat(60));
  for (const r of results) console.log(pad(r.name, 34), pad(`${r.value} ${r.unit}`, 12), r.verdict);
  console.log();
  if (errors.length) { console.log("ERRORS DURING RUN:"); errors.forEach(e => console.log("  " + e)); }
  else console.log("No page errors during the run.");

  const bad = results.filter(r => r.verdict === "fail" || r.verdict === "risk");
  console.log();
  console.log(bad.length ? `${bad.length} measurement(s) need attention.` : "All measurements within budget.");
  await browser.close();
  process.exit(errors.length || bad.some(b => b.verdict === "fail") ? 1 : 0);
})();
