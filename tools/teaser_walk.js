/* coachwalk — the coach app's Walk tab, for the previews. Inserted by
   tools/teaser_rules.js between the coachwalk markers; edit it here.
   Tap a bunker: its notes stand beside it on the field like sticky notes,
   what the measured layout says about it reads under the field, and one tap
   opens Sightlines standing in it. Notes stay with the field, on this phone. */
const WALK_WIRES=['The field','Snake wire','Snake side','Centre','Dorito side','Dorito wire'];
let walkPick=null,walkShut=null;
function walkAll(){try{const o=JSON.parse(localStorage.getItem('gridlock_walknotes')||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
function walkNotesHere(){const l=walkAll()[layoutKey];return Array.isArray(l)?l.filter(n=>n&&typeof n.note==='string'):[];}
function walkSave(list){try{const o=walkAll();o[layoutKey]=list;localStorage.setItem('gridlock_walknotes',JSON.stringify(o));return true;}catch(e){gAlert('This phone would not keep the note.');return false;}}
function walkWhereOf(b){return bLabelId(b.id)+' · '+b.id;}
function walkIdOf(where){return String(where||'').split(' · ').pop();}
function walkPickedBun(){const id=walkIdOf(walkPick);return BUN.find(b=>b.id===id)||null;}
function walkLanes(b){const i=BUN.indexOf(b);let clear=0;BUN.forEach((c,j)=>{if(j!==i&&losClear(b.x,b.y,c.x,c.y,new Set([i,j]),'stand'))clear++;});return {clear,of:BUN.length-1};}
function walkClick(e){try{if(!svg.createSVGPoint||!svg.getScreenCTM)return;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const m=svg.getScreenCTM();if(!m)return;const p=pt.matrixTransform(m.inverse());const fx=clamp(p.x,0,150),fy=clamp(120-p.y,0,120);
  let hit=null,best=8;BUN.forEach(b=>{const d=Math.hypot(b.x-fx,b.y-fy);if(d<best){best=d;hit=b;}});if(hit){walkPick=walkWhereOf(hit);walkShut=null;walkRedraw(true);}}catch(err){}}
function walkRedraw(focus){const t=document.getElementById('wkNote');const typed=t?t.value:'';renderWalk();const n=document.getElementById('wkNote');if(n){n.value=typed;if(focus)n.focus({preventScroll:true});}}
function walkAdd(){const pb=walkPickedBun();const where=pb?walkWhereOf(pb):((document.getElementById('wkWhere')||{}).value||WALK_WIRES[0]);
  const note=sanitizeText(((document.getElementById('wkNote')||{}).value||'').trim()).slice(0,240);
  if(!note){gAlert('Type the note first.');return;}
  const fold=s=>String(s).toLowerCase().replace(/\s+/g,' ').trim();
  if(walkNotesHere().some(n=>n.where===where&&fold(n.note)===fold(note))){gAlert('Already noted here.');return;}
  if(!walkSave([{where,note,at:Date.now()}].concat(walkNotesHere())))return;
  const t=document.getElementById('wkNote');if(t)t.value='';walkPick=null;renderWalk();}
function walkDel(i){const list=walkNotesHere(),was=list[i];if(!was)return;
  gChoose('Take this note off?','It comes off '+(was.where||'the field')+' and is not kept anywhere else.',[{label:'Remove',primary:true,run:()=>{list.splice(i,1);walkSave(list);renderWalk();}},{label:'Cancel',run:()=>{}}]);}
function walkStickies(){const old=document.getElementById('walkStick');if(old)old.remove();
  const b=walkPickedBun();if(!b||walkShut===b.id||MODE!=='walk')return;
  const box=document.querySelector('.fieldbox');if(!box)return;
  const mine=walkNotesHere().filter(n=>walkIdOf(n.where)===b.id);
  const day=t=>{try{return t?new Date(t).toLocaleDateString([],{month:'short',day:'numeric'}):'';}catch(e){return '';}};
  const el2=document.createElement('div');el2.id='walkStick';el2.className='wstick';el2.setAttribute('role','group');el2.setAttribute('aria-label','Notes on '+bLabelId(b.id));
  el2.innerHTML=`<div class="wstick__head"><b>${hesc(bLabelId(b.id))}</b><span>${mine.length?mine.length+(mine.length===1?' note':' notes'):'no notes'}</span><button type="button" class="wstick__x" aria-label="Close the notes">✕</button></div><div class="wstick__pad">${mine.length?mine.map((n,i)=>`<div class="wnote" style="--tilt:${i%2?1.2:-1.2}deg"><p class="wnote__text">${hesc(n.note)}</p>${n.at?`<span class="wnote__when">${hesc(day(n.at))}</span>`:''}</div>`).join(''):`<div class="wnote wnote--empty" style="--tilt:-1deg"><p class="wnote__text">No notes on ${hesc(bLabelId(b.id))} yet. Type one below and tap Add note.</p></div>`}</div>`;
  el2.querySelector('.wstick__x').onclick=ev=>{ev.stopPropagation();walkShut=b.id;el2.remove();};
  el2.addEventListener('click',ev=>ev.stopPropagation());
  box.appendChild(el2);walkPlace();}
function walkPlace(){const el2=document.getElementById('walkStick'),box=document.querySelector('.fieldbox'),b=walkPickedBun();if(!el2||!box||!b||!svg.getScreenCTM)return;
  const m=svg.getScreenCTM();if(!m)return;const pt=svg.createSVGPoint();pt.x=X(b.x);pt.y=Y(b.y);const at=pt.matrixTransform(m),r=box.getBoundingClientRect();
  const x=at.x-r.left,y=at.y-r.top,gap=16,pad=6,w=Math.min(240,Math.max(150,r.width*0.46));el2.style.width=w+'px';el2.style.maxHeight=(r.height-pad*2)+'px';
  const h=el2.offsetHeight,right=x<r.width/2;el2.style.left=Math.max(pad,Math.min(r.width-w-pad,right?x+gap:x-gap-w))+'px';el2.style.top=Math.max(pad,Math.min(r.height-h-pad,y-h/2))+'px';}
addEventListener('resize',()=>{if(MODE==='walk')walkPlace();});
function renderWalk(){const B=document.getElementById('walkbox');if(!B)return;
  if(typeof field==='function')field();
  const notes=walkNotesHere(),noted=new Set(notes.map(n=>walkIdOf(n.where)));
  BUN.forEach(b=>{if(noted.has(b.id))el('circle',{cx:X(b.x),cy:Y(b.y),r:1.6,fill:'#efedeb',stroke:'#0b0c0d','stroke-width':.6});});
  const pb=walkPickedBun();if(pb){const w=(pb.w||5)/2+1.5,h=(pb.h||5)/2+1.5;el('rect',{x:X(pb.x)-w,y:Y(pb.y)-h,width:2*w,height:2*h,rx:1.5,fill:'none',stroke:'#ffffff','stroke-width':.9});}
  svg.onclick=walkClick;svg.onpointerdown=null;svg.onpointerup=null;
  const lg=document.getElementById('legend');if(lg){lg.classList.remove('hidden');lg.innerHTML='<span>Tap a bunker to see its notes'+(notes.length?' — a dot marks one that already has a note':'')+', and add one below. Or pick a wire.</span>';}
  const P=document.getElementById('panel');if(P){P.classList.add('hidden');}
  const where=walkPick||WALK_WIRES[0];
  let book='';if(pb){const l=walkLanes(pb);book=`<p class="walk-book"><b>${hesc(bLabelId(pb.id))}</b> — <b>${l.clear}</b> of ${l.of} lanes clear from here, standing.</p><button class="ld" id="wkLanes">Lanes from here</button>`;}
  const opts=WALK_WIRES.map(w=>`<option${w===where?' selected':''}>${hesc(w)}</option>`).join('')+BUN.map(b=>{const v=walkWhereOf(b);return `<option value="${hesc(v)}"${v===where?' selected':''}>${hesc(bLabelId(b.id))}</option>`;}).join('');
  B.innerHTML=`<div class="panel"><div class="lbl">Walk</div><p class="walk-lede">What you noticed standing on it, against the bunker or the wire you noticed it on. Notes stay with this field, on this phone.</p>${book}
    <label class="lbl" for="wkWhere">Where</label><select id="wkWhere">${opts}</select>
    <label class="lbl" for="wkNote">Note</label><textarea id="wkNote" maxlength="240" placeholder="Snake mouth is hot. GP first off the tape."></textarea>
    <button class="ld on walk-add" id="wkAdd">Add note</button></div>
    <div class="panel"><div class="lbl">On the walk${notes.length?' · '+notes.length+(notes.length===1?' note':' notes'):''}</div>${notes.length?notes.map((n,i)=>`<div class="iqrow walk-row"><div><b>${hesc(n.note)}</b><p>${hesc(n.where)}</p></div><button class="ld" data-wkdel="${i}">Remove</button></div>`).join(''):'<div class="iqrow">Nothing noted on this field yet.</div>'}</div>`;
  B.querySelector('#wkWhere').onchange=e=>{walkPick=e.target.value;walkShut=null;walkRedraw(false);};
  B.querySelector('#wkAdd').onclick=walkAdd;
  B.querySelectorAll('[data-wkdel]').forEach(x=>x.onclick=()=>walkDel(+x.dataset.wkdel));
  const ln=B.querySelector('#wkLanes');if(ln)ln.onclick=()=>{const i=BUN.indexOf(walkPickedBun());if(i<0)return;sightSel=i;if(typeof setMode==='function')setMode('sight');sightSel=i;if(typeof renderSight==='function')renderSight();window.scrollTo({top:0,behavior:'smooth'});};
  walkStickies();}
