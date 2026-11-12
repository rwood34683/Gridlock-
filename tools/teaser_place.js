/* coachplace — where they went, then what happened, for the Player preview's
   Tally and Scout › Breakouts (both draw through renderTally). Inserted by
   tools/teaser_rules.js between the coachplace markers; edit it here.
   Off the buzzer ten men leave at once, so step 1 is a tap a man: each tap
   puts one man on the bunker nearest it, a second tap on a bunker puts a
   second man there. Step 2 opens the first man still to tell in the same
   form as before; logging him opens the next. Placed men are this point's
   scratch, kept in page memory per field and per team being scouted, and
   cleared when the point's result is saved. Nothing is sent anywhere. */
const PLACE_MAX=10;
let placeStep='where',placeBy={},placeCur=-1,placeNext=false;
function placeList(){const k=tScope();return placeBy[k]||(placeBy[k]=[]);}
function placeUntold(){return placeList().filter(m=>!m.told);}
function placeReset(){delete placeBy[tScope()];placeCur=-1;placeNext=false;placeStep='where';}
function placeTap(id){if(placeStep!=='where')return false;const list=placeList();
  if(list.length>=PLACE_MAX){gToast('Ten men placed. Take one off to place another.');return true;}
  list.push({bid:id,told:false});tallySel=null;gToast('Man '+list.length+' on '+bLabelId(id));renderTally();return true;}
function placeTell(i){const m=placeList()[i];if(!m)return;placeStep='tell';placeCur=i;tallySelect(m.bid);}
function placeOpenNext(){const list=placeList(),i=list.findIndex(m=>!m.told);
  if(i<0){placeCur=-1;tallySel=null;gToast('Everyone placed is told. Log the point when it is over.');renderTally();return;}placeTell(i);}
function placeTold(bid){const list=placeList();let i=(placeCur>=0&&list[placeCur]&&list[placeCur].bid===bid&&!list[placeCur].told)?placeCur:list.findIndex(m=>!m.told&&m.bid===bid);
  if(i>=0){list[i].told=true;placeNext=placeStep==='tell';}placeCur=-1;}
function placeStepTo(s){placeStep=s;tallyTrace=false;if(s==='where'){tallySel=null;placeCur=-1;renderTally();return;}placeOpenNext();}
function placeOff(i){const list=placeList();if(!list[i])return;list.splice(i,1);if(placeCur===i){placeCur=-1;tallySel=null;}else if(placeCur>i)placeCur--;renderTally();}
function placeBar(){const list=placeList(),left=placeUntold().length,w=placeStep==='where';
  let h='<div class="row" role="group" aria-label="Logging step" style="gap:5px;margin:2px 0 6px"><button type="button" class="ld '+(w?'on':'')+'" data-pstep="where" aria-pressed="'+w+'" style="flex:1">1 · Where they went</button><button type="button" class="ld '+(!w?'on':'')+'" data-pstep="tell" aria-pressed="'+(!w)+'" style="flex:1">2 · What happened'+(left?' ('+left+')':'')+'</button></div>';
  h+='<div style="font-size:12px;color:#ff5a52;margin-bottom:5px">'+(w
    ?'Tap the field where each man broke to, one tap a man. Tap a bunker again for a second man on it. Then go to step 2 and fill in each one.'
    :(left?(placeCur>=0&&list[placeCur]?'<b style="color:#efedeb">Man '+(placeCur+1)+' of '+list.length+' · '+hesc(bLabelId(list[placeCur].bid))+'</b> — fill him in below. Log this breakout opens the next man. ':'')+'Tap a man below to tell him out of order.':(list.length?'Everyone placed is told. Tap a bunker to log one more man.':'Nobody is placed yet. Go to step 1 and tap where they went, or tap a bunker to log one man.')))+'</div>';
  if(list.length){h+='<div class="lbl" style="margin-top:2px">Placed this point · '+list.length+(left?' · '+left+' still to tell':' · all told')+'</div><div class="row" style="flex-wrap:wrap;gap:4px;margin-bottom:6px">';
    list.forEach((m,i)=>{const lab=(i+1)+' · '+bLabelId(m.bid)+(m.told?' ✓':'');
      h+='<span style="display:inline-flex;gap:2px"><button type="button" class="ld '+(i===placeCur?'on':'')+'" data-ptell="'+i+'" aria-label="Man '+(i+1)+' on '+hesc(bLabelId(m.bid))+(m.told?', told':', still to tell')+'">'+hesc(lab)+'</button>'+(w?'<button type="button" class="ld" data-poff="'+i+'" aria-label="Take man '+(i+1)+' off">✕</button>':'')+'</span>';});
    h+='</div>';}
  return h;}
function placeDraw(){const list=placeList(),seen={};
  list.forEach((m,i)=>{const b=BUN.find(x=>x.id===m.bid);if(!b)return;const k=seen[m.bid]=(seen[m.bid]||0)+1,dx=(k-1)*3.2;
    const cur=i===placeCur;el('rect',{x:X(b.x)-1.6+dx,y:Y(b.y)-1.6,width:3.2,height:3.2,rx:.5,fill:m.told?'#efedeb':'#ad1515',stroke:cur?'#ffd24d':'#0b0c0d','stroke-width':cur?.6:.3,'pointer-events':'none'});
    const t=el('text',{x:X(b.x)+dx,y:Y(b.y)+1,fill:m.told?'#0b0c0d':'#efedeb','font-size':2.3,'text-anchor':'middle','font-weight':800,'pointer-events':'none'});t.textContent=String(i+1);});
  if(placeStep==='where'){const lg=document.getElementById('legend');if(lg)lg.innerHTML='<span>Step 1 · Where they went — tap the field where each man broke to. Numbered squares are the men placed.</span>';}}
function placeWire(){document.querySelectorAll('[data-pstep]').forEach(b=>b.onclick=()=>placeStepTo(b.dataset.pstep));
  document.querySelectorAll('[data-ptell]').forEach(b=>b.onclick=()=>placeTell(+b.dataset.ptell));
  document.querySelectorAll('[data-poff]').forEach(b=>b.onclick=()=>placeOff(+b.dataset.poff));
  placeDraw();
  {const o=document.getElementById('tallyOpts'),m=placeList()[placeCur];if(o&&m&&placeStep==='tell'&&!o.querySelector('.place-who')){const d=document.createElement('div');d.className='place-who';d.style.cssText='font-size:13px;font-weight:800;color:#efedeb;margin:2px 0 6px';d.textContent='Man '+(placeCur+1)+' of '+placeList().length+' · '+bLabelId(m.bid);o.prepend(d);}}
  if(placeNext){placeNext=false;setTimeout(placeOpenNext,0);}}
