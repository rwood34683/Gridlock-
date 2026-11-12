/* coachplay — the coach app's Tally and Scout, for the Player preview (owner,
   12 Nov 2026: "the same functionality as the coach's app", nothing more than
   the screens the preview already has). Inserted by tools/teaser_rules.js
   between the coachplay markers, Player only; edit it here.

   Tally is the coach's break chart: one match at a time against who you play,
   a point that counts from one inside it, the score from We won it / They
   won it, Back a point and Next point, right or wrong read, and the two steps
   — 1 · Where they went (a tap a man, yours or theirs by the half it lands
   in, no more than five a side) and 2 · What happened (the man's sheet:
   yours or theirs, who, made it or shot on the break and from where, how he
   got in, which way he was shooting and at what, delayed, moved to and late,
   with the route drawn for him round the bunkers in the way). It opens on
   step 2. Where the points come from and the point's log sit under it.
   Scout's Matchup, Breakouts, Layers and Games read the same sheets: their
   five and their call logged on Breakouts, their outs and rotations and yours
   on Layers, every sheet against them point by point on Games.
   Every number is a count of what was logged here. Kept on this phone under
   the Player app's own keys; nothing is sent anywhere. */
var CP_KEY='gridlock_sheets',CP_SIDE=5,CP_DIRS=[[-135,'↖'],[-90,'↑'],[-45,'↗'],[180,'←'],[null,'off'],[0,'→'],[135,'↙'],[90,'↓'],[45,'↘']];
var cpStep='tell',cpDraft=null,cpPickFor='',cpRead='',cpTheirPick=[],cpTheirHist=[],cpGame=null,cpLy={theirOuts:true,ourOuts:true,ourMoves:true,theirMoves:true},cpRoutes={};
function cpEmpty(){return {matches:[],matchId:'',point:1,results:[],rows:[],theirs:[]};}
function cpLoad(){try{const o=JSON.parse(localStorage.getItem(CP_KEY)||'null');if(o&&Array.isArray(o.matches)){['results','rows','theirs'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[];});return o;}}catch(e){}return cpEmpty();}
var SH=cpLoad();
function cpRedraw(){if(MODE==='tally')cpTally();else if(MODE==='scout')renderScout();}
function cpSave(){try{localStorage.setItem(CP_KEY,JSON.stringify(SH));return true;}catch(e){gToast('This phone would not keep that.');return false;}}
function cpId(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function cpPit(){return (typeof Rsel!=='undefined'&&Rsel&&Rsel.ti>=0)?teamName(Rsel):'';}
function cpMatch(){let m=SH.matches.find(x=>x.id===SH.matchId);if(!m){m={id:cpId('m'),at:Date.now(),vs:'',lay:layoutKey};SH.matches.push(m);SH.matchId=m.id;SH.point=1;cpSave();}return m;}
function cpLogged(mid){return SH.rows.some(r=>r.m===mid)||SH.results.some(r=>r.m===mid)||SH.theirs.some(r=>r.m===mid);}
function cpVs(){const m=cpMatch();if(!m.vs&&cpPit()&&!cpLogged(m.id)){m.vs=cpPit();m.lay=layoutKey;cpSave();}return m.vs;}
function cpOffField(){const m=cpMatch();return m.lay&&m.lay!==layoutKey&&cpLogged(m.id);}
function cpScore(mid){let us=0,them=0;SH.results.forEach(r=>{if(r.m===mid){if(r.won==='us')us++;else if(r.won==='them')them++;}});return {us,them};}
function cpResult(mid,pt){return SH.results.find(r=>r.m===mid&&r.pt===pt)||null;}
function cpRowsAt(mid,pt){return SH.rows.filter(r=>r.m===mid&&r.pt===pt);}
function cpTag(r){return r.who?(/^\d+$/.test(r.who)?'#'+r.who:r.who):'';}
function cpBunker(id){return BUN.find(b=>b.id===id)||null;}
function cpSideOf(id){const b=cpBunker(id);return b&&b.x>75?'them':'us';}
function cpOurNames(){const seen=[];try{linesAll().forEach(l=>(l.spots||[]).forEach(s=>{const n=String(s.player||'').trim();if(n&&!seen.includes(n))seen.push(n);}));}catch(e){}return seen.slice(0,12);}
function cpWho(side){if(side==='us'){const n=cpOurNames();if(n.length)return n;}return ['1','2','3','4','5'];}
function cpFieldTap(e){let id=bidFromTarget(e.target);if(id==null){const fp=fieldPointFromEvent(e);if(fp){const h=tallyPickNearest(fp.fx,fp.fy);if(h)id=h.id;}}return id;}
/* the route, drawn for him: from his goal line to the bunker he broke to, then
   to the one he moved to, round the bunkers in the way (one corner a leg). */
function cpLeg(a,b,ex){if(losClear(a[0],a[1],b[0],b[1],ex))return [b];let best=null,bl=1e9;
  for(let x=4;x<=146;x+=4)for(let y=4;y<=116;y+=4){const c=[x,y];if(!losClear(a[0],a[1],x,y,ex)||!losClear(x,y,b[0],b[1],ex))continue;const l=Math.hypot(x-a[0],y-a[1])+Math.hypot(b[0]-x,b[1]-y);if(l<bl){bl=l;best=c;}}
  return best?[best,b]:[b];}
function cpRoute(r){const b=cpBunker(r.bid);if(!b)return [];const k=layoutKey+'|'+r.side+'|'+r.bid+'|'+(r.moved||'');if(cpRoutes[k])return cpRoutes[k];
  const ex=new Set([BUN.indexOf(b)]),start=[r.side==='them'?148:2,clamp(b.y,8,112)];let pts=[start].concat(cpLeg(start,[b.x,b.y],ex));
  const mv=cpBunker(r.moved);if(mv){ex.add(BUN.indexOf(mv));pts=pts.concat(cpLeg([b.x,b.y],[mv.x,mv.y],ex));}
  return cpRoutes[k]=pts;}
function cpDrawRoute(r,col,op){const pts=cpRoute(r);if(pts.length<2)return;const d='M '+pts.map(p=>X(p[0])+' '+Y(p[1])).join(' L ');
  el('path',{d,fill:'none',stroke:'#0b0c0d','stroke-width':1.6,opacity:op,'stroke-linejoin':'round','pointer-events':'none'});
  el('path',{d,fill:'none',stroke:col,'stroke-width':.8,opacity:op,'stroke-linejoin':'round','stroke-dasharray':r.delay?'1.6 1.2':'','pointer-events':'none'});}
function cpMan(b,k,col,told,label,ring){const dx=(k-1)*3.4;
  el('rect',{x:X(b.x)-1.7+dx,y:Y(b.y)-1.7,width:3.4,height:3.4,rx:.5,fill:told?col:'#0b0c0d',stroke:ring?'#ffffff':col,'stroke-width':ring?.7:.5,'pointer-events':'none'});
  if(label){const t=el('text',{x:X(b.x)+dx,y:Y(b.y)+1,fill:'#efedeb','font-size':2.2,'text-anchor':'middle','font-weight':800,'pointer-events':'none'});t.textContent=label;}}
function cpStrip(){const m=cpMatch(),vs=cpVs(),s=cpScore(m.id);
  return `<div class="iqrow" style="border-color:#3a3f40;margin-bottom:6px"><div style="font-size:12px;color:#ff5a52">${vs?'vs '+hesc(vs):'No opponent yet'} · point ${SH.point} · <b style="color:#efedeb">${s.us}–${s.them}</b></div><div class="row" style="gap:5px;margin-top:5px;flex-wrap:wrap"><button type="button" class="ld" data-cp="back" ${SH.point>1?'':'aria-disabled="true"'}>‹ Point ${Math.max(1,SH.point-1)}</button><button type="button" class="ld" data-cp="next">Next point</button><button type="button" class="ld" data-cp="new">New match</button></div></div>`;}
function cpNeedOpp(){if(cpVs())return false;gToast('Pick who you play in the right pit first.');return true;}
function cpWire(P,after){P.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{const a=b.dataset.cp;
  if(a==='back')cpBack();else if(a==='next')cpNext();else if(a==='new')cpNew();else if(a==='won')cpEnd('us');else if(a==='lost')cpEnd('them');
  else if(a==='right'||a==='wrong'){cpRead=cpRead===a?'':a;}
  else if(a==='where'||a==='tell'){cpStep=a;cpDraft=null;cpPickFor='';if(a==='tell')cpOpenNext(true);}
  else if(a==='opp'){setMode('scout');scView='matchup';renderScout();return;}
  after();});}
