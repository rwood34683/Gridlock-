from pathlib import Path
from bs4 import BeautifulSoup
from collections import Counter,defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo
import json,sqlite3,hashlib,zipfile
P=Path(__file__).parent
if (P/'import-report.json').exists():raise SystemExit('Authenticated enrichment exists. Use import_saved_rosters.py; do not overwrite it with the public-only collector/builder.')
def read(f):return json.loads((P/f).read_text())
def write(f,o):(P/f).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n')
def text(x):return x.get_text(' ',strip=True)
def timestamp(f):return datetime.fromtimestamp(f.stat().st_mtime,ZoneInfo('America/New_York')).isoformat()
t=read('teams.json');rs=read('rosters.json')['rosters'];assert len(rs)==len(t['teams'])==680
# Distinguish an explicit login wall from merely absent public tables.
for r in rs:
 if r['members']==[] and r['status']=='public_event_roster':r['status']='public_empty_roster'
 if r['members'] is None:
  f=P/r['source_file']
  if f.exists():
   page=BeautifulSoup(f.read_text(errors='replace'),'html.parser')
   wording=text(page).lower()
   if 'login to view roster' in wording or 'log in to view roster' in wording or 'sign in to view roster' in wording:
    r['status']='login_required'
write('rosters.json',dict(schema_version='1.0',event_id='9322',rosters=rs))
# College registration rows use a narrower table than the main event.
s=BeautifulSoup((P/'sources/event-9508.html').read_text(),'html.parser')
t['divisions']=[d for d in t['divisions'] if d['event_id']!='9508']
for tr in s.find('table').select('tbody > tr'):
 c=tr.find_all('td',recursive=False)
 if len(c)!=9:continue
 t['divisions'].append(dict(event_id='9508',division_id=c[0]['data-r'],name=text(c[0]),group=text(c[0]),classification=text(c[1]),signed_up=int(text(c[5])),paid=int(text(c[6])),limit=text(c[7]),format_rules=text(c[8]),listed_count=0,source_url='https://pbleagues.com/event/9508',retrieved_at=timestamp(P/'sources/event-9508.html')))
# Preserve bracket labels published within each entry's own event schedule.
rbyid={r['entry_id']:r for r in rs}
for e in t['teams']:
 r=rbyid[e['entry_id']];f=P/r['source_file']
 if not f.exists():continue
 page=BeautifulSoup(f.read_text(errors='replace'),'html.parser')
 labels=sorted(set(' '.join(x.get('data-group','').strip('|').split()) for x in page.select('.round[data-group]'))-{''})
 e['bracket']='; '.join(labels) if labels else None
 e['bracket_source_url']=r['source_url'] if labels else None
 e['bracket_retrieved_at']=r['retrieved_at'] if labels else None
write('teams.json',t)
# Build public-source manifest, retaining exact response documents and file hashes.
known={'event-9322.html':'https://pbleagues.com/event/9322','event-9508.html':'https://pbleagues.com/event/9508','teams-9322.html':'https://pbleagues.com/event/9322/teams','teams-9508.html':'https://pbleagues.com/event/9508/teams','nxl-world-cup.html':'https://www.nxlpaintball.com/world-cup','pbleagues-home.html':'https://pbleagues.com/'}
rmap={Path(r['source_file']).name:r for r in rs}
sources=[]
for f in sorted((P/'sources').glob('*.html')):
 r=rmap.get(f.name);url=r['source_url'] if r else known[f.name]
 sources.append(dict(source_id=len(sources)+1,url=url,retrieved_at=timestamp(f),local_file=str(f.relative_to(P)),sha256=hashlib.sha256(f.read_bytes()).hexdigest(),http_status=r['http_status'] if r else 200))
