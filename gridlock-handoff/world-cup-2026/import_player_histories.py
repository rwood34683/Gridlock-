"""Offline parser for explicitly observed rosterclass scored-event history pages."""
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin,urlparse,parse_qs
from collections import defaultdict,Counter
from datetime import datetime
from zoneinfo import ZoneInfo
import json,sqlite3,hashlib,re,shutil,os,html
from history_format import history_tables,history_rows
from pdf_text_history import pdf_text_rows
P=Path(__file__).parent
TZ=ZoneInfo('America/New_York')
def save(n,x):(P/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def text(t):return t.get_text(' ',strip=True)
def token(u,k):return parse_qs(urlparse(u).query).get(k,[None])[0]
def stamp(f):return datetime.fromtimestamp(f.stat().st_mtime,TZ).isoformat()
c=sqlite3.connect(P/'world-cup-2026.sqlite');c.row_factory=sqlite3.Row
# Queue only current-event players, deduplicated by published numeric person ID.
by=defaultdict(list)
for row in c.execute('SELECT m.person_id,m.name_as_published,m.role,m.person_event_link,m.entry_id,e.team_name_as_published FROM roster_memberships m JOIN event_entries e USING(entry_id)'):
 by[row['person_id']].append(dict(row))
queues={True:[],False:[]};urlmap={}
for pid,rows in by.items():
 links=sorted({r['person_event_link'] for r in rows if r['person_event_link'] and 'rosterclass.cgi?' in r['person_event_link']})
 roles=sorted({r['role'] for r in rows});isplayer='Player' in roles
 if not links:continue
 primary=next((r for r in rows if r['role']=='Player'),rows[0])
 record=dict(person_id=pid,name=primary['name_as_published'],roles=roles,is_current_event_player=isplayer,source_url=links[0],observed_alternative_urls=links[1:],entry_ids=sorted({r['entry_id'] for r in rows}),current_teams=sorted({r['team_name_as_published'] for r in rows}),history_scope='classification_scored_events_only',hometown_status='not_retrieved')
 queues[isplayer].append(record)
 for u in links:urlmap[(token(u,'ERID'),token(u,'EPID'))]=pid
for isplayer,name in [(True,'person-profile-queue.json'),(False,'person-profile-other-roles-queue.json')]:
 rows=sorted(queues[isplayer],key=lambda x:(x['name'].lower(),x['person_id']));save(name,dict(count=len(rows),queue_scope='current_event_players_only' if isplayer else 'coaches_staff_media_without_current_player_role',people=rows))
c.executescript('''CREATE TABLE IF NOT EXISTS person_event_history(observation_id TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people,event_date_as_published TEXT,event_date_iso TEXT,event_name TEXT,event_id TEXT,event_url TEXT,team_name TEXT,team_roster_url TEXT,division_as_published TEXT,place_as_published TEXT,classification_score_as_published TEXT,classification_context TEXT,role_at_historical_event TEXT,participation_basis TEXT NOT NULL,source_id INTEGER NOT NULL REFERENCES sources);''')
for col,typ in [('extraction_status','TEXT'),('raw_row_as_published','TEXT'),('raw_layout_line_number','INTEGER')]:
 if col not in [r[1] for r in c.execute('pragma table_info(person_event_history)')]:c.execute('ALTER TABLE person_event_history ADD COLUMN '+col+' '+typ)
c.execute('CREATE TABLE IF NOT EXISTS profile_text_sources(source_id INTEGER PRIMARY KEY REFERENCES sources,person_id TEXT NOT NULL REFERENCES people,raw_layout_text TEXT NOT NULL,extraction_status TEXT NOT NULL)')
counts=Counter();errors=[];warnings=[]
confirmed=set()
manifest=P/'authenticated/person-profile-manifest.jsonl'
if manifest.exists():
 for index,line in enumerate(manifest.read_text().splitlines()):
  if os.environ.get('PROFILE_IMPORT_MANIFEST_LIMIT') and index>=int(os.environ['PROFILE_IMPORT_MANIFEST_LIMIT']):break
  try:
   rec=json.loads(line)
   if rec.get('status')=='ok' and rec.get('file'):confirmed.add(Path(rec['file']).name)
  except json.JSONDecodeError:pass
for f in sorted((P/'authenticated').glob('*.html')):
 if not (f.name.startswith('person-') or f.name.startswith('profile-')):continue
 try:
  if confirmed and f.name not in confirmed and not f.name.startswith('person-sample-'):
   counts['pending_manifest_confirmation']+=1;continue
  raw=f.read_text(errors='replace');match=re.search(r'<!--\s*source:\s*(https://pbleagues.com/cgi-bin/rosterclass.cgi\?[^\s;<>]+)',html.unescape(raw[:2000]))
  if not match:
   if f.name.startswith('person-sample-'):warnings.append(dict(file=f.name,status='sample_without_source_comment_skipped'));continue
   raise ValueError('No observed rosterclass source URL comment')
  url=match[1].replace('&amp;','&');pid=urlmap.get((token(url,'ERID'),token(url,'EPID')))
  if not pid:raise ValueError('Profile ERID/EPID not bound to an observed roster membership')
  digest=hashlib.sha256(f.read_bytes()).hexdigest()
  has_canonical=c.execute("select 1 from sqlite_master where type='table' and name='profile_canonical_evidence'").fetchone()
  if has_canonical and c.execute('select 1 from profile_canonical_evidence where person_id=?',(pid,)).fetchone():
   counts['higher_fidelity_structured_evidence_already_present']+=1;continue
  prior=c.execute("select 1 from sources s join person_profile_access a using(source_id) where s.sha256=? and a.person_id=? and a.status in ('authenticated_scored_event_history','authenticated_scored_event_history_partial')",(digest,pid)).fetchone()
  if prior:counts['unchanged_files_skipped']+=1;continue
  s=BeautifulSoup(raw,'html.parser')
  published_id=s.find('meta',attrs={'name':'person-id'})
  if published_id and published_id.get('content')!=pid:raise ValueError('Published profile person-id disagrees with exact roster-link identity')
  tables=history_tables(s)
  pdf_rows,pdf_zero,pdf_layout=pdf_text_rows(s)
  explicit_zero=bool(re.search(r'\bno (?:scored |qualifying |previous )?events(?: found| recorded| available| to display)?\b',text(s),re.I))
  explicit_zero=explicit_zero or 'corresponding section has no event rows' in text(s).lower()
  if not tables and pdf_rows is None and not explicit_zero:raise ValueError('No scored-event history tables or explicit no-events statement; not imported as empty history')
  capture=re.search(r'retrieved:\s*([^ ;<>]+)',raw[:2000]);when=stamp(f)
  if capture:
   try:when=datetime.fromisoformat(capture[1]).astimezone(TZ).isoformat()
   except ValueError:pass
  digest=hashlib.sha256(f.read_bytes()).hexdigest();dest=P/'authenticated/archive'/(digest+'.html');dest.parent.mkdir(exist_ok=True)
  if not dest.exists():shutil.copy2(f,dest)
  local=str(dest.relative_to(P));existing=c.execute('select source_id from sources where local_file=? and sha256=?',(local,digest)).fetchone()
  if existing:sid=existing[0]
  else:sid=c.execute('insert into sources(url,retrieved_at,local_file,sha256,http_status) values(?,?,?,?,NULL)',(url,when,local,digest)).lastrowid
  c.execute('DELETE FROM person_event_history WHERE person_id=? AND source_id=?',(pid,sid))
  found=[]
  if pdf_layout is not None:c.execute('INSERT OR REPLACE INTO profile_text_sources VALUES(?,?,?,?)',(sid,pid,pdf_layout,'pdf_layout_raw_preserved_no_guessed_cells'))
  for observed in pdf_rows or []:
   row=dict(person_id=pid,**observed,source_id=sid);obs=hashlib.sha256(json.dumps(row,sort_keys=True).encode()).hexdigest();row=dict(observation_id=obs,**row)
   c.execute('INSERT OR REPLACE INTO person_event_history('+','.join(row)+') VALUES('+','.join('?' for _ in row)+')',list(row.values()));found.append(row)
  for table in tables:
   for observed in history_rows(table):
    row=dict(person_id=pid,**observed,source_id=sid)
    obs=hashlib.sha256(json.dumps(row,sort_keys=True).encode()).hexdigest();row=dict(observation_id=obs,**row)
    c.execute('INSERT OR REPLACE INTO person_event_history('+','.join(row)+') VALUES('+','.join('?' for _ in row)+')',list(row.values()));found.append(row)
  # A compact participation index deduplicates repeated classification contexts.
  c.execute('DELETE FROM person_team_history WHERE person_id=? AND source_id=?',(pid,sid));seen=set()
  for row in found:
   if row['team_name'] is None:continue
   key=(row['event_url'] or row['event_name'],row['team_roster_url'] or row['team_name'],row['event_date_as_published'])
   if key in seen:continue
   seen.add(key);c.execute('INSERT INTO person_team_history(person_id,team_id,team_name,event_name,event_date,role,source_id) VALUES(?,NULL,?,?,?,NULL,?)',(pid,row['team_name'],row['event_name'],row['event_date_iso'] or row['event_date_as_published'],sid))
  c.execute("UPDATE person_profile_observations SET hometown_status='not_published_in_retrieved_classification_page',history_status=?,source_id=? WHERE person_id=?",('scored_event_history_imported_columns_unresolved' if pdf_rows else 'scored_event_history_imported' if found else 'scored_event_history_imported_zero_rows',sid,pid))
  c.execute('INSERT OR REPLACE INTO person_profile_access VALUES(?,?,?,?,?)',(pid,sid,'authenticated_scored_event_history_partial' if pdf_rows else 'authenticated_scored_event_history','classification_history','PDF layout: date anchors/context retained; event/team and wrapped cells unresolved, not guessed.' if pdf_rows else 'Only scored-event participation is observed; no complete career history or hometown claimed.'))
  counts['files_imported']+=1;counts['pdf_profiles_with_unresolved_columns']+=int(bool(pdf_rows));counts['visible_zero_row_profiles']+=int(not found);counts['scored_context_rows']+=len(found);counts['deduplicated_participation_rows']+=len(seen)
 except Exception as ex:errors.append(dict(file=f.name,error=str(ex)))
c.commit();assert not c.execute('pragma foreign_key_check').fetchall();assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
save('profile_text_sources.json',dict(profiles=[dict(r) for r in c.execute('select * from profile_text_sources')]))
save('person_event_history.json',dict(scope='classification_scored_event_history_not_complete_career',observations=[dict(r) for r in c.execute('select * from person_event_history')]))
save('player_profiles.json',dict(profiles=[dict(r) for r in c.execute('select * from person_profile_observations')],team_history=[dict(r) for r in c.execute('select * from person_team_history')],name_variants=[dict(r) for r in c.execute('select * from person_name_variants')],profile_access=[dict(r) for r in c.execute('select * from person_profile_access')]))
save('sources.json',[dict(r) for r in c.execute('select * from sources order by source_id')])
save('history-import-report.json',dict(counts=counts,errors=errors,warnings=warnings,player_queue_count=len(queues[True]),other_roles_queue_count=len(queues[False])))
sql=[r[0] for r in c.execute("select sql from sqlite_master where sql is not null and name not like 'sqlite_%' order by case type when 'table' then 0 when 'index' then 1 else 2 end")];(P/'schema.sql').write_text('PRAGMA foreign_keys=ON;\n'+';\n'.join(sql)+';\n');c.close()
print(json.dumps(dict(counts=counts,errors=errors,warnings=warnings,player_queue_count=len(queues[True]),other_roles_queue_count=len(queues[False])),indent=2))

# Integrate completed exact DOM/PDF captures, including records without HTML.
from import_structured_histories import run as import_exact_evidence
import_exact_evidence()