function cpEnd(won){if(cpNeedOpp()||cpOffField())return;const m=cpMatch();if(cpResult(m.id,SH.point)){gToast('Point '+SH.point+' already has a winner.');return;}
  SH.results.push({m:m.id,pt:SH.point,won,read:cpRead});SH.point++;cpRead='';cpDraft=null;cpPickFor='';cpTheirPick=[];cpTheirHist=[];cpSave();
  const s=cpScore(m.id);gToast((won==='us'?'You won point ':'They won point ')+(SH.point-1)+' · '+s.us+'–'+s.them);}
function cpBack(){if(SH.point<=1){gToast('This is point 1.');return;}const m=cpMatch();SH.point--;const r=cpResult(m.id,SH.point);
  if(r){SH.results=SH.results.filter(x=>x!==r);cpRead=r.read||'';}cpDraft=null;cpPickFor='';cpTheirPick=[];cpSave();gToast('Back on point '+SH.point+(r?' · its result is taken off':''));}
function cpNext(){if(cpNeedOpp())return;SH.point++;cpRead='';cpDraft=null;cpPickFor='';cpTheirPick=[];cpSave();gToast('Point '+SH.point+', no result on the last');}
function cpNew(){const m=cpMatch();if(!cpLogged(m.id)){m.vs='';m.at=Date.now();m.lay=layoutKey;}else{const n={id:cpId('m'),at:Date.now(),vs:'',lay:layoutKey};SH.matches.push(n);SH.matchId=n.id;}
  SH.point=1;cpRead='';cpDraft=null;cpPickFor='';cpTheirPick=[];cpTheirHist=[];if(typeof Rsel!=='undefined'){Rsel={di:0,ti:-1};}if(typeof Lsel!=='undefined'){Lsel={di:0,ti:-1};}cpSave();gToast('New match. Pick who you play.');}
function cpPlace(id){if(cpNeedOpp()||cpOffField())return false;const m=cpMatch(),side=cpSideOf(id),here=cpRowsAt(m.id,SH.point).filter(r=>r.side===side);
  if(here.length>=CP_SIDE){gToast((side==='us'?'Your':'Their')+' five are all charted on point '+SH.point+'.');return false;}
  const r={id:cpId('b'),m:m.id,pt:SH.point,lay:layoutKey,vs:m.vs,side,bid:id,who:'',made:null,from:'',entry:'',dir:null,at:'',delay:false,moved:'',late:false,todo:true};SH.rows.push(r);cpSave();return r;}
function cpUntold(){const m=cpMatch();return cpRowsAt(m.id,SH.point).filter(r=>r.todo&&(MODE!=='scout'||r.side==='them'));}
function cpOpen(r){cpDraft=Object.assign({},r);cpPickFor='';}
function cpOpenNext(quiet){const u=cpUntold();if(u.length){cpOpen(u[0]);return true;}cpDraft=null;if(!quiet)gToast('Everyone placed on point '+SH.point+' is told.');return false;}
function cpTallyTap(e){const id=cpFieldTap(e);if(id==null)return;
  if(cpDraft&&cpPickFor){if(id===cpDraft.bid){gToast('That is the bunker he broke to.');return;}cpDraft[cpPickFor]=id;cpPickFor='';cpTally();return;}
  if(cpStep==='where'){const r=cpPlace(id);if(r)gToast((r.side==='us'?'Yours':'Theirs')+' on '+bLabelId(id));cpTally();return;}
  const u=!(cpDraft&&cpDraft.bid===id)&&cpUntold().find(r=>r.bid===id);if(u){cpOpen(u);cpTally();return;}
  const r=cpPlace(id);if(r){cpOpen(r);if(cpRowsAt(r.m,r.pt).filter(x=>x.bid===id).length>1)gToast('Man '+cpRowsAt(r.m,r.pt).filter(x=>x.bid===id).length+' on '+bLabelId(id));}cpTally();}
