/* The supplied World Cup directory is reference data, never a coach's season.
 * Public team data only: divisions, team entries and team locations. Player
 * rosters are not included (see docs/WORLD-CUP-DATA.md). */
(function(root) {
  "use strict";
  let host, book;
  const PAGE=30;
  const fold = x => String(x || "").normalize("NFKD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\s+/g," ").trim();
  const index = (rows,key) => new Map(rows.map(r=>[String(r[key]),r]));
  function data() {
    if(book) return book;
    const d=root.WorldCup2026Data.read();
    book={d,entries:index(d.entries,"entry_id"),locations:index(d.locations,"entry_id"),search:new Map()};
    const order=new Map(d.divisions.map((v,i)=>[v.event_id+":"+v.division_id,i]));
    book.sorted=[...d.entries].sort((a,b)=>(order.get(a.event_id+":"+a.division_id)??Infinity)-(order.get(b.event_id+":"+b.division_id)??Infinity)
      || a.team_name.localeCompare(b.team_name,"en") || a.entry_id.localeCompare(b.entry_id));
    for(const e of book.sorted) {
      const l=book.locations.get(e.entry_id);
      book.search.set(e.entry_id,fold([e.team_name,e.division,e.bracket,l?.hometown_raw,l?.hometown_country,l?.home_field_name].join(" ")));
    }
    return book;
  }
  const view = () => host.view() || {};
  const esc = s => host.esc(s == null ? "" : String(s));
  function when(value) {
    const d=new Date(value);
    return value && Number.isFinite(d.getTime()) ? d.toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})+" ET" : "Date not recorded";
  }
  function link(url,label) {
    try { const u=new URL(url); if(u.protocol!=="https:" || u.username || u.password || !["pbleagues.com","www.pbleagues.com","www.nxlpaintball.com","nxlpaintball.com"].includes(u.hostname)) return esc(label);
      return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
    } catch(e) { return esc(label); }
  }
  const NO_ROSTERS="Player rosters are not included.";
  const teamButton = e => `<button class="list__row cup-row" data-entry="${esc(e.entry_id)}" onclick="WorldCup2026.openEntry(this.dataset.entry)"><span class="list__body"><span class="list__name">${esc(e.team_name)}</span><span class="list__desc">${esc(e.division)}${e.bracket ? " · Bracket "+esc(e.bracket) : ""}</span></span><span class="list__go" aria-hidden="true">›</span></button>`;
  function selectedRows() {
    const b=data(), v=view(), words=fold(v.q).split(" ").filter(Boolean);
    return b.sorted.filter(e=>(!v.division || e.event_id+":"+e.division_id===v.division) && words.every(w=>b.search.get(e.entry_id).includes(w)));
  }
  function results() {
    const list=selectedRows(), pages=Math.max(1,Math.ceil(list.length/PAGE)), page=Math.max(0,Math.min(pages-1,Number(view().page)||0));
    const start=page*PAGE;
    const groups=new Map();
    list.slice(start,start+PAGE).forEach(e=>{const key=e.event_id+":"+e.division_id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);});
    return `<p class="note" role="status" aria-live="polite">${list.length ? `${list.length} entries · showing ${start+1}–${Math.min(start+PAGE,list.length)}` : "No entries found in this snapshot. Try another division or name."}</p>
      ${[...groups].map(([key,entries])=>`<section class="cup-division-group" data-division="${esc(key)}"><h3 class="panel__title">${esc(entries[0].division)}${entries[0].event_id!=="9322"?" · NCPA":""}</h3><div class="list">${entries.map(teamButton).join("")}</div></section>`).join("")}
      ${pages>1?`<div class="btnrow cup-pages">${page>0?'<button class="btn btn--quiet" onclick="WorldCup2026.pageBy(-1)">Previous teams</button>':""}<span class="note">Page ${page+1} of ${pages}</span>${page<pages-1?'<button class="btn btn--quiet" onclick="WorldCup2026.pageBy(1)">Next teams</button>':""}</div>`:""}`;
  }
  function listPage() {
    const b=data(),v=view(),c=b.d.coverage;
    return host.sec("World Cup teams", `<p class="lede">Find who is entered, by division.</p>
      <p class="note">NXL World Cup · Kissimmee · November 11–15, 2026</p>
      <p class="note">${c.event_entries} entries · ${c.divisions_with_entries} competition divisions · ${c.distinct_team_ids} team IDs. A club can enter more than one division. ${NO_ROSTERS}</p>
      <div class="fld"><label for="cup-division">Division</label><select id="cup-division" onchange="WorldCup2026.division(this.value)"><option value="">All divisions</option>${b.d.divisions.map(d=>{const id=d.event_id+":"+d.division_id;return `<option value="${esc(id)}"${v.division===id?" selected":""}>${esc(d.name)} · ${d.listed_count} entries${d.event_id!=="9322"?" · NCPA":""}</option>`;}).join("")}</select></div>
      <div class="fld"><label for="cup-find">Find a team</label><div class="btnrow"><input class="grow" id="cup-find" type="search" maxlength="100" value="${esc(v.q)}" placeholder="Team, division or hometown" autocomplete="off" oninput="WorldCup2026.search(this.value)" onkeydown="if(event.key==='Escape'){event.preventDefault();WorldCup2026.clear()}"/><button class="btn btn--quiet" onclick="WorldCup2026.clear()">Clear</button></div></div>
      <div id="cup-results">${results()}</div>
      <details class="cup-about"><summary>About this list</summary><p class="note">Supplied PBLeagues team list, read ${esc(when(b.d.retrieved_at))}. Entries can change. ${link("https://pbleagues.com/event/9322/teams","Check the event list")}.</p>
      <p class="note">${NO_ROSTERS} To scout a team's players, add them on the pit card from what you see, or paste a roster you have.</p>
      <p class="note">${b.d.divisions.filter(d=>d.event_id!=="9322"&&!d.listed_count).length} related NCPA packages have no entries in this snapshot. Team hometowns belong to the team.</p>
      <p class="note">This list is kept with the app. Browsing it does not change your squad, schedule, scouting notes or saved season.</p></details>`);
  }
  function entryPage(e) {
    const b=data(),l=b.locations.get(e.entry_id);
    return `<button class="btn btn--quiet" onclick="WorldCup2026.backList()">‹ Team list</button>`+host.sec(esc(e.team_name),
      `<p class="lede">${esc(e.division)}${e.bracket?" · Bracket "+esc(e.bracket):""}</p>
      <p class="note">${esc(e.registration_status)} · Entry ${esc(e.entry_id)}</p>
      <p class="note">Team hometown: ${esc(l?.hometown_raw || "Not published")}${l?.hometown_country ? " · "+esc(l.hometown_country) : ""}<br>Home field: ${esc(l?.home_field_name || "Not published")}${l?.home_field_location_raw?" · "+esc(l.home_field_location_raw):""}</p>
      <p class="note cup-norosters">${NO_ROSTERS}</p>
      <details class="cup-about"><summary>Registration and source</summary><p class="note">Team ID: ${esc(e.team_id)}<br>Event ID: ${esc(e.event_id)}</p>
      <p class="note">${link(e.source_url,"Registration list")} · ${esc(when(e.retrieved_at))}</p>
      <p class="note">An entry is not confirmation that the team attended.</p></details>`);
  }
  function refresh() {const el=document.getElementById("cup-results");if(el)el.innerHTML=results();}
  root.WorldCup2026={
    page(options) {host=options;try {const b=data(),v=view(),e=b.entries.get(v.entry);return `<div class="cup">${e?entryPage(e):listPage()}</div>`;} catch(e) {return host.sec("World Cup teams",'<p class="empty">The team list could not open. Reload the app and try again. Your saved season is unchanged.</p>');}},
    search(q){host.change({q:String(q||"").slice(0,100),page:0},false);refresh();},
    division(division){host.change({division,page:0},false);refresh();},
    clear(){host.change({q:"",page:0},false);const el=document.getElementById("cup-find");if(el){el.value="";el.focus();}refresh();},
    pageBy(n){host.change({page:Math.max(0,(Number(view().page)||0)+n)},false);refresh();document.getElementById("cup-results")?.scrollIntoView({block:"start"});document.querySelector("#cup-results .list__row")?.focus({preventScroll:true});},
    openEntry(entry){if(!data().entries.has(entry))return;host.change({entry});host.top();},
    backList(){const entry=view().entry;host.change({entry:""});const row=[...document.querySelectorAll("#cup-results [data-entry]")].find(r=>r.dataset.entry===entry);if(row){row.focus({preventScroll:true});row.scrollIntoView({block:"nearest"});}else document.getElementById("cup-find")?.focus({preventScroll:true});}
  };
})(window);
