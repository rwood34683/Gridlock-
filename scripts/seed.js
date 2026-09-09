#!/usr/bin/env node
/* The demo state both capture scripts drive the app into.

   A realistic mid-session: a real roster, real film notes on both pits, a live
   point, league groups with people in them. Shots of an empty shell tell a
   coach nothing about whether the app is worth installing. */
module.exports = {
  entered: true, role: "staff", email: "coach@team.com",
  tab: "playbook", script: "snake", layoutKey: "lso",
  faceOn: true, shotOn: true, t: 0.62, matchState: "Even",
  tips: { pb: true, tally: true, scout: true, sl: true, class: true },
  left: {
    name: "Blast Camp", tend: "Balanced", threat: 5, pts: 200,
    notes: "Snake runner is #7, goes on the buzzer every time. Weak on the D-wire when they trade.",
  },
  right: {
    name: "Rejects", tend: "Snake", threat: 4, pts: 186,
    notes: "Two off the break to the snake. Slow to rotate once the front player is out.",
  },
  point: 3,
  tally: [
    { pt: 3, side: "them", name: "#4" },
    { pt: 3, side: "us", name: "Marsh" },
    { pt: 2, side: "us", name: "Reyes" },
    { pt: 2, side: "them", name: "#2" },
  ],
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
  ],
};