function cpLog(){const d=cpDraft;if(!d)return;if(d.moved&&d.moved===d.bid){gToast('Moved to is the bunker he broke to.');return;}if(d.from&&d.from===d.bid){gToast('Shot from is the bunker he broke to.');return;}
  if(d.who&&cpRowsAt(d.m,d.pt).some(r=>r.id!==d.id&&r.side===d.side&&r.who===d.who)){gToast(cpTag(d)+' is already charted on point '+d.pt+'.');return;}
  if(d.made==null)d.made=true;d.todo=false;const i=SH.rows.findIndex(r=>r.id===d.id);if(i>=0)SH.rows[i]=d;else SH.rows.push(d);cpSave();
  gToast('Logged '+(cpTag(d)||(d.side==='us'?'your man':'their man'))+' · '+bLabelId(d.bid)+(d.made?' · made it':' · shot on the break'));cpDraft=null;cpPickFor='';cpOpenNext(true);}
function cpOff(id){SH.rows=SH.rows.filter(r=>r.id!==id);if(cpDraft&&cpDraft.id===id)cpDraft=null;cpSave();}
function cpSheet(){const d=cpDraft,b=cpBunker(d.bid),opp=hesc(cpMatch().vs||'Theirs'),chip=(on,attr,txt,lab)=>`<button type="button" class="ld ${on?'on':''}" ${attr} aria-pressed="${!!on}"${lab?' aria-label="'+lab+'"':''}>${txt}</button>`;
  const others=BUN.filter(x=>x.id!==d.bid),opt=(v)=>'<option value="">—</option>'+others.map(x=>`<option value="${x.id}" ${v===x.id?'selected':''}>${hesc(bLabelId(x.id))}</option>`).join('');
  let h=`<div id="cpSheet" class="iqrow" style="border-color:#efedeb;margin:6px 0"><div class="row" style="justify-content:space-between;align-items:center"><b style="font-size:13px">${hesc(bLabelId(d.bid))} · point ${d.pt}</b><button type="button" class="ld" data-cs="done">Done</button></div>`;
  h+=`<div class="row" style="gap:5px;margin:5px 0">${chip(d.side==='us','data-cs="us"','Your player')}${chip(d.side==='them','data-cs="them"',opp)}</div>`;
  h+=`<div class="lbl">Who</div><div class="row" style="gap:4px;flex-wrap:wrap">${chip(!d.who,'data-who=""','No name')}${cpWho(d.side).map(n=>chip(d.who===n,'data-who="'+hesc(n)+'"',/^\d+$/.test(n)?'#'+n:hesc(n))).join('')}</div>`;
  h+=`<div style="font-size:11px;color:#ff5a52;margin:3px 0">Tap his name and he is logged made it. Shot on the break, or more to say? Answer that first, then his name.</div>`;
  h+=`<div class="lbl">Did he make it?</div><div class="row" style="gap:5px">${chip(d.made===true,'data-cs="made"','Made it')}${chip(d.made===false,'data-cs="shot"','Shot on the break')}</div>`;
  if(d.made===false)h+=`<div class="lbl">Shot from</div><div class="row" style="gap:4px"><select id="cpFrom" style="flex:1" aria-label="Shot from">${opt(d.from)}</select>${chip(cpPickFor==='from','data-pf="from"','Tap the field')}</div>`;
  h+=`<div class="lbl">How did he get in?</div><div class="row" style="gap:5px">${chip(d.entry==='battle','data-ce="battle"','Battling in')}${chip(d.entry==='clean','data-ce="clean"','No pressure')}</div>`;
  h+=`<div class="lbl">Shooting which way?</div><div style="display:grid;grid-template-columns:repeat(3,44px);gap:4px">${CP_DIRS.map(([v,g])=>chip(d.dir===v&&v!=null||(v==null&&d.dir==null),'data-cd="'+(v==null?'':v)+'"',g,v==null?'Not shooting':'Shooting '+g)).join('')}</div>`;
  h+=`<div class="lbl">Shooting at</div><div class="row" style="gap:4px"><select id="cpAt" style="flex:1" aria-label="Shooting at">${opt(d.at)}</select>${chip(cpPickFor==='at','data-pf="at"','Tap the field')}</div>`;
  h+=`<div class="lbl">Timing</div><div class="row">${chip(d.delay,'data-cs="delay"','Delayed break')}</div>`;
  h+=`<div class="lbl">Moved to</div><div class="row" style="gap:4px"><select id="cpMoved" style="flex:1" aria-label="Moved to">${opt(d.moved)}</select>${chip(cpPickFor==='moved','data-pf="moved"','Tap the field')}${d.moved?chip(d.late,'data-cs="late"','Late'):''}</div>`;
  h+=`<div class="lbl">Route</div><div style="font-size:11px;color:#ff5a52">Drawn for you, around the bunkers in the way, from the bunker he broke to.</div>`;
  h+=`<div class="row" style="gap:5px;margin-top:6px;position:sticky;bottom:0;background:#161818;padding:4px 0"><button type="button" class="ld on" data-cs="log" style="flex:1">✓ Log this breakout</button><button type="button" class="ld" data-cs="off">Take him off</button></div></div>`;
  return h;}
function cpSheetWire(P){const d=cpDraft;if(!d)return;const up=()=>cpRedraw();
  P.querySelectorAll('[data-cs]').forEach(b=>b.onclick=()=>{const a=b.dataset.cs;
    if(a==='done'){cpDraft=null;cpPickFor='';}else if(a==='us'||a==='them'){d.side=a;d.who='';}else if(a==='made'){d.made=d.made===true?null:true;d.from='';}else if(a==='shot'){d.made=d.made===false?null:false;}
    else if(a==='delay')d.delay=!d.delay;else if(a==='late')d.late=!d.late;else if(a==='log'){cpLog();}else if(a==='off'){cpOff(d.id);gToast('Taken off.');cpOpenNext(true);}up();});
  P.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>{d.who=b.dataset.who;if(d.who)cpLog();up();});
  P.querySelectorAll('[data-ce]').forEach(b=>b.onclick=()=>{d.entry=d.entry===b.dataset.ce?'':b.dataset.ce;up();});
  P.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>{const v=b.dataset.cd;d.dir=v===''?null:+v;up();});
  P.querySelectorAll('[data-pf]').forEach(b=>b.onclick=()=>{cpPickFor=cpPickFor===b.dataset.pf?'':b.dataset.pf;up();});
  [['cpFrom','from'],['cpAt','at'],['cpMoved','moved']].forEach(([i,k])=>{const s=P.querySelector('#'+i);if(s)s.onchange=()=>{d[k]=s.value;if(k==='moved'&&!s.value)d.late=false;up();};});}
