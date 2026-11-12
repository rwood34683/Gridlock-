"""Portable deliverable excludes raw browser captures and transport containers.
Raw captures remain untouched on box; package includes sanitized source views.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib,zipfile,html
import pymupdf as fitz
P=Path(__file__).parent
rows=json.loads((P/'sources.json').read_text());views=P/'clean-source-views';views.mkdir(exist_ok=True);manifest=[];created=[]
old=json.loads((P/'clean-source-views.json').read_text()) if (P/'clean-source-views.json').exists() else []
cache={r['source_id']:r for r in old}
for r in rows:
 f=P/r['local_file']
 if not f.exists():continue
 cached=cache.get(r['source_id'])
 if cached and cached['original_sha256']==r['sha256']:
  prior=P/cached['clean_view']
  if prior.exists() and hashlib.sha256(prior.read_bytes()).hexdigest()==cached['clean_view_sha256']:
   manifest.append(cached);continue
 if f.suffix.lower()=='.pdf':
  with fitz.open(f) as doc:plain='\n\n'.join(pg.get_text('text',sort=True) for pg in doc)
  content=('<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Source PDF text derivative</h1><pre>'+html.escape(plain)+'</pre></body></html>').encode();suffix='.html'
 elif f.suffix.lower() in ['.html','.htm']:
  s=BeautifulSoup(f.read_text(errors='replace'),'html.parser')
  for node in s.select('script,input,textarea,select,iframe,object,embed'):node.decompose()
  for form in s.select('form'):form.unwrap()
  for node in s.find_all(True):
   for key in list(node.attrs):
    if key.lower().startswith('on'):del node.attrs[key]
  content=str(s).encode();suffix='.html'
 else:content=f.read_bytes();suffix=f.suffix
 dest=views/(str(r['source_id'])+suffix);dest.write_bytes(content);created.append(dest)
 manifest.append(dict(source_id=r['source_id'],source_url=r['url'],retrieved_at=r['retrieved_at'],original_file=r['local_file'],original_sha256=r['sha256'],clean_view=str(dest.relative_to(P)),clean_view_sha256=hashlib.sha256(content).hexdigest(),note='Sanitized derivative; source hashes in SQLite refer to preserved originals on box.'))
(P/'clean-source-views.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
p=P/'README.md';body=p.read_text().split('\n## Portable source safety\n')[0];body+='\n## Portable source safety\n\nRaw browser captures remain unchanged on the box and are NOT included in this portable ZIP. `clean-source-views/` contains source views with scripts, form controls, iframes and event handlers removed. `clean-source-views.json` maps every original source ID/URL/time/hash to its separately hashed sanitized derivative. SQLite source paths/hashes document original captures; use this mapping for portable source viewing. No cookies, session files, credentials, hidden form controls or browser transport PDFs are packaged.\n';p.write_text(body)
zpath=P/'world-cup-2026.zip';tmp=P/'world-cup-2026.zip.tmp'
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(P.rglob('*')):
  if not f.is_file() or f in [zpath,tmp] or '__pycache__' in str(f):continue
  rel=f.relative_to(P)
  if rel.parts[0] in ['authenticated','sources','player-profile-samples']:continue
  if f.suffix in ['.pdf','.tmp']:continue
  z.write(f,'world-cup-2026/'+str(rel))
with zipfile.ZipFile(tmp) as z:assert z.testzip() is None
# Ensure sanitized views contain neither scripts nor hidden/input form controls.
assert all(not BeautifulSoup(f.read_text(errors='replace'),'html.parser').select('script,input,textarea,select,iframe,form') for f in created if f.suffix=='.html')
tmp.replace(zpath);print('CLEAN ZIP',zpath,zpath.stat().st_size,'bytes',len(manifest),'sanitized views')
