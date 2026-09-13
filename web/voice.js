/* Scout dictation controller. A finalized transcript is evidence, not a score.
 * Recognition and drafts are transient. Only completed event rows are saved. */
"use strict";
const _voiceUI = {phase:"idle",partial:"",status:"",draft:"",draftScope:"",generation:0,session:null,
  availability:null,checking:false,editId:"",edit:null};
const voiceKinds = {out:"Eliminated",move:"Position / move",hit:"Hit reported",note:"Observation"};
function voiceContext(){
  const v=S.voice || {}, side=v.side === "left" ? "left" : "right", pit=pitOf(side);
  return {side,team:v.team || (pit.named ? pit.name : "Unidentified opponent"),player:v.player || "auto",
    layout:S.layoutKey,m:S.matchId,pt:S.point || 1,language:v.language || "en-US"};
}
function voiceScope(c=voiceContext()){
  return JSON.stringify([c.side,c.team,c.player,c.layout,c.m,c.pt,c.language]);
}
function voicePlayers(team){
  const players=(profileOf(team).players || []).map(p=>({key:arrivalPlayerKey(p),name:p.name || "",num:p.num}));
  for(const e of S.voiceEvents || []) if(e.team===team && e.player && !players.some(p=>p.key===e.player)){
    const num=e.player.startsWith("number:") ? e.player.slice(7) : "";
    players.push({key:e.player,name:e.playerName==="#"+num ? "" : e.playerName || "",num});
  }
  return players;
}
function voicePlayerLabel(p){ return [p.num!==undefined && p.num!=="" ? "#"+p.num : "",p.name].filter(Boolean).join(" ") || p.key; }
function voiceBunkers(layout){
  return (LAYOUTS[layout] || {bunkers:[]}).bunkers.map(b=>({id:b.id,name:b.n,
    aliases:[b.id,b.n,(S.bunkerCalls[layout] || {})[b.id] || ""].filter(Boolean)}));
}
function voiceOptions(c){
  const players=voicePlayers(c.team);
  return {players,bunkers:voiceBunkers(c.layout),selectedPlayer:players.find(p=>p.key===c.player) || null};
}
function updateVoiceLive(){
  const status=document.getElementById("voice-status"), partial=document.getElementById("voice-partial"), live=document.getElementById("voice-live");
  if(status) status.textContent=_voiceUI.status || "Ready to record";
  if(partial) partial.textContent=_voiceUI.partial || (_voiceUI.phase==="listening" ? "Speak a player’s name or number, then what happened." : "Completed phrases are saved automatically.");
  if(live) live.dataset.listening=String(!!_voiceUI.session);
}
function stopVoiceSession(message){
  _voiceUI.generation++;
  _voiceUI.session=null; _voiceUI.phase="idle"; _voiceUI.partial="";
  if(message) _voiceUI.status=message;
  if(window.gridlockSpeech) Promise.resolve(window.gridlockSpeech.stop()).catch(()=>{});
}
function guardVoiceSession(){
  if(_voiceUI.session && (!S.entered || S.tab!=="scout" || S.scoutTab!=="voice" || voiceScope()!==_voiceUI.session.scope)){
    stopVoiceSession("Listening stopped because the player, team, point, field or screen changed.");
  }
}
window.setVoice = patch => {
  stopVoiceSession("Ready to record");
  _voiceUI.editId=""; _voiceUI.edit=null;
  S.voice={...(S.voice || {}),...patch};
  if("team" in patch && !("player" in patch)) S.voice.player="auto";
  if("side" in patch){ if(!("team" in patch)) S.voice.team=""; if(!("player" in patch)) S.voice.player="auto"; }
  save(S); render();
};
function checkVoiceAvailability(){
  if(_voiceUI.checking || _voiceUI.availability) return;
  _voiceUI.checking=true;
  Promise.resolve().then(()=>window.gridlockSpeech ? window.gridlockSpeech.available() : {available:false,engine:"none"})
    .catch(()=>({available:false,engine:"none"})).then(result=>{
      _voiceUI.availability=result; _voiceUI.checking=false;
      if(S.tab==="scout" && S.scoutTab==="voice") render();
    });
}
window.startVoiceLog = async () => {
  if(_voiceUI.session) return;
  const context=voiceContext(), token=++_voiceUI.generation;
  const session={context,scope:voiceScope(context),options:voiceOptions(context),token,seen:new Set()};
  _voiceUI.session=session; _voiceUI.phase="starting"; _voiceUI.status="Starting microphone…"; _voiceUI.partial="";
  _voiceUI.editId=""; _voiceUI.edit=null;
  const active=()=>_voiceUI.session===session && _voiceUI.generation===token && voiceScope()===session.scope
    && S.entered && S.tab==="scout" && S.scoutTab==="voice" && !document.hidden;
  const fail=message=>{
    if(!active()) return;
    stopVoiceSession(String(message || "Dictation could not start. You can record text below.")); render();
  };
  render();
  try{
    if(!window.gridlockSpeech) throw new Error("Dictation is unavailable here. Use Record text below.");
    await window.gridlockSpeech.start({language:context.language,
      onPartial:text=>{if(active()){_voiceUI.partial=String(text || "");updateVoiceLive();}},
      onFinal:(text,id)=>{
        if(!active() || !String(text || "").trim()) return;
        // The engine assigns a stable ID per utterance. Identical words in a
        // later utterance remain separate observations.
        if(id!==undefined && id!==null){ const key=String(id); if(session.seen.has(key)) return; session.seen.add(key); }
        _voiceUI.partial="";
        const count=saveVoiceText(text,"speech",session.context,session.options);
        _voiceUI.status=count ? `${count} event${count===1?"":"s"} saved · listening` : "Listening…";
        render();
      },
      onState:state=>{
        if(!active()) return;
        if(state==="idle" || state==="error"){
          stopVoiceSession(state==="error" ? "Dictation stopped. Retry or record text below." : "Listening stopped. Completed events are saved."); render();
        } else { _voiceUI.phase=state; _voiceUI.status=state==="listening" ? "Listening · speak naturally, pause between events" : "Starting microphone…"; updateVoiceLive(); }
      },onError:fail});
  }catch(error){ fail(error.message || error); }
};
window.stopVoiceLog = () => { stopVoiceSession("Listening stopped. Completed events are saved."); render(); };
document.addEventListener("visibilitychange",()=>{
  if(document.hidden && _voiceUI.session){stopVoiceSession("Listening stopped while the app was in the background.");render();}
});
window.addEventListener("pagehide",()=>{if(_voiceUI.session) stopVoiceSession("Listening stopped.");});
function linkVoiceSighting(event){
  const previous=(S.arrivalSightings || []).find(s=>s.voiceId===event.id);
  S.arrivalSightings=(S.arrivalSightings || []).filter(s=>s.voiceId!==event.id);
  if(event.review || !event.player || !event.bunker || !voiceBunkers(event.layout).some(b=>b.id===event.bunker)) return;
  const same=s=>s.team===event.team && s.player===event.player && s.layout===event.layout && s.m===event.m && s.pt===event.pt;
  const scoped=S.arrivalSightings.filter(same).sort((a,b)=>a.seq-b.seq || a.at-b.at);
  const linked={id:"voice-"+event.id,voiceId:event.id,team:event.team,player:event.player,layout:event.layout,
    m:event.m,pt:event.pt,bunker:event.bunker,seq:1,at:event.at};
  if(previous && same(previous)){
    linked.seq=previous.seq; S.arrivalSightings.push(linked); return;
  }
  // Reassigning an earlier observation must not move it after that player's
  // later sightings. Renumber only this context, preserving every observation.
  const insertion=scoped.findIndex(s=>s.at>event.at);
  scoped.splice(insertion<0 ? scoped.length : insertion,0,linked);
  scoped.forEach((s,index)=>{s.seq=index+1;});
  S.arrivalSightings.push(linked);
}
function saveVoiceText(text,source,context=voiceContext(),options=voiceOptions(context)){
  const transcript=String(text || "").trim().slice(0,12000);
  if(!transcript) return 0;
  const parsed=window.GridlockVoiceParser.parse(transcript,options), at=Date.now();
  const rows=parsed.map((p,index)=>({id:`v-${at.toString(36)}-${Math.random().toString(36).slice(2,10)}-${index}`,
    text:transcript,originalText:transcript,team:context.team,player:p.player || "",playerName:p.playerName || "",
    kind:p.kind,bunker:p.bunker || "",bunkerName:p.bunkerName || "",review:!!p.review,reason:p.reason || "",
    side:context.side,layout:context.layout,m:context.m,pt:context.pt,at,source}));
  S.voiceEvents=[...(S.voiceEvents || []),...rows]; rows.forEach(linkVoiceSighting); save(S);
  return rows.length;
}
window.editVoiceDraft = text => { _voiceUI.draft=text; _voiceUI.draftScope=voiceScope(); };
window.clearVoiceDraft = () => { _voiceUI.draft="";_voiceUI.draftScope="";render(); };
window.recordVoiceText = () => {
  const input=document.getElementById("voice-manual"), text=input ? input.value : _voiceUI.draft;
  if(!text.trim()){ _voiceUI.status="Enter what happened to a player first.";updateVoiceLive();return; }
  if(_voiceUI.draftScope && _voiceUI.draftScope!==voiceScope()){
    _voiceUI.status="This draft belongs to an earlier selection. Clear it or edit it for this team, player, field, match and point before recording.";updateVoiceLive();return;
  }
  const count=saveVoiceText(text,"typed"); _voiceUI.draft="";_voiceUI.draftScope="";
  _voiceUI.status=`${count} event${count===1?"":"s"} saved${_voiceUI.session?" · listening":""}`;render();
};
window.editVoiceEvent = id => {
  const event=(S.voiceEvents || []).find(e=>e.id===id); if(!event) return;
  stopVoiceSession("Listening paused for correction.");
  _voiceUI.editId=id;_voiceUI.edit={...event};render();
};
window.changeVoiceEdit = (field,value) => {if(_voiceUI.edit && ["player","kind","bunker","text"].includes(field)) _voiceUI.edit[field]=value;};
window.cancelVoiceEdit = () => {_voiceUI.editId="";_voiceUI.edit=null;render();};
window.saveVoiceCorrection = () => {
  const before=(S.voiceEvents || []).find(e=>e.id===_voiceUI.editId); if(!before || !_voiceUI.edit) return;
  const value=key=>(document.getElementById("voice-edit-"+key) || {}).value ?? _voiceUI.edit[key];
  const player=value("player"),kind=value("kind"),bunker=value("bunker"),text=String(value("text")).trim();
  const selected=voicePlayers(before.team).find(p=>p.key===player), place=voiceBunkers(before.layout).find(b=>b.id===bunker);
  if(!text || !selected || !voiceKinds[kind] || (kind==="move" && !place)){
    _voiceUI.status="Choose a player and enter a transcript. A position / move also needs a bunker.";updateVoiceLive();return;
  }
  const event={...before,text,originalText:before.originalText || before.text,player,playerName:selected.name || "#"+selected.num,
    kind,bunker:place ? place.id : "",bunkerName:place ? place.name : "",review:false,reason:"",corrected:true};
  S.voiceEvents=S.voiceEvents.map(e=>e.id===event.id ? event : e);linkVoiceSighting(event);save(S);
  _voiceUI.editId="";_voiceUI.edit=null;_voiceUI.status="Correction saved.";render();
};
window.undoVoiceEvent = id => {
  S.voiceEvents=(S.voiceEvents || []).filter(e=>e.id!==id);
  S.arrivalSightings=(S.arrivalSightings || []).filter(s=>s.voiceId!==id);
  if(_voiceUI.editId===id){_voiceUI.editId="";_voiceUI.edit=null;}
  save(S);_voiceUI.status="Event removed.";render();
};
window.voiceManagePlayers = () => {
  const c=voiceContext();stopVoiceSession("Listening stopped.");
  S.arrival={...(S.arrival || {}),side:c.side,team:c.team,player:c.player==="auto"?"number:1":c.player};
  S.scoutTab="arrival";save(S);render();
};
window.openVoiceArrival = id => {
  const e=(S.voiceEvents || []).find(e=>e.id===id);if(!e) return;
  stopVoiceSession("Listening stopped."); S.layoutKey=e.layout;
  S.arrival={side:e.side || "right",startEnd:e.side || "right",team:e.team,player:e.player,matchId:e.m,point:e.pt,layout:e.layout,destination:e.bunker};
  S.scoutTab="arrival";save(S);render();
};
function voiceEditor(event){
  const edit=_voiceUI.edit, players=voicePlayers(event.team);
  return `<div class="voice-editor"><div class="voice-grid">
    <div class="fld"><label for="voice-edit-player">Player</label><select id="voice-edit-player" onchange="changeVoiceEdit('player',this.value)"><option value="">Choose player</option>${players.map(p=>`<option value="${esc(p.key)}"${p.key===edit.player?' selected':''}>${esc(voicePlayerLabel(p))}</option>`).join("")}</select></div>
    <div class="fld"><label for="voice-edit-kind">What happened</label><select id="voice-edit-kind" onchange="changeVoiceEdit('kind',this.value)">${Object.entries(voiceKinds).map(([k,n])=>`<option value="${k}"${edit.kind===k?' selected':''}>${n}</option>`).join("")}</select></div>
    <div class="fld"><label for="voice-edit-bunker">Bunker</label><select id="voice-edit-bunker" onchange="changeVoiceEdit('bunker',this.value)"><option value="">No confirmed location</option>${voiceBunkers(event.layout).map(b=>`<option value="${esc(b.id)}"${b.id===edit.bunker?' selected':''}>${esc(b.name)} · ${esc(b.id)}</option>`).join("")}</select></div></div>
    <div class="fld"><label for="voice-edit-text">Transcript</label><textarea id="voice-edit-text" maxlength="12000" oninput="changeVoiceEdit('text',this.value)">${esc(edit.text)}</textarea></div>
    <div class="voice-tools"><button class="btn" onclick="saveVoiceCorrection()">Save correction</button><button class="btn btn--quiet" onclick="cancelVoiceEdit()">Cancel correction</button></div></div>`;
}
function scoutVoice(){
  checkVoiceAvailability();
  const c=voiceContext(), players=voicePlayers(c.team), teams=[...new Set([c.team,...arrivalTeamNames()])];
  const events=(S.voiceEvents || []).filter(e=>e.team===c.team && e.layout===c.layout && e.m===c.m && e.pt===c.pt
    && (c.player==="auto" || e.player===c.player || e.review && !e.player)).slice().reverse();
  const available=_voiceUI.availability, active=!!_voiceUI.session;
  return sec("Voice log",`<p class="lede">Say who you’re watching and what happens. Each completed phrase is saved to their history with the current team, match and point.</p>
    <p class="aid"><b>A scouting record, not a prediction.</b> Unclear events are saved for review. Confirmed locations join the route viewer; match scores stay under the coach’s control.</p>
    <div class="voice-grid">
      <div class="fld"><label for="voice-side">Their starting end</label><select id="voice-side" onchange="setVoice({side:this.value,team:voiceContext().team})"><option value="right"${c.side==='right'?' selected':''}>Right end → moving left</option><option value="left"${c.side==='left'?' selected':''}>Left end → moving right</option></select></div>
      <div class="fld"><label for="voice-team">Opponent team</label><select id="voice-team" onchange="setVoice({team:this.value})">${teams.map(t=>`<option value="${esc(t)}"${t===c.team?' selected':''}>${esc(t)}</option>`).join("")}</select></div>
      <div class="fld"><label for="voice-player">Player being watched</label><select id="voice-player" onchange="setVoice({player:this.value})"><option value="auto"${c.player==='auto'?' selected':''}>Detect name or jersey number</option>${players.map(p=>`<option value="${esc(p.key)}"${c.player===p.key?' selected':''}>${esc(voicePlayerLabel(p))}</option>`).join("")}</select></div>
    </div><div class="voice-tools"><button class="btn btn--quiet" onclick="voiceManagePlayers()">Manage team &amp; players</button></div>
    <p class="note">${esc(curLayout().name)} · ${esc(matchLabel(curMatch()) || "Current match")} · Point ${c.pt} · English (US)</p>
    <p class="note">Example: “Number seven is out.” For locations, use a unique bunker call from your field. Pause briefly between observations. Select one player to say “he moved to…” without repeating their name.</p>
    <details><summary>Bunker calls for this field</summary><p class="note">Shared names need an exact ID or a unique team call. Set your own calls in Playbook.</p><p class="note">${voiceBunkers(c.layout).map(b=>esc([...new Set([b.id,...b.aliases])].join(" / "))).join(" · ")}</p></details>
    <div class="voice-live" id="voice-live" data-listening="${active}"><p id="voice-status" class="voice-status" role="status">${esc(_voiceUI.status || "Ready to record")}</p><p id="voice-partial" class="voice-partial" aria-live="off">${esc(_voiceUI.partial || "Completed phrases are saved automatically.")}</p>
      <div class="voice-tools">${active ? `<button class="btn" onclick="stopVoiceLog()">Stop listening</button>` : `<button class="btn" onclick="startVoiceLog()"${!available || !available.available?' disabled':''}>Start listening</button>`}</div>
      <p class="note">${!available ? "Checking dictation support…" : !available.available ? "Dictation is unavailable in this browser or device. You can still record text below." : available.engine==='native' ? "Uses your device’s speech recognition service. Native transcripts appear when each phrase is finalized." : "Uses this browser’s speech recognition service; live words appear here before they are finalized."}</p>
      <p class="note">Starting asks for microphone access. Your device or browser’s speech provider may process audio online and require internet. GRIDLOCK saves text locally and does not keep audio. Leaving this screen or changing context stops listening.</p>
    </div>
    <div class="fld"><label for="voice-manual">Or type an observation</label><textarea id="voice-manual" maxlength="12000" placeholder="Number seven is out" oninput="editVoiceDraft(this.value)">${esc(_voiceUI.draft)}</textarea></div>
    ${_voiceUI.draft && _voiceUI.draftScope!==voiceScope() ? `<p class="note">This draft is from an earlier selection. Clear it or edit it for the current selection before recording.</p><button class="btn btn--quiet" onclick="clearVoiceDraft()">Clear draft</button>`:''}
    <button class="btn" onclick="recordVoiceText()">Record text</button>
    <h3>Point ${c.pt} · ${events.length} recorded event${events.length===1?'':'s'}</h3>
    <p class="note">Showing this team, player, field, match and point. Full backups include this history.</p>
    ${events.length ? events.map(e=>`<article class="voice-event${e.review?' voice-event--review':''}" data-voice-id="${esc(e.id)}">
      <div class="voice-meta">${esc(new Date(e.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}))} · ${e.source==='speech'?'Spoken':'Typed'}${e.corrected?' · Corrected':''}${e.review?' · Needs review':''}</div>
      <b>${esc(e.playerName || e.player.replace(/^number:/,'#').replace(/^name:/,'') || "Unassigned player")} · ${voiceKinds[e.kind]}${e.bunker ? ' · '+esc(e.bunkerName)+' ('+esc(e.bunker)+')' : ''}</b>
      <p class="voice-transcript">${esc(e.text)}</p>${e.review?`<p class="note">${esc(e.reason || "Check the player and event before using this as a confirmed observation.")}</p>`:''}
      ${e.originalText && e.originalText!==e.text ? `<details><summary>Original transcript</summary><p class="voice-transcript">${esc(e.originalText)}</p></details>`:''}
      <div class="voice-tools"><button class="btn btn--quiet" onclick="editVoiceEvent(${esc(JSON.stringify(e.id))})">Edit event</button><button class="btn btn--quiet" onclick="undoVoiceEvent(${esc(JSON.stringify(e.id))})">Undo event</button>${!e.review && e.player && e.bunker ? `<button class="btn btn--quiet" onclick="openVoiceArrival(${esc(JSON.stringify(e.id))})">View route</button>`:''}</div>
      ${_voiceUI.editId===e.id ? voiceEditor(e) : ''}</article>`).join("") : `<div class="empty">No observations recorded for this selection yet.</div>`}`);
}