/* Where the points come from: each bunker your five broke to on this field,
   how often, how often he made it, and the points won less lost with a man
   of yours there (each point once a bunker). */
function cpValue(){const out={},seen={};SH.rows.forEach(r=>{if(r.lay!==layoutKey||r.side!=='us'||r.todo)return;const o=out[r.bid]||(out[r.bid]={n:0,made:0,won:0,lost:0});o.n++;if(r.made)o.made++;
  const k=r.bid+'|'+r.m+'|'+r.pt;if(seen[k])return;seen[k]=1;const res=cpResult(r.m,r.pt);if(res){if(res.won==='us')o.won++;else o.lost++;}});return out;}
function cpTally(){if(MODE!=='tally')return;field();cpGround();svg.onclick=cpTallyTap;const m=cpMatch(),vs=cpVs(),s=cpScore(m.id),here=cpRowsAt(m.id,SH.point),val=cpValue();
  BUN.forEach(b=>{const v=val[b.id];if(!v)return;const net=v.won-v.lost,col=net>0?'#3ecf8e':net<0?'#e0a33a':'#3a3f40';el('circle',{cx:X(b.x),cy:Y(b.y),r:3.6,fill:'none',stroke:col,'stroke-width':1.1,opacity:.9,'pointer-events':'none'});
    el('text',{x:X(b.x),y:Y(b.y)-4.5,fill:col,'font-size':2.5,'text-anchor':'middle','font-weight':800,'pointer-events':'none'}).textContent=v.n;});
  const seen={};here.forEach((r,i)=>{if(!r.todo)cpDrawRoute(r,r.side==='us'?'#e5342f':'#3d8bff',cpDraft&&cpDraft.id===r.id?1:.7);});
  {const c={us:0,them:0};cpSquares(here.map(r=>({id:r.bid,col:r.side==='us'?'#e5342f':'#3d8bff',n:++c[r.side],shot:r.made===false&&!r.todo,ring:!!(cpDraft&&cpDraft.id===r.id)})));}
  if(cpDraft){[['at','#ffffff'],['moved','#efedeb'],['from','#ff5a52']].forEach(([k,c])=>{const b=cpBunker(cpDraft[k]);if(b)el('circle',{cx:X(b.x),cy:Y(b.y),r:4.2,fill:'none',stroke:c,'stroke-width':.8,'stroke-dasharray':'1.2 .8','pointer-events':'none'});});
    if(cpDraft.todo===false||cpDraft.made!=null)cpDrawRoute(cpDraft,cpDraft.side==='us'?'#e5342f':'#3d8bff',1);}
  const lg=document.getElementById('legend');if(lg)lg.innerHTML=cpPickFor?'<span>Tap the bunker for '+(cpPickFor==='at'?'Shooting at':cpPickFor==='moved'?'Moved to':'Shot from')+'.</span>':'<span>A green ring wins you points on this field, amber costs you. The number is how often your five have broken to it.</span>';
  const us=here.filter(r=>r.side==='us').length,th=here.filter(r=>r.side==='them').length,un=here.filter(r=>r.todo).length;
  let h=`<div class="lbl">Break chart</div>`;
  if(cpOffField())h+=`<div class="iqrow" style="border-color:#e5252a;font-size:12px">This sheet was played on another field. Pick that event again, or start a New match here.</div>`;
  if(!vs){h+=`<div class="iqrow" style="border-color:#efedeb"><b>Who are you playing?</b><div style="font-size:12px;color:#ff5a52;margin:3px 0">Put them in the right pit on Scout › Matchup and the sheet is against them.</div><button type="button" class="ld on" data-cp="opp">Pick who you play</button></div>`;}
  h+=`<div style="font-size:22px;font-weight:900;margin:2px 0">${s.us}–${s.them} <span style="font-size:13px;color:#ff5a52;font-weight:700">You v ${vs?hesc(vs):'—'} · point ${SH.point}</span></div><div style="font-size:12px;color:#efedeb;margin-bottom:6px">${us} yours · ${th} theirs · ${here.length-un} logged this point${un?' · '+un+' still to tell':''}</div>`;
  h+=`<div class="row" role="group" aria-label="Logging step" style="gap:5px;margin-bottom:5px"><button type="button" class="ld ${cpStep==='where'?'on':''}" data-cp="where" aria-pressed="${cpStep==='where'}" style="flex:1">1 · Where they went</button><button type="button" class="ld ${cpStep==='tell'?'on':''}" data-cp="tell" aria-pressed="${cpStep==='tell'}" style="flex:1">2 · What happened${un?' ('+un+')':''}</button></div>`;
  h+=`<div style="font-size:12px;color:#ff5a52;margin-bottom:5px">${cpStep==='where'?'Off the buzzer, tap the bunker each man broke to — one tap a man, so two on one bunker is two taps. Yours or theirs by the half it lands in. ✕ in the list takes a man off.':'Tap the bunker a man broke to and his sheet opens. Tap his name and he is logged made it.'}</div>`;
  if(here.length){h+=`<div class="row" style="flex-wrap:wrap;gap:4px;margin-bottom:5px">`+here.map(r=>`<span style="display:inline-flex;gap:2px"><button type="button" class="ld ${cpDraft&&cpDraft.id===r.id?'on':''}" data-cr="${r.id}">${r.side==='us'?'Yours':'Theirs'} · ${hesc(bLabelId(r.bid))}${cpTag(r)?' · '+hesc(cpTag(r)):''}${r.todo?' · to tell':r.made?' ✓':' ✕ shot'}</button><button type="button" class="ld" data-cx="${r.id}" aria-label="Take this man off">✕</button></span>`).join('')+`</div>`;}
  if(cpDraft)h+=cpSheet();
  h+=`<div class="lbl" style="margin-top:6px">Point sheet</div><div class="row" style="gap:5px">${['right','wrong'].map(k=>`<button type="button" class="ld ${cpRead===k?'on':''}" data-cp="${k}" aria-pressed="${cpRead===k}" style="flex:1">${k==='right'?'✓ Right read':'✗ Wrong read'}</button>`).join('')}</div>`;
  h+=`<div class="row" style="gap:5px;margin-top:5px"><button type="button" class="ld" data-cp="back" aria-label="Back a point">‹ ${Math.max(1,SH.point-1)}</button><button type="button" class="ld" data-cp="won" style="flex:1;background:#ad1515;border-color:#e5252a;color:#fff">We won it</button><button type="button" class="ld" data-cp="lost" style="flex:1;background:#3d8bff;border-color:#3d8bff;color:#fff">They won it</button></div>`;
  h+=`<div class="row" style="gap:5px;margin-top:5px"><button type="button" class="ld" data-cp="next" style="flex:1">Next point, no result</button><button type="button" class="ld" data-cp="new">New match</button></div>`;
  const reads=SH.results.filter(r=>r.m===m.id&&r.read),rr=reads.filter(r=>r.read==='right').length;if(reads.length)h+=`<div style="font-size:11px;color:#ff5a52;margin-top:4px">Reads this match: ${rr} right · ${reads.length-rr} wrong · ${Math.round(100*rr/reads.length)}% right.</div>`;
  const rows=Object.entries(val).map(([id,v])=>({id,...v,net:v.won-v.lost})).sort((a,b)=>b.net-a.net||b.n-a.n);
  h+=`<div class="lbl" style="margin-top:9px">Where the points come from</div>`;
  h+=rows.length?`<table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr><th style="text-align:left">Bunker</th><th>Breaks</th><th>Made it</th><th>Net points</th></tr></thead><tbody>`+rows.map(r=>`<tr style="border-top:1px solid #26292a"><td>${hesc(bLabelId(r.id))}</td><td style="text-align:center">${r.n}</td><td style="text-align:center">${Math.round(100*r.made/r.n)}%</td><td style="text-align:center;font-weight:800;color:${r.net>0?'#2ec76b':r.net<0?'#e0503a':'#ff5a52'}">${r.net>0?'+':''}${r.net}</td></tr>`).join('')+`</tbody></table>`:`<div style="font-size:12px;color:#ff5a52">Nothing charted on this field yet. Tap a bunker on the field above the moment a man breaks to it.</div>`;
  const logd=here.filter(r=>!r.todo);h+=`<div class="lbl" style="margin-top:9px">Log · point ${SH.point}</div>`+(logd.length?logd.map(r=>`<div class="row" style="gap:5px;align-items:center;font-size:12px;margin-bottom:3px"><span style="flex:1">${r.side==='us'?'Yours':hesc(vs||'Theirs')} · ${hesc(bLabelId(r.bid))}${cpTag(r)?' · '+hesc(cpTag(r)):''} · ${r.made?'made it':'shot on the break'+(r.from?' from '+hesc(bLabelId(r.from)):'')}${r.moved?' · moved to '+hesc(bLabelId(r.moved))+(r.late?' late':''):''}</span><button type="button" class="ld" data-cr="${r.id}">Fix</button><button type="button" class="ld" data-cx="${r.id}">Undo</button></div>`).join(''):`<div style="font-size:12px;color:#ff5a52">Nothing logged on point ${SH.point} yet.</div>`);
  const P=document.getElementById('panel');P.innerHTML=h;cpWire(P,cpTally);cpSheetWire(P);
  P.querySelectorAll('[data-cr]').forEach(b=>b.onclick=()=>{const r=SH.rows.find(x=>x.id===b.dataset.cr);if(r){cpStep='tell';cpOpen(r);}cpTally();});
  P.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>{cpOff(b.dataset.cx);cpTally();});
  if(cpDraft&&innerWidth<900){const f=document.querySelector('.fieldbox');if(f&&f.getBoundingClientRect().bottom<0)f.scrollIntoView({block:'start'});}}
