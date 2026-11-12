"""Public HTML only; no login, cookies, profile or payment requests. Cached sequential fetches."""
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import urljoin
from collections import Counter
import json,time,urllib.request,urllib.error
P=Path(__file__).parent
if (P/'import-report.json').exists():raise SystemExit('Authenticated enrichment exists. Use import_saved_rosters.py; do not overwrite it with the public-only collector/builder.')
BASE='https://pbleagues.com'
def stamp():return datetime.now(ZoneInfo('America/New_York')).isoformat()
def txt(t):return t.get_text(' ',strip=True)
def savedtime(path):return datetime.fromtimestamp(path.stat().st_mtime,ZoneInfo('America/New_York')).isoformat()
def write(name,obj):(P/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def summary(eid):
 s=BeautifulSoup((P/f'sources/event-{eid}.html').read_text(),'html.parser');out=[];group=None
 for tr in s.find('table').select('tbody > tr'):
  cs=tr.find_all('td',recursive=False)
  if not cs:continue
  if cs[0].has_attr('data-r'):group=txt(cs[0]);cs=cs[4:]
  if len(cs)!=8:continue
  out.append(dict(group=group,classification=txt(cs[0]),signed_up=int(txt(cs[4])),paid=int(txt(cs[5])),limit=txt(cs[6]),format_rules=txt(cs[7])))
 return out
s=BeautifulSoup((P/'sources/teams-9322.html').read_text(),'html.parser')
sums=summary(9322);ds=s.select('div.ranking');assert len(ds)==len(sums)==34
entries=[];divisions=[]
for d,su in zip(ds,sums):
 did=d['data-id'];name=d['data-division'];rows=d.select('tbody tr[data-id]')
 assert len(rows)==su['signed_up'],(name,len(rows),su)
 divisions.append(dict(event_id='9322',division_id=did,name=name,**su,listed_count=len(rows),source_url=BASE+'/event/9322',retrieved_at=savedtime(P/'sources/event-9322.html')))
 for r in rows:
  a=r.select_one('a.team');cells=r.find_all('td',recursive=False)
  entries.append(dict(event_id='9322',division_id=did,division=name,format=su['group'],format_rules=su['format_rules'],bracket=None,team_name=txt(a),team_id=r.get('data-etid'),entry_id=r['data-id'],event_roster_token=a['href'].split('/')[-1],roster_url=urljoin(BASE,a['href']),registration_status=txt(cells[2]),source_url=BASE+'/event/9322/teams',retrieved_at=savedtime(P/'sources/teams-9322.html')))
assert len(entries)==680
assert len({e['entry_id'] for e in entries})==680
for i,su in enumerate(summary(9508)):
 divisions.append(dict(event_id='9508',division_id='9508-college-'+str(i+1),division_id_is_synthetic=True,name=su['group'],**su,listed_count=0,source_url=BASE+'/event/9508',retrieved_at=savedtime(P/'sources/event-9508.html')))
meta=dict(name='NXL World Cup',year=2026,event_id='9322',start_date='2026-11-11',end_date='2026-11-15',timezone='America/New_York',source_urls=['https://www.nxlpaintball.com/world-cup',BASE+'/event/9322',BASE+'/event/9322/teams'],related_events=[dict(event_id='9508',name='NCPA @ NXL World Cup',start_date='2026-11-14',end_date='2026-11-15',source_url=BASE+'/event/9508',team_list_url=BASE+'/event/9508/teams',listed_team_count=0)],practice_event_excluded='9510: practice spots are not competition team entries')
write('teams.json',dict(schema_version='1.0',event=meta,retrieved_at=stamp(),divisions=divisions,teams=entries))
print('TEAMS',len(entries),'unique source team IDs',len({e['team_id'] for e in entries}),'status',dict(Counter(e['registration_status'] for e in entries)),flush=True)
results=[];manifest=[]
for i,e in enumerate(entries):
 path=P/f"sources/roster-{e['event_roster_token']}.html";url=e['roster_url'];err=None;code=200
 if not path.exists():
  time.sleep(.65)
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'PublicPaintballResearch/1.0 (event roster archive; no authentication)'})
   with urllib.request.urlopen(req,timeout=30) as resp:
    code=resp.status;body=resp.read();final=resp.url
   path.write_bytes(body)
  except urllib.error.HTTPError as ex:
   code=ex.code;err=str(ex);path.write_bytes(ex.read())
  except Exception as ex:err=str(ex);code=None
 if path.exists():
  html=path.read_text(errors='replace');p=BeautifulSoup(html,'html.parser');tables=p.select('table.rosterList');text=txt(p)
 else:html='';tables=[];text='';p=None
 members=[]
 if tables:
  state='public_event_roster'
  for table in tables:
   for tr in table.select('tbody tr'):
    a=tr.select_one('a.itemName');cs=tr.find_all('td',recursive=False)
    if not a:continue
    assert len(cs)==5,(url,str(tr))
    members.append(dict(person_id=tr.get('data-id'),name=txt(a),role=txt(cs[4]),section=table.get('id'),checked_in=txt(cs[2]),registration_fee_paid=txt(cs[3]),jersey_number=None,person_event_link=urljoin(BASE,a['href'])))
 elif code in (401,403):state='access_denied'
 elif err:state='fetch_error'
 elif ('sign in' in text.lower() or 'log in' in text.lower()) and ('password' in html.lower() or 'login' in str(p.title).lower() or 'log in to' in text.lower() or 'must be logged' in text.lower()):state='login_required'
 elif 'World Cup' in text and ('Roster:' in text or 'Roster' in text):state='no_public_members_visible'
 else:state='unrecognized_page'
 results.append(dict(entry_id=e['entry_id'],team_id=e['team_id'],team_name=e['team_name'],division_id=e['division_id'],division=e['division'],event_id=e['event_id'],source_url=url,source_file=str(path.relative_to(P)),retrieved_at=savedtime(path) if path.exists() else stamp(),http_status=code,status=state,error=err,roster_kind='event' if tables else None,members=members if tables else None,member_count=len(members) if tables else None))
 if (i+1)%20==0 or i==len(entries)-1:
  write('rosters.json',dict(schema_version='1.0',event_id='9322',updated_at=stamp(),rosters=results));print(f"{i+1}/{len(entries)}",dict(Counter(r['status'] for r in results)),flush=True)
write('rosters.json',dict(schema_version='1.0',event_id='9322',updated_at=stamp(),rosters=results))
