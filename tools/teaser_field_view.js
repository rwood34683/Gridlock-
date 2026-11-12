"use strict";
// Player's field stays ahead of the long scouting cards. No recorded data moves.
const start = "<!-- player-field-view:begin -->", end = "<!-- player-field-view:end -->";
const block = `${start}
<style>
body.player-field-view .fieldbox{display:flex;justify-content:center}
body.player-field-view #field{max-height:var(--player-field-height,60dvh);max-width:100%;width:100%;height:auto}
</style>
<script>
(function(){
 if(EDITION!=='player')return;
 const field=document.querySelector('.fieldbox'),pits=document.getElementById('topScout'),panel=document.getElementById('panel');
 // Keep the existing pickers, ratings and notes together below the field.
 panel.before(pits);
 const fit=()=>{if(MODE!=='tally'&&MODE!=='scout')return;const top=field.getBoundingClientRect().top+scrollY;
  document.body.style.setProperty('--player-field-height',Math.max(160,innerHeight-top-28)+'px');};
 const mode=setMode;
 setMode=function(m){mode(m);document.body.classList.toggle('player-field-view',MODE==='tally'||MODE==='scout');
  if(MODE==='tally'||MODE==='scout'){fit();window.scrollTo(0,0);}};
 addEventListener('resize',fit);
 if(typeof ResizeObserver==='function'){const watch=new ResizeObserver(fit);watch.observe(document.querySelector('header'));watch.observe(document.querySelector('.tabs'));}
 document.body.classList.toggle('player-field-view',MODE==='tally'||MODE==='scout');fit();
})();
</script>
${end}`;
exports.apply=(src,kind)=>{
 if(kind!=="player")return src;
 // Never animate the page between a field tap, its picker and the next tap.
 // Includes the coachplay picker when that generator is present. Cancelling
 // an in-flight smooth scroll still allows a queued compositor frame to move
 // the page; make these app-initiated jumps instant from the start instead.
 src=src.replaceAll("behavior:'smooth'","behavior:'instant'");
 const a=src.indexOf(start),b=src.indexOf(end);
 return a>=0&&b>a?src.slice(0,a)+block+src.slice(b+end.length):src.replace("</body>",block+"\n</body>");
};
