"""Offline importer: browser-saved event HTML, or explicitly mapped tabular export.
Never opens URLs, browser profiles, sessions or credentials. See IMPORTING.md.
"""
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlparse,parse_qs,urljoin
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import Counter,defaultdict
import argparse,json,re,sqlite3,hashlib,subprocess,csv,io,zipfile,shutil
P=Path(__file__).resolve().parent
TZ=ZoneInfo('America/New_York')
def load(f):return json.loads(f.read_text())
def save(f,v):f.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def text(x):return x.get_text(' ',strip=True)
def ts(f):return datetime.fromtimestamp(f.stat().st_mtime,TZ).isoformat()
def qid(link,key):return parse_qs(urlparse(link).query).get(key,[None])[0]
def modern(s):
 tables=s.select('table.rosterList')
 if not tables:raise ValueError('No visible modern roster tables (possibly login wall); not imported as empty')
 members=[]
 for tb in tables:
  initial=len(members)
  for tr in tb.select('tbody tr'):
   a=tr.select_one('a.itemName');cs=tr.find_all('td',recursive=False)
   if not a:continue
   if len(cs)!=5:raise ValueError('Unexpected modern roster columns')
   members.append(dict(person_id=tr.get('data-id'),name=text(a),role=text(cs[4]),section=tb.get('id'),checked_in=text(cs[2]),registration_fee_paid=text(cs[3]),jersey_number=None,person_event_link=urljoin('https://pbleagues.com',a['href']),event_person_token=qid(a['href'],'EPID')))
  ident=tb.get('id','').replace('roster-','')
  count=s.select_one('.count-'+ident)
  if count and text(count).isdigit() and len(members)-initial!=int(text(count)):raise ValueError('Modern section count mismatch: '+ident)
 return members

def legacy(s):
 table=s.select_one('#RosterTable')
 if not table:
  if 'There are currently no players on this roster.' in text(s):return []
  raise ValueError('No legacy RosterTable found')
 out=[];role=None;expected={}
 for tr in table.find_all('tr',recursive=False):
  if tr.find('th'):
   for th in tr.find_all('th'):
    m=re.match(r'^(Coach|Players|Staff|Media)\s*\(\s*(\d+)\s*\)',text(th))
    if m:
     role={'Players':'Player'}.get(m[1],m[1]);expected[role]=int(m[2])
   continue
  a=tr.select_one('b a[href*="rosterclass.cgi"]')
  if not a:continue
  if role is None:raise ValueError('Legacy person without a section role')
  img=tr.select_one('img[src*="pictures_crop/"]');pid=re.search(r'/(\d+)\.(?:png|jpg|jpeg)',img['src'],re.I) if img else None
  cs=tr.find_all('td',recursive=False);nextrow=tr.find_next_sibling('tr');age=re.search(r'Age:\s*(\d+)',text(nextrow)) if nextrow else None
  out.append(dict(person_id=pid[1] if pid else None,name=text(a),role=role,section='legacy-'+role.lower(),checked_in=None,registration_fee_paid=None,jersey_number=None,person_event_link=urljoin('https://pbleagues.com',a['href']),event_person_token=qid(a['href'],'EPID'),legacy_name_as_published=text(a),classification=text(cs[-1]) if cs else None,age_as_published=age[1] if age else None))
 for role,n in expected.items():
  if sum(m['role']==role for m in out)!=n:raise ValueError('Legacy section count mismatch: '+role)
 return out