write('sources.json',sources);src={s['url']:s['source_id'] for s in sources}
db=P/'world-cup-2026.sqlite'
if db.exists():db.unlink()
c=sqlite3.connect(db);c.executescript((P/'schema.sql').read_text())
def ins(table,**v):c.execute(f"INSERT INTO {table} ({','.join(v)}) VALUES ({','.join('?' for _ in v)})",list(v.values()))
for s in sources:ins('sources',**s)
ins('events',event_id='9322',name=t['event']['name'],start_date='2026-11-11',end_date='2026-11-15',timezone='America/New_York',source_id=src['https://pbleagues.com/event/9322'])
ins('events',event_id='9508',name='NCPA @ NXL World Cup',start_date='2026-11-14',end_date='2026-11-15',timezone='America/New_York',source_id=src['https://pbleagues.com/event/9508'])
for d in t['divisions']:ins('divisions',division_id=d['division_id'],event_id=d['event_id'],name=d['name'],format_group=d['group'],classification=d['classification'],format_rules=d['format_rules'],signed_up=d['signed_up'],paid_summary=d['paid'],registration_limit=d['limit'],listed_count=d['listed_count'],source_id=src[d['source_url']])
seen=set()
for e in t['teams']:
 sid=src[e['source_url']]
 if e['team_id'] not in seen:ins('teams',team_id=e['team_id'],name=e['team_name'],source_id=sid);seen.add(e['team_id'])
 ins('event_entries',entry_id=e['entry_id'],event_id=e['event_id'],division_id=e['division_id'],team_id=e['team_id'],team_name_as_published=e['team_name'],registration_status=e['registration_status'],roster_token=e['event_roster_token'],roster_url=e['roster_url'],bracket=e['bracket'],bracket_source_id=src.get(e['bracket_source_url']),source_id=sid)
people=set();roles=Counter()
for r in rs:
 sid=src.get(r['source_url'])
 ins('roster_access',entry_id=r['entry_id'],status=r['status'],roster_kind=r['roster_kind'],member_count=r['member_count'],http_status=r['http_status'],error=r['error'],source_id=sid)
 for m in r['members'] or []:
  pid=m['person_id'];roles[m['role']]+=1
  if pid and pid not in people:ins('people',person_id=pid,name=m['name'],source_id=sid);people.add(pid)
  ins('roster_memberships',entry_id=r['entry_id'],person_id=pid,name_as_published=m['name'],role=m['role'],section=m['section'],checked_in=m['checked_in'],registration_fee_paid=m['registration_fee_paid'],jersey_number=m['jersey_number'],person_event_link=m['person_event_link'],source_id=sid)
c.commit();assert c.execute('pragma integrity_check').fetchone()[0]=='ok';assert not c.execute('pragma foreign_key_check').fetchall()
# No roster or entry identity deduplication by name.
duplicates={}
for keys,lab in [(['division_id','team_id'],'same_division_team_id'),(['division_id','team_name'],'same_division_exact_name')]:
 cnt=Counter(tuple(e[k] for k in keys) for e in t['teams']);duplicates[lab]=[dict(key=list(k),count=v) for k,v in cnt.items() if v>1]
counts=dict(Counter(r['status'] for r in rs));statuscounts=dict(Counter(e['registration_status'] for e in t['teams']))
val=dict(event_id='9322',registration_entries=680,unique_source_team_ids=len(seen),divisions_with_entries=34,college_divisions_with_zero_entries=2,advertised_signed_up=680,advertised_paid=575,team_status_counts=statuscounts,roster_status_counts=counts,people=len(people),memberships_by_role=dict(roles),duplicate_checks=duplicates,sqlite_integrity='ok',foreign_key_violations=0,source_count=len(sources))
val['public_populated_rosters']=sum(r['status']=='public_event_roster' for r in rs)
val['public_empty_rosters']=sum(r['status']=='public_empty_roster' for r in rs)
val['roster_coverage_by_division']=[dict(division_id=d['division_id'],division=d['name'],entries=d['listed_count'],statuses=dict(Counter(r['status'] for r in rs if r['division_id']==d['division_id']))) for d in t['divisions']]
val['retrieval_start']=min(x['retrieved_at'] for x in sources)
val['retrieval_end']=max(x['retrieved_at'] for x in sources)
val['public_roster_unique_team_ids']=len(set(r['team_id'] for r in rs if r['status']=='public_event_roster'))
val['roster_http_status_counts']=dict(Counter(str(r['http_status']) for r in rs))
write('validation.json',val)
md=['# NXL World Cup 2026 — registered teams','', 'November 11–15, 2026, Kissimmee, Florida. PBLeagues event 9322.', '',f"680 event/division entries; {len(seen)} distinct published team IDs. Includes unpaid/pending/deadline-passed entries, not confirmed attendance.",'','Source: https://pbleagues.com/event/9322/teams','','## Division counts','','| Division | Entries | Paid (event summary) |','|---|---:|---:|']
for d in t['divisions']:md.append(f"| {d['name']} | {d['listed_count']} | {d['paid']} |")
for d in t['divisions']:
 md += ['', '## '+d['name'],'']
 rows=[e for e in t['teams'] if e['division_id']==d['division_id']]
 if not rows:md.append('No teams publicly listed. NCPA event 9508 summary: 0 signed up, 0 paid. https://pbleagues.com/event/9508/teams')
 for e in rows:md.append(f"- [{e['team_name']}]({e['roster_url']}) — {e['registration_status']} (team `{e['team_id']}`, entry `{e['entry_id']}`)")
