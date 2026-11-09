/* The supplied World Cup directory is reference data, never a coach's season. */
(function(root) {
  "use strict";
  let host, book;
  const PAGE=30, HISTORY_PAGE=15;
  const fold = x => String(x || "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
  const group = (rows,key) => { const m=new Map(); for(const r of rows){const k=String(r[key]); if(!m.has(k))m.set(k,[]); m.get(k).push(r);} return m; };
  const index = (rows,key) => new Map(rows.map(r=>[String(r[key]),r]));
  function data() {
    if(book) return book;
    const d=root.WorldCup2026Data.read();
    book={d,entries:index(d.entries,"entry_id"),people:index(d.people,"person_id"),locations:index(d.locations,"entry_id"),
      rosters:index(d.rosters,"entry_id"),members:group(d.memberships,"entry_id"),history:group(d.history,"person_id"),
      names:group(d.names,"person_id"),sources:index(d.sources,"source_id"),search:new Map()};
    book.sorted=[...d.entries].sort((a,b)=>a.team_name.localeCompare(b.team_name,"en") || a.division.localeCompare(b.division,"en") || a.entry_id.localeCompare(b.entry_id));
    for(const e of book.sorted) {
      const l=book.locations.get(e.entry_id), members=book.members.get(e.entry_id)||[];
      book.search.set(e.entry_id,fold([e.team_name,e.division,e.bracket,l?.hometown_raw,l?.home_field_name,
        ...members.flatMap(m=>[m.name,...(book.names.get(m.person_id)||[]).map(n=>n.name)])].join(" ")));
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
  function source(id) {
    const s=data().sources.get(String(id));
    return s ? `${link(s.url,"PBLeagues source")} · <time datetime="${esc(s.retrieved_at)}">${esc(when(s.retrieved_at))}</time>` : "Source not supplied";
  }
  const teamButton = e => `<button class="list__row cup-row" data-entry="${esc(e.entry_id)}" onclick="WorldCup2026.openEntry(this.dataset.entry)"><span class="list__body"><span class="list__name">${esc(e.team_name)}</span><span class="list__desc">${esc(e.division)}${e.bracket ? " · Bracket "+esc(e.bracket) : ""}</span></span><span class="list__go" aria-hidden="true">›</span></button>`;
  function selectedRows() {
    const b=data(), v=view(), words=fold(v.q).split(" ").filter(Boolean);
    return b.sorted.filter(e=>(!v.division || e.event_id+":"+e.division_id===v.division) && words.every(w=>b.search.get(e.entry_id).includes(w)));
  }
  function results() {
    const list=selectedRows(), pages=Math.max(1,Math.ceil(list.length/PAGE)), page=Math.max(0,Math.min(pages-1,Number(view().page)||0));
    const start=page*PAGE;
    return `<p class="note" role="status" aria-live="polite">${list.length ? `${list.length} entries · showing ${start+1}–${Math.min(start+PAGE,list.length)}` : "No entries found in this snapshot. Try another division or name."}</p>
      <div class="list">${list.slice(start,start+PAGE).map(teamButton).join("")}</div>
      ${pages>1?`<div class="btnrow cup-pages">${page>0?'<button class="btn btn--quiet" onclick="WorldCup2026.pageBy(-1)">Previous teams</button>':""}<span class="note">Page ${page+1} of ${pages}</span>${page<pages-1?'<button class="btn btn--quiet" onclick="WorldCup2026.pageBy(1)">Next teams</button>':""}</div>`:""}`;
  }
  function listPage() {
    const b=data(),v=view(),c=b.d.coverage,h=c.player_history_statuses;
    return host.sec("World Cup teams", `<p class="lede">Find who is entered and who is on their roster.</p>
      <p class="note">NXL World Cup · Kissimmee · November 11–15, 2026</p>
      <p class="note">${c.event_entries} entries · ${b.d.divisions.filter(d=>d.listed_count>0).length} competition divisions · ${c.distinct_team_ids} team IDs. A club can enter more than one division.</p>
      <div class="fld"><label for="cup-division">Division</label><select id="cup-division" onchange="WorldCup2026.division(this.value)"><option value="">All divisions</option>${b.d.divisions.map(d=>{const id=d.event_id+":"+d.division_id;return `<option value="${esc(id)}"${v.division===id?" selected":""}>${esc(d.name)} · ${d.listed_count} entries${d.event_id!=="9322"?" · NCPA":""}</option>`;}).join("")}</select></div>
      <div class="fld"><label for="cup-find">Find a team or person</label><div class="btnrow"><input class="grow" id="cup-find" type="search" maxlength="100" value="${esc(v.q)}" placeholder="Team, player, coach or hometown" autocomplete="off" oninput="WorldCup2026.search(this.value)" onkeydown="if(event.key==='Escape'){event.preventDefault();WorldCup2026.clear()}"/><button class="btn btn--quiet" onclick="WorldCup2026.clear()">Clear</button></div></div>
      <div id="cup-results">${results()}</div>
      <details class="cup-about"><summary>About this list</summary><p class="note">Supplied PBLeagues snapshot: ${esc(when(b.d.coverage.generated_at))}. Entries and rosters can change. ${link("https://pbleagues.com/event/9322/teams","Check the event list")}. Source pages may ask you to sign in.</p>
      <p class="note">${c.roster_status_counts.authenticated_event_roster} rosters contain names; ${c.roster_status_counts.authenticated_empty_roster} were empty when read. There are ${c.distinct_current_players.toLocaleString("en-US")} players and ${c.distinct_people.toLocaleString("en-US")} people across all roles. ${b.d.divisions.filter(d=>d.event_id!=="9322"&&!d.listed_count).length} related NCPA packages have no entries in this snapshot.</p>
      <p class="note">${h.scored_event_history_imported} players have classification history records; ${h.scored_event_history_imported_zero_rows} have a retrieved page with no scored events; ${h.not_retrieved.toLocaleString("en-US")} have not been retrieved. Player hometowns and jersey numbers are not supplied. Team hometowns belong to the team.</p>
      <p class="note">This list is kept with the app. Browsing it does not change your squad, schedule, scouting notes or saved season.</p></details>`);
  }
  function rosterPage(e) {
    const b=data(),r=b.rosters.get(e.entry_id),l=b.locations.get(e.entry_id),members=b.members.get(e.entry_id)||[];
    const groups=["Player","Coach","Staff","Media"].filter(role=>members.some(m=>m.role===role));
    return `<button class="btn btn--quiet" onclick="WorldCup2026.backList()">‹ Team list</button>`+host.sec(esc(e.team_name),
      `<p class="lede">${esc(e.division)}${e.bracket?" · Bracket "+esc(e.bracket):""}</p>
      <p class="note">${esc(e.registration_status)} · Entry ${esc(e.entry_id)}</p>
      <p class="note">Team hometown: ${esc(l?.hometown_raw || "Not published")}${l?.hometown_country ? " · "+esc(l.hometown_country) : ""}<br>Home field: ${esc(l?.home_field_name || "Not published")}${l?.home_field_location_raw?" · "+esc(l.home_field_location_raw):""}</p>
      <p class="note">${link(e.roster_url,"PBLeagues roster")} · Read ${esc(when(r?.retrieved_at || e.retrieved_at))}</p>
      ${members.length?groups.map(role=>`<h3>${esc({Player:"Players",Coach:"Coaches",Staff:"Staff",Media:"Media"}[role])} · ${members.filter(m=>m.role===role).length}</h3><div class="list">${members.filter(m=>m.role===role).map(m=>`<button class="list__row cup-row" data-person="${esc(m.person_id)}" onclick="WorldCup2026.openPerson(this.dataset.person)"><span class="list__body"><span class="list__name">${esc(m.name)}</span><span class="list__desc">${esc(m.classification || "Classification not supplied")}${m.jersey_number==null?" · Jersey not published":" · #"+esc(m.jersey_number)}</span></span><span class="list__go" aria-hidden="true">›</span></button>`).join("")}</div>`).join("")
       : `<div class="empty">${r?.status==="authenticated_empty_roster"?"This roster was empty when read. That does not mean the team withdrew.":"Roster names were not supplied for this entry."}</div>`}
      <details class="cup-about"><summary>Registration and sources</summary><p class="note">Team ID: ${esc(e.team_id)}<br>Event ID: ${esc(e.event_id)}<br>Roster status: ${esc(r?.status || "not supplied")}</p>
      <p class="note">${link(e.source_url,"Registration list")} · ${esc(when(e.retrieved_at))}</p>
      ${l?`<p class="note">${link(l.source_url,"Team location source")} · ${esc(when(l.retrieved_at))}</p>`:""}
      <p class="note">The snapshot keeps both roster views where they differ. Each name below links to its sources. A roster entry is not confirmation that somebody attended.</p></details>`);
  }
  function historyRows(id) {
    const groups=new Map();
    for(const row of data().history.get(id)||[]) {
      const key=JSON.stringify([row.event_date_as_published,row.event_date_iso,row.event_name,row.team_name,row.division_as_published,row.place_as_published,row.classification_score_as_published]);
      if(!groups.has(key))groups.set(key,{...row,sources:new Set(),observations:[]});
      const g=groups.get(key);g.sources.add(row.source_id);g.observations.push(row.observation_id);
    }
    return [...groups.values()].sort((a,b)=>String(b.event_date_iso||"").localeCompare(String(a.event_date_iso||"")));
  }
  function personPage(p,e) {
    const b=data(),v=view(),m=(b.members.get(e.entry_id)||[]).find(x=>x.person_id===p.person_id),rows=historyRows(p.person_id),pages=Math.max(1,Math.ceil(rows.length/HISTORY_PAGE)),page=Math.max(0,Math.min(pages-1,Number(v.historyPage)||0));
    const variants=[...new Set((b.names.get(p.person_id)||[]).map(n=>n.name).filter(n=>n!==p.name))];
    const status=p.history?.status;
    const historyNote=status==="not_retrieved"?"History has not been retrieved for this person.":status==="scored_event_history_imported_zero_rows"?"The retrieved classification page listed no scored events.":rows.length?"Published classification records. This is an incomplete history; classification scores are not match scores.":"No classification records were supplied.";
    return `<button class="btn btn--quiet" onclick="WorldCup2026.backRoster()">‹ ${esc(e.team_name)} roster</button>`+host.sec(esc(m?.name || p.name),
      `<p class="lede">${esc(m?.role || "Roster member")} · ${esc(e.team_name)}</p><p class="note">Classification: ${esc(m?.classification || "Not supplied")}<br>Jersey: ${esc(m?.jersey_number ?? "Not published")}<br>Player hometown: ${esc(p.hometown?.raw || (p.hometown?.status==="not_retrieved"?"Not retrieved":"Not published in the retrieved profile"))}</p>
      <details><summary>Published names and sources</summary><p class="note">Person ID: ${esc(p.person_id)}<br>Display name: ${esc(p.name)}${variants.length?"<br>Other published names: "+variants.map(esc).join(" · "):""}</p>
      ${[...new Set([m?.source_id,m?.legacy_source_id,p.source_id].filter(x=>x!=null))].map(id=>`<p class="note">${source(id)}</p>`).join("")}</details>`)
      +host.sec("Entries in this snapshot",`<div class="list">${p.current_entry_ids.map(id=>b.entries.get(id)).filter(Boolean).map(teamButton).join("")}</div>`)
      +host.sec("Classification event history",`<p class="note">${esc(historyNote)}</p>${rows.length?`<p class="note">${rows.length} distinct records from ${(b.history.get(p.person_id)||[]).length} supplied observations. Repeated copies of the same record share their sources below.</p><div class="cup-history">${rows.slice(page*HISTORY_PAGE,(page+1)*HISTORY_PAGE).map(r=>`<article><h3>${link(r.event_url,r.event_name || "Event not supplied")}</h3><p>${esc(r.event_date_as_published || r.event_date_iso || "Date not recorded")} · ${esc(r.team_name || "Team not supplied")}</p><p class="note">${esc(r.division_as_published || "Division not supplied")}<br>Place: ${esc(r.place_as_published || "Not supplied")}<br>Classification score: ${esc(r.classification_score_as_published || "Not supplied")}</p><details><summary>Sources · ${r.sources.size}</summary>${[...r.sources].map(id=>`<p class="note">${source(id)}</p>`).join("")}</details></article>`).join("")}</div>`:""}
      ${pages>1?`<div class="btnrow cup-pages">${page>0?'<button class="btn btn--quiet" onclick="WorldCup2026.historyBy(-1)">Previous records</button>':""}<span class="note">${page+1} of ${pages}</span>${page<pages-1?'<button class="btn btn--quiet" onclick="WorldCup2026.historyBy(1)">Next records</button>':""}</div>`:""}`);
  }
  function refresh() {const el=document.getElementById("cup-results");if(el)el.innerHTML=results();}
  root.WorldCup2026={
    page(options) {host=options;try {const b=data(),v=view(),e=b.entries.get(v.entry),p=b.people.get(v.person);return `<div class="cup">${e?(p?personPage(p,e):rosterPage(e)):listPage()}</div>`;} catch(e) {return host.sec("World Cup teams",'<p class="empty">The team list could not open. Reload the app and try again. Your saved season is unchanged.</p>');}},
    search(q){host.change({q:String(q||"").slice(0,100),page:0},false);refresh();},
    division(division){host.change({division,page:0},false);refresh();},
    clear(){host.change({q:"",page:0},false);const el=document.getElementById("cup-find");if(el){el.value="";el.focus();}refresh();},
    pageBy(n){host.change({page:Math.max(0,(Number(view().page)||0)+n)},false);refresh();document.getElementById("cup-results")?.scrollIntoView({block:"start"});document.querySelector("#cup-results .list__row")?.focus({preventScroll:true});},
    openEntry(entry){if(!data().entries.has(entry))return;host.change({entry,person:"",historyPage:0});host.top();},
    openPerson(person){if(!(data().members.get(view().entry)||[]).some(m=>m.person_id===person))return;host.change({person,historyPage:0});host.top();},
    backList(){const entry=view().entry;host.change({entry:"",person:""});const row=[...document.querySelectorAll("#cup-results [data-entry]")].find(r=>r.dataset.entry===entry);if(row){row.focus({preventScroll:true});row.scrollIntoView({block:"nearest"});}else document.getElementById("cup-find")?.focus({preventScroll:true});},
    backRoster(){const person=view().person;host.change({person:""});const row=[...document.querySelectorAll(".cup [data-person]")].find(r=>r.dataset.person===person);row?.focus({preventScroll:true});row?.scrollIntoView({block:"nearest"});},
    historyBy(n){host.change({historyPage:Math.max(0,(Number(view().historyPage)||0)+n)});document.querySelector(".cup-history")?.scrollIntoView({block:"start"});}
  };
})(window);
