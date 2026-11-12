"""Exact row/cell/link-label DOM export adapter; nested detail rows are ignored."""
from urllib.parse import urljoin
from datetime import datetime
import re

def dom_rows(payload):
 out=[];contexts=[]
 for table in payload['tables']:
  context=None
  for cells in table['matrix']:
   if len(cells)==1:
    t=cells[0].get('text','').strip()
    if re.match(r'^(On This .*Roster:|Start of the \d{4} Season:)',t):context=t;contexts.append(t)
   if len(cells)!=7 or not re.fullmatch(r'\d+\.',cells[0].get('text','').strip()):continue
   if context is None:raise ValueError('DOM scored row lacks exact context heading')
   links=cells[2].get('links',[]);events=[l for l in links if re.search(r'/event/\d+',l.get('href',''))];teams=[l for l in links if 'roster.cgi?ERID=' in l.get('href','')]
   if len(events)!=1 or len(teams)!=1:raise ValueError('DOM row needs exactly one event link and one team-roster link')
   event,team=events[0],teams[0];date=cells[1]['text'].strip();url=urljoin('https://pbleagues.com',event['href'])
   out.append(dict(event_date_as_published=date,event_date_iso=datetime.strptime(date,'%m/%d/%Y').date().isoformat(),event_name=event['text'].strip(),event_id=re.search(r'/event/(\d+)',url)[1],event_url=url,team_name=team['text'].strip(),team_roster_url=urljoin('https://pbleagues.com',team['href']),division_as_published=cells[3]['text'].strip(),place_as_published=cells[4]['text'].strip(),classification_score_as_published=cells[5]['text'].strip(),classification_context=context,role_at_historical_event=None,participation_basis='classification_scored_event_history',extraction_status='structured_dom_cell_anchor_labels_verified',raw_row_as_published=None,raw_layout_line_number=None))
 zero=not out and len(contexts)>=2 and all(re.search(r':\s*None\s*\(0\)$',x) for x in contexts)
 if not out and not zero:raise ValueError('No scored DOM rows or explicit zero contexts')
 return out,zero