(P/'teams.md').write_text('\n'.join(md)+'\n')
(P/'README.md').write_text(f'''# NXL World Cup 2026 public team and event-roster database

## Event and scope
The actual upcoming event is **November 11–15, 2026**, Kissimmee, Florida, PBLeagues **9322**, not the 2025 event. Authoritative NXL page: https://www.nxlpaintball.com/world-cup . PBLeagues event: https://pbleagues.com/event/9322 ; team list: https://pbleagues.com/event/9322/teams .

All **680 registrations across 34 competition divisions** have been extracted, including Championship groups, Pro, WNXL, all divisional X-Ball and small formats, Classic Mounds, Commander's Cup and youth. There are **{len(seen)} distinct source team IDs**, because teams can enter multiple divisions. Do not call 680 unique clubs.

The separate NCPA @ NXL World Cup event **9508**, November 14–15, is included as event/division metadata: https://pbleagues.com/event/9508 and https://pbleagues.com/event/9508/teams . Both College X-Ball entry-package divisions show zero registrations; its team page has no teams. Practice event 9510 is excluded: practice slots are not competing team entries. The NXL marketing page mentions Veterans International, but no separate Veterans International division appears among event 9322's published registration divisions; do not infer its participants or equate it to Commander's Cup.

## Files
- `world-cup-2026.sqlite`: normalized SQLite database; no dependencies required to read it with Python's sqlite3.
- `schema.sql`: schema and `player_rosters` view.
- `teams.json`: event metadata, 36 division/package records (34 main + 2 empty college), and 680 event registration entries in `teams`.
- `rosters.json`: one access/result record per event entry, including source URL, timestamp, access status, and members when publicly visible.
- `teams.md`: readable complete team list and division totals.
- `sources.json`: exact URLs, retrieval timestamps (America/New_York, explicit offset), local HTML paths, HTTP status and SHA-256 hashes.
- `sources/`: saved public HTML, no photos downloaded.
- `validation.json`: totals, source status counts, duplicate checks and database checks.
- `collect.py`, `build_database.py`: local extraction/build scripts, not a repository integration. Collector uses cached pages and sequential requests with a 0.65-second minimum pause between new requests; it never signs in or follows player/profile/payment links. Re-running the collector reuses the existing source cache, not a fresh event snapshot; run the builder afterward to restore college metadata.

## Roster access / limitations
Roster outcome counts: `{json.dumps(counts)}`. Roles across available rosters: `{json.dumps(dict(roles))}`; {len(people)} distinct published person IDs. All 680 roster links were checked. Of 54 publicly readable event-roster pages, 30 contain published members and 24 explicitly show zero members in visible roster tables (`public_empty_roster`). These are empty published snapshots, not proof the teams have no players. Login-gated/denied/otherwise unreadable results have `members: null`, `member_count: null`, and an explicit status, **not an empty roster**. `no_public_members_visible` means the HTML has no public member table; it is not proof that the team has no players.

Available records are the **event-specific roster pages linked directly from this event's team list**, not a season list or a substitute. They are pre-event roster listings, not proof the people attended: `checked_in` is copied literally. Coach/Staff/Player roles remain separate. No jerseys are published in the parsed member tables; `jersey_number` is NULL everywhere. No name, jersey or player identity is inferred from film, namesakes, legacy pages or previous events. No individual player profiles, addresses, emails or pictures are collected.

Registration labels preserved exactly: `{json.dumps(statuscounts)}`. The event summary reports 575 paid while 562 entry rows say Payment Accepted and 13 say Pending - Pay; both source representations are retained rather than silently treating pending as accepted. Registration Deadline Passed is preserved, not relabeled withdrawn. No published withdrawal label was observed in this team list. Some formats remain open for registration near/during the event, so this is a timestamped public snapshot and can change; it is not final attendance or guaranteed complete private rosters.

Each of the 34 main-division row counts was checked against its advertised Signed Up count; total matches 680. College totals match zero. Duplicate checks are in `validation.json`; entries are never silently merged by team name. Stable IDs: `teams.team_id` is the page's published opaque `data-etid`/ETID; `event_entries.entry_id` is the numeric registration-row `data-id`; `roster_token` is the event-roster ERID in its URL; `people.person_id` is the numeric public roster row's `data-id`. Never substitute an ERID for a team ID. Division IDs are the team page's published IDs, with the two college IDs from event 9508. Names as published are retained in event entries and memberships even if one source ID appears with spelling differences. `teams.name`/`people.name` use the first observed label, not an independent canonical identity assertion. `bracket` contains only distinct nonempty published `data-group` labels from that entry's own event-roster schedule; NULL if absent. Its separate source URL/time (or database `bracket_source_id`) cites that roster page; no match scores or schedule times were extracted. `format_group` and `format_rules` copy the registration summary, not inferred match rules.

## Claude Code and Codex
Download/extract the ZIP into a directory those tools can access. This box path is **not automatically available on your own computer**. No installation, cloud upload or repository modification has been done. In either tool, give the actual local path, for example:

> Read `/absolute/local/path/world-cup-2026/README.md` and query `/absolute/local/path/world-cup-2026/world-cup-2026.sqlite` read-only. Use `player_rosters` for players only. Show access status before declaring a roster empty, preserve source citations and timestamps, and never invent missing jerseys.

If the SQLite CLI is installed:
```sh
sqlite3 -readonly world-cup-2026.sqlite
```
Example SQL:
```sql
-- Count all entries by division, including zero-entry college packages.
SELECT d.event_id,d.name,COUNT(e.entry_id) AS entries
FROM divisions d LEFT JOIN event_entries e USING(division_id)
GROUP BY d.division_id ORDER BY d.event_id,d.name;

-- Players only, with provenance.
SELECT * FROM player_rosters WHERE team_name='San Diego Dynasty';

-- Access limitations, not "empty rosters".
SELECT e.team_name_as_published,d.name,a.status,s.url,s.retrieved_at
FROM roster_access a JOIN event_entries e USING(entry_id)
JOIN divisions d USING(division_id)
LEFT JOIN sources s ON s.source_id=a.source_id
WHERE a.status<>'public_event_roster';

-- Preserve players, coaches and staff separately.
SELECT e.team_name_as_published,r.name_as_published,r.role,r.jersey_number
FROM roster_memberships r JOIN event_entries e USING(entry_id)
WHERE e.team_name_as_published='Edmonton Impact';
```
Python standard-library example:
```python
import sqlite3
con = sqlite3.connect('file:world-cup-2026.sqlite?mode=ro', uri=True)
print(con.execute('SELECT COUNT(*) FROM event_entries').fetchone()[0])
```
''')
c.close()
zip_path=P/'world-cup-2026.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(P.rglob('*')):
  if f.is_file() and f!=zip_path and '__pycache__' not in str(f):z.write(f,'world-cup-2026/'+str(f.relative_to(P)))
with zipfile.ZipFile(zip_path) as z:assert z.testzip() is None
print(json.dumps(val,indent=2));print('ZIP',zip_path,zip_path.stat().st_size)
