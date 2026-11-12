/* playerhome — the Player preview's dashboard (owner, 12 Nov 2026: "after
   signing in, a dashboard with the tabs instead of opening into Tally").
   Inserted by tools/teaser_rules.js between the playerhome markers, Player
   only; edit it here. One card a screen the Player app opens — the tabs on
   the bar and the rows of the More menu, as they stand — with a line on what
   it is for and, where there is one, where you are now. A tap goes there
   through that tab's own button, so nothing opens any other way. Nothing is
   taken out: every tab and More row is still where it was, and Home is one
   more tab at the front of the bar. Reading the dashboard changes nothing. */
var HOME_SAYS={tally:'Chart the break: where each man went, then what happened, and who won the point.',
  scout:'Their five, their call and their record, team by team.',
  sight:'Tap a bunker and see every clear lane from it.',
  walk:'Notes on each bunker, stuck to the field.',
  practice:'Your drills and practice results.',
  rules:'The three official 2026 rulebooks. Needs a connection.',
  nexus:'Backups and what is kept on this phone.',
  team:'Your team and its code.',myline:'Your line and your spot in it.',msg:'Messages from your team.'};
(function homeTab(){const bar=document.querySelector('.tabs');if(!bar||bar.querySelector('button[data-m="home"]'))return;
  const b=document.createElement('button');b.dataset.m='home';b.textContent='Home';bar.insertBefore(b,bar.firstChild);
  if(!document.getElementById('homebox')){const box=document.createElement('div');box.id='homebox';box.className='hidden';box.style.marginTop='2px';
    const anchor=document.getElementById('practicebox');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor);}})();
function homeNow(m){try{
  if(m==='tally'&&typeof SH!=='undefined'){const mt=SH.matches.find(x=>x.id===SH.matchId);if(mt&&mt.vs){const s=cpScore(mt.id);return 'vs '+mt.vs+' · point '+SH.point+' · '+s.us+'–'+s.them;}return 'No match yet. Pick who you play.';}
  if(m==='scout'){const t=typeof cpPit==='function'?cpPit():'';return t?'Who you play: '+t:'Pick who you play in the right pit.';}
  if(m==='sight'||m==='walk'){const ev=document.querySelector('header select');return ev&&ev.selectedOptions[0]?ev.selectedOptions[0].textContent:'';}
  }catch(e){}return '';}
function homeItems(){const out=[],seen=new Set();
  document.querySelectorAll('.tabs button').forEach(b=>{const m=b.dataset.m;if(!m||m==='home'||b.id==='moreBtn'||b.style.display==='none'||seen.has(m))return;seen.add(m);out.push({m,name:b.textContent.trim(),open:()=>b.click()});});
  document.querySelectorAll('#moreMenu [data-mm]').forEach(b=>{const m=b.dataset.mm;if(!m||seen.has(m))return;seen.add(m);out.push({m,name:b.textContent.trim(),more:true,open:()=>b.click()});});
  return out;}
function renderHome(){const box=document.getElementById('homebox');if(!box)return;const t=typeof teamGet==='function'?teamGet():null,items=homeItems();
  box.innerHTML=`<div class="lbl">Your dashboard</div><div style="font-size:12.5px;color:#ff5a52;margin:2px 0 10px">${t&&t.code?'Team '+hesc(t.code)+' · ':''}Tap a card to open it. Home on the bar brings you back here.</div>`
   +`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">`
   +items.map((it,i)=>{const now=homeNow(it.m);return `<button type="button" class="iqrow" data-home="${i}" style="display:block;width:100%;text-align:left;cursor:pointer;min-height:92px;border-color:#3a3f40;background:#161818;color:#efedeb;padding:14px">`
     +`<div style="font-size:17px;font-weight:900">${hesc(it.name)}${it.more?' <span style="font-size:11px;color:#ff5a52;font-weight:700">· More</span>':''}</div>`
     +`<div style="font-size:12.5px;color:#ff5a52;margin-top:4px">${hesc(HOME_SAYS[it.m]||'')}</div>`
     +(now?`<div style="font-size:12px;color:#efedeb;margin-top:6px;font-weight:700">${hesc(now)}</div>`:'')+`</button>`;}).join('')+`</div>`;
  box.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>{const it=items[+b.dataset.home];if(it)it.open();});}
/* The Rules row joins the More menu after this script, so the first draw is
   redone once the page has loaded. */
window.addEventListener('load',()=>{if(typeof MODE!=='undefined'&&MODE==='home')renderHome();});