/* ---------- Scout ---------- */
function cpTheirs(team){return SH.theirs.filter(t=>t.team===team&&t.lay===layoutKey);}
function cpCalls(){return Object.keys(playSet()).map(k=>[k,playName(k)]);}
function cpFiveNow(team){const m=cpMatch();const t=SH.theirs.find(x=>x.team===team&&x.m===m.id&&x.pt===SH.point&&x.plants&&x.plants.length);if(t)return t.plants;
  return cpRowsAt(m.id,SH.point).filter(r=>r.side==='them').map(r=>r.bid);}
function cpLogTheir(team,patch){const m=cpMatch(),on=m.vs===team,key=on?{m:m.id,pt:SH.point}:{m:'',pt:0};
  let t=on?SH.theirs.find(x=>x.team===team&&x.m===m.id&&x.pt===SH.point):null;if(!t){t={id:cpId('t'),team,lay:layoutKey,call:'',plants:[],...key,at:Date.now()};SH.theirs.push(t);}Object.assign(t,patch);cpSave();return t;}
function cpPlaceFive(plants){const m=cpMatch();const have=cpRowsAt(m.id,SH.point).filter(r=>r.side==='them').map(r=>r.bid);const left=have.slice();
  plants.forEach(id=>{const i=left.indexOf(id);if(i>=0){left.splice(i,1);return;}if(cpRowsAt(m.id,SH.point).filter(r=>r.side==='them').length>=CP_SIDE)return;
    SH.rows.push({id:cpId('b'),m:m.id,pt:SH.point,lay:layoutKey,vs:m.vs,side:'them',bid:id,who:'',made:null,from:'',entry:'',dir:null,at:'',delay:false,moved:'',late:false,todo:true});});cpSave();}