def tabular(path):
 """Strict normal-export adapter: requires name and role columns, no prose guesses."""
 if path.suffix.lower()=='.json':
  v=load(path);rows=v.get('members',[]) if isinstance(v,dict) else v
 else:
  if path.suffix.lower()=='.pdf':data=subprocess.run(['pdftotext','-layout',str(path),'-'],capture_output=True,text=True,check=True).stdout
  else:data=path.read_text()
  lines=[l for l in data.splitlines() if l.strip()]
  if path.suffix.lower()=='.csv':rows=list(csv.DictReader(io.StringIO(data)))
  else:
   split=lambda l:re.split(r'\t+| {2,}',l.strip())
   pos=next((i for i,l in enumerate(lines) if any(x.lower() in ['name','name, surname'] for x in split(l)) and any(x.lower()=='role' for x in split(l))),None)
   if pos is None:raise ValueError('Text/PDF needs a table header with Name and Role; use an explicit normalized JSON export for flowing browser text')
   head=split(lines[pos]);rows=[dict(zip(head,split(l))) for l in lines[pos+1:] if len(split(l))==len(head)]
 out=[]
 for row in rows:
  row={k.lower().strip().replace(' ','_'):v for k,v in row.items()}
  name=row.get('name') or row.get('name,_surname');role=row.get('role')
  if not name or role not in ['Player','Coach','Staff','Media']:raise ValueError('Every export row needs a published name and explicit Player/Coach/Staff/Media role')
  out.append(dict(person_id=str(row['person_id']) if row.get('person_id') else None,name=name,role=role,section='export-'+role.lower(),checked_in=row.get('checked_in'),registration_fee_paid=row.get('registration_fee_paid'),jersey_number=row.get('jersey_number'),person_event_link=row.get('person_event_link'),event_person_token=row.get('event_person_token')))
 return out

