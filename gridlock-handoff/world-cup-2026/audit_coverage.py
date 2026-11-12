"""Offline coverage/source-table audit and explicit people export. No network/browser."""
from pathlib import Path
from collections import Counter,defaultdict
from bs4 import BeautifulSoup
from datetime import datetime
from zoneinfo import ZoneInfo
import json,sqlite3,hashlib,re
from import_saved_rosters import modern,legacy
from history_format import history_tables,history_rows
from pdf_text_history import pdf_text_rows
from pdf_annotation_history import parse_pdf
from dom_json_history import dom_rows
P=Path(__file__).parent
def read(n):return json.loads((P/n).read_text())
def save(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def text(x):return x.get_text(' ',strip=True)
def normalize_id(m,eid):
 if m.get('person_id'):return m['person_id']
 return 'local:'+hashlib.sha256((eid+'|'+(m.get('event_person_token') or m['name'])+'|'+m['role']).encode()).hexdigest()[:24]
c=sqlite3.connect('file:'+str(P/'world-cup-2026.sqlite')+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
sources={r['source_id']:dict(r) for r in c.execute('select * from sources')}
def prov(sid):
 s=sources.get(sid)
 return dict(source_id=sid,source_url=s['url'],retrieved_at=s['retrieved_at'],source_file=s['local_file']) if s else None
t=read('teams.json');entries={e['entry_id']:e for e in t['teams']};pub={r['entry_id']:r for r in read('public-snapshot/rosters.json')['rosters']};access={r['entry_id']:dict(r) for r in c.execute('select * from roster_access')};imports=defaultdict(dict)
for r in c.execute('select * from authenticated_imports'):imports[r['entry_id']][r['kind']]=dict(r)
actual=defaultdict(list)
for r in c.execute('select * from roster_memberships'):actual[r['entry_id']].append(dict(r))
issues=[];warnings=[];missing=[];diffs=[];observations=[]
divisions=[]
for d in t['divisions']:
 count=sum(e['division_id']==d['division_id'] for e in entries.values());ok=count==d['signed_up'];divisions.append(dict(division_id=d['division_id'],division=d['name'],event_id=d['event_id'],published_signed_up=d['signed_up'],entries=count,match=ok,source_url=d['source_url']))
 if not ok:issues.append(dict(kind='division_count_mismatch',division=d['name']))
for eid,e in entries.items():
 views={};errors=[]
 for kind in ['modern','legacy']:
  if kind in imports[eid]:
   sid=imports[eid][kind]['source_id'];s=sources[sid];f=P/s['local_file'];pr=prov(sid)
  elif kind=='modern' and pub[eid]['status'] in ['public_event_roster','public_empty_roster']:
   r=pub[eid];f=P/r['source_file'];sid=next((sid for sid,s in sources.items() if s['local_file']==r['source_file']),None);pr=prov(sid)
  else:
   if kind=='legacy':missing.append(dict(item_type='entry',entry_id=eid,team_name=e['team_name'],division=e['division'],field='legacy_roster_including_media_and_full_name_variants',status='not_imported',actionable=True,source_url='https://pbleagues.com/cgi-bin/roster.cgi?ERID='+e['event_roster_token']))
   continue
  try:
   page=BeautifulSoup(f.read_text(errors='replace'),'html.parser')
   if f.suffix=='.txt' and kind=='legacy':
    from aria_roster import parse_aria
    members=parse_aria(f.read_text())
   else:members=(modern if kind=='modern' else legacy)(page)
   for m in members:m['person_id']=normalize_id(m,eid)
   views[kind]=dict(count=len(members),roles=dict(Counter(m['role'] for m in members)),members=members,source=pr,section_counts_validated=True)
  except Exception as ex:
   errors.append(dict(kind=kind,error=str(ex)));issues.append(dict(kind='source_roster_parse_or_section_count_failure',entry_id=eid,view=kind,error=str(ex)))
 if 'modern' not in views:issues.append(dict(kind='modern_coverage_missing',entry_id=eid))
 if 'modern' in views and 'legacy' in views:
  exact={m.get('event_person_token'):m['person_id'] for m in views['modern']['members'] if m.get('event_person_token')}
  for m in views['legacy']['members']:
   if m.get('event_person_token') in exact:m['person_id']=exact[m['event_person_token']]
 expected={(m['person_id'],m['role']) for v in views.values() for m in v['members']};actualkeys={(m['person_id'],m['role']) for m in actual[eid]}
 if expected!=actualkeys:issues.append(dict(kind='database_membership_union_mismatch',entry_id=eid,missing_from_database=[list(k) for k in expected-actualkeys],unexpected_in_database=[list(k) for k in actualkeys-expected]))
 if len(actualkeys)!=len(actual[eid]):issues.append(dict(kind='duplicate_current_membership_key',entry_id=eid))
 if 'modern' in views and 'legacy' in views:
  a={(m['person_id'],m['role']):m for m in views['modern']['members']};b={(m['person_id'],m['role']):m for m in views['legacy']['members']}
  names=[dict(person_id=k[0],role=k[1],modern_name=a[k]['name'],legacy_full_name=b[k]['name'],whitespace_only=' '.join(a[k]['name'].split())==' '.join(b[k]['name'].split())) for k in a.keys()&b.keys() if a[k]['name']!=b[k]['name']]
  if names or a.keys()!=b.keys():diffs.append(dict(entry_id=eid,team_name=e['team_name'],division=e['division'],modern_count=len(a),legacy_count=len(b),modern_roles=views['modern']['roles'],legacy_roles=views['legacy']['roles'],modern_only=[dict(person_id=k[0],role=k[1],name=a[k]['name']) for k in a.keys()-b.keys()],legacy_only=[dict(person_id=k[0],role=k[1],name=b[k]['name']) for k in b.keys()-a.keys()],name_variants=names,interpretation='Preserved source observations; differences are not automatically errors or transfers.'))
 observations.append(dict(entry_id=eid,team_name=e['team_name'],division=e['division'],modern={k:v for k,v in views.get('modern',{}).items() if k!='members'},legacy={k:v for k,v in views.get('legacy',{}).items() if k!='members'},database_union_memberships=len(actual[eid]),database_roles=dict(Counter(m['role'] for m in actual[eid])),errors=errors))
# Representative source-to-database checks use full source rows and role sets above.
choices=[('Baltimore',next(eid for eid,e in entries.items() if eid=='236224')),('Pro',next(eid for eid,e in entries.items() if e['division']=='Pro X-Ball (Thu-Sun)')),('D4',next(eid for eid,e in entries.items() if e['division']=='Division 4 X-Ball (Thu-Sun)')),('3v3',next(eid for eid,e in entries.items() if e['division']=='Amateur 3v3 X-Ball (Wed)'))]
spot=[]
for label,eid in choices:
 o=next(o for o in observations if o['entry_id']==eid);spot.append(dict(label=label,**o,database_sample=[dict(person_id=m['person_id'],name=m['name_as_published'],role=m['role'],legacy_name=m.get('legacy_name_as_published'),source=prov(m['source_id']),legacy_source=prov(m.get('legacy_source_id'))) for m in actual[eid][:3]]))
# Profile evidence and people export with actual source-linked participation rows.
profiles={r['person_id']:dict(r) for r in c.execute('select * from person_profile_observations')};roles=defaultdict(set);memberentries=defaultdict(set)
for rows in actual.values():
 for m in rows:roles[m['person_id']].add(m['role']);memberentries[m['person_id']].add(m['entry_id'])
history=defaultdict(list)
for r in c.execute('select * from person_event_history'):
 row=dict(r);row['source']=prov(row['source_id']);history[row['person_id']].append(row)
variants=defaultdict(list)
for r in c.execute('select * from person_name_variants'):
 row=dict(r);row['source']=prov(row['source_id']);variants[row['person_id']].append(row)
profileaccess=defaultdict(list)
for r in c.execute('select * from person_profile_access'):
 row=dict(r);row['source']=prov(row['source_id']);profileaccess[row['person_id']].append(row)
people=[]
for row in c.execute('select * from people'):
 person=dict(row);pid=person['person_id'];pr=profiles.get(pid,{});isplayer='Player' in roles[pid];home_status=pr.get('hometown_status','not_retrieved');history_status=pr.get('history_status','not_retrieved')
 person.update(is_current_event_player=isplayer,current_roles=sorted(roles[pid]),current_entry_ids=sorted(memberentries[pid]),name_variants=variants[pid],hometown=dict(raw=pr.get('hometown_raw'),city=pr.get('hometown_city'),region=pr.get('hometown_region'),country=pr.get('hometown_country'),status=home_status,source=prov(pr.get('source_id'))),history=dict(status=history_status,scope='classification_scored_event_history_not_complete_career',source=prov(pr.get('source_id')),observations=history[pid]),profile_access=profileaccess[pid]);people.append(person)
 if isplayer:
  if 'columns_unresolved' in history_status:missing.append(dict(item_type='player',person_id=pid,name=person['name'],field='event_team_columns_from_pdf_layout',status='captured_partial_extraction_not_guessed',actionable=True,source=prov(pr.get('source_id'))))
  if history_status=='not_retrieved':missing.append(dict(item_type='player',person_id=pid,name=person['name'],field='scored_event_participation_history',status='not_retrieved',actionable=True))
  if home_status!='published':missing.append(dict(item_type='player',person_id=pid,name=person['name'],field='player_hometown',status=home_status,actionable=home_status=='not_retrieved',source=prov(pr.get('source_id')),notes='No hometown inference from current or historical team locations.'))
save('people.json',dict(scope='All observed people; is_current_event_player separates players from staff/coaches/media',people=people))
# Independently compare imported history row counts with source classTable rows.
historychecks=[]
for row in c.execute("select distinct person_id,source_id from person_profile_access where status in ('authenticated_scored_event_history','authenticated_scored_event_history_partial')"):
 sid=row['source_id'];f=P/sources[sid]['local_file'];expected=0
 if f.suffix.lower()=='.pdf':expected=len(parse_pdf(f)[0])
 elif f.suffix.lower()=='.json':expected=len(dom_rows(json.loads(f.read_text()))[0])
 else:
  page=BeautifulSoup(f.read_text(errors='replace'),'html.parser')
  for table in history_tables(page):expected+=len(history_rows(table))
  pdf_rows,_,_=pdf_text_rows(page)
  expected+=len(pdf_rows or [])
 got=c.execute('select count(*) from person_event_history where person_id=? and source_id=?',(row['person_id'],sid)).fetchone()[0];ok=expected==got;historychecks.append(dict(person_id=row['person_id'],source=prov(sid),source_context_rows=expected,database_rows=got,match=ok,visible_zero_row_profile=expected==0))
 if not ok:issues.append(dict(kind='history_row_count_mismatch',person_id=row['person_id'],source_id=sid))
ancillary_missing=[]
for h in c.execute("select observation_id,person_id,event_date_iso,event_name,team_name,division_as_published,place_as_published,classification_score_as_published,source_id from person_event_history where extraction_status='pdf_uri_rectangles_event_team_verified'"):
 fields=[k for k in ['division_as_published','place_as_published','classification_score_as_published'] if h[k] is None]
 if fields:
  item=dict(item_type='history_row',person_id=h['person_id'],observation_id=h['observation_id'],event_date=h['event_date_iso'],event_name=h['event_name'],team_name=h['team_name'],field='pdf_ancillary_cells',missing_columns=fields,status='coordinate_cell_boundary_unresolved_not_guessed',actionable=True,source=prov(h['source_id']))
  ancillary_missing.append(item);missing.append(item)
locs=[dict(r) for r in c.execute('select * from team_location_observations')]
for l in locs:
 for field in ['hometown_raw','home_field_name']:
  if not l[field]:missing.append(dict(item_type='team_entry',entry_id=l['entry_id'],field=field,status='not_published_in_retrieved_page',actionable=False,source=prov(l['source_id'])))
sourceerrors=[]
for sid,s in sources.items():
 f=P/s['local_file']
 if not f.exists():sourceerrors.append(dict(source_id=sid,status='file_missing'))
 elif hashlib.sha256(f.read_bytes()).hexdigest()!=s['sha256']:sourceerrors.append(dict(source_id=sid,status='hash_mismatch'))
issues+=sourceerrors
currentplayers=[p for p in people if p['is_current_event_player']];legacy_count=sum(bool(o['legacy']) for o in observations);modern_count=sum(bool(o['modern']) for o in observations)
if any('columns_unresolved' in p['history']['status'] for p in currentplayers):warnings.append('PDF-derived profiles preserve dated rows and context but event/team columns remain unresolved; they are partial extraction, not fully normalized participation.')
if ancillary_missing:warnings.append(str(len(ancillary_missing))+' PDF rows have verified event/team links but missing ancillary division/place/score cells; values remain NULL and are queued.')
if legacy_count<680:warnings.append('Legacy coverage incomplete; modern pages can omit Media and full-name variants.')
if any(p['history']['status']=='not_retrieved' for p in currentplayers):warnings.append('Not every current player has supplied scored-event profile history.')
if any(p['hometown']['status']!='published' for p in currentplayers):warnings.append('Player hometown coverage is incomplete/unpublished; no hometown inferred.')
report=dict(generated_at=datetime.now(ZoneInfo('America/New_York')).isoformat(),overall='source_checks_pass_but_requested_enrichment_incomplete' if not issues and warnings else 'checks_failed' if issues else 'all_audited_fields_covered',event_entries=len(entries),advertised_signed_up=680,distinct_team_ids=len({e['team_id'] for e in entries.values()}),distinct_people=len(people),distinct_current_players=len(currentplayers),modern_views_audited=modern_count,legacy_views_audited=legacy_count,media_memberships=c.execute("select count(*) from roster_memberships where role='Media'").fetchone()[0],roster_status_counts=dict(Counter(r['status'] for r in access.values())),memberships_by_role=dict(Counter(m['role'] for rows in actual.values() for m in rows)),player_history_statuses=dict(Counter(p['history']['status'] for p in currentplayers)),player_hometown_statuses=dict(Counter(p['hometown']['status'] for p in currentplayers)),team_hometown_entries=sum(bool(l['hometown_raw']) for l in locs),home_field_entries=sum(bool(l['home_field_name']) for l in locs),non_null_jersey_memberships=c.execute('select count(*) from roster_memberships where jersey_number is not null').fetchone()[0],jersey_policy='NULL when not explicitly published; no inferred jersey numbers',divisions=divisions,modern_legacy_difference_entries=len(diffs),representative_spot_checks=spot,history_source_row_checks=historychecks,source_hash_checks=len(sources),issues=issues,warnings=warnings,sqlite_integrity=c.execute('pragma integrity_check').fetchone()[0],foreign_key_violations=[list(r) for r in c.execute('pragma foreign_key_check')])
validation=read('validation.json')
validation.update(source_count=len(sources),people=len(people),unique_current_players=len(currentplayers),memberships_by_role=report['memberships_by_role'],roster_status_counts=report['roster_status_counts'],scored_event_history_people=c.execute('select count(distinct person_id) from person_event_history').fetchone()[0],scored_event_history_observations=c.execute('select count(*) from person_event_history').fetchone()[0],scored_participation_index_rows=c.execute('select count(*) from person_team_history').fetchone()[0],player_history_statuses=report['player_history_statuses'],player_hometown_coverage=report['player_hometown_statuses'])
save('validation.json',validation)
report['pdf_rows_with_missing_ancillary_cells']=len(ancillary_missing)
save('coverage-audit.json',report);save('roster-source-coverage.json',dict(entries=observations));save('modern-legacy-differences.json',dict(entries=diffs));save('missing-items.json',dict(count=len(missing),by_field=dict(Counter(x['field'] for x in missing)),items=missing,interpretation='actionable=false marks unpublished data rather than a failed retrieval. Missing hometown is never filled from team location.'))
md=['# Coverage audit','',report['overall'],'',f"680 registered entries / 592 team IDs. Modern sources checked: {modern_count}/680; legacy sources checked: {legacy_count}/680.",f"Current players: {len(currentplayers)}; all people including other roles: {len(people)}.",f"Memberships by role: {json.dumps(report['memberships_by_role'])}",f"Player history coverage: {json.dumps(report['player_history_statuses'])}",f"Player hometown coverage: {json.dumps(report['player_hometown_statuses'])}",f"Published team hometown: {report['team_hometown_entries']}/680; home field: {report['home_field_entries']}/680.",f"Non-NULL jerseys: {report['non_null_jersey_memberships']}; none guessed.",f"Source hash checks: {len(sources)}; issues: {len(issues)}; SQLite: {report['sqlite_integrity']}.",'','## Open limitations']+['- '+x for x in warnings]+['','## Representative source-to-database checks']
for x in spot:md.append(f"- {x['label']}: {x['team_name']} / {x['division']} / entry {x['entry_id']}: modern {x['modern'].get('count','missing')}, legacy {x['legacy'].get('count','not imported')}, preserved database union {x['database_union_memberships']}.")
md+=['','## Audit detail files','- coverage-audit.json: division totals, checks and spot-check provenance','- roster-source-coverage.json: per-entry source section/role counts','- modern-legacy-differences.json: exact role/name/count differences, not silently erased','- missing-items.json: machine-readable unfinished versus unpublished fields','- people.json: source-linked hometown/history statuses and actual scored-event observations','','## Claude Code / Codex local-use prompt','Download and extract the package into a local directory those tools can access, then use:','','> Read `<LOCAL_PATH>/world-cup-2026/README.md` and `coverage-audit.md`. Open `world-cup-2026.sqlite` read-only. Query current players using role=Player or player_rosters; do not mix staff into player counts. Use people.json/person_event_history for source-linked scored-event participation, not inferred transfers or complete careers. Report missing-items.json coverage, cite source URLs and retrieval times, and never infer hometowns or jerseys.','','Nothing has been installed or copied into either coding environment.']
(P/'coverage-audit.md').write_text('\n'.join(md)+'\n')
p=P/'README.md';body=p.read_text().split('\n## Coverage audit status\n')[0];body+='\n## Coverage audit status\n\n'+report['overall']+'\n\nModern coverage '+str(modern_count)+'/680; legacy '+str(legacy_count)+'/680. **Do not claim every requested field is complete.** Player hometown/history coverage and all open limitations are in `coverage-audit.md`, `coverage-audit.json` and `missing-items.json`. `people.json` explicitly includes actual source-linked history observations and hometown/status fields per person.\n';body=re.sub(r'\n## Scored-event history checkpoint\n.*?(?=\n## |\Z)','\n## Scored-event history checkpoint\n\n'+str(sum(v for k,v in report['player_history_statuses'].items() if k.startswith('scored_event_history_imported')))+' current players have imported scored-event classification profiles; '+str(report['player_history_statuses'].get('not_retrieved',0))+' remain without imported history. This is not complete career history. See coverage-audit.json for source-linked status.\n',body,flags=re.S)
p.write_text(body)
c.close();print(json.dumps({k:report[k] for k in ['overall','modern_views_audited','legacy_views_audited','distinct_current_players','memberships_by_role','player_history_statuses','player_hometown_statuses','issues','warnings']},indent=2))