function cpNoPit(){gToast('Pick who you play in the right pit first, then tap where they went.');const s=document.querySelector('#sideR .pickSel');if(s){s.scrollIntoView({block:'center',behavior:'smooth'});try{s.focus({preventScroll:true});}catch(e){}}}
function cpScoutTap(e){const id=cpFieldTap(e);if(id==null)return;const team=cpPit();if(!team){cpNoPit();return;}
  if(scView==='log'&&cpDraft){if(cpPickFor){if(id===cpDraft.bid){gToast('That is the bunker he broke to.');return;}cpDraft[cpPickFor]=id;cpPickFor='';renderScout();return;}
    const u=cpDraft.bid!==id&&cpUntold().find(r=>r.bid===id);if(u){cpOpen(u);renderScout();return;}}
  if(cpTheirPick.length>=CP_SIDE){gToast('Five placed. ✕ one to move him, or Log their five.');if(scView!=='log'){scView='log';renderScout();}return;}
  cpDraft=null;cpPickFor='';cpTheirHist.push(cpTheirPick.slice());cpTheirPick.push(id);if(scView!=='log'){scView='log';cpGame=null;}gToast('Their man on '+bLabelId(id)+' · '+cpTheirPick.length+' of 5');renderScout();}
function cpScoutHead(P){svg.onclick=cpScoutTap;const w=document.createElement('div');w.innerHTML=scViewToggle()+cpStrip();[...w.children].reverse().forEach(c=>P.insertBefore(c,P.firstChild));
  P.querySelectorAll('[data-scview]').forEach(b=>b.onclick=()=>{scView=b.dataset.scview;cpGame=null;if(typeof svg!=='undefined'&&svg)svg.onclick=null;renderScout();});cpWire(P,renderScout);}
function cpNoTeam(P,what){svg.onclick=cpScoutTap;P.innerHTML=`<div class="iqrow" style="border-color:#efedeb;font-size:12px">Pick who you play in the right pit and ${what}.</div>`;cpScoutHead(P);}
function cpMatchup(P){svg.onclick=cpScoutTap;cpGround();P.querySelectorAll('.iqrow').forEach(r=>{if(/NOT IN THIS PREVIEW/.test(r.textContent))r.remove();});const team=cpPit();if(!team)return;cpTallyFive(team);const five=cpFiveNow(team);
  const w=document.createElement('div');w.innerHTML=`<div class="lbl" style="margin-top:8px">Their five · point ${SH.point}</div><div style="font-size:12px;color:#ff5a52">${five.length?five.map(id=>hesc(bLabelId(id))).join(' · '):'Not logged yet. Tap where they went on Breakouts.'}</div>`;P.appendChild(w);
  P.querySelectorAll('.iqrow').forEach(r=>{if(/NOT IN THIS PREVIEW/.test(r.textContent))r.remove();});const t=document.createElement('div');t.innerHTML=cpStrip();P.insertBefore(t.firstChild,P.children[1]||null);cpWire(P,renderScout);}
/* Their five on Scout's field, drawn as the coach app's fiveSquares draws it:
   a rounded square in the pit's colour, a white edge, the man's number in
   white, over a faint dark shadow. Two or more on one bunker sit side by side. */
/* The coach app's field ground on Tally and Scout: ten dark stripes in place
   of the grid, a fine frame, a faint dashed fifty and two end lines, the red
   bar down your end line. The bunker labels stay. */
function cpGround(){if(!svg)return;const first=svg.querySelector('rect');
  svg.querySelectorAll('line[stroke="#1d2022"]').forEach(l=>l.remove());
  if(first){first.setAttribute('stroke','none');const at=first.nextSibling,add=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);svg.insertBefore(e,at);return e;};
    for(let i=1;i<10;i+=2)add('rect',{x:i*15,y:0,width:15,height:120,fill:'#0c0d0e'});
    add('rect',{x:0,y:0,width:150,height:120,fill:'none',stroke:'#33383a','stroke-width':.5,opacity:.9});
    add('line',{x1:2,y1:0,x2:2,y2:120,stroke:'#e8e8e8','stroke-width':.4,opacity:.22});add('line',{x1:148,y1:0,x2:148,y2:120,stroke:'#e8e8e8','stroke-width':.4,opacity:.22});
    add('rect',{x:-3,y:0,width:1.25,height:120,fill:'#e5342f',opacity:.8});}
  const mid=svg.querySelector('line[x1="75"][x2="75"]');if(mid){mid.setAttribute('stroke-width','.4');mid.setAttribute('stroke-dasharray','2.5 3.5');mid.setAttribute('opacity','.26');}}
function cpFive(ids,col){cpSquares(ids.map((id,i)=>({id,col,n:i+1})));}
/* One numbered square a man, each item {id, col, n, ring}; any men on one
   bunker, whichever side, stand side by side so every number can be read. */
function cpSquares(items){const r=3.1,ids=items.map(m=>m.id),many=id=>ids.filter(x=>x===id).length;
  items.forEach((m,i)=>{const id=m.id,col=m.col,b=cpBunker(id);if(!b)return;const k=ids.slice(0,i).filter(x=>x===id).length,n=many(id),x=X(b.x)+(k-(n-1)/2)*(r*2+.75),y=Y(b.y);
    if(m.ring)el('circle',{cx:x,cy:y,r:r+1.6,fill:'none',stroke:'#ffffff','stroke-width':.7,'pointer-events':'none'});
    el('rect',{x:x-r-.3,y:y-r-.3,width:r*2+.6,height:r*2+.6,rx:1.2,fill:'#000',opacity:.55,'pointer-events':'none'});
    el('rect',{x:x-r,y:y-r,width:r*2,height:r*2,rx:1,fill:col,stroke:'#efedeb','stroke-width':.65,'pointer-events':'none'});
    const t=el('text',{x,y:y+1.3,fill:'#fff','font-size':3.5,'text-anchor':'middle','font-weight':800,'pointer-events':'none'});t.textContent=m.shot?'✕':String(m.n);});}
