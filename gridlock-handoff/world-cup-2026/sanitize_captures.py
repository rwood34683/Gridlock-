import os,json,re,shutil
from datetime import datetime
from zoneinfo import ZoneInfo
from bs4 import BeautifulSoup,Comment
P='/workspace/paintball/world-cup-2026'; A=P+'/authenticated'
# Make the existing in-scope player sample available at the importer’s canonical filename.
sample=A+'/person-sample-ZPLwHGdKVYDIxLEn.html'; canonical=A+'/person-ZPLwHGdKVYDIxLEn.html'
if os.path.exists(sample) and not os.path.exists(canonical): shutil.copy2(sample,canonical)
# Add a provenance row for the reused sample if absent.
pm=A+'/person-profile-manifest.jsonl'; rows=[json.loads(x) for x in open(pm,encoding='utf8') if x.strip()]; seen={x['epid'] for x in rows}
if 'ZPLwHGdKVYDIxLEn' not in seen and os.path.exists(canonical):
 src='https://pbleagues.com/cgi-bin/rosterclass.cgi?ERID=JxUPPQG4Ox4pHkeb&EPID=ZPLwHGdKVYDIxLEn'; mt=os.path.getmtime(sample); stamp=datetime.fromtimestamp(mt,ZoneInfo('America/New_York')).isoformat(timespec='seconds')
 q={x['epid']:x for x in json.load(open(A+'/_person-profile-queue.json'))}; person=q.get('ZPLwHGdKVYDIxLEn',{})
 rec={'epid':'ZPLwHGdKVYDIxLEn','requested_url':src,'final_url':src,'source_url':src,'retrieved_at':stamp,'status':'reused_existing_sample','http_status':200,'bytes':os.path.getsize(sample),'file':'person-ZPLwHGdKVYDIxLEn.html','name':person.get('name'),'current_teams':person.get('current_teams',[]),'error':None}
 rows.append(rec); open(pm,'w',encoding='utf8').write(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in rows))
# Build URL/time metadata from manifests. No page secrets are read or emitted.
legacy=[json.loads(x) for x in open(A+'/legacy-manifest.jsonl',encoding='utf8') if x.strip()]
profiles=[json.loads(x) for x in open(pm,encoding='utf8') if x.strip()]
meta_by_file={}
for r in legacy+profiles:
 if r.get('file') and r['file'].endswith('.html'):
  meta_by_file[r['file']]=r
# Existing legacy sample provenance.
legacy_sample='legacy-roster-NjOIyMLK8WSac4M1.html'
if os.path.exists(A+'/'+legacy_sample):
 mt=os.path.getmtime(A+'/'+legacy_sample); meta_by_file[legacy_sample]={'final_url':'https://pbleagues.com/cgi-bin/roster.cgi?ERID=NjOIyMLK8WSac4M1','requested_url':'https://pbleagues.com/cgi-bin/roster.cgi?ERID=NjOIyMLK8WSac4M1','retrieved_at':datetime.fromtimestamp(mt,ZoneInfo('America/New_York')).isoformat(timespec='seconds')}
# Strip unrelated signed-in header/account details, ad payloads, scripts, hidden form values, and tracking comments.
files=[]
for fn in os.listdir(A):
 if ((fn.startswith('legacy-roster-') or fn.startswith('person-') or fn.startswith('person-sample-')) and fn.endswith('.html')):
  path=A+'/'+fn
  raw=open(path,encoding='utf8',errors='replace').read()
  soup=BeautifulSoup(raw,'html.parser')
  for tag in soup.find_all(['script','input','form']): tag.decompose()
  for tag in list(soup.find_all('iframe')):
   label=(tag.get('title','')+' '+tag.get('aria-label','')).lower()
   if 'advertisement' in label or tag.get('id')=='google_esf' or tag.find_parent('ins',class_='adsbygoogle'):
    tag.decompose()
  for tag in soup.find_all('ins',class_='adsbygoogle'): tag.decompose()
  for tag in soup.find_all('meta'):
   if (tag.get('http-equiv','').lower()=='origin-trial'): tag.decompose()
  for tag in list(soup.find_all(id=['appaInnerHeaderLoginBox','appaLoginBoxContainer'])): tag.decompose()
  for tag in list(soup.find_all('a')):
   if tag.get_text(' ',strip=True).lower()=='logout':
    parent=tag.find_parent('li')
    (parent or tag).decompose()
  for tag in soup.find_all(True):
   for attr in list(tag.attrs):
    if attr.lower().startswith('on'): del tag.attrs[attr]
  for node in soup.find_all(string=lambda v:isinstance(v,Comment)): node.extract()
  r=meta_by_file.get(fn,{})
  head=f"<!-- source: {r.get('final_url') or r.get('source_url') or ''}; requested: {r.get('requested_url') or r.get('source_url') or ''}; retrieved: {r.get('retrieved_at') or ''} -->\n"
  with open(path,'w',encoding='utf8',newline='') as f:f.write(head+str(soup))
  files.append(fn)
# Redact signed-in menu text/links from the two safe accessibility snapshots, preserving roster content.
for fn in os.listdir(A):
 if fn.startswith('legacy-roster-') and fn.endswith('.aria.txt'):
  path=A+'/'+fn; lines=open(path,encoding='utf8',errors='replace').read().splitlines(); cleaned=[]
  for line in lines:
   low=line.lower()
   if any(s in low for s in ['welcome,','your classification','your profile','your teams','your schedule','quick links:','check class for specific league','manage your teams','logout','/cgi-bin/playerprofile.cgi?epid=jtzen10ba0xjeyhu','/cgi-bin/teamprofile.cgi']): continue
   cleaned.append(line)
  open(path,'w',encoding='utf8').write('\n'.join(cleaned)+'\n')
print(json.dumps({'sanitized_html_files':len(files),'account_header_removed':True,'ad_iframes_scripts_hidden_inputs_removed':True,'profile_sample_canonical':os.path.exists(canonical)}))
