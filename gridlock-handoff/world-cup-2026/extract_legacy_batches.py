import os,json,base64,re,html
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
P='/workspace/paintball/world-cup-2026'; AUTH=P+'/authenticated'; PDF='/workspace/browser-pdfs'; MAN=AUTH+'/legacy-manifest.jsonl'
entries={x['entry_id']:x for x in json.load(open(P+'/rosters.json'))['rosters']}
seen=set()
if os.path.exists(MAN):
 for line in open(MAN,encoding='utf8'):
  try: seen.add(str(json.loads(line)['entry_id']))
  except: pass
written=0; failed=0
for fn in sorted(os.listdir(PDF)):
 path=os.path.join(PDF,fn)
 if not fn.lower().endswith('.pdf'): continue
 raw=open(path,'rb').read()
 if b'%ROSTER_BATCH_BEGIN\n' not in raw or b'%ROSTER_BATCH_END' not in raw: continue
 txt=raw.decode('latin1'); dat=txt.split('%ROSTER_BATCH_BEGIN\n',1)[1].split('%ROSTER_BATCH_END',1)[0]
 b64=''.join(line[1:].strip() for line in dat.splitlines() if line.startswith('%'))
 try: batch=json.loads(base64.b64decode(b64).decode('utf8'))
 except Exception as e: print('decode-error',fn,str(e));continue
 for item in batch:
  eid=str(item['entry_id'])
  if eid in seen: continue
  entry=entries.get(eid,{})
  status=item.get('http_status'); content=item.get('html') or ''
  ok=status==200 and bool(content) and 'ROSTER_BATCH' not in content
  file=f"legacy-roster-{eid}.html"
  if ok:
   meta=f"<!-- source: {item.get('final_url') or item.get('requested_url')}; requested: {item.get('requested_url')}; retrieved: {item.get('retrieved_at')} -->\n"
   with open(os.path.join(AUTH,file),'w',encoding='utf8',newline='') as f:f.write(meta+content)
   written+=1
  else: failed+=1
  ts=item.get('retrieved_at')
  rec={'entry_id':eid,'roster_id':item.get('roster_id'),'requested_url':item.get('requested_url'),'final_url':item.get('final_url'),'retrieved_at':ts,'status':'ok' if ok else 'failed','http_status':status,'bytes':len(content.encode('utf8')),'file':file if ok else None,'error':item.get('error'),'source_file':entry.get('source_file'),'team_name':entry.get('team_name'),'division':entry.get('division'),'transport_pdf':fn}
  with open(MAN,'a',encoding='utf8') as f:f.write(json.dumps(rec,ensure_ascii=False)+'\n')
  seen.add(eid)
print(json.dumps({'new_html':written,'failures':failed,'manifest_records':len(seen)},ensure_ascii=False))
