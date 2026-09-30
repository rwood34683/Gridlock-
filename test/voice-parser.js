#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {parse} = require("../web/voice-parser");
const players = [
  {key:"number:7",name:"Alex Goldman",num:"7"},
  {key:"number:12",name:"Jordan",num:"12"},
  {key:"number:19",name:"Sam",num:"19"},
  {key:"number:42",name:"André",num:"42"},
];
const bunkers = [
  {id:"GW#1",name:"Home",aliases:["home bunker","giant wing"]},
  {id:"S#1",name:"Snake one",aliases:["snake 1","snake"]},
  {id:"S#2",name:"Snake two",aliases:["snake 2","snake"]},
  {id:"MD#1",name:"Dorito one",aliases:["D1","dorito 1","dorito"]},
  {id:"MD#2",name:"Dorito two",aliases:["D2","dorito 2","dorito"]},
];
const context = {players,bunkers,selectedPlayer:null};
let count = 0;
function check(name, fn) { fn(); count++; console.log("PASS " + name); }
function one(text, extra = {}) { const result = parse(text,{...context,...extra}); assert.equal(result.length,1); return result[0]; }
function event(text, kind, player, bunker = "") {
  const row = one(text); assert.equal(row.kind,kind); assert.equal(row.player,player); assert.equal(row.bunker,bunker); assert.equal(row.review,false,row.reason); return row;
}
check("named elimination is independent of selected player",()=>{
  const row = one("Alex is out",{selectedPlayer:players[1]}); assert.equal(row.player,"number:7"); assert.equal(row.kind,"out"); assert.equal(row.review,false);
});
check("movement uses an exact friendly bunker call",()=>event("Jordan moved to Home","move","number:12","GW#1"));
check("hit records the identified player and location",()=>event("Sam was hit at Home","hit","number:19","GW#1"));
check("short hit phrasing still identifies the casualty",()=>event("Sam hit at Home","hit","number:19","GW#1"));
check("spoken seven and twelve identify jerseys",()=>{
  event("number seven ran to snake one","move","number:7","S#1"); event("number twelve is out","out","number:12");
});
check("joined and spaced spoken numbers identify forty two",()=>{
  event("number fortytwo is out","out","number:42"); event("number forty-two got hit","hit","number:42");
});
check("number without spaces and hashtag jersey remain usable",()=>{
  event("number7 is out","out","number:7"); event("#12 at D1","move","number:12","MD#1"); event("No. 7 is out","out","number:7");
});
check("unknown numbered opponent is valid without inventing a name",()=>{
  const row = event("number ninety nine at Home","move","number:99","GW#1"); assert.equal(row.playerName,"#99");
});
check("unknown named player never falls back to selected opponent",()=>{
  const row = one("Morgan is out",{selectedPlayer:players[0]}); assert.equal(row.review,true); assert.equal(row.player,"");
});
check("ambiguous first names remain unresolved; a full name disambiguates",()=>{
  const duplicate = [...players,{key:"number:8",num:"8",name:"Alex Brown"}];
  assert.equal(one("Alex is out",{players:duplicate}).review,true);
  const clear = one("Alex Goldman is out",{players:duplicate}); assert.equal(clear.player,"number:7"); assert.equal(clear.review,false);
});
check("duplicate roster jersey numbers are not resolved by first match",()=>{
  const row = one("number seven is out",{players:[...players,{key:"other-seven",num:7,name:"Other"}]}); assert.equal(row.review,true); assert.equal(row.player,"");
});
check("negated elimination and hit never count as confirmed",()=>{
  for (const phrase of ["Alex is not out","Sam wasn't hit at Home","number seven did not move to Home"]) {
    const row = one(phrase); assert.equal(row.kind,"note"); assert.equal(row.review,true);
  }
});
check("uncertain hit and location stay in review",()=>{
  assert.equal(one("Sam might be hit at Home").review,true); assert.equal(one("I think number seven is out").review,true);
});
check("active shooting never blames the shooter or invents the victim",()=>{
  for (const phrase of ["number7shotnumber12","Alex shot Jordan","Alex is shooting at Home"]) {
    const row = one(phrase); assert.equal(row.kind,"note"); assert.equal(row.review,true);
  }
  assert.equal(one("number7shotnumber12").player,"");
});
check("getting shot out is an explicit elimination",()=>event("number seven got shot out","out","number:7"));
check("out of a bunker is movement, not elimination",()=>{
  const row = one("Alex ran out of Home to D1"); assert.equal(row.kind,"move"); assert.equal(row.bunker,"MD#1"); assert.equal(row.review,false);
});
check("source and destination in movement resolve only the destination",()=>event("Jordan moved from Home to snake two","move","number:12","S#2"));
check("a source without a destination never creates an arrival",()=>{
  for (const text of ["Alex moved from Home","Alex ran out of Home"]) {
    const row = one(text); assert.equal(row.kind,"move"); assert.equal(row.bunker,""); assert.equal(row.review,true);
  }
});
check("ambiguous bunker shorthand never chooses the first bunker",()=>{
  const row = one("Jordan at snake"); assert.equal(row.review,true); assert.equal(row.bunker,"");
});
check("long exact bunker call overrides its ambiguous contained shorthand",()=>event("Jordan at snake one","move","number:12","S#1"));
check("two possible destinations require review",()=>{
  const row = one("Jordan moved to snake one or snake two"); assert.equal(row.review,true); assert.equal(row.bunker,"");
});
check("unrecognized location is kept as raw text instead of guessed",()=>{
  const text = "Jordan moved to the mystery bunker"; const row = one(text); assert.equal(row.review,true); assert.equal(row.bunker,""); assert.equal(row.text,text);
});
check("plural subjects are not attributed to the selected player",()=>{
  for (const phrase of ["they moved to snake","two players are out","both are out"]) {
    const row = one(phrase,{selectedPlayer:players[0]}); assert.equal(row.player,""); assert.equal(row.review,true);
  }
});
check("a selected player supports direct short event commands",()=>{
  const row = one("moved to Home",{selectedPlayer:players[2]}); assert.equal(row.player,"number:19"); assert.equal(row.review,false);
  const out = one("he is out",{selectedPlayer:players[2]}); assert.equal(out.player,"number:19"); assert.equal(out.review,false);
});
check("explicit unknown number overrides selected player",()=>{
  const row = one("number 83 is out",{selectedPlayer:players[0]}); assert.equal(row.player,"number:83"); assert.equal(row.review,false);
});
check("conjoined multi-player events preserve each actual subject",()=>{
  const text = "Alex is out and Jordan moved to Home, Sam was hit at snake two.";
  const rows = parse(text,context); assert.equal(rows.length,3);
  assert.deepEqual(rows.map(r=>[r.player,r.kind,r.bunker,r.review]),[
    ["number:7","out","",false],["number:12","move","GW#1",false],["number:19","hit","S#2",false],
  ]); assert(rows.every(r=>r.text===text));
});
check("same-player then continuation follows the spoken player",()=>{
  const rows = parse("Alex moved to Home then he was hit",{...context,selectedPlayer:players[1]});
  assert.equal(rows.length,2); assert(rows.every(r=>r.player==="number:7")); assert.deepEqual(rows.map(r=>r.kind),["move","hit"]);
});
check("two subjects sharing an action require explicit review",()=>{
  const row = one("number seven and number twelve are out"); assert.equal(row.player,""); assert.equal(row.review,true);
});
check("source of fire is not attributed as the victim's bunker",()=>{
  const row = one("Sam was hit from Home"); assert.equal(row.kind,"hit"); assert.equal(row.bunker,""); assert.equal(row.review,false);
});
check("a numeric bunker call cannot steal the player's jersey number",()=>{
  const row = one("number seven is out",{bunkers:[...bunkers,{id:"numeric-call",name:"Seven",aliases:[]}]});
  assert.equal(row.bunker,""); assert.equal(row.review,false);
});
check("a transitive hit and a command do not assign an unproven casualty",()=>{
  for (const text of ["Sam hit Home","hit Sam"]) {
    const row = one(text); assert.equal(row.kind,"note"); assert.equal(row.review,true);
  }
});
check("attention toward a bunker never becomes a player location",()=>{
  for (const text of ["Alex is looking at Home","Alex is looking towards Home","Alex is aiming at Home",
    "Alex is watching Home","Alex is shooting at Home","Alex is being watched at Home","Alex is covering at Home"]) {
    const row = one(text); assert.equal(row.review,true,text); assert.equal(row.bunker,"",text); assert.equal(row.kind,"note",text);
  }
});
check("an unknown shooter's location is not assigned to the casualty",()=>{
  const row = one("number seven was shot by Morgan at Home"); assert.equal(row.player,"number:7");
  assert.equal(row.kind,"hit"); assert.equal(row.review,true); assert.equal(row.bunker,"");
});
check("clear casualty location before the shooter remains useful",()=>event("Sam was hit at Home by Morgan","hit","number:19","GW#1"));
check("being shot at is incoming fire, not confirmation of a hit",()=>{
  const row = one("Sam is being shot at Home"); assert.equal(row.kind,"note"); assert.equal(row.review,true); assert.equal(row.bunker,"");
});
check("normal stated positions remain confident after attention safeguards",()=>{
  event("Alex is at Home","move","number:7","GW#1"); event("Alex is behind Home","move","number:7","GW#1");
  event("Alex is at Home watching the wire","move","number:7","GW#1");
  event("I see Alex at Home","move","number:7","GW#1");
});
check("Unicode names and full-width numerals are safe",()=>{
  event("André is out","out","number:42"); event("number ７ at Home","move","number:7","GW#1");
  const custom = one("李明 is out",{players:[{key:"name:李明",name:"李明"}]}); assert.equal(custom.player,"name:李明"); assert.equal(custom.review,false);
});
check("HTML and control-like text stays inert in the retained transcript",()=>{
  const text = "<script>globalThis.compromised=true</script> unknown";
  const rows = parse(text,context); assert(rows.length); assert(rows.every(row=>row.text===text && row.review)); assert.equal(globalThis.compromised,undefined);
});
check("empty and non-event speech produce no invented result",()=>{
  assert.deepEqual(parse("  ",context),[]); assert.equal(one("hello there").review,true);
});
check("UMD exposes the same parser in a browser context",()=>{
  const sandbox = {}; vm.runInNewContext(fs.readFileSync(require.resolve("../web/voice-parser"),"utf8"),sandbox);
  assert.equal(typeof sandbox.GridlockVoiceParser.parse,"function");
  const result = sandbox.GridlockVoiceParser.parse("number seven is out",{players:[],bunkers:[]});
  assert.equal(result[0].player,"number:7"); assert.equal(result[0].review,false);
});
console.log(`Voice parser: ${count}/${count} checks passed.`);
