"""Offline-only final/checkpoint: roster imports, scored-history imports, validation, ZIP."""
from pathlib import Path
import subprocess,sys,json,sqlite3,zipfile
P=Path(__file__).parent
for script in ['import_saved_rosters.py','import_player_histories.py']:
 subprocess.run([sys.executable,str(P/script)],check=True)
c=sqlite3.connect(P/'world-cup-2026.sqlite');c.row_factory=sqlite3.Row
v=json.loads((P/'validation.json').read_text());v.update(source_count=c.execute('select count(*) from sources').fetchone()[0],unique_current_players=c.execute("select count(distinct person_id) from roster_memberships where role='Player'").fetchone()[0],scored_event_history_people=c.execute('select count(distinct person_id) from person_event_history').fetchone()[0],scored_event_history_observations=c.execute('select count(*) from person_event_history').fetchone()[0],scored_participation_index_rows=c.execute('select count(*) from person_team_history').fetchone()[0],player_hometown_coverage={r[0]:r[1] for r in c.execute("select p.hometown_status,count(*) from person_profile_observations p where exists(select 1 from roster_memberships r where r.person_id=p.person_id and r.role='Player') group by p.hometown_status")})
assert not c.execute('pragma foreign_key_check').fetchall();assert c.execute('pragma integrity_check').fetchone()[0]=='ok';assert c.execute('select count(*) from roster_access').fetchone()[0]==680
(P/'validation.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');c.close()
p=P/'README.md';body=p.read_text().split('\n## Scored-event history checkpoint\n')[0];body+='\n## Scored-event history checkpoint\n\n'+str(v['scored_event_history_people'])+' people have imported classification scored-event history, with '+str(v['scored_event_history_observations'])+' source-context observations. These are not complete career histories or inferred transfers. Player hometown is not shown in these classification pages. See `person_event_history.json`, `player_profiles.json`, and `history-import-report.json`.\n\nFor the final offline import/package command use `python3 finalize_checkpoint.py`.\n';p.write_text(body)
subprocess.run([sys.executable,str(P/'audit_coverage.py')],check=True)
zpath=P/'world-cup-2026.zip';tmp=P/'world-cup-2026.zip.tmp'
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(P.rglob('*')):
  if f.is_file() and f not in [zpath,tmp] and '__pycache__' not in str(f):z.write(f,'world-cup-2026/'+str(f.relative_to(P)))
with zipfile.ZipFile(tmp) as z:assert z.testzip() is None
tmp.replace(zpath)
print('ZIP READY',zpath,zpath.stat().st_size,'bytes');print(json.dumps({k:v[k] for k in ['roster_status_counts','memberships_by_role','people','unique_current_players','scored_event_history_people']},indent=2))

# Portable delivery always uses sanitized source views, never raw browser artifacts.
subprocess.run([sys.executable,str(P/'package_clean.py')],check=True)
