"""Coordinate/link-annotation PDF extraction; no name/line semantics inferred."""
import pymupdf as fitz
from pathlib import Path
import re
from datetime import datetime

def rect_text(page,rect):
 words=[w for w in page.get_text('words') if rect.x0-.5<=(w[0]+w[2])/2<=rect.x1+.5 and rect.y0-.5<=(w[1]+w[3])/2<=rect.y1+.5]
 return ' '.join(w[4] for w in sorted(words,key=lambda w:(round(w[1],1),w[0])))
def parse_pdf(path):
 doc=fitz.open(path);groups=[];dates=[];contexts=[];offset=0;page_offsets=[]
 for pno,page in enumerate(doc):
  page_offsets.append(offset)
  for b in page.get_text('blocks'):
   raw=' '.join(b[4].split());m=re.search(r'((?:On This .*?Roster:|Start of the \d{4} Season:)\s*.*?\([^()]*\))',raw)
   if m:contexts.append((offset+b[1],m[1]))
  for word in page.get_text('words'):
   if re.fullmatch(r'\d{2}/\d{2}/\d{4}',word[4]) and word[0]<150:dates.append(dict(date=word[4],pno=pno,word=word,y=offset+(word[1]+word[3])/2))
  for link in sorted(page.get_links(),key=lambda a:(a['from'].y0,a['from'].x0)):
   uri=link.get('uri','');kind='event' if re.search(r'https://pbleagues.com/event/\d+',uri) else 'team' if 'pbleagues.com/cgi-bin/roster.cgi?ERID=' in uri else None
   if not kind:continue
   r=link['from'];label=rect_text(page,r)
   if groups and groups[-1]['kind']==kind and groups[-1]['uri']==uri:
    g=groups[-1];g['text'].append(label);g['end']=offset+r.y1;g['segments'].append((pno,r))
   else:groups.append(dict(kind=kind,uri=uri,text=[label],start=offset+r.y0,end=offset+r.y1,segments=[(pno,r)]))
  offset+=page.rect.height
 dates.sort(key=lambda d:d['y']);pairs=[];pending=None
 for g in groups:
  if g['kind']=='event':pending=g
  elif pending:
   candidates=[d for d in dates if pending['start']-4<=d['y']<=g['end']+4]
   if len(candidates)==1:pairs.append((pending,g,candidates[0]))
   pending=None
 if len(pairs)!=len(dates):raise ValueError(f'PDF link-pair/date mismatch: {len(pairs)} pairs vs {len(dates)} dates')
 if len({(d['pno'],d['y']) for _,_,d in pairs})!=len(dates):raise ValueError('Ambiguous duplicate PDF date association')
 rows=[]
 for event,team,d in pairs:
  ctx=[x for x in contexts if x[0]<d['y']]
  if not ctx:raise ValueError('PDF date lacks classification context')
  page=doc[d['pno']];w=d['word'];cy=(w[1]+w[3])/2
  borders=[x['rect'] for x in page.get_drawings() if 0<x['rect'].width<=1.1 and x['rect'].height>5 and x['rect'].y0<cy<x['rect'].y1]
  dr=[r for r in borders if r.x0<w[0] and r.x1<w[0] and r.x0>10]
  cols=[None,None,None]
  if dr:
   left=max(dr,key=lambda r:r.x0);xs=sorted({round(r.x0,2) for r in borders if abs(r.y0-left.y0)<1.1 and abs(r.y1-left.y1)<1.1})
   # Date-cell left border must be immediately before the complete date word.
   idx=xs.index(round(left.x0,2))
   if idx+5<len(xs) and xs[idx+1]>=w[2]-.5:
    for n in range(3):
     lo=xs[idx+2+n]+.8;hi=xs[idx+3+n]-.1
     cols[n]=rect_text(page,fitz.Rect(lo,left.y0,hi,left.y1)) or None
  if event['start']<page_offsets[d['pno']] or team['end']>page_offsets[d['pno']]+page.rect.height:
   # Reconstruct each ancillary cell only from actual same-column row border
   # segments on every involved page. URI rectangles identify the row's y-span.
   rebuilt=[[],[],[]];valid=bool(dr) and idx+5<len(xs)
   first=event['segments'][0][0];last=team['segments'][-1][0]
   for page_index in range(first,last+1):
    if not valid:break
    pg=doc[page_index];anchors=[r for pn,r in event['segments']+team['segments'] if pn==page_index]
    if not anchors:valid=False;break
    anchor_y=(anchors[0].y0+anchors[0].y1)/2
    segments=[x['rect'] for x in pg.get_drawings() if 0<x['rect'].width<=1.1 and x['rect'].height>5 and abs(x['rect'].x0-left.x0)<.2 and x['rect'].y0<anchor_y<x['rect'].y1]
    if len(segments)!=1:valid=False;break
    bound=segments[0]
    for n in range(3):rebuilt[n].append(rect_text(pg,fitz.Rect(xs[idx+2+n]+.8,bound.y0,xs[idx+3+n]-.1,bound.y1)))
   cols=[' '.join(parts).strip() or None for parts in rebuilt] if valid else [None,None,None]
  date=d['date'];eventurl=event['uri'];eventid=re.search(r'/event/(\d+)',eventurl)[1]
  rows.append(dict(event_date_as_published=date,event_date_iso=datetime.strptime(date,'%m/%d/%Y').date().isoformat(),event_name=' '.join(event['text']),event_id=eventid,event_url=eventurl,team_name=' '.join(team['text']),team_roster_url=team['uri'],division_as_published=cols[0],place_as_published=cols[1],classification_score_as_published=cols[2],classification_context=ctx[-1][1],role_at_historical_event=None,participation_basis='classification_scored_event_history',extraction_status='pdf_uri_rectangles_event_team_verified',raw_row_as_published=None,raw_layout_line_number=None))
 zero=not dates and len(contexts)>=2 and all(re.search(r':\s*None\s*\(0\)$',x[1]) for x in contexts)
 if not rows and not zero:raise ValueError('No verified PDF rows or explicit zero contexts')
 return rows,zero
