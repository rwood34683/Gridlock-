#!/usr/bin/env node
"use strict";
// Compile the owner's JSON handoff, never scrape or contact the roster service.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const {gzipSync} = require("fflate");
const ROOT = path.resolve(__dirname, "..");
const PRIVATE_FIELDS = ["age_as_published", "registration_fee_paid", "person_event_link", "event_person_token"];
// "...rosterclass.cgi?ERID=x&EPID=y" -> "...rosterclass.cgi?ERID=x": the entry stays, the person goes.
// Only a string that is one address: in a sentence, "[^&#]*" would run to the
// end of the text and cut the rest of it off.
const withoutPersonToken = s => /^https?:\/\/\S+$/i.test(s) && /[?&]EPID=/i.test(s)
  ? s.replace(/&EPID=[^&#]*/gi, "").replace(/\?EPID=[^&#]*&?/i, "?").replace(/\?(#|$)/, "$1") : s;
function compile(dir) {
  const hashes = {};
  const read = name => {
    const bytes = fs.readFileSync(path.join(dir, name + ".json"));
    hashes[name + ".json"] = crypto.createHash("sha256").update(bytes).digest("hex");
    return JSON.parse(bytes);
  };
  const teams = read("teams"), rosters = read("rosters"), people = read("people"), profiles = read("player_profiles"),
    history = read("person_event_history"), locations = read("team_locations"), sources = read("sources"), audit = read("coverage-audit"),
    missing = read("missing-items"), coverage = read("roster-source-coverage"), differences = read("modern-legacy-differences");
  const without = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
  const rows = {
    divisions: teams.divisions,
    entries: teams.teams.map(t => without(t, ["team_location"])),
    locations: locations.observations,
    rosters: rosters.rosters.map(r => without(r, ["members"])),
    memberships: rosters.rosters.flatMap(r => r.members.map(m => ({entry_id:r.entry_id, ...m}))),
    people: people.people.map(p => ({...without(p, ["name_variants", "history", "profile_access"]),
      history:without(p.history, ["observations"])})),
    profiles: profiles.profiles,
    names: profiles.name_variants,
    access: profiles.profile_access,
    history: history.observations,
    participation: profiles.team_history,
    sources,
    missing: missing.items,
    rosterCoverage: coverage.entries,
    rosterDifferences: differences.entries
  };
  // What the app never ships about a person: a published age, whether they
  // paid, their personal roster link and its token. They came off login-only
  // pages, some of the people are minors, and no screen needs them. The token
  // is also cut out of any source address that carries one.
  for (const m of rows.memberships) for (const k of PRIVATE_FIELDS) delete m[k];
  const scrub = v => typeof v === "string" ? withoutPersonToken(v)
    : Array.isArray(v) ? v.map(scrub)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)])) : v;
  for (const name of Object.keys(rows)) rows[name] = scrub(rows[name]);
  function unique(list, key) {
    if (new Set(list.map(x => x[key])).size !== list.length) throw new Error("Duplicate " + key);
  }
  unique(rows.entries, "entry_id"); unique(rows.people, "person_id"); unique(rows.sources, "source_id");
  const entries = new Set(rows.entries.map(x => x.entry_id)), persons = new Set(rows.people.map(x => x.person_id));
  for (const m of rows.memberships) if (!entries.has(m.entry_id) || !persons.has(m.person_id)) throw new Error("Broken membership relationship");
  for (const h of rows.history) if (!persons.has(h.person_id)) throw new Error("Unknown history person");
  if (rows.entries.length !== audit.event_entries || rows.people.length !== audit.distinct_people ||
      rows.memberships.length !== Object.values(audit.memberships_by_role).reduce((a,b) => a+b,0)) throw new Error("Coverage counts disagree");
  const roles = {};
  for (const m of rows.memberships) roles[m.role] = (roles[m.role] || 0) + 1;
  if (JSON.stringify(Object.entries(roles).sort()) !== JSON.stringify(Object.entries(audit.memberships_by_role).sort())) throw new Error("Role counts disagree");
  for (const d of rows.divisions) if (rows.entries.filter(e => e.event_id === d.event_id && e.division_id === d.division_id).length !== d.listed_count) throw new Error("Division count disagrees: " + d.division_id);
  const data = {event:teams.event, retrieved_at:teams.retrieved_at, roster_updated_at:rosters.updated_at,
    coverage:without(audit, ["representative_spot_checks", "history_source_row_checks"]), missing_summary:without(missing,["items"]),
    history_scope:history.scope, tables:{}};
  // Columns preserve every supplied field (except PRIVATE_FIELDS, dropped
  // above) without repeating its name thousands
  // of times. References preserve repeated strings exactly, including nulls,
  // source IDs and the names that must never be rewritten by a brand build.
  for (const [name, list] of Object.entries(rows)) {
    const columns = [...new Set(list.flatMap(Object.keys))];
    data.tables[name] = {columns, rows:list.map(r => columns.map(k => Object.hasOwn(r,k) ? r[k] : null))};
  }
  const strings = [], lookup = new Map();
  function pack(v) {
    if (typeof v === "string") { if (!lookup.has(v)) { lookup.set(v,strings.length); strings.push(v); } return -1-lookup.get(v); }
    if (typeof v === "number" && v < 0) return {$number:v};
    if (Array.isArray(v)) return v.map(pack);
    if (v && typeof v === "object") {
      if (Object.hasOwn(v,"$number")) throw new Error("Reserved codec field");
      return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,pack(x)]));
    }
    return v;
  }
  const packed = pack(data), payload = Buffer.from(gzipSync(Buffer.from(JSON.stringify({strings,data:packed})),{level:9,mtime:0})).toString("base64");
  const js = `/* Generated by scripts/import-world-cup.js from the owner's 8 Nov 2026 snapshot.
 * Read only. Kept outside the coach's season; decoded only when this tool opens.
 * The encoding preserves source names across brand builds. It is not encryption. */
(function(root) {
  "use strict";
  let cached;
  const payload = "${payload}";
  function read() {
    if(cached) return cached;
    const raw = atob(payload), bytes = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    const inflate = typeof module !== "undefined" && module.exports ? require("fflate").gunzipSync : root.fflate.gunzipSync;
    const packed = JSON.parse(new TextDecoder().decode(inflate(bytes)));
    function expand(v) {
      if(typeof v === "number" && v < 0) return packed.strings[-1-v];
      if(Array.isArray(v)) return v.map(expand);
      if(v && typeof v === "object") {
        if(Object.hasOwn(v,"$number")) return v.$number;
        return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,expand(x)]));
      }
      return v;
    }
    cached = expand(packed.data);
    for(const [name,table] of Object.entries(cached.tables))
      cached[name]=table.rows.map(row => Object.fromEntries(table.columns.map((key,i)=>[key,row[i]])));
    delete cached.tables;
    return cached;
  }
  const api={read};
  if(typeof module !== "undefined" && module.exports) module.exports=api;
  else root.WorldCup2026Data=api;
})(typeof window === "undefined" ? globalThis : window);
`;
  const manifest = {event_id:teams.event.event_id, snapshot:audit.generated_at, input_sha256:hashes,
    counts:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,v.length])),
    output_sha256:crypto.createHash("sha256").update(js).digest("hex"), output_bytes:Buffer.byteLength(js)};
  return {js,manifest};
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error("Pass the extracted World Cup JSON folder.");
  const {js,manifest} = compile(path.resolve(process.argv[2]));
  fs.writeFileSync(path.join(ROOT,"web/world-cup-data.js"),js);
  const lib = path.dirname(require.resolve("fflate/package.json"));
  fs.writeFileSync(path.join(ROOT,"web/fflate.js"),"/* fflate 0.8.3\n"+fs.readFileSync(path.join(lib,"LICENSE"),"utf8")+"\n*/\n"+fs.readFileSync(path.join(lib,"umd/index.js"),"utf8"));
  fs.copyFileSync(path.join(lib,"LICENSE"),path.join(ROOT,"web/fflate-LICENSE.txt"));
  fs.mkdirSync(path.join(ROOT,"data"),{recursive:true});
  fs.writeFileSync(path.join(ROOT,"data/world-cup-2026-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify(manifest,null,2));
}
module.exports={compile, PRIVATE_FIELDS, withoutPersonToken};
