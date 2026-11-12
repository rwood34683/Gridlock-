import os,json,base64
P='/workspace/paintball/world-cup-2026'; AUTH=P+'/authenticated'; PDF='/workspace/browser-pdfs'; MAN=AUTH+'/person-profile-manifest.jsonl'
queue={x['epid']:x for x in json.load(open(AUTH+'/_person-profile-queue.json'))}
seen=set()
if os.path.exists(MAN):
 for line in open(MAN,encoding='utf8'):
  try: seen.add(str(json.loads(line)['epid']))
  except: pass
ok=0; aria=0; failed=0
for fn in sorted(os.listdir(PDF)):
 path=os.path.join(PDF,fn)
 if not fn.endswith('.pdf'): continue
 raw=open(path,'rb').read()
 if b'%PERSON_BATCH_BEGIN\n' not in raw or b'%PERSON_BATCH_END' not in raw: continue
 txt=raw.decode('latin1'); dat=txt.split('%PERSON_BATCH_BEGIN\n',1)[1].split('%PERSON_BATCH_END',1)[0]
 b64=''.join(line[1:].strip() for line in dat.splitlines() if line.startswith('%'))
 try: batch=json.loads(base64.b64decode(b64).decode('utf8'))
 except Exception as e: print('decode-error',fn,str(e));continue
 for item in batch:
  epid=str(item['epid'])
  if epid in seen: continue
  src=queue.get(epid,{})
  http=item.get('http_status'); content=item.get('html') or ''; snapshot=item.get('snapshot') or ''
  base={'epid':epid,'requested_url':item.get('requested_url') or src.get('url'),'final_url':item.get('final_url'),'retrieved_at':item.get('retrieved_at'),'http_status':http,'source_url':src.get('url'),'name':src.get('name'),'current_teams':src.get('current_teams',[]),'alternative_urls':src.get('alternative_urls',[]),'transport_pdf':fn}
  if http==200 and content:
   file=f'person-{epid}.html'; meta=f"<!-- source: {item.get('final_url') or item.get('requested_url')}; requested: {item.get('requested_url')}; retrieved: {item.get('retrieved_at')} -->\n"
   open(os.path.join(AUTH,file),'w',encoding='utf8',newline='').write(meta+content); rec={**base,'status':'ok','bytes':len(content.encode('utf8')),'file':file,'error':item.get('error')}; ok+=1
  elif snapshot:
   file=f'person-{epid}.aria.txt'; meta=f"Source: {item.get('final_url') or item.get('requested_url')}\nRetrieved: {item.get('retrieved_at')}\nSafe accessibility snapshot only; HTML unavailable.\n\n"
   open(os.path.join(AUTH,file),'w',encoding='utf8').write(meta+snapshot); rec={**base,'status':'aria_snapshot_only','bytes':len(snapshot.encode('utf8')),'file':file,'error':item.get('error')}; aria+=1
  else:
   rec={**base,'status':'failed','bytes':0,'file':None,'error':item.get('error')}; failed+=1
  with open(MAN,'a',encoding='utf8') as f:f.write(json.dumps(rec,ensure_ascii=False)+'\n')
  seen.add(epid)
print(json.dumps({'html':ok,'aria_snapshot_only':aria,'failures':failed,'manifest_records':len(seen)}))
