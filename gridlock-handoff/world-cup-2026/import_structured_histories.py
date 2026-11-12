"""Incremental exact DOM/PDF evidence integration. Only manifest-associated local artifacts."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from collections import Counter,defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo
import json,sqlite3,hashlib,shutil,os
import pymupdf as fitz
from pdf_annotation_history import parse_pdf
from dom_json_history import dom_rows
P=Path(__file__).parent;TZ=ZoneInfo('America/New_York')
def token(u,k):return parse_qs(urlparse(u).query).get(k,[None])[0]
def save(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def run():
 c=sqlite3.connect(P/'world-cup-2026.sqlite');c.row_factory=sqlite3.Row
 c.executescript('''CREATE TABLE IF NOT EXISTS profile_canonical_evidence(person_id TEXT PRIMARY KEY REFERENCES people,source_id INTEGER NOT NULL REFERENCES sources,kind TEXT NOT NULL); CREATE TABLE IF NOT EXISTS profile_capture_evidence(source_id INTEGER PRIMARY KEY REFERENCES sources,person_id TEXT NOT NULL REFERENCES people,capture_method TEXT NOT NULL,original_artifact_path TEXT NOT NULL,sha256 TEXT NOT NULL,page_count INTEGER,row_count INTEGER,zero_event_evidence INTEGER NOT NULL);''')
 bindings={}
 for r in c.execute('select person_id,person_event_link from roster_memberships where person_event_link is not null'):
  u=r['person_event_link'];bindings[(token(u,'ERID'),token(u,'EPID'))]=r['person_id']
 errors=[];warnings=[];counts=Counter();tasks={};records=[]
 manifest_files=sorted((P/'authenticated').glob('*profile*manifest*.jsonl'))+sorted((P/'import-batches').glob('*manifest*.jsonl'))
 for f in manifest_files:
  for i,line in enumerate(f.read_text().splitlines()):
   if os.environ.get('PROFILE_IMPORT_MANIFEST_LIMIT') and i>=int(os.environ['PROFILE_IMPORT_MANIFEST_LIMIT']):break
   try:
    r=json.loads(line)
    if r.get('status') in ['ok','success','saved','captured','pdf_captured','pdf_only','pdf_saved'] and not r.get('error'):records.append(r)
   except json.JSONDecodeError:counts['unfinished_manifest_lines_skipped']+=1
 # Exact structured DOM exports take precedence over PDF captures of that person.
 for f in sorted((P/'authenticated').glob('person-*-dom-tables.json')):
  try:
   obj=json.loads(f.read_text());u=obj['source_url'];pid=bindings.get((token(u,'ERID'),token(u,'EPID')))
   if not pid or str(obj['person_id'])!=pid or obj['epid']!=token(u,'EPID'):raise ValueError('DOM metadata does not match exact roster-link identity')
   tasks[pid]=dict(path=f,kind='dom_json',source_url=u,person_id=pid,retrieved_at=obj['retrieved_at'],payload=obj,priority=2)
  except Exception as ex:errors.append(dict(file=str(f),error=str(ex)))
 from collections import Counter as _Counter
 transport_pdf_basename_counts=_Counter(Path(r['transport_pdf']).name for r in records if r.get('transport_pdf'))
 for r in records:
  try:
   u=r.get('source_url') or r.get('requested_url');ep=token(u or '','EPID');pid=bindings.get((token(u or '','ERID'),ep))
   if not pid:raise ValueError('Manifest source URL lacks exact roster-link identity')
   if r.get('person_id') is not None and str(r['person_id'])!=pid:raise ValueError('Manifest numeric person-id mismatch')
   if pid in tasks and tasks[pid]['priority']==2:continue
   current=c.execute('select history_status from person_profile_observations where person_id=?',(pid,)).fetchone()
   if current and current[0] in ['scored_event_history_imported','scored_event_history_imported_zero_rows'] and not any(x in str(r.get('capture_method','')).lower() for x in ['pdf','print']) and not any(r.get(k) for k in ['filepath','pdf_path','actual_path','transport_pdf','transport_pdf_source']):continue
   # Only explicitly supplied/associated paths in the two approved roots.
   paths=[]
   for key in ['filepath','pdf_path','actual_path','transport_pdf_source','pdf_file','saved_pdf_path','output_path','actualpath','path','file']:
    value=r.get(key)
    if value and str(value).lower().endswith('.pdf'):
     q=Path(value);paths.append(q if q.is_absolute() else P/'authenticated'/q)
   paths.append(P/'authenticated'/('person-'+ep+'.pdf'))
   if r.get('transport_pdf') and transport_pdf_basename_counts[Path(r['transport_pdf']).name]==1:paths.append(Path('/workspace/browser-pdfs')/Path(r['transport_pdf']).name)
   found=None
   for q in paths:
    q=q.resolve()
    if (q.is_relative_to(P/'authenticated') or q.is_relative_to(Path('/workspace/browser-pdfs'))) and q.is_file() and q.stat().st_size>0:found=q;break
   if found is not None and r.get('pdf_bytes') is not None:
    try:
     expected_bytes=int(r['pdf_bytes'])
    except (TypeError,ValueError):
     expected_bytes=None
    if expected_bytes is not None and found.stat().st_size!=expected_bytes:
     counts['incomplete_pdf_byte_mismatch_skipped']+=1
     warnings.append(dict(person_id=r.get('person_id'),epid=token(u or '','EPID'),file=str(found),expected_bytes=expected_bytes,actual_bytes=found.stat().st_size,error='PDF size does not match completed manifest pdf_bytes; treating as unfinished capture'))
     continue
   if found is None:
    # Older HTML captures may carry a shared/unresolvable transport_pdf hint; HTML was the imported source.
    if r.get('file') and str(r.get('file')).lower().endswith(('.html','.htm','.txt')):
     counts['html_manifest_without_resolvable_unique_pdf_skipped']+=1
     continue
    pdfish=any(r.get(k) for k in ['filepath','pdf_path','actual_path','transport_pdf','transport_pdf_source']) or any(x in str(r.get('capture_method','')).lower() for x in ['pdf','print'])
    if pdfish and r.get('status') in ['ok','success','saved','captured','pdf_captured','pdf_only','pdf_saved']:
     counts['completed_manifest_pdf_path_unresolved']+=1;warnings.append(dict(person_id=r.get('person_id'),epid=token(u or '','EPID'),error='Completed PDF manifest record has no resolvable associated PDF under approved roots'))
    else:counts['non_pdf_or_incomplete_manifest_records_without_local_pdf']+=1
    continue
   when=r.get('retrieved_at') or r.get('saved_at')
   if not when:raise ValueError('PDF capture has no retrieval timestamp')
   tasks[pid]=dict(path=found,kind='pdf',source_url=u,person_id=pid,retrieved_at=when,record=r,priority=1)
  except Exception as ex:errors.append(dict(file=r.get('file'),error=str(ex)))
 for pid,t in tasks.items():
  f=t['path'];u=t['source_url'];kind=t['kind']
  try:
   before=f.stat();digest=hashlib.sha256(f.read_bytes()).hexdigest();when=datetime.fromisoformat(t['retrieved_at']).astimezone(TZ).isoformat()
   old=c.execute('select e.source_id,e.kind,s.sha256 from profile_canonical_evidence e join sources s using(source_id) where person_id=?',(pid,)).fetchone()
   missing_ancillary=c.execute('select count(*) from person_event_history where person_id=? and source_id=? and (division_as_published is null or place_as_published is null or classification_score_as_published is null)',(pid,old['source_id'])).fetchone()[0] if old else 0
   if old and old['sha256']==digest and old['kind']==kind and not missing_ancillary:counts['unchanged_structured_captures_skipped']+=1;continue
   pages=None
   if kind=='dom_json':rows,zero=dom_rows(t['payload'])
   else:
    with fitz.open(f) as doc:
     pages=len(doc);eps={token(link.get('uri',''),'EPID') for pg in doc for link in pg.get_links() if 'playerprofile.cgi?' in link.get('uri','')}
    if token(u,'EPID') not in eps:raise ValueError('Actual PDF lacks matching player-profile EPID link annotation')
    rows,zero=parse_pdf(f)
    expected=t['record'].get('score_row_count',t['record'].get('scored_event_rows'))
    if expected is not None and isinstance(expected,(int,float)) and int(expected)!=len(rows):raise ValueError(f'PDF row count differs from manifest: {len(rows)} vs {expected}')
   after=f.stat()
   if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):raise ValueError('Artifact changed during parse; deferred until next batch')
   prior_partial=c.execute("select count(*) from person_event_history where person_id=? and extraction_status like 'pdf_row_anchor_preserved%'",(pid,)).fetchone()[0]
   if prior_partial and prior_partial!=len(rows):raise ValueError(f'Existing preserved row count differs from structured evidence: {prior_partial} vs {len(rows)}')
   folder=P/('pdf-sources' if kind=='pdf' else 'structured-sources');folder.mkdir(exist_ok=True);frozen=folder/(digest+f.suffix)
   if not frozen.exists():shutil.copy2(f,frozen)
   rel=str(frozen.relative_to(P));existing=c.execute('select source_id from sources where local_file=? and sha256=?',(rel,digest)).fetchone()
   sid=existing[0] if existing else c.execute('insert into sources(url,retrieved_at,local_file,sha256,http_status) values(?,?,?,?,NULL)',(u,when,rel,digest)).lastrowid
   # Raw layouts and archived source documents stay immutable; dated placeholders
   # are superseded by their exact structured evidence, not retained as duplicates.
   c.execute("delete from person_event_history where person_id=? and extraction_status like 'pdf_row_anchor_preserved%'",(pid,))
   c.execute("update person_profile_access set status='superseded_by_structured_evidence' where person_id=? and status='authenticated_scored_event_history_partial'",(pid,))
   if old and old['source_id']!=sid:
    c.execute('delete from person_event_history where person_id=? and source_id=?',(pid,old['source_id']));c.execute('delete from person_team_history where person_id=? and source_id=?',(pid,old['source_id']));c.execute("update person_profile_access set status='superseded_by_structured_evidence' where person_id=? and source_id=?",(pid,old['source_id']))
   c.execute('delete from person_event_history where person_id=? and source_id=?',(pid,sid));c.execute('delete from person_team_history where person_id=? and source_id=?',(pid,sid));seen=set()
   for obs in rows:
    row=dict(person_id=pid,**obs,source_id=sid);oid=hashlib.sha256(json.dumps(row,sort_keys=True).encode()).hexdigest();row=dict(observation_id=oid,**row)
    c.execute('insert into person_event_history('+','.join(row)+') values('+','.join('?' for _ in row)+')',list(row.values()))
    key=(row['event_url'],row['team_roster_url'],row['event_date_as_published'])
    if key not in seen:
     c.execute('insert into person_team_history(person_id,team_id,team_name,event_name,event_date,role,source_id) values(?,NULL,?,?,?,NULL,?)',(pid,row['team_name'],row['event_name'],row['event_date_iso'],sid));seen.add(key)
   status='scored_event_history_imported' if rows else 'scored_event_history_imported_zero_rows'
   c.execute('update person_profile_observations set history_status=?,hometown_status=?,source_id=? where person_id=?',(status,'not_published_in_retrieved_classification_page',sid,pid))
   c.execute('insert or replace into person_profile_access values(?,?,?,?,?)',(pid,sid,'authenticated_scored_event_history',kind,'Exact DOM anchor labels or PDF URI rectangles; no inferred team/event splits.'))
   c.execute('insert or replace into profile_canonical_evidence values(?,?,?)',(pid,sid,kind));c.execute('insert or replace into profile_capture_evidence values(?,?,?,?,?,?,?,?)',(sid,pid,'pdf_uri_annotations_and_grid_coordinates' if kind=='pdf' else 'exact_dom_cells_anchor_labels',str(f),digest,pages,len(rows),int(zero)))
   counts['profiles_imported']+=1;counts['zero_profiles_imported']+=int(zero);counts['rows_imported']+=len(rows);counts['partial_profiles_repaired']+=int(bool(prior_partial));counts['partial_rows_repaired']+=prior_partial;counts['dom_profiles']+=int(kind=='dom_json');counts['pdf_profiles']+=int(kind=='pdf')
   counts['rows_with_missing_ancillary_cells']+=sum(any(r[k] is None for k in ['division_as_published','place_as_published','classification_score_as_published']) for r in rows)
  except Exception as ex:errors.append(dict(person_id=pid,file=str(f),error=str(ex)))
 c.commit();assert not c.execute('pragma foreign_key_check').fetchall();assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
 save('sources.json',[dict(r) for r in c.execute('select * from sources order by source_id')]);save('person_event_history.json',dict(scope='classification_scored_event_history_not_complete_career',observations=[dict(r) for r in c.execute('select * from person_event_history')]))
 save('player_profiles.json',dict(profiles=[dict(r) for r in c.execute('select * from person_profile_observations')],team_history=[dict(r) for r in c.execute('select * from person_team_history')],name_variants=[dict(r) for r in c.execute('select * from person_name_variants')],profile_access=[dict(r) for r in c.execute('select * from person_profile_access')]))
 remaining=[dict(r) for r in c.execute("select p.person_id,n.name,p.history_status from person_profile_observations p join people n using(person_id) where (p.history_status='not_retrieved' or p.history_status like '%unresolved%') and exists(select 1 from roster_memberships r where r.person_id=p.person_id and r.role='Player')")];save('person-profile-normalization-remaining.json',dict(count=len(remaining),people=remaining,scope='Own parsed-coverage queue; browser capture queues are untouched.'))
 status={r[0]:r[1] for r in c.execute("select p.history_status,count(*) from person_profile_observations p where exists(select 1 from roster_memberships r where r.person_id=p.person_id and r.role='Player') group by p.history_status")}
 report=dict(counts=counts,errors=errors,warnings=warnings,manifest_records_read=len(records),associated_structured_people=len(tasks),player_history_statuses=status,history_observations=c.execute('select count(*) from person_event_history').fetchone()[0],participation_index_rows=c.execute('select count(*) from person_team_history').fetchone()[0]);save('structured-history-import-report.json',report)
 sql=[r[0] for r in c.execute("select sql from sqlite_master where sql is not null and name not like 'sqlite_%' order by case type when 'table' then 0 when 'index' then 1 else 2 end")];(P/'schema.sql').write_text('PRAGMA foreign_keys=ON;\n'+';\n'.join(sql)+';\n');c.close();print(json.dumps(report,indent=2))
if __name__=='__main__':run()
