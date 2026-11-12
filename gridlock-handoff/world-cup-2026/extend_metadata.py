"""Offline-only enrichment of the cached public event pages."""
from pathlib import Path
from bs4 import BeautifulSoup
from collections import Counter
import json,sqlite3,shutil
P=Path(__file__).parent
snap=P/'public-snapshot';snap.mkdir(exist_ok=True)
for name in ['teams.json','rosters.json','sources.json','world-cup-2026.sqlite','validation.json']:
 if not (snap/name).exists():shutil.copy2(P/name,snap/name)
def load(n):return json.loads((P/n).read_text())
def save(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def txt(n):return n.get_text(' ',strip=True)
t=load('teams.json');rs=load('rosters.json')['rosters'];rmap={r['entry_id']:r for r in rs};locs=[]
for e in t['teams']:
 r=rmap[e['entry_id']];s=BeautifulSoup((P/r['source_file']).read_text(),'html.parser');vals={}
 for tr in s.select('table tr'):
  cs=tr.find_all('td',recursive=False)
  if len(cs)==2 and txt(cs[0]) in ['Home Town','Field']:
   vals[txt(cs[0])]=cs[1]
 home=vals.get('Home Town');field=vals.get('Field');raw=txt(home) if home else None
 parts=[x.strip() for x in raw.split(',')] if raw else []
 flag=home.select_one('img[title]') if home else None
 lines=[x.strip() for x in field.stripped_strings] if field else []
 row=dict(entry_id=e['entry_id'],team_id=e['team_id'],hometown_raw=raw,hometown_city=parts[0] if parts else None,hometown_region=', '.join(parts[1:]) or None if parts else None,hometown_country=flag['title'] if flag else None,home_field_name=lines[0] if lines else None,home_field_location_raw=' '.join(lines[1:]) or None,location_status='published' if raw or lines else 'not_published_in_retrieved_page',source_url=r['source_url'],retrieved_at=r['retrieved_at'],source_file=r['source_file'])
 e['team_location']=row;locs.append(row)
save('teams.json',t);save('team_locations.json',dict(observations=locs))
c=sqlite3.connect(P/'world-cup-2026.sqlite');c.executescript('''
CREATE TABLE IF NOT EXISTS team_location_observations(entry_id TEXT PRIMARY KEY REFERENCES event_entries, team_id TEXT NOT NULL REFERENCES teams,hometown_raw TEXT,hometown_city TEXT,hometown_region TEXT,hometown_country TEXT,home_field_name TEXT,home_field_location_raw TEXT,location_status TEXT NOT NULL,source_id INTEGER REFERENCES sources);
CREATE TABLE IF NOT EXISTS person_profile_observations(person_id TEXT PRIMARY KEY REFERENCES people,hometown_raw TEXT,hometown_city TEXT,hometown_region TEXT,hometown_country TEXT,hometown_status TEXT NOT NULL DEFAULT 'not_retrieved',history_status TEXT NOT NULL DEFAULT 'not_retrieved',source_id INTEGER REFERENCES sources);
CREATE TABLE IF NOT EXISTS person_team_history(history_id INTEGER PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people,team_id TEXT,team_name TEXT NOT NULL,event_name TEXT,event_date TEXT,role TEXT,source_id INTEGER REFERENCES sources);
''')
for row in locs:
 sid=c.execute('select source_id from sources where local_file=?',(row['source_file'],)).fetchone()[0]
 cs=['entry_id','team_id','hometown_raw','hometown_city','hometown_region','hometown_country','home_field_name','home_field_location_raw','location_status'];v={k:row[k] for k in cs};v['source_id']=sid
 c.execute('INSERT OR REPLACE INTO team_location_observations ('+','.join(v)+') VALUES ('+','.join('?' for _ in v)+')',list(v.values()))
c.execute("INSERT OR IGNORE INTO person_profile_observations(person_id) SELECT person_id FROM people")
c.commit();assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
cols=[x[0] for x in c.execute('select * from person_profile_observations').description];profiles=[dict(zip(cols,r)) for r in c.execute('select * from person_profile_observations')];save('player_profiles.json',dict(profiles=profiles,team_history=[]))
# Queue is derived from the immutable public access snapshot.
queue=[dict(entry_id=r['entry_id'],team_id=r['team_id'],team_name=r['team_name'],division_id=r['division_id'],division=r['division'],source_url=r['source_url'],public_access_status=r['status']) for r in load('public-snapshot/rosters.json')['rosters'] if r['status']=='login_required']
groups=[]
for d in t['divisions']:
 rows=[r for r in queue if r['division_id']==d['division_id']]
 if rows:groups.append(dict(division_id=d['division_id'],division=d['name'],count=len(rows),entries=rows))
save('login-required-queue.json',dict(count=len(queue),divisions=groups))
lines=['# Login-required event roster queue',f'# {len(queue)} entries; no network requests made by this utility.','']
for g in groups:
 lines+=['## '+g['division']+' ('+str(g['count'])+')']
 lines += [r['entry_id']+'\t'+r['team_name']+'\t'+r['source_url'] for r in g['entries']];lines+=['']
(P/'login-required-queue.txt').write_text('\n'.join(lines))
schema=c.execute("select sql from sqlite_master where name in ('team_location_observations','person_profile_observations','person_team_history') order by name").fetchall();c.close()
p=P/'schema.sql';st=p.read_text()
if 'CREATE TABLE IF NOT EXISTS team_location_observations' not in st:p.write_text(st+'\n'+';\n'.join(x[0] for x in schema)+';\n')
print('Location coverage',dict(Counter(x['location_status'] for x in locs)),'hometown',sum(bool(x['hometown_raw']) for x in locs),'field',sum(bool(x['home_field_name']) for x in locs),'queue',len(queue))
