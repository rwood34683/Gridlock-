#!/usr/bin/env node
"use strict";
// Convert only the public schedule and owner-supplied film suggestions. The
// private event package and elimination rows are never read into a season.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data/worldcup-handoff-2026.json");
const OUTPUT = path.join(ROOT, "data/worldcup-2026-season-copy.json");
const fold = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const key = g => [g.d,g.t,fold(g.h),fold(g.a)].join("|");
const read = f => JSON.parse(fs.readFileSync(f,"utf8"));
const text = v => JSON.stringify(v, null, 2) + "\n";
const SOURCE_FIELDS = ["game_id","event_id","division_id","division","day","date","time","field","pit","round","score","status","source_url","retrieved_at","home_name","home_entry_id","home_team_id","home_slot_label","away_name","away_entry_id","away_team_id","away_slot_label"];
const FILM_FIELDS = ["player","team","jersey","roleLane","preferredBunker","usualOut","usualKill","latePointClutch","notes","confidence","sourceGames"];
function take(row, fields) {
  assert.deepEqual(Object.keys(row).filter(k => !fields.includes(k)), [], "unmapped source fields need review");
  return Object.fromEntries(fields.filter(k => k in row).map(k => {
    assert(row[k] === null || ["string","number","boolean"].includes(typeof row[k]), "source fields must be scalar");
    return [k,row[k]];
  }));
}
function capture(pack) {
  const schedule=read(path.join(pack,"world-cup-2026/schedule.json"));
  const fragment=read(path.join(pack,"export/gridlock/season-copy-games.json"));
  const film=read(path.join(pack,"lone-star-open-2026/tendencies.json"));
  assert.equal(fragment.format,"gridlock.coach.copy"); assert.equal(fragment.v,1);
  assert.equal(fragment.data.games.length,646); assert.equal(schedule.games.length,722);
  assert.equal(film.tendencies.length,49);
  return {handoffCommit:"ea9320a1e00726bda43c56a36704c14f82b9cdea",
    sourceUrl:schedule.source_url, retrievedAt:schedule.retrieved_at,
    games:fragment.data.games.map(g => take(g,["id","d","t","h","a","f","dv","g","layout","score","status","srcId"])),
    schedule:schedule.games.map(g => take(g,SOURCE_FIELDS)),
    film:{sourceId:film.canvas_id,sourceUrl:film.canvas_url,updatedAt:film.page_updated_utc,
      rows:film.tendencies.map(r=>take(r,FILM_FIELDS))}};
}
function season(input) {
  const sources=new Map(input.schedule.map(g=>[g.game_id,g]));
  assert.equal(sources.size,722); assert.equal(input.games.length,646);
  const games=input.games.map(g=>{
    const src=sources.get(g.srcId); assert(src,`missing source ${g.id}`);
    assert.equal(g.id,"imp:"+src.game_id);
    return {...g,...src}; // Extra scalars survive copies: IDs, null slots, source and snapshot score.
  });
  assert.equal(new Set(games.map(key)).size,646);
  const scout={}; let players=0, teamNotes=0;
  input.film.rows.forEach((r,i)=>{
    // These are ordinal references to this immutable source, not invented person IDs.
    const sourceId=input.film.sourceId+":"+(i+1);
    const note=["Suggested · Lone Star Open 2026", "Confidence: "+r.confidence,
      ["Preferred bunker",r.preferredBunker],["Usual out",r.usualOut],["Usual kill",r.usualKill],
      ["Late point",r.latePointClutch],["Notes",r.notes],["Source games",r.sourceGames],
      ["Source jersey",r.jersey],"Source: "+sourceId,"Read: "+input.film.updatedAt,
      input.film.sourceUrl].map(v=>Array.isArray(v)?v[1]?v[0]+": "+v[1]:"":v).filter(Boolean).join(" · ");
    const profile=scout[r.team] ||= {players:[],filmSuggestions:true};
    if(r.jersey === "team" || /\(team\)|^team:/i.test(r.player)){
      profile.notes=[profile.notes, r.player+" · "+note].filter(Boolean).join("\n\n");
      teamNotes++; return;
    }
    // Unknown or conflicting jersey text belongs in the note, never in a number box.
    const jersey=/^#?(\d+)$/.exec(r.jersey || "");
    profile.players.push({name:r.player,num:jersey?jersey[1]:"",wire:r.roleLane,note,
      suggested:true,from:"film-suggestion",sourceId,sourceUrl:input.film.sourceUrl,
      sourceRow:i+1,sourceTeam:r.team,sourceJersey:r.jersey,sourceGames:r.sourceGames,
      confidence:r.confidence,sourceAt:input.film.updatedAt});
    players++;
  });
  return {copy:{format:"gridlock.coach.copy",v:1,app:"Gridlock Coach",at:input.retrievedAt,
    data:{games,scout}},counts:{games:games.length,players,teamNotes,teams:Object.keys(scout).length}};
}
function stampSeeds(input, html) {
  const start=html.indexOf("const SCHEDULE = {"),end=html.indexOf("// Days in the order",start);
  assert(start>=0&&end>start,"schedule block present");
  let block=html.slice(start,end),count=0;
  // Keep all 78 legacy game IDs, including the two corrected names. A kept
  // match and a coach's hidden-row preference still refer to the same game.
  block=block.replace(/^(\s*)\{(?:"d"|d):"([^\n]+)\},?$/gm,(line,indent)=>{
    const vm=require("node:vm"),g=vm.runInNewContext("("+line.trim().replace(/,$/,"")+")");
    const oldId=g.id || "sch:"+key(g);
    if(g.d==="2026-11-11"&&g.t==="08:00"&&g.f==="Lone Wolf · Pit 1") g.h="Rejects";
    if(g.d==="2026-11-11"&&g.t==="09:30"&&g.f==="NXL Pro · Pit 1") g.a="Rejects";
    const hits=input.schedule.filter(s=>s.date===g.d&&clock(s.time)===g.t&&fold(s.home_name||s.home_slot_label)===fold(g.h)&&fold(s.away_name||s.away_slot_label)===fold(g.a));
    assert.equal(hits.length,1,`seed match ${key(g)}`); const src=hits[0];
    const original={d:g.d,t:g.t,h:g.h,a:g.a,f:g.f,...(g.dv?{dv:g.dv}:{})};
    count++;
    return indent+JSON.stringify({...original,id:oldId,srcId:src.game_id,...src})+",";
  });
  assert.equal(count,78);
  return html.slice(0,start)+block+html.slice(end);
}
function clock(s){const m=/^(\d+):(\d+) ([AP])M$/.exec(s);assert(m,"source clock");return String(+m[1]%12+(m[3]==="P"?12:0)).padStart(2,"0")+":"+m[2];}
function main(){
  const args=process.argv.slice(2),source=args.indexOf("--source"),check=args.includes("--check");
  if(source>=0){assert(!check,"--source writes the reviewed public input");fs.writeFileSync(INPUT,text(capture(path.resolve(args[source+1]))));}
  const input=read(INPUT),out=season(input),expected=text(out.copy);
  if(check) {
    assert.equal(fs.readFileSync(OUTPUT,"utf8"),expected,"regenerate the season copy");
    const html=fs.readFileSync(path.join(ROOT,"web/index.html"),"utf8");
    assert.equal(stampSeeds(input,html),html,"regenerate seed provenance");
  }
  else fs.writeFileSync(OUTPUT,expected);
  if(args.includes("--stamp-seed")) {const f=path.join(ROOT,"web/index.html");fs.writeFileSync(f,stampSeeds(input,fs.readFileSync(f,"utf8")));}
  console.log(`${check?"Up to date":"Prepared"}: ${out.counts.games} schedule rows, ${out.counts.players} suggested players, ${out.counts.teamNotes} team notes. No tally rows or private event data.`);
}
module.exports={capture,season,stampSeeds,key};
if(require.main===module) main();