def run():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--directory',type=Path,default=P/'authenticated');ap.add_argument('--manifest',type=Path);ap.add_argument('--package',action='store_true');args=ap.parse_args()
 t=load(P/'teams.json');entries={e['entry_id']:e for e in t['teams']};bytoken={e['event_roster_token']:e for e in t['teams']}
 tasks=[]
 if args.manifest:
  data=load(args.manifest);tasks=data.get('files',[]) if isinstance(data,dict) else data
  for x in tasks:
   f=Path(x['file']);x['path']=f if f.is_absolute() else args.manifest.parent/f
 else:
  for f in sorted(list(args.directory.glob('*.html'))+list(args.directory.glob('*.aria.txt'))):
   m=re.fullmatch(r'(legacy-)?roster-([A-Za-z0-9]+)\.(?:html|aria\.txt)',f.name)
   if m and (m[2] in bytoken or m[2] in entries):
    e=entries[m[2]] if m[2] in entries else bytoken[m[2]];kind='legacy' if m[1] else 'modern';url='https://pbleagues.com/cgi-bin/roster.cgi?ERID='+e['event_roster_token'] if kind=='legacy' else e['roster_url']
    header=f.read_text(errors='replace')[:1200];capture=re.search(r'retrieved:\s*([^ ;<>]+)',header,re.I)
    tasks.append(dict(path=f,entry_id=e['entry_id'],source_url=url,kind=kind,retrieved_at=capture[1] if capture else ts(f),timestamp_basis='browser_capture_comment' if capture else 'saved_file_mtime',priority=2 if m[2] in entries else 1))
 parsed=defaultdict(dict);errors=[]
 for x in tasks:
  try:
   e=entries[str(x['entry_id'])];f=Path(x['path']);kind=x.get('kind','modern');url=x['source_url'];expected=e['roster_url'] if kind!='legacy' else 'https://pbleagues.com/cgi-bin/roster.cgi?ERID='+e['event_roster_token']
   if url!=expected:raise ValueError('Source URL does not match the registered entry')
   if not x.get('retrieved_at'):x['retrieved_at']=x.get('saved_at')
   if not x.get('retrieved_at'):raise ValueError('Explicit retrieval timestamp required in manifest')
   try:x['retrieved_at']=datetime.fromisoformat(x['retrieved_at']).astimezone(TZ).isoformat()
   except ValueError:x['retrieved_at']=ts(f);x['timestamp_basis']='saved_file_mtime_capture_unknown'
   if f.suffix.lower() in ['.html','.htm']:
    s=BeautifulSoup(f.read_text(errors='replace'),'html.parser');members=legacy(s) if kind=='legacy' else modern(s)
    tokens={qid(a['href'],'ERID') for a in s.select('a[href*="rosterclass.cgi?"]')};tokens.discard(None)
    if tokens and e['event_roster_token'] not in tokens:raise ValueError('Saved page ERID does not match entry')
   elif f.name.endswith('.aria.txt') and kind=='legacy':
    from aria_roster import parse_aria
    members=parse_aria(f.read_text())
   else:members=tabular(f)
   for m in members:
    if not m['person_id']:m['person_id']='local:'+hashlib.sha256((e['entry_id']+'|'+(m.get('event_person_token') or m['name'])+'|'+m['role']).encode()).hexdigest()[:24]
   x.update(members=members,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),kind=kind)
   prev=parsed[e['entry_id']].get(kind)
   if prev is None or (x.get('priority',1),x['retrieved_at'])>(prev.get('priority',1),prev['retrieved_at']):parsed[e['entry_id']][kind]=x
  except Exception as ex:errors.append(dict(file=str(x.get('path')),error=str(ex)))
 c=sqlite3.connect(P/'world-cup-2026.sqlite');c.execute('PRAGMA foreign_keys=ON')
 c.executescript('''CREATE TABLE IF NOT EXISTS person_name_variants(person_id TEXT NOT NULL REFERENCES people,name TEXT NOT NULL,variant_kind TEXT NOT NULL,source_id INTEGER NOT NULL REFERENCES sources,UNIQUE(person_id,name,variant_kind,source_id)); CREATE TABLE IF NOT EXISTS authenticated_imports(entry_id TEXT NOT NULL REFERENCES event_entries,source_id INTEGER NOT NULL REFERENCES sources,kind TEXT NOT NULL,member_count INTEGER NOT NULL,PRIMARY KEY(entry_id,kind));''')
 for name,typ in [('legacy_name_as_published','TEXT'),('classification','TEXT'),('age_as_published','TEXT'),('legacy_source_id','INTEGER REFERENCES sources')]:
  if name not in [r[1] for r in c.execute('pragma table_info(roster_memberships)')]:c.execute(f'ALTER TABLE roster_memberships ADD COLUMN {name} {typ}')
 current=load(P/'rosters.json');rmap={r['entry_id']:r for r in current['rosters']}
 # A partial manifest must not erase a previously imported complementary view.
 for eid,kinds in parsed.items():
  for old in c.execute('SELECT i.kind,s.local_file,s.url,s.retrieved_at,s.sha256 FROM authenticated_imports i JOIN sources s USING(source_id) WHERE entry_id=?',(eid,)).fetchall():
   kind,local,url,when,digest=old
   if kind in kinds:continue
   f=P/local
   if f.exists():
    page=BeautifulSoup(f.read_text(errors='replace'),'html.parser')
    kinds[kind]=dict(path=f,source_url=url,retrieved_at=when,sha256=digest,kind=kind,members=legacy(page) if kind=='legacy' else modern(page),timestamp_basis='previous_import')
 # Public modern views remain authoritative display/check-in observations when
 # a new authenticated legacy page is supplied for one of the 54 public entries.
 public_rosters={r['entry_id']:r for r in load(P/'public-snapshot/rosters.json')['rosters']}
 for eid,kinds in parsed.items():
  if 'modern' not in kinds and public_rosters[eid]['status'] in ['public_event_roster','public_empty_roster']:
   r=public_rosters[eid];f=P/r['source_file'];page=BeautifulSoup(f.read_text(),'html.parser')
   kinds['modern']=dict(path=f,source_url=r['source_url'],retrieved_at=r['retrieved_at'],sha256=hashlib.sha256(f.read_bytes()).hexdigest(),kind='modern',members=modern(page),timestamp_basis='preserved_public_snapshot')
 for eid,kinds in parsed.items():
  for kind,x in kinds.items():
   f=Path(x['path']).resolve()
   archive=P/'authenticated/archive';archive.mkdir(parents=True,exist_ok=True)
   frozen=archive/(x['sha256']+f.suffix.lower())
   if not frozen.exists():shutil.copy2(f,frozen)
   try:rel=str(frozen.relative_to(P))
   except ValueError:raise ValueError('Save import artifacts inside the package directory first')
   row=c.execute('SELECT source_id FROM sources WHERE local_file=? AND sha256=?',(rel,x['sha256'])).fetchone()
   if row:sid=row[0]
   else:
    cur=c.execute('INSERT INTO sources(url,retrieved_at,local_file,sha256,http_status) VALUES(?,?,?,?,NULL)',(x['source_url'],x['retrieved_at'],rel,x['sha256']));sid=cur.lastrowid
   x['source_id']=sid;c.execute('INSERT OR REPLACE INTO authenticated_imports VALUES(?,?,?,?)',(eid,sid,kind,len(x['members'])))
  # Exact EPID bindings resolve people with missing/default legacy photos.
  modern_ids={m.get('event_person_token'):m['person_id'] for m in kinds.get('modern',{}).get('members',[]) if m.get('event_person_token')}
  for m in kinds.get('legacy',{}).get('members',[]):
   if m.get('event_person_token') in modern_ids:m['person_id']=modern_ids[m['event_person_token']]
  combined={}
  for kind in ['modern','legacy']:
   if kind not in kinds:continue
   x=kinds[kind]
   for m in x['members']:
    key=(m['person_id'],m['role'])
    if key not in combined:combined[key]=dict(m,source_id=x['source_id'],name_variant_kind='legacy_full_name' if kind=='legacy' else 'display')
    base=combined[key]
    if kind=='legacy':base.update({k:m.get(k) for k in ['legacy_name_as_published','classification','age_as_published']});base['legacy_source_id']=x['source_id']
    c.execute('INSERT OR IGNORE INTO people(person_id,name,source_id) VALUES(?,?,?)',(m['person_id'],m['name'],x['source_id']))
    c.execute('INSERT OR IGNORE INTO person_profile_observations(person_id) VALUES(?)',(m['person_id'],))
    c.execute('INSERT OR IGNORE INTO person_name_variants VALUES(?,?,?,?)',(m['person_id'],m['name'],'legacy_full_name' if kind=='legacy' else 'display',x['source_id']))
  c.execute('DELETE FROM roster_memberships WHERE entry_id=?',(eid,))
  for m in combined.values():
   fields=['person_id','role','section','checked_in','registration_fee_paid','jersey_number','person_event_link','source_id','legacy_name_as_published','classification','age_as_published','legacy_source_id'];row={k:m.get(k) for k in fields};row.update(entry_id=eid,name_as_published=m['name'])
   c.execute('INSERT INTO roster_memberships('+','.join(row)+') VALUES('+','.join('?' for _ in row)+')',list(row.values()))
  primary=kinds.get('modern') or kinds['legacy'];state='authenticated_event_roster' if combined else 'authenticated_empty_roster'
  c.execute('UPDATE roster_access SET status=?,roster_kind=?,member_count=?,http_status=NULL,error=NULL,source_id=? WHERE entry_id=?',(state,'event',len(combined),primary['source_id'],eid))
  r=rmap[eid];r.update(status=state,roster_kind='event',members=list(combined.values()),member_count=len(combined),source_url=primary['source_url'],source_file=c.execute('select local_file from sources where source_id=?',(primary['source_id'],)).fetchone()[0],retrieved_at=primary['retrieved_at'],timestamp_basis=primary.get('timestamp_basis','provided_manifest'),http_status=None,error=None,access_method='user_authorized_browser_saved_artifact',source_coverage=dict(modern='imported' if 'modern' in kinds else 'not_imported',legacy='imported' if 'legacy' in kinds else 'not_imported',media='legacy_imported' if 'legacy' in kinds else 'not_retrieved_in_modern_roster'))
 # Remove only superseded local placeholders, never source documents/observations.
 for row in c.execute("select person_id from people p where person_id like 'local:%' and not exists(select 1 from roster_memberships r where r.person_id=p.person_id)").fetchall():
  pid=row[0];c.execute('delete from person_profile_access where person_id=?',(pid,));c.execute('delete from person_event_history where person_id=?',(pid,));c.execute('delete from person_team_history where person_id=?',(pid,));c.execute('delete from person_name_variants where person_id=?',(pid,));c.execute('delete from person_profile_observations where person_id=?',(pid,));c.execute('delete from people where person_id=?',(pid,))
 c.commit();assert not c.execute('pragma foreign_key_check').fetchall();assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
 current['updated_at']=datetime.now(TZ).isoformat();save(P/'rosters.json',current)
 c.row_factory=sqlite3.Row;save(P/'sources.json',[dict(r) for r in c.execute('select * from sources order by source_id')]);save(P/'player_profiles.json',dict(profiles=[dict(r) for r in c.execute('select * from person_profile_observations')],team_history=[dict(r) for r in c.execute('select * from person_team_history')],name_variants=[dict(r) for r in c.execute('select * from person_name_variants')]))
 val=load(P/'validation.json');val.update(roster_status_counts=dict(Counter(r['status'] for r in current['rosters'])),people=c.execute('select count(*) from people').fetchone()[0],memberships_by_role={r[0]:r[1] for r in c.execute('select role,count(*) from roster_memberships group by role')},authenticated_imported_entries=c.execute('select count(distinct entry_id) from authenticated_imports').fetchone()[0],source_count=c.execute('select count(*) from sources').fetchone()[0],sqlite_integrity='ok',foreign_key_violations=0)
 val['team_location_coverage']={r[0]:r[1] for r in c.execute('select location_status,count(*) from team_location_observations group by location_status')}
 val['team_hometown_entries']=c.execute('select count(*) from team_location_observations where hometown_raw is not null').fetchone()[0]
 val['home_field_entries']=c.execute('select count(*) from team_location_observations where home_field_name is not null').fetchone()[0]
 val['player_profile_coverage']={r[0]:r[1] for r in c.execute('select hometown_status,count(*) from person_profile_observations group by hometown_status')}
 val['roster_coverage_by_division']=[dict(division_id=d['division_id'],division=d['name'],entries=d['listed_count'],statuses=dict(Counter(r['status'] for r in current['rosters'] if r['division_id']==d['division_id']))) for d in t['divisions']];save(P/'validation.json',val)
 readme=P/'README.md';body=readme.read_text();marker='\n## Current authenticated import status\n'
 body=body.split(marker)[0]
 body+=marker+'\n'+json.dumps(val['roster_status_counts'])+'\n\nThis section supersedes the initial public-only counts above. See `validation.json`, `import-report.json`, and `IMPORTING.md` for live coverage, legacy Media limitations and offline importing. The original public snapshot remains in `public-snapshot/`.\n'
 readme.write_text(body)
 report=dict(imported_entries_this_run=len(parsed),artifact_count=sum(len(k) for k in parsed.values()),errors=errors,roster_status_counts=val['roster_status_counts'],memberships_by_role=val['memberships_by_role']);save(P/'import-report.json',report)
 # Export exact live schema, retaining added columns and observation tables.
 sql=[r[0] for r in c.execute("select sql from sqlite_master where sql is not null and name not like 'sqlite_%' order by case type when 'table' then 0 when 'index' then 1 else 2 end")];(P/'schema.sql').write_text('PRAGMA foreign_keys=ON;\n'+';\n'.join(sql)+';\n');c.close()
 if args.package:
  zpath=P/'world-cup-2026.zip';tmp=P/'world-cup-2026.zip.tmp'
  with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as z:
   for f in sorted(P.rglob('*')):
    if f.is_file() and f not in [zpath,tmp] and '__pycache__' not in str(f):z.write(f,'world-cup-2026/'+str(f.relative_to(P)))
  with zipfile.ZipFile(tmp) as z:assert z.testzip() is None
  tmp.replace(zpath)
 print(json.dumps(report,indent=2))
if __name__=='__main__':run()
