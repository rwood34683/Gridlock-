#!/usr/bin/env node
"use strict";
/* Compile the World Cup team directory from the owner's JSON handoff.
 *
 * Only public team and event fields ship, named one by one in PUBLIC below.
 * The handoff also carried PBLeagues rosters, people, profiles, name
 * variants, histories, profile-access records and roster comparisons. The
 * owner has no written permission to redistribute those (10 Nov 2026), so
 * this importer never reads those files and never copies a field it does not
 * name. A field added to the handoff later stays out until somebody adds it
 * here on purpose. Never scrape or contact the roster service.
 *
 *   node scripts/import-world-cup.js <extracted handoff folder>
 *   node scripts/import-world-cup.js --from-bundle web/world-cup-data.js
 *
 * The second form re-derives the public file from an existing bundle, through
 * the same allowlist, for when the original handoff is not on this machine. */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const {gzipSync} = require("fflate");
const ROOT = path.resolve(__dirname, "..");
// Every field that may ship. Nothing about a person is listed, and no link to
// a roster page (those need a sign-in and name people).
const PUBLIC = Object.freeze({
  event: ["name", "year", "event_id", "start_date", "end_date", "timezone", "source_urls", "related_events", "practice_event_excluded"],
  related_events: ["event_id", "name", "start_date", "end_date", "source_url", "team_list_url", "listed_team_count"],
  divisions: ["event_id", "division_id", "name", "group", "classification", "signed_up", "limit", "format_rules", "listed_count", "source_url", "retrieved_at"],
  entries: ["event_id", "division_id", "division", "format", "format_rules", "bracket", "team_name", "team_id", "entry_id", "registration_status", "source_url", "retrieved_at"],
  locations: ["entry_id", "team_id", "hometown_raw", "hometown_city", "hometown_region", "hometown_country", "home_field_name", "home_field_location_raw", "location_status", "retrieved_at"],
});
const TABLES = ["divisions", "entries", "locations"];
// Public pages only: the event, its team list and the league's own site.
const PUBLIC_URL = /^https:\/\/(?:www\.)?(?:pbleagues\.com\/event\/\d+(?:\/teams)?|nxlpaintball\.com\/[\w-]+)\/?$/;
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o && Object.hasOwn(o, k)).map(k => [k, o[k]]));

function publicData(src) {
  const event = pick(src.event, PUBLIC.event);
  if (Array.isArray(event.related_events)) event.related_events = event.related_events.map(r => pick(r, PUBLIC.related_events));
  const rows = {};
  for (const t of TABLES) rows[t] = (src[t] || []).map(r => pick(r, PUBLIC[t]));
  // The checks a rebuild must pass before anything is written.
  const unique = (list, key) => { if (new Set(list.map(x => x[key])).size !== list.length) throw new Error("Duplicate " + key); };
  unique(rows.entries, "entry_id");
  const entries = new Set(rows.entries.map(e => e.entry_id));
  for (const l of rows.locations) if (!entries.has(l.entry_id)) throw new Error("Location for an unknown entry: " + l.entry_id);
  for (const d of rows.divisions)
    if (rows.entries.filter(e => e.event_id === d.event_id && e.division_id === d.division_id).length !== d.listed_count)
      throw new Error("Division count disagrees: " + d.division_id);
  const urls = [...(event.source_urls || []), ...(event.related_events || []).flatMap(r => [r.source_url, r.team_list_url]),
    ...rows.divisions.map(d => d.source_url), ...rows.entries.map(e => e.source_url)].filter(Boolean);
  for (const u of urls) if (!PUBLIC_URL.test(u)) throw new Error("Not a public event address: " + u);
  return {event, retrieved_at: src.retrieved_at || null,
    coverage: {event_entries: rows.entries.length, distinct_team_ids: new Set(rows.entries.map(e => e.team_id)).size,
      divisions: rows.divisions.length, divisions_with_entries: rows.divisions.filter(d => d.listed_count > 0).length},
    rows};
}

