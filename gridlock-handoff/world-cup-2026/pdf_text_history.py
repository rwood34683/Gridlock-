"""Loss-aware parser: PDF-layout row anchors/context only, never guessed event/team cells."""
import re
from datetime import datetime

def pdf_text_rows(s):
 pre=s.find('pre')
 if not pre:return None,None,None
 layout=pre.get_text();lines=layout.splitlines();context=None;rows=[];contexts=[]
 heading=re.compile(r'((?:On This .*?Roster:|Start of the \d{4} Season:)\s*.*?\([^()]*\))')
 for i,line in enumerate(lines):
  match=heading.search(line)
  if match:context=match[1].strip();contexts.append(context)
  elif line.strip()=='Not Counted':context='Not Counted'
  anchor=re.match(r'^\s*(\d+)\.\s*(\d{2}/\d{2}/\d{4})\b',line)
  if not anchor:continue
  if not context:raise ValueError('PDF row lacks an observed classification context')
  iso=datetime.strptime(anchor[2],'%m/%d/%Y').date().isoformat()
  rows.append(dict(event_date_as_published=anchor[2],event_date_iso=iso,event_name=None,event_id=None,event_url=None,team_name=None,team_roster_url=None,division_as_published=None,place_as_published=None,classification_score_as_published=None,classification_context=context,role_at_historical_event=None,participation_basis='classification_scored_event_history',extraction_status='pdf_row_anchor_preserved_event_team_columns_unresolved',raw_row_as_published=line,raw_layout_line_number=i+1))
 # A printed empty classification table is evidence only if both explicit
 # classification contexts show None (0), not merely a future-results note.
 zero=not rows and len(contexts)>=2 and all(re.search(r':\s*None\s*\(0\)$',x) for x in contexts) and 'Event/Team' in layout
 if not rows and not zero:raise ValueError('PDF text lacks scored row anchors or independently verified empty classification contexts')
 return rows,zero,layout