function cpTallyFive(team){cpFive(cpFiveNow(team),'#3d8bff');}
function cpBreakouts(){field();cpGround();const P=document.getElementById('panel');const team=cpPit();if(!team){cpNoTeam(P,'their five and their call log against them');return;}
  cpFive(cpTheirPick,'#3d8bff');
  if(!cpTheirPick.length)cpTallyFive(team);
  if(cpDraft){[['at','#ffffff'],['moved','#efedeb'],['from','#ff5a52']].forEach(([k,c])=>{const b=cpBunker(cpDraft[k]);if(b)el('circle',{cx:X(b.x),cy:Y(b.y),r:4.2,fill:'none',stroke:c,'stroke-width':.8,'stroke-dasharray':'1.2 .8','pointer-events':'none'});});const b=cpBunker(cpDraft.bid);if(b)el('circle',{cx:X(b.x),cy:Y(b.y),r:4.6,fill:'none',stroke:'#ffffff','stroke-width':.9,'pointer-events':'none'});}
  const m=cpMatch(),on=m.vs===team,mine=cpTheirs(team),calls={},plants={};let n=0;
  mine.forEach(t=>{if(t.call){calls[t.call]=(calls[t.call]||0)+1;n++;}(t.plants||[]).forEach(id=>{plants[id]=(plants[id]||0)+1;});});
  const cur=on?SH.theirs.find(x=>x.team===team&&x.m===m.id&&x.pt===SH.point):null;
  let h=`<div class="lbl">1 · Where did they go? · ${hesc(team)}</div><div style="font-size:12px;color:#ff5a52;margin-bottom:4px">Tap the field where each of their five ended up, in any order — two or three on one bunker is a tap each. No names needed. Then Log their five and tell each man below.</div>`;
  h+=cpTheirPick.length?`<div class="row" style="flex-wrap:wrap;gap:4px">`+cpTheirPick.map((id,i)=>`<button type="button" class="ld" data-tx="${i}" aria-label="Take ${hesc(bLabelId(id))} off">${hesc(bLabelId(id))} ×</button>`).join('')+`</div>`:`<div style="font-size:12px;color:#efedeb">Nothing placed yet. Tap a bunker for each man — tap it again to put a second man there.</div>`;
  h+=`<div class="row" style="gap:5px;margin-top:5px"><button type="button" class="ld on" data-tb5="log" style="flex:1">Log their five · ${on?'point '+SH.point:'season'}</button><button type="button" class="ld" data-tb5="undo">↶ Undo</button><button type="button" class="ld" data-tb5="clear">Clear all</button></div>`;
  {const men=on?cpRowsAt(m.id,SH.point).filter(r=>r.side==='them'):[],left=men.filter(r=>r.todo).length;
   if(men.length){h+=`<div class="lbl" style="margin-top:9px">2 · What happened · point ${SH.point}${left?' · '+left+' to tell':''}</div><div style="font-size:12px;color:#ff5a52;margin-bottom:4px">Tap a man for his details. Logging him opens the next.</div><div class="row" style="flex-wrap:wrap;gap:4px">`+men.map(r=>`<button type="button" class="ld ${cpDraft&&cpDraft.id===r.id?'on':''}" data-cr="${r.id}">${hesc(bLabelId(r.bid))}${cpTag(r)?' · '+hesc(cpTag(r)):''}${r.todo?' · to tell':r.made?' ✓':' ✕ shot'}</button>`).join('')+`</div>`;}
   if(cpDraft)h+=cpSheet();}
  h+=`<div class="lbl" style="margin-top:9px">What they run · ${hesc(team)}</div><div style="font-size:12px;color:#ff5a52;margin-bottom:4px">Log their call as you see it. Their tendency is one word off film; this is the count behind it.</div><div class="row" style="flex-wrap:wrap;gap:4px">`+cpCalls().map(([k,nm])=>`<button type="button" class="ld ${cur&&cur.call===k?'on':''}" data-tc="${k}" aria-pressed="${!!(cur&&cur.call===k)}">${hesc(nm)}</button>`).join('')+`</div>`;
  if(!on)h+=`<div style="font-size:12px;color:#efedeb;margin-top:4px">This sheet is ${m.vs?hesc(m.vs):'not against anyone yet'}. ${hesc(team)} is not on it, so what you log here counts for the season on this field and never against a point.</div>`;
  const cs=Object.entries(calls).sort((a,b)=>b[1]-a[1]),ps=Object.entries(plants).sort((a,b)=>b[1]-a[1]);
  h+=`<div class="lbl" style="margin-top:9px">Their record</div>`+(cs.length?cs.map(([k,c])=>`<div style="font-size:12px">${hesc(playName(k))} — ${c} of ${n} logged</div>`).join(''):`<div style="font-size:12px;color:#ff5a52">Nothing logged on ${hesc(team)} yet. Tap their call above the moment you read it.</div>`);
  if(ps.length)h+=`<div class="lbl" style="margin-top:6px">Where they plant</div>`+ps.slice(0,8).map(([id,c])=>`<div style="font-size:12px">${hesc(bLabelId(id))} — ${c} of ${mine.filter(t=>t.plants&&t.plants.length).length} fives</div>`).join('');
  P.innerHTML=h;cpScoutHead(P);cpSheetWire(P);
  P.querySelectorAll('[data-cr]').forEach(b=>b.onclick=()=>{const r=SH.rows.find(x=>x.id===b.dataset.cr);if(r)cpOpen(r);cpBreakouts();const sh=document.getElementById('cpSheet');if(sh)sh.scrollIntoView({block:'start'});});
  P.querySelectorAll('[data-tx]').forEach(b=>b.onclick=()=>{cpTheirHist.push(cpTheirPick.slice());cpTheirPick.splice(+b.dataset.tx,1);cpBreakouts();});
  P.querySelectorAll('[data-tb5]').forEach(b=>b.onclick=()=>{const a=b.dataset.tb5;
    if(a==='undo'){if(cpTheirHist.length)cpTheirPick=cpTheirHist.pop();else gToast('Nothing to undo.');}
    else if(a==='clear'){cpTheirHist.push(cpTheirPick.slice());cpTheirPick=[];}
    else{if(!cpTheirPick.length){gToast('Tap where they went on the field first.');return;}const plants=cpTheirPick.slice();cpLogTheir(team,{plants});if(on)cpPlaceFive(plants);cpTheirPick=[];cpTheirHist=[];if(on)cpOpenNext(true);gToast('Their five logged'+(on?' on point '+SH.point+'. Now tell each man.':' for the season'));}
    cpBreakouts();});
  P.querySelectorAll('[data-tc]').forEach(b=>b.onclick=()=>{const k=b.dataset.tc;cpLogTheir(team,{call:k});gToast(playName(k)+' logged'+(on?' on point '+SH.point:' for the season'));cpBreakouts();});}
