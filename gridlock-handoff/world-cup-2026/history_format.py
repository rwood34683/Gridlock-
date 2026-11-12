"""Two observed saved formats: native combined Event/Team and normalized split columns."""
from datetime import datetime
from urllib.parse import urljoin
import re

def text(t):return t.get_text(' ',strip=True)
def history_tables(s):
 result=[]
 for table in s.select('table'):
  heads=[text(x) for x in table.select(':scope > thead > tr > th')]
  if 'classTable' in table.get('class',[]) or heads[:8]==['#','Date','Event','Team','Division','Place','Score','Details']:result.append(table)
 return result

def history_rows(table):
 heading=table.find('caption') or table.find('h3') or table.find_previous('h2')
 context=text(heading) if heading else None
 out=[]
 for tr in table.select(':scope > tbody > tr, :scope > tr'):
  cs=tr.find_all('td',recursive=False)
  if len(cs) not in [7,8] or not re.fullmatch(r'\d+\.',text(cs[0])):continue
  split=len(cs)==8;eventcell=cs[2];teamcell=cs[3] if split else cs[2]
  eventa=eventcell.select_one('a[href*="/event/"]');teama=teamcell.select_one('a[href*="roster.cgi?"]')
  if not split and (not eventa or not teama):continue
  eventname=text(eventa) if eventa else text(eventcell);teamname=text(teama) if teama else text(teamcell)
  if not eventname or not teamname:continue
  date=text(cs[1]);iso=None
  try:iso=datetime.strptime(date,'%m/%d/%Y').date().isoformat()
  except ValueError:pass
  eventurl=urljoin('https://pbleagues.com',eventa['href']) if eventa else None;teamurl=urljoin('https://pbleagues.com',teama['href']) if teama else None;eid=re.search(r'/event/(\d+)',eventurl or '')
  offset=1 if split else 0
  out.append(dict(event_date_as_published=date,event_date_iso=iso,event_name=eventname,event_id=eid[1] if eid else None,event_url=eventurl,team_name=teamname,team_roster_url=teamurl,division_as_published=text(cs[3+offset]),place_as_published=text(cs[4+offset]),classification_score_as_published=text(cs[5+offset]),classification_context=context,role_at_historical_event=None,participation_basis='classification_scored_event_history'))
 return out
