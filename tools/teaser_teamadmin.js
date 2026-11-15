/* teamadmin — the Team preview's Team admin tab (owner, 15 Nov 2026).
   Inserted by tools/teaser_rules.js between the teamadmin markers, Team only;
   edit it here. The tab sits after Rules and before Nexus.

   Eight roles (the owner chose no Parent role), one role a person, so one
   person cannot hold two duties that should be kept apart:
     Owner · Site admin · Head coach · Assistant coach / Scout · Treasurer ·
     Logistics · Captain · Player
   Separation of duties:
   - nobody changes their own role; only the Owner or a Site admin assigns
     roles, and a Site admin cannot make (or touch) a Site admin or the Owner;
   - there is always exactly one Owner, who can hand ownership on;
   - money takes two people: whoever records an entry cannot approve it, and
     only the Treasurer or the Owner approves;
   - the Site admin, who decides who is on the team, has no money access;
   - every role change and money entry goes in an activity log that has no
     edit or delete.
   Money is a record only: who owes, who paid, what was spent. Nothing is
   charged or sent anywhere.

   This is a preview with no server: the roles live on this phone and cannot
   lock anybody out on another phone. "View as" shows the app as any member
   sees it — the tabs their role uses and the Team admin buttons they can
   press. It is held in page memory only and a reload is the Owner again. */
var TA_ROLES=[
 ['owner','Owner','Everything. Hands ownership on and reads the activity log.'],
 ['siteadmin','Site admin','Members, roles, team settings and the join code. No money.'],
 ['headcoach','Head coach','Roster, lineups, schedule, tournament prep and team messages.'],
 ['asstcoach','Assistant coach / Scout','Lineups, schedule, tournament prep and messages.'],
 ['treasurer','Treasurer','Dues, entry fees, expenses and sponsor money. Approves money.'],
 ['logistics','Logistics','Travel, hotel, rides, paint and air, and the game-day checklists.'],
 ['captain','Captain','Player check-ins and team messages.'],
 ['player','Player','Their line, the schedule, messages and their own dues.']];
var TA_ROLE=Object.fromEntries(TA_ROLES.map(r=>[r[0],r]));
/* What each role can do. The table on the tab is read from this, and so is
   every check below, so the two cannot disagree. */
var TA_CAN={
 members:['owner','siteadmin'],
 settings:['owner','siteadmin'],
 roster:['owner','headcoach'],
 lineups:['owner','headcoach','asstcoach','captain'],
 schedule:['owner','headcoach','asstcoach','logistics','captain'],
 messages:['owner','siteadmin','headcoach','asstcoach','treasurer','logistics','captain'],
 record:['owner','treasurer','headcoach','logistics'],
 approve:['owner','treasurer'],
 allmoney:['owner','treasurer'],
 checklists:['owner','headcoach','logistics'],
 log:['owner']};
var TA_CAN_SAY=[['members','Add and remove members, give roles'],['settings','Team settings and join code'],['roster','Change the roster'],
 ['lineups','Set lineups'],['schedule','Schedule and tournament prep'],['messages','Message the whole team'],['record','Record money'],
 ['approve','Approve money (never their own entry)'],['allmoney','See all the money'],['checklists','Travel and gear checklists'],['log','Read the activity log']];
/* The tabs each role sees under View as. Home, Team, Schedule, Messages,
   Rules, Team admin and Nexus are everybody's. */
