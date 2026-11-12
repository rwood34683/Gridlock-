from pathlib import Path
from urllib.parse import parse_qs,urlparse
from collections import Counter
import re,json
P=Path(__file__).parent
def parse_aria(raw):
 # Bind exact observed EPID links to existing modern numeric person IDs.
 index={}
 for r in json.loads((P/'rosters.json').read_text())['rosters']:
  for m in r['members'] or []:
   u=m.get('person_event_link') or '';ep=parse_qs(urlparse(u).query).get('EPID',[None])[0]
   if ep:index[ep]=m['person_id']
 lines=raw.splitlines();expected={};role=None;out=[]
 for i,line in enumerate(lines):
  section=re.search(r'columnheader "(Coach|Players|Staff|Media) \((\d+)\)"',line)
  if section:role={'Players':'Player'}.get(section[1],section[1]);expected[role]=int(section[2])
  name=re.search(r'\blink "([^"]+)"',line)
  if not name or i+1>=len(lines) or 'rosterclass.cgi?' not in lines[i+1]:continue
  url=lines[i+1].split('/url:',1)[1].strip();ep=parse_qs(urlparse(url).query).get('EPID',[None])[0]
  if not ep or ep not in index:raise ValueError('ARIA EPID lacks exact modern person-ID binding')
  if role is None:raise ValueError('ARIA person lacks explicit role header')
  tail='\n'.join(lines[i+2:i+7]);classification=re.search(r'cell "([^"\n]+)"',tail);age=re.search(r'Age: (\d+)',tail)
  cl=classification[1] if classification and not classification[1].startswith('Age:') else None
  out.append(dict(person_id=index[ep],name=name[1],role=role,section='legacy-'+role.lower(),checked_in=None,registration_fee_paid=None,jersey_number=None,person_event_link='https://pbleagues.com'+url if url.startswith('/') else url,event_person_token=ep,legacy_name_as_published=name[1],classification=cl,age_as_published=age[1] if age else None))
 for r,n in expected.items():
  if sum(m['role']==r for m in out)!=n:raise ValueError('ARIA role count mismatch '+r)
 if not expected:raise ValueError('ARIA has no explicit roster section headers')
 return out
