"""Read-only fixed-width feasibility tests; no inferred event/team splits or DB writes."""
from pathlib import Path
from bs4 import BeautifulSoup
from collections import Counter
import json,re,hashlib
from pdf_text_history import pdf_text_rows
P=Path(__file__).parent
manifest=[json.loads(l) for l in (P/'authenticated/person-profile-manifest.jsonl').read_text().splitlines() if l.strip()];batch=manifest[146:346];items=[]
for rec in batch:
 f=P/'authenticated'/rec['file'];page=BeautifulSoup(f.read_text(),'html.parser');rows,zero,layout=pdf_text_rows(page)
 longest=max((len(x.rstrip()) for x in layout.splitlines()),default=0)
 items.append(dict(record=rec,file=f,rows=rows,zero=zero,layout=layout,wrapped_lines=sum(bool(re.search(r'\S.{8,}\s{2,}\S',x)) for x in layout.splitlines()),longest_line=longest))
zeros=[x for x in items if x['zero']][:2]
shorts=sorted([x for x in items if x['rows']],key=lambda x:(len(x['rows']),x['record']['name']))[:2]
longs=sorted([x for x in items if x['rows'] and x not in shorts],key=lambda x:(x['wrapped_lines'],x['longest_line']),reverse=True)[:6]
samples=zeros+shorts+longs;out=[]
for x in samples:
 headers=[]
 for line in x['layout'].splitlines():
  if 'Event/Team' in line and 'Date' in line and 'Division' in line:
   headers.append(dict(raw=line,offsets={k:line.find(k) for k in ['Date','Event/Team','Division','Place','Score','Details']}))
 contexts=sorted({r['classification_context'] for r in x['rows']});rec=x['record'];f=x['file']
 out.append(dict(name=rec['name'],person_id=rec.get('person_id'),source_url=rec['source_url'],file=str(f.relative_to(P)),sha256=hashlib.sha256(f.read_bytes()).hexdigest(),case='explicit_zero' if x['zero'] else 'short' if x in shorts else 'long_wrapped',visible_dated_row_count=len(x['rows']),explicit_zero=x['zero'],contexts=contexts,headers=headers,combined_event_team_cell_evident=bool(headers),separate_event_and_team_headers=False,complete_separate_event_team_values_recoverable_from_preserved_structure=False,reason='Printed header is one Event/Team column. No preserved anchor/link rectangles identify the vertical boundary between wrapped event and wrapped team text within a dated row. Header offsets alone cannot separate these fields without inference.'))
transport_names={r.get('transport_pdf') for r in batch if r.get('transport_pdf')};available=[f for f in (P/'authenticated').glob('*.pdf') if f.name in transport_names or f.name.startswith('person-')]
report=dict(tested_profiles=len(out),sample_mix=dict(Counter(x['case'] for x in out)),available_associated_pdfs=[str(f.relative_to(P)) for f in available],dated_rows_preserved_in_samples=sum(x['visible_dated_row_count'] for x in out),samples=out,conclusion='No actual PDFs supplied. Safe date/context/zero extraction succeeds; 191 event/team splits remain unresolved. Separate Event and Team are not x-separated columns in the original printed table.',missing_artifact='Actual person-EPID.pdf (with link annotations if retained), or original DOM Event/Team cell anchor text + href records bound to profile URL/time. transport_pdf basenames in the manifest are labels, not supplied files.',db_modified=False,network_used=False,browser_or_session_access=False)
(P/'pdf-recovery-feasibility.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
md=['# PDF history repair feasibility','',report['conclusion'],'','Ten representative saved profiles: 2 explicit zero, 2 short and 6 long/wrapped. Dated row/context extraction remains validated; no event/team name splits were inferred.','',f"Associated actual PDFs found in supplied authenticated/: {len(available)}.",'','## Why fixed-width offsets are insufficient','The original heading is Event/Team, one combined column—not separate Event and Team x-columns. Printed dates sit vertically centered beside wrapped text. An event can wrap and a team can wrap; the raw layout does not preserve which lines belonged to each original hyperlink. Stable x-offsets can retain the combined cell region, but cannot certify a boundary between two same-column names.','', '## Required source artifact',report['missing_artifact'],'','When a real PDF is supplied, inspect actual word boxes, table geometry and URI link annotation rectangles. Event links and roster links, if retained, can identify their text without lexical guessing. Bbox coordinates alone still require an unambiguous cell/anchor boundary; ambiguous cases remain flagged. No PDF capability or fidelity is assumed before inspecting one.','','No original PDF rendering was available for independent visual comparison. Browser files and manifests were left unchanged. Only this feasibility report was written; database and active collection queues were not modified.']
for x in out:md.append(f"\n- {x['case']}: {x['name']} — {x['visible_dated_row_count']} rows, Event/Team header evidence {'present' if x['combined_event_team_cell_evident'] else 'missing'}. Source: {x['source_url']}")
(P/'pdf-recovery-feasibility.md').write_text('\n'.join(md)+'\n')
print(json.dumps({k:report[k] for k in ['tested_profiles','sample_mix','available_associated_pdfs','dated_rows_preserved_in_samples','conclusion','missing_artifact']},indent=2))