function encode(pub) {
  const data = {event: pub.event, retrieved_at: pub.retrieved_at, coverage: pub.coverage, tables: {}};
  for (const [name, list] of Object.entries(pub.rows)) {
    const columns = [...new Set(list.flatMap(Object.keys))];
    data.tables[name] = {columns, rows: list.map(r => columns.map(k => Object.hasOwn(r, k) ? r[k] : null))};
  }
  const strings = [], lookup = new Map();
  function pack(v) {
    if (typeof v === "string") { if (!lookup.has(v)) { lookup.set(v, strings.length); strings.push(v); } return -1 - lookup.get(v); }
    if (typeof v === "number" && v < 0) return {$number: v};
    if (Array.isArray(v)) return v.map(pack);
    if (v && typeof v === "object") {
      if (Object.hasOwn(v, "$number")) throw new Error("Reserved codec field");
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, pack(x)]));
    }
    return v;
  }
  const packed = pack(data), payload = Buffer.from(gzipSync(Buffer.from(JSON.stringify({strings, data: packed})), {level: 9, mtime: 0})).toString("base64");
  return `/* Generated by scripts/import-world-cup.js from the owner's 8 Nov 2026 snapshot.
 * Public team and event fields only: divisions, team entries and team
 * locations. No player, roster, profile or history record is in this file.
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
}

function finish(pub, inputs, builtFrom) {
  const js = encode(pub);
  const manifest = {event_id: pub.event.event_id, snapshot: pub.retrieved_at, built_from: builtFrom, input_sha256: inputs,
    fields: PUBLIC, counts: Object.fromEntries(Object.entries(pub.rows).map(([k, v]) => [k, v.length])), coverage: pub.coverage,
    output_sha256: crypto.createHash("sha256").update(js).digest("hex"), output_bytes: Buffer.byteLength(js)};
  return {js, manifest};
}
// From the extracted handoff. Reads teams.json and team_locations.json only.
function compile(dir) {
  const hashes = {};
  const read = name => {
    const bytes = fs.readFileSync(path.join(dir, name + ".json"));
    hashes[name + ".json"] = crypto.createHash("sha256").update(bytes).digest("hex");
    return JSON.parse(bytes);
  };
  const teams = read("teams"), locations = read("team_locations");
  return finish(publicData({event: teams.event, retrieved_at: teams.retrieved_at, divisions: teams.divisions,
    entries: teams.teams, locations: locations.observations}), hashes, "handoff");
}
// From an existing bundle, through the same allowlist.
function compileFromBundle(file) {
  const text = fs.readFileSync(file, "utf8"), sandbox = {module: {exports: {}}, require, atob, TextDecoder, Uint8Array, Object, JSON, globalThis: {}};
  new Function("module", "require", "atob", "TextDecoder", text)(sandbox.module, require, s => Buffer.from(s, "base64").toString("binary"), TextDecoder);
  const d = sandbox.module.exports.read();
  return finish(publicData(d), {[path.basename(file)]: crypto.createHash("sha256").update(text).digest("hex")}, "bundle");
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length) throw new Error("Pass the extracted World Cup JSON folder, or --from-bundle <file>.");
  const {js, manifest} = args[0] === "--from-bundle" ? compileFromBundle(path.resolve(args[1])) : compile(path.resolve(args[0]));
  fs.writeFileSync(path.join(ROOT, "web/world-cup-data.js"), js);
  const lib = path.dirname(require.resolve("fflate/package.json"));
  fs.writeFileSync(path.join(ROOT, "web/fflate.js"), "/* fflate 0.8.3\n" + fs.readFileSync(path.join(lib, "LICENSE"), "utf8") + "\n*/\n" + fs.readFileSync(path.join(lib, "umd/index.js"), "utf8"));
  fs.copyFileSync(path.join(lib, "LICENSE"), path.join(ROOT, "web/fflate-LICENSE.txt"));
  fs.mkdirSync(path.join(ROOT, "data"), {recursive: true});
  fs.writeFileSync(path.join(ROOT, "data/world-cup-2026-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({counts: manifest.counts, coverage: manifest.coverage, output_bytes: manifest.output_bytes}, null, 2));
}
module.exports = {compile, compileFromBundle, publicData, PUBLIC, TABLES};
