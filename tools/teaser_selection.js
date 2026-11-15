/* Player's selected opponents, not the team joined with a code.
 * Generated into Player by teaser_rules.js. Never clear saved observations.
 * The optional sheet transition also supports the coach-style Player Tally.
 */
(function(){
  if(EDITION!=='player')return;
  const selected=side=>side==='L'?Lsel:Rsel;
  const sheet=()=>typeof SH!=='undefined'&&SH&&Array.isArray(SH.matches)?SH:null;
  const current=()=>{const s=sheet();return s&&s.matches.find(m=>m.id===s.matchId);};
  const has=side=>selected(side).ti>=0||(side==='R'&&!!(current()||{}).vs);
  // A fresh confirmation is needed if the selection, sheet or draft changed.
  const identity=side=>JSON.stringify([MODE,layoutKey,side,selected(side),side==='R'?sheet():null,
    typeof cpDraft==='undefined'?null:cpDraft,typeof cpTheirPick==='undefined'?null:cpTheirPick]);
  function clear(side){
    if(side==='R'){
      const s=sheet();
      if(s){
        const m=current(),used=m&&['rows','results','theirs'].some(k=>(s[k]||[]).some(r=>r.m===m.id));
        const blank={id:used||!m?cpId('m'):m.id,at:Date.now(),vs:'',lay:layoutKey};
        const next={...s,matchId:blank.id,point:1,matches:[...s.matches.filter(x=>used||!m||x.id!==m.id),blank]};
        const text=JSON.stringify(next);
        try{localStorage.setItem(CP_KEY,text);if(localStorage.getItem(CP_KEY)!==text)throw Error('not saved');}
        catch(e){gToast('Could not save the change. Your team is still selected. Try again.');return false;}
        SH=next;
        cpStep='tell';cpDraft=null;cpPickFor='';cpRead='';cpTheirPick=[];cpTheirHist=[];cpGame=null;
      }
      Rsel={di:0,ti:-1};
      if(typeof tallySel!=='undefined')tallySel=null;
      if(typeof tallyLast!=='undefined')tallyLast=null;
      if(typeof TSCOPE!=='undefined')TSCOPE=null;
    }else Lsel={di:0,ti:-1};
    draw();gToast('Team cleared. Saved matches and scouting notes are kept.');
    const focus=MODE==='scout'?document.querySelector('#side'+side+' .pickSel'):document.querySelector('[data-cp="opp"]')||document.querySelector('.tabs button.on');
    if(focus)focus.focus();return true;
  }
  function control(side){
    const row=document.createElement('div');row.className='row';row.style.cssText='gap:6px;flex-wrap:wrap;margin:6px 0';
    const b=document.createElement('button');b.type='button';b.className='ld';b.dataset.clearTeam=side;
    b.textContent='Clear team';b.setAttribute('aria-label',side==='L'?'Clear left team':'Clear opponent team');
    const cancel=document.createElement('button');cancel.type='button';cancel.className='ld';cancel.textContent='Cancel';cancel.hidden=true;
    const note=document.createElement('span');note.style.cssText='font-size:12px;color:#ff5a52;flex-basis:100%';note.textContent='Saved matches and scouting notes stay.';note.hidden=true;
    let armed=null;
    const reset=()=>{armed=null;b.textContent='Clear team';cancel.hidden=true;note.hidden=true;};
    b.onclick=()=>{const now=identity(side);if(armed===now){reset();clear(side);}else{armed=now;b.textContent='Tap again to clear';cancel.hidden=false;note.hidden=false;}};
    cancel.onclick=()=>{reset();b.focus();};row.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();reset();b.focus();}};
    row.append(b,cancel,note);return row;
  }
  const sideDraw=renderSide;
  renderSide=function(side,sel){sideDraw(side,sel);const box=document.getElementById('side'+side),pick=box&&box.querySelector('.pickSel');if(pick&&has(side))pick.after(control(side));};
  const tallyDraw=typeof cpTally==='function'?cpTally:renderTally;
  const tally=()=>{tallyDraw();if(MODE==='tally'&&has('R'))document.getElementById('panel').prepend(control('R'));};
  if(typeof cpTally==='function')cpTally=tally;else renderTally=tally;
  if(MODE==='tally'||MODE==='scout')draw();
})();