function cpLayers(){field();cpGround();const P=document.getElementById('panel');const team=cpPit();if(!team){cpNoTeam(P,'what you have logged against them is drawn here');return;}
  const ms=new Set(SH.matches.filter(m=>m.vs===team).map(m=>m.id)),rows=SH.rows.filter(r=>ms.has(r.m)&&r.lay===layoutKey&&!r.todo);
  const outs=s=>{const o={};rows.forEach(r=>{if(r.side===s&&r.made===false)o[r.bid]=(o[r.bid]||0)+1;});return o;},moves=s=>{const o={};rows.forEach(r=>{if(r.side===s&&r.moved){const k=r.bid+'>'+r.moved;o[k]=(o[k]||0)+1;}});return o;};
  const L={theirOuts:['Their outs',outs('them'),'#3d8bff'],ourOuts:['Your outs',outs('us'),'#e5342f'],ourMoves:['Your rotations',moves('us'),'#3ecf8e'],theirMoves:['Their rotations',moves('them'),'#3d8bff']};
  Object.entries(L).forEach(([k,[,o,c]])=>{if(!cpLy[k])return;Object.entries(o).forEach(([key,n])=>{if(key.includes('>')){const [a,b]=key.split('>').map(cpBunker);if(!a||!b)return;
      el('line',{x1:X(a.x),y1:Y(a.y),x2:X(b.x),y2:Y(b.y),stroke:'#0b0c0d','stroke-width':1.5,'pointer-events':'none'});el('line',{x1:X(a.x),y1:Y(a.y),x2:X(b.x),y2:Y(b.y),stroke:c,'stroke-width':.7,'pointer-events':'none'});
      el('circle',{cx:X(b.x),cy:Y(b.y),r:1,fill:c,'pointer-events':'none'});el('text',{x:(X(a.x)+X(b.x))/2,y:(Y(a.y)+Y(b.y))/2-1,fill:c,'font-size':2.6,'text-anchor':'middle','font-weight':800,'pointer-events':'none'}).textContent=n;}
    else{const b=cpBunker(key);if(!b)return;el('circle',{cx:X(b.x),cy:Y(b.y),r:2.6+n,fill:'none',stroke:c,'stroke-width':.9,'pointer-events':'none'});el('text',{x:X(b.x),y:Y(b.y)-3.8-n,fill:c,'font-size':2.6,'text-anchor':'middle','font-weight':800,'pointer-events':'none'}).textContent=n;}});});
  const cnt=o=>Object.values(o).reduce((a,b)=>a+b,0);
  let h=`<div class="lbl">Layers · ${hesc(team)}</div><div style="font-size:12px;color:#ff5a52;margin-bottom:5px">What you have logged against ${hesc(team)} on this field, drawn where it happened. Rings are outs, arrows are rotations — green yours, blue theirs, the number how often.</div><div class="row" style="flex-wrap:wrap;gap:4px">`+Object.entries(L).map(([k,[nm,o]])=>`<button type="button" class="ld ${cpLy[k]?"on":""}" data-ly="${k}" aria-pressed="${!!cpLy[k]}">${nm} · ${cnt(o)}</button>`).join('')+`</div>`;
  if(!rows.length)h+=`<div style="font-size:12px;color:#ff5a52;margin-top:5px">Nothing logged against ${hesc(team)} on this field yet. Outs get a bunker on the Tally tab, on the point you are on.</div>`;
  P.innerHTML=h;cpScoutHead(P);P.querySelectorAll('[data-ly]').forEach(b=>b.onclick=()=>{cpLy[b.dataset.ly]=!cpLy[b.dataset.ly];cpLayers();});}
function cpStory(m,pt){const res=cpResult(m.id,pt),before={us:0,them:0};SH.results.forEach(r=>{if(r.m===m.id&&r.pt<pt){before[r.won]++;}});
  const t=SH.theirs.find(x=>x.m===m.id&&x.pt===pt),rows=cpRowsAt(m.id,pt).filter(r=>!r.todo),out=[`Score before: ${before.us}–${before.them}`];
  if(t&&t.call)out.push('They ran '+playName(t.call));if(t&&t.plants&&t.plants.length)out.push('Their five: '+t.plants.map(bLabelId).join(' · '));
  rows.forEach(r=>out.push((r.side==='us'?'Yours':'Theirs')+' · '+bLabelId(r.bid)+(cpTag(r)?' · '+cpTag(r):'')+' · '+(r.made?'made it':'shot on the break'+(r.from?' from '+bLabelId(r.from):''))));
  out.push(res?(res.won==='us'?'You won it':'They won it')+(res.read?' · '+res.read+' read':''):'No result');return out;}
function cpGames(){field();cpGround();const P=document.getElementById('panel');const team=cpPit();if(!team){cpNoTeam(P,'every sheet against them is listed here');return;}
  const ms=SH.matches.filter(m=>m.vs===team&&cpLogged(m.id)).sort((a,b)=>b.at-a.at);let h=`<div class="lbl">Games · ${hesc(team)}</div>`;
  if(!ms.length)h+=`<div style="font-size:12px;color:#ff5a52">No game against ${hesc(team)} yet. Score a point on Tally and it shows up here.</div>`;
  ms.forEach(m=>{const s=cpScore(m.id),day=new Date(m.at).toLocaleDateString([],{month:'short',day:'numeric'});h+=`<button type="button" class="ld ${cpGame===m.id?'on':''}" data-gm="${m.id}" style="display:block;width:100%;text-align:left;margin-bottom:4px">${hesc(day)} · ${s.us}–${s.them}${m.id===SH.matchId?' · on now':''}</button>`;
    if(cpGame===m.id){const pts=new Set();SH.results.concat(SH.rows,SH.theirs).forEach(r=>{if(r.m===m.id&&r.pt)pts.add(r.pt);});[...pts].sort((a,b)=>a-b).forEach(pt=>{h+=`<div class="iqrow" style="border-color:#3a3f40;font-size:12px;margin-bottom:4px"><b>Point ${pt}</b>`+cpStory(m,pt).map(x=>`<div>${hesc(x)}</div>`).join('')+`</div>`;});}});
  P.innerHTML=h;cpScoutHead(P);P.querySelectorAll('[data-gm]').forEach(b=>b.onclick=()=>{cpGame=cpGame===b.dataset.gm?null:b.dataset.gm;cpGames();});}