var TA_TABS={lineup:['owner','siteadmin','headcoach','asstcoach','captain','player'],tprep:['owner','headcoach','asstcoach','logistics','captain']};
var TA_KINDS=[['dues','Dues owed','in'],['payment','Payment received','in'],['sponsor','Sponsor money','in'],['fee','Entry fee','out'],['expense','Expense','out']];
var TA_KIND=Object.fromEntries(TA_KINDS.map(k=>[k[0],k]));
var TA_AS=null,TA_FORM={};
function taCan(what,m){m=m||taMe();return !!(m&&(TA_CAN[what]||[]).includes(m.role));}
function taAllData(){try{const o=JSON.parse(localStorage.getItem('gridlock_tadmin')||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}}
function taClean(d){d=d&&typeof d==='object'?d:{};return {members:Array.isArray(d.members)?d.members.filter(m=>m&&m.id&&m.name&&TA_ROLE[m.role]):[],
 money:Array.isArray(d.money)?d.money.filter(x=>x&&x.id&&TA_KIND[x.kind]&&x.cents>0):[],log:Array.isArray(d.log)?d.log.filter(x=>x&&x.id&&x.what):[]};}
function taGet(){const t=teamGet();if(!t||!t.code)return null;return taClean(taAllData()[t.code]);}
function taSave(d){const t=teamGet();if(!t||!t.code)return false;const o=taAllData();o[t.code]=d;try{localStorage.setItem('gridlock_tadmin',JSON.stringify(o));return true;}catch(e){gAlert('This phone would not save that. Nothing changed.');return false;}}
function taId(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function taOwner(d){return (d||taGet()||{members:[]}).members.find(m=>m.role==='owner')||null;}
function taMe(d){d=d||taGet();if(!d)return null;return d.members.find(m=>m.id===TA_AS)||taOwner(d);}
function taWho(m){return m?m.name+' ('+TA_ROLE[m.role][1]+')':'';}
function taLog(d,what){const me=taMe(d);d.log.push({id:taId('l'),at:Date.now(),by:taWho(me),what});}
function taMoney(c){return '$'+(c/100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function taCents(v){const s=String(v||'').replace(/[$,\s]/g,'');if(!/^\d+(\.\d{1,2})?$/.test(s))return 0;const c=Math.round(parseFloat(s)*100);return c>0&&c<=100000000?c:0;}
function taWhen(t){try{return new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(e){return '';}}
/* Can the person acting change this member's role or take them off? */
function taCanTouch(me,m){if(!me||!m||me.id===m.id||m.role==='owner')return false;if(me.role==='owner')return true;
 return me.role==='siteadmin'&&m.role!=='siteadmin';}
function taRolesFor(me){return TA_ROLES.filter(r=>r[0]!=='owner'&&(me.role==='owner'||r[0]!=='siteadmin'));}
/* View as: hide the tabs the member's role does not use. Only tabs this code
   hid are shown again, so a tab the preview hides stays hidden. */
function taApplyView(){const d=taGet(),me=d?taMe(d):null,role=me?me.role:'owner';
 document.querySelectorAll('.tabs button[data-m]').forEach(b=>{const allow=!TA_TABS[b.dataset.m]||TA_TABS[b.dataset.m].includes(role);
  if(!allow&&b.style.display!=='none'){b.style.display='none';b.dataset.taHid='1';}
  else if(allow&&b.dataset.taHid){b.style.display='';delete b.dataset.taHid;}});}
function taBalances(d){const out={};d.money.forEach(x=>{if(x.status!=='approved'||!x.who)return;const k=x.who;out[k]=out[k]||{owed:0,paid:0};
 if(x.kind==='dues')out[k].owed+=x.cents;if(x.kind==='payment')out[k].paid+=x.cents;});return out;}
(function taTab(){const bar=document.querySelector('.tabs');if(!bar||bar.querySelector('button[data-m="tadmin"]'))return;
 const b=document.createElement('button');b.dataset.m='tadmin';b.textContent='Team admin';
 const nx=bar.querySelector('button[data-m="nexus"]');if(nx)nx.before(b);else bar.appendChild(b);
 b.onclick=()=>{if(typeof editMode!=='undefined')editMode=false;setMode('tadmin');};
 if(!document.getElementById('tadminbox')){const box=document.createElement('div');box.id='tadminbox';box.className='hidden';box.style.marginTop='2px';
  const anchor=document.getElementById('teambox');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor);}})();
function renderTadmin(){const box=document.getElementById('tadminbox');if(!box)return;const t=teamGet()||{};
 let h='<div class="lbl">Team admin</div>';
 if(!t.code){box.innerHTML=h+'<div style="font-size:12.5px;color:#ff5a52;margin:4px 0 10px">Create your team first. Team admin gives the people in it their jobs.</div><button class="ld on" id="taToTeam">Go to Team</button>';
  document.getElementById('taToTeam').onclick=()=>setMode('team');return;}
 if(t.player){box.innerHTML=h+'<div style="font-size:12.5px;color:#ff5a52;margin:4px 0 10px">Team admin is run from the phone that created '+hesc(t.code)+'. Ask your team’s Owner or Site admin to change your role.</div>';return;}
 const d=taGet();
 if(!d.members.length){
  box.innerHTML=h+'<div style="font-size:12.5px;color:#ff5a52;margin:4px 0 10px">Give each person on '+hesc(t.name||'your team')+' a job: Owner, Site admin, Head coach, Assistant coach, Treasurer, Logistics, Captain or Player. You set it up, so you start as the Owner.</div>'
   +'<div class="row" style="gap:5px"><input id="taOwnerName" aria-label="Your name" placeholder="your name" maxlength="40" style="flex:1 1 160px" value="'+hesc(TA_FORM.owner||'')+'"><button class="ld on" id="taStart">Set up Team admin</button></div>';
  const go=()=>{const n=document.getElementById('taOwnerName').value.trim();if(!n){gAlert('Type your name first.');return;}
   const nd=taGet();const o={id:taId('m'),name:n.slice(0,40),role:'owner',at:Date.now()};nd.members.push(o);TA_AS=o.id;taLog(nd,'Set up Team admin. '+o.name+' is the Owner.');if(taSave(nd)){TA_FORM={};renderTadmin();}};
  document.getElementById('taStart').onclick=go;document.getElementById('taOwnerName').onkeydown=e=>{if(e.key==='Enter')go();};return;}
 const me=taMe(d),owner=taOwner(d);
 /* who is acting */
 h+='<div class="iqrow" style="border-color:#3a3f40;background:#161818"><label for="taAs" style="font-size:12px;color:#ff5a52;font-weight:800">View as</label>'
  +'<select id="taAs" style="width:100%;margin-top:4px">'+d.members.map(m=>'<option value="'+hesc(m.id)+'"'+(m.id===me.id?' selected':'')+'>'+hesc(taWho(m))+'</option>').join('')+'</select>'
  +(me.role!=='owner'?'<div style="font-size:12.5px;color:#efedeb;margin-top:6px">You are seeing what <b>'+hesc(me.name)+'</b> sees as '+hesc(TA_ROLE[me.role][1])+'. Tabs they do not use are hidden.</div><button class="ld" id="taBack" style="margin-top:6px">Back to the Owner</button>':'')
  +'<div style="font-size:11.5px;color:#ff5a52;margin-top:6px">Preview: roles live on this phone only. They do not lock anyone out on another phone until the Team app has accounts.</div></div>';
 /* members */
 const canM=taCan('members',me);
 h+='<div class="lbl" style="margin-top:12px">Members ('+d.members.length+')</div>';
 h+=d.members.slice().sort((a,b)=>TA_ROLES.findIndex(r=>r[0]===a.role)-TA_ROLES.findIndex(r=>r[0]===b.role)||a.name.localeCompare(b.name)).map(m=>{
  const touch=canM&&taCanTouch(me,m);
  return '<div class="row" style="justify-content:space-between;align-items:center;gap:6px;border-top:1px solid #26292a;padding:6px 0;flex-wrap:wrap">'
   +'<span style="font-size:13.5px;flex:1 1 140px;overflow-wrap:anywhere"><b>'+hesc(m.name)+'</b>'+(m.id===me.id?' <span style="font-size:11px;color:#ff5a52">(viewing as)</span>':'')+'<br><span style="font-size:11.5px;color:#ff5a52">'+hesc(TA_ROLE[m.role][1])+'</span></span>'
   +(touch?'<select data-tarole="'+hesc(m.id)+'" aria-label="Role for '+hesc(m.name)+'" style="flex:0 1 190px">'+taRolesFor(me).map(r=>'<option value="'+r[0]+'"'+(r[0]===m.role?' selected':'')+'>'+hesc(r[1])+'</option>').join('')+'</select>'
     +'<button class="ld" data-tarm="'+hesc(m.id)+'" aria-label="Remove '+hesc(m.name)+'">Remove</button>':'')+'</div>';}).join('');
 if(canM){
  h+='<div class="row" style="gap:5px;margin-top:8px;flex-wrap:wrap"><input id="taNewName" aria-label="New member’s name" placeholder="name" maxlength="40" style="flex:1 1 140px" value="'+hesc(TA_FORM.name||'')+'">'
   +'<select id="taNewRole" aria-label="New member’s role" style="flex:1 1 150px">'+taRolesFor(me).map(r=>'<option value="'+r[0]+'"'+((TA_FORM.role||'player')===r[0]?' selected':'')+'>'+hesc(r[1])+'</option>').join('')+'</select>'
   +'<button class="ld on" id="taAdd">+ Add member</button></div>';
  const ros=(t.roster||[]).filter(n=>!d.members.some(m=>tpSlug(m.name)===tpSlug(n)));
  if(ros.length)h+='<button class="ld" id="taRoster" style="margin-top:6px">Add the '+ros.length+' on the roster as Players</button>';
 } else h+='<div style="font-size:12px;color:#ff5a52;margin-top:6px">Only the Owner or a Site admin adds members and gives roles.</div>';
 if(me.role==='owner'&&d.members.length>1)
  h+='<div class="row" style="gap:5px;margin-top:10px;flex-wrap:wrap"><select id="taHand" aria-label="Hand ownership to" style="flex:1 1 180px"><option value="">Hand ownership to…</option>'
   +d.members.filter(m=>m.id!==me.id).map(m=>'<option value="'+hesc(m.id)+'">'+hesc(taWho(m))+'</option>').join('')+'</select><button class="ld" id="taHandGo">Hand over</button></div>';
 /* money */
 const all=taCan('allmoney',me),rec=taCan('record',me),appr=taCan('approve',me);
 h+='<div class="lbl" style="margin-top:14px">Money</div><div style="font-size:12px;color:#ff5a52;margin-bottom:6px">A record of who owes, who paid and what was spent. Nothing is charged or sent. Every entry needs a second person — the Treasurer or the Owner — to approve it.</div>';
 const mine=d.money.filter(x=>all||tpSlug(x.who)===tpSlug(me.name)||x.byId===me.id);
 if(all){let inn=0,out=0,pend=0;d.money.forEach(x=>{if(x.status==='pending')pend++;if(x.status!=='approved'||x.kind==='dues')return;if(TA_KIND[x.kind][2]==='in')inn+=x.cents;else out+=x.cents;});
  h+='<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">'+[['In',taMoney(inn)],['Out',taMoney(out)],['On hand',(inn-out<0?'−':'')+taMoney(Math.abs(inn-out))],['Waiting to approve',String(pend)]]
   .map(x=>'<div class="iqrow" style="flex:1 1 120px;margin:0;border-color:#3a3f40"><div style="font-size:11px;color:#ff5a52">'+x[0]+'</div><div style="font-size:17px;font-weight:900">'+x[1]+'</div></div>').join('')+'</div>'
   +'<div style="font-size:11px;color:#f04a44;margin-bottom:6px">In and Out count approved entries only. Dues owed are what members owe, not money in.</div>';
  const bal=taBalances(d),names=Object.keys(bal);
  if(names.length)h+='<div style="font-size:12.5px;font-weight:800;margin:6px 0 2px">Dues by member</div>'+names.sort().map(n=>{const b=bal[n],left=b.owed-b.paid;
   return '<div class="row" style="justify-content:space-between;border-top:1px solid #26292a;padding:5px 0;font-size:13px"><span>'+hesc(n)+'</span><span>'+(left>0?'<b style="color:#ff5a52">owes '+taMoney(left)+'</b>':left<0?'paid '+taMoney(-left)+' ahead':'paid up')+'</span></div>';}).join('');
 } else {const b=taBalances(d)[me.name]||{owed:0,paid:0},left=b.owed-b.paid;
  h+='<div class="iqrow" style="border-color:#3a3f40"><div style="font-size:11px;color:#ff5a52">Your dues</div><div style="font-size:17px;font-weight:900">'+(left>0?'You owe '+taMoney(left):'Paid up')+'</div></div>';}
 if(rec){const f=TA_FORM;
  h+='<div class="iqrow" style="border-color:#3a3f40;margin-top:8px"><div style="font-size:12.5px;font-weight:800;margin-bottom:6px">Record money</div>'
   +'<div class="row" style="gap:5px;flex-wrap:wrap"><select id="taKind" aria-label="What kind" style="flex:1 1 150px">'+TA_KINDS.map(k=>'<option value="'+k[0]+'"'+((f.kind||'dues')===k[0]?' selected':'')+'>'+k[1]+'</option>').join('')+'</select>'
   +'<select id="taWho" aria-label="Which member" style="flex:1 1 150px"><option value="">No member</option>'+d.members.map(m=>'<option value="'+hesc(m.name)+'"'+(f.who===m.name?' selected':'')+'>'+hesc(m.name)+'</option>').join('')+'</select>'
   +'<input id="taAmt" aria-label="Amount in dollars" inputmode="decimal" placeholder="$ amount" maxlength="12" style="flex:1 1 110px" value="'+hesc(f.amt||'')+'"></div>'
   +'<div class="row" style="gap:5px;margin-top:5px;flex-wrap:wrap"><input id="taNote" aria-label="What it was for" placeholder="what for (e.g. World Cup entry)" maxlength="80" style="flex:1 1 200px" value="'+hesc(f.note||'')+'"><button class="ld on" id="taRec">Record</button></div></div>';}
 const list=mine.slice().sort((a,b)=>b.at-a.at);
 if(list.length)h+='<div style="font-size:12.5px;font-weight:800;margin:10px 0 2px">'+(all?'Every entry':'Your entries')+'</div>'+list.map(x=>{
  const st=x.status==='approved'?'<span style="color:#9fe8bd">Approved by '+hesc(x.approvedBy||'')+'</span>':x.status==='rejected'?'<span style="color:#ff9a8a">Turned down by '+hesc(x.approvedBy||'')+'</span>':'<b style="color:#ffd24d">Waiting for a second person</b>';
  return '<div style="border-top:1px solid #26292a;padding:7px 0;font-size:13px"><div class="row" style="justify-content:space-between;gap:6px"><b>'+hesc(TA_KIND[x.kind][1])+(x.who?' · '+hesc(x.who):'')+'</b><b>'+taMoney(x.cents)+'</b></div>'
   +(x.note?'<div style="color:#efedeb">'+hesc(x.note)+'</div>':'')+'<div style="font-size:11.5px;color:#ff5a52">Recorded by '+hesc(x.by)+' · '+hesc(taWhen(x.at))+'</div><div style="font-size:11.5px">'+st+'</div>'
   +(x.status==='pending'&&appr?'<div class="row" style="gap:5px;margin-top:5px"><button class="ld on" data-taok="'+hesc(x.id)+'">Approve</button><button class="ld" data-tano="'+hesc(x.id)+'">Turn down</button></div>':'')+'</div>';}).join('');
 else h+='<div style="font-size:12px;color:#f04a44;margin-top:6px">Nothing recorded yet.</div>';
 /* logistics */
 if(taCan('checklists',me))h+='<div class="lbl" style="margin-top:14px">Logistics</div><div style="font-size:12px;color:#ff5a52;margin-bottom:6px">Travel, hotel, rides, paint and air and the game-day checklist are in Tournament prep.</div><button class="ld" id="taPrep">Open Tournament prep</button>';
 /* the table */
 h+='<details style="margin-top:14px"><summary style="min-height:44px;display:flex;align-items:center;font-weight:800;cursor:pointer">What each role can do</summary><div style="overflow-x:auto">'
  +'<table style="border-collapse:collapse;font-size:11.5px;min-width:560px"><thead><tr><th style="text-align:left;padding:4px">Can…</th>'+TA_ROLES.map(r=>'<th style="padding:4px;writing-mode:vertical-rl;transform:rotate(180deg);text-align:left">'+hesc(r[1])+'</th>').join('')+'</tr></thead><tbody>'
  +TA_CAN_SAY.map(([k,say])=>'<tr style="border-top:1px solid #26292a"><td style="padding:4px">'+say+'</td>'+TA_ROLES.map(r=>'<td style="text-align:center;padding:4px">'+(TA_CAN[k].includes(r[0])?'✓':'<span style="color:#5a5f60">—</span>')+'</td>').join('')+'</tr>').join('')
  +'</tbody></table></div><div style="font-size:11.5px;color:#ff5a52;margin-top:6px">One role a person. Nobody changes their own role. A Site admin cannot make another Site admin. In this preview, View as hides the tabs a role does not use and the Team admin buttons it cannot press; buttons inside the other tabs are not locked yet.</div></details>';
 /* the log */
 if(taCan('log',me)){const L=d.log.slice().sort((a,b)=>b.at-a.at);
  h+='<div class="lbl" style="margin-top:14px">Activity log</div><div style="font-size:12px;color:#ff5a52;margin-bottom:4px">Every role change and money entry, newest first. Nothing in it can be changed or deleted.</div>'
   +L.slice(0,TA_FORM.logAll?L.length:30).map(x=>'<div style="border-top:1px solid #26292a;padding:5px 0;font-size:12.5px">'+hesc(x.what)+'<div style="font-size:11px;color:#ff5a52">'+hesc(x.by)+' · '+hesc(taWhen(x.at))+'</div></div>').join('')
   +(L.length>30&&!TA_FORM.logAll?'<button class="ld" id="taLogAll">Show all '+L.length+'</button>':'');}
 box.innerHTML=h;
 const $=id=>document.getElementById(id);
 $('taAs').onchange=e=>{TA_AS=e.target.value;taApplyView();renderTadmin();};
 if($('taBack'))$('taBack').onclick=()=>{TA_AS=null;taApplyView();renderTadmin();};
 const keep=()=>{['owner','name','amt','note'].forEach(k=>{const el=$({name:'taNewName',amt:'taAmt',note:'taNote'}[k]);if(el)TA_FORM[k]=el.value;});['role','kind','who'].forEach(k=>{const el=$({role:'taNewRole',kind:'taKind',who:'taWho'}[k]);if(el)TA_FORM[k]=el.value;});};
 box.querySelectorAll('input,select').forEach(el=>{if(el.id&&el.id!=='taAs'&&el.id!=='taHand')el.addEventListener('change',keep);});
 const act=(fn)=>{const nd=taGet(),who=taMe(nd);if(!who||who.id!==me.id){renderTadmin();return;}fn(nd,who);};
 box.querySelectorAll('[data-tarole]').forEach(s=>s.onchange=()=>act((nd,who)=>{const m=nd.members.find(x=>x.id===s.dataset.tarole);
  if(!m||!taCanTouch(who,m)||!taCan('members',who)){gAlert('You cannot change that role.');renderTadmin();return;}
  if(s.value==='siteadmin'&&who.role!=='owner'){gAlert('Only the Owner makes a Site admin.');renderTadmin();return;}
  if(!TA_ROLE[s.value]||s.value==='owner'){renderTadmin();return;}
  const was=m.role;if(was===s.value)return;m.role=s.value;taLog(nd,m.name+': '+TA_ROLE[was][1]+' → '+TA_ROLE[m.role][1]+'.');if(taSave(nd)){gToast(m.name+' is now '+TA_ROLE[m.role][1]+'.');renderTadmin();}}));
 box.querySelectorAll('[data-tarm]').forEach(b=>b.onclick=()=>{const m=d.members.find(x=>x.id===b.dataset.tarm);if(!m)return;
  gChoose('Take '+m.name+' off Team admin?',m.name+' loses the '+TA_ROLE[m.role][1]+' role. Money entries and the activity log keep their name.',[{label:'Remove',primary:true,run:()=>act((nd,who)=>{const x=nd.members.find(y=>y.id===m.id);
   if(!x||!taCanTouch(who,x)||!taCan('members',who)){gAlert('You cannot remove '+m.name+'.');renderTadmin();return;}
   nd.members=nd.members.filter(y=>y.id!==x.id);taLog(nd,x.name+' ('+TA_ROLE[x.role][1]+') was taken off.');if(taSave(nd))renderTadmin();})},{label:'Cancel'}]);});
 if($('taAdd')){const add=()=>{keep();act((nd,who)=>{const n=($('taNewName').value||'').trim().slice(0,40),r=$('taNewRole').value;
  if(!taCan('members',who)){gAlert('Only the Owner or a Site admin adds members.');return;}
  if(!n){gAlert('Type their name first.');return;}
  if(nd.members.some(m=>tpSlug(m.name)===tpSlug(n))){gAlert(n+' is already a member. Change their role in the list.');return;}
  if(!TA_ROLE[r]||r==='owner'||(r==='siteadmin'&&who.role!=='owner')){gAlert('Only the Owner makes a Site admin.');return;}
  nd.members.push({id:taId('m'),name:n,role:r,at:Date.now()});taLog(nd,n+' added as '+TA_ROLE[r][1]+'.');if(taSave(nd)){TA_FORM.name='';renderTadmin();}});};
  $('taAdd').onclick=add;$('taNewName').onkeydown=e=>{if(e.key==='Enter')add();};}
 if($('taRoster'))$('taRoster').onclick=()=>act((nd,who)=>{if(!taCan('members',who))return;const ros=((teamGet()||{}).roster||[]).filter(n=>!nd.members.some(m=>tpSlug(m.name)===tpSlug(n)));
  ros.forEach(n=>nd.members.push({id:taId('m'),name:String(n).slice(0,40),role:'player',at:Date.now()}));if(ros.length)taLog(nd,ros.length+' from the roster added as Players.');if(taSave(nd))renderTadmin();});
 if($('taHandGo'))$('taHandGo').onclick=()=>{const id=$('taHand').value,m=d.members.find(x=>x.id===id);if(!m){gAlert('Pick who to hand ownership to.');return;}
  gChoose('Hand ownership to '+m.name+'?',m.name+' becomes the Owner. You become a Site admin. Only the new Owner can hand it back.',[{label:'Hand over',primary:true,run:()=>act((nd,who)=>{
   if(who.role!=='owner')return;const x=nd.members.find(y=>y.id===m.id),o=nd.members.find(y=>y.id===who.id);if(!x||!o)return;
   o.role='siteadmin';x.role='owner';taLog(nd,'Ownership handed from '+o.name+' to '+x.name+'. '+o.name+' is now Site admin.');TA_AS=x.id;if(taSave(nd)){taApplyView();renderTadmin();}})},{label:'Cancel'}]);};
 if($('taRec')){const recd=()=>{keep();act((nd,who)=>{if(!taCan('record',who)){gAlert('Your role does not record money.');return;}
  const kind=$('taKind').value,whoName=$('taWho').value,c=taCents($('taAmt').value),note=($('taNote').value||'').trim().slice(0,80);
  if(!TA_KIND[kind])return;if(!c){gAlert('Type an amount, like 25 or 120.50.');return;}
  if((kind==='dues'||kind==='payment')&&!whoName){gAlert('Pick the member this '+(kind==='dues'?'is owed by':'came from')+'.');return;}
  if(whoName&&!nd.members.some(m=>m.name===whoName)){gAlert('That member is no longer on the list.');renderTadmin();return;}
  const x={id:taId('$'),kind,who:whoName,cents:c,note,by:taWho(who),byId:who.id,at:Date.now(),status:'pending'};nd.money.push(x);
  taLog(nd,'Recorded '+TA_KIND[kind][1].toLowerCase()+' '+taMoney(c)+(whoName?' · '+whoName:'')+(note?' · '+note:'')+'. Waiting for approval.');
  if(taSave(nd)){TA_FORM.amt='';TA_FORM.note='';gToast('Recorded. A second person has to approve it.');renderTadmin();}});};
  $('taRec').onclick=recd;$('taNote').onkeydown=e=>{if(e.key==='Enter')recd();};}
 const decide=(id,ok)=>act((nd,who)=>{const x=nd.money.find(y=>y.id===id);if(!x||x.status!=='pending'){renderTadmin();return;}
  if(!taCan('approve',who)){gAlert('Only the Treasurer or the Owner approves money.');return;}
  if(x.byId===who.id){gAlert('You recorded this one. Someone else has to '+(ok?'approve':'turn down')+' it.');return;}
  x.status=ok?'approved':'rejected';x.approvedBy=taWho(who);x.approvedAt=Date.now();
  taLog(nd,(ok?'Approved ':'Turned down ')+TA_KIND[x.kind][1].toLowerCase()+' '+taMoney(x.cents)+(x.who?' · '+x.who:'')+', recorded by '+x.by+'.');if(taSave(nd))renderTadmin();});
 box.querySelectorAll('[data-taok]').forEach(b=>b.onclick=()=>decide(b.dataset.taok,true));
 box.querySelectorAll('[data-tano]').forEach(b=>b.onclick=()=>decide(b.dataset.tano,false));
 if($('taPrep'))$('taPrep').onclick=()=>{const b=document.querySelector('.tabs button[data-m="tprep"]');if(b&&b.style.display!=='none')b.click();else setMode('tprep');};
 if($('taLogAll'))$('taLogAll').onclick=()=>{TA_FORM.logAll=true;renderTadmin();};
}
/* A backup from another phone: members, money and the log join by id. An
   entry decided on either phone keeps the decision; this phone's members
   and roles stand where both have them. */
function taMerge(raw){let inc={};try{inc=JSON.parse(raw||'{}')||{};}catch(e){return;}const cur=taAllData();
 Object.keys(inc).forEach(code=>{if(!/^[A-Z0-9]{1,10}-[A-Z0-9]{4}$/.test(code))return;const a=taClean(cur[code]),b=taClean(inc[code]);
  const ids=new Set(a.members.map(m=>m.id));b.members.forEach(m=>{if(!ids.has(m.id)&&m.role!=='owner')a.members.push(m);});
  if(!a.members.some(m=>m.role==='owner')){const o=b.members.find(m=>m.role==='owner');if(o)a.members.push(o);}
  const mi={};a.money.forEach(x=>mi[x.id]=x);b.money.forEach(x=>{const h=mi[x.id];if(!h)a.money.push(x);else if(h.status==='pending'&&x.status!=='pending')Object.assign(h,{status:x.status,approvedBy:x.approvedBy,approvedAt:x.approvedAt});});
  const li=new Set(a.log.map(x=>x.id));b.log.forEach(x=>{if(!li.has(x.id))a.log.push(x);});cur[code]=a;});
 try{localStorage.setItem('gridlock_tadmin',JSON.stringify(cur));}catch(e){}}
