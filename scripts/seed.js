#!/usr/bin/env node
/* The demo state both capture scripts drive the app into.

   A realistic mid-session: a real roster, real film notes on both pits, a live
   point, league groups with people in them. Shots of an empty shell tell a
   coach nothing about whether the app is worth installing. */
module.exports = {
  entered: true, role: "staff", email: "coach@team.com",
  tab: "playbook", script: "snake", layoutKey: "lso",
  faceOn: true, shotOn: true, t: 0.62, matchState: "Even",
  tips: { pb: true, tally: true, scout: true, sl: true, class: true, lg: true },
  left: {
    name: "Blast Camp", tend: "Balanced", threat: 5, pts: 200,
    notes: "Snake runner is #7, goes on the buzzer every time. Weak on the D-wire when they trade.",
  },
  right: {
    name: "Rejects", tend: "Snake", threat: 4, pts: 186,
    notes: "Two off the break to the snake. Slow to rotate once the front player is out.",
  },
  point: 4,
  // One match in play, with the format on it: race to 4, a 2–1 score, the
  // break clock set, nine men with five standing. Rows carry its id.
  matches: [{ id: "shot-m1", at: Date.now() - 1800000, vs: "Rejects", layout: "lso", raceTo: 4, breakClock: 90, end: "left", swapEnds: false }],
  matchId: "shot-m1",
  results: [
    { m: "shot-m1", pt: 1, won: "us", at: Date.now() - 1500000, read: "right" },
    { m: "shot-m1", pt: 2, won: "them", at: Date.now() - 1100000 },
    { m: "shot-m1", pt: 3, won: "us", at: Date.now() - 600000, read: "right" },
  ],
  lineups: { "shot-m1|1": ["Reyes", "Okafor", "Vance", "Marsh", "Bright"] },
  tally: [
    { m: "shot-m1", pt: 3, side: "them", name: "#4 Dill", layout: "lso", vs: "Rejects", script: "snake" },
    { m: "shot-m1", pt: 3, side: "us", name: "Marsh", layout: "lso", vs: "Rejects", script: "snake" },
    { m: "shot-m1", pt: 2, side: "us", name: "Reyes", layout: "lso", vs: "Rejects", script: "hold" },
    { m: "shot-m1", pt: 2, side: "them", name: "#2 Ng", layout: "lso", vs: "Rejects", script: "hold" },
  ],
  calls: [
    { m: "shot-m1", pt: 1, script: "snake", layout: "lso", vs: "Rejects", at: Date.now() - 1600000 },
    { m: "shot-m1", pt: 2, script: "hold", layout: "lso", vs: "Rejects", at: Date.now() - 1200000 },
    { m: "shot-m1", pt: 3, script: "snake", layout: "lso", vs: "Rejects", at: Date.now() - 700000 },
  ],
  scout: {
    Rejects: { tend: "Snake", threat: 4, notes: "Two off the break to the snake. Slow to rotate once the front player is out.",
      players: [{ num: "4", name: "Dill", wire: "snake", note: "", threat: 4 }, { num: "2", name: "Ng", wire: "dorito", note: "", threat: 3 },
                { num: "9", name: "Ortega", wire: "snake", note: "", threat: 3 }, { num: "17", name: "Baker", wire: "centre", note: "", threat: 3 },
                { num: "21", name: "Lowe", wire: "dorito", note: "", threat: 2 }] },
    "Blast Camp": { tend: "Balanced", threat: 5, notes: "Snake runner is #7, goes on the buzzer every time. Weak on the D-wire when they trade." },
  },
  groups: [
    { id: "ops", name: "Ops", members: [
      { name: "Dana Whitlock", phone: "5550142" }, { name: "Marcus Iyer", phone: "5550188" },
      { name: "Priya Raman", phone: "5550119" }] },
    { id: "refs", name: "Refs", members: [
      { name: "Head ref — Ola", phone: "5550170" }, { name: "Snake side — Tam", phone: "5550171" }] },
    { id: "reg", name: "Registration", members: [{ name: "Front gate", phone: "5550160" }] },
    { id: "vendors", name: "Vendors", members: [] },
  ],
  blasts: [
    { at: "Sat 07:12", n: 6, body: "Pit gate opens 8:00. Chrono is live at 8:30." },
  ],
  roster: [
    { name: "Reyes", num: 7, p: "snake MW", s: "GP" },
    { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
    { name: "Vance", num: 11, p: "GP", s: "snake" },
    { name: "Marsh", num: 22, p: "D-wire MD", s: "Tr" },
    { name: "Bright", num: 5, p: "back centre", s: "MD hold" },
    { name: "Nguyen", num: 9, p: "snake", s: "GP" },
    { name: "Walsh", num: 14, p: "MD", s: "D-wire" },
    { name: "Cole", num: 2, p: "GP", s: "snake MW" },
    { name: "Ito", num: 8, p: "back centre", s: "MT 50" },
  ],
};
