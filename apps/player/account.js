/* Gridlock Player account entry. Network and tokens stay in the cloud adapter.
 * No preview/demo codes, Coach season reads, permission cache or automatic sends. */
(function(){
  'use strict';
  const api=window.gridlockCloud,root=document.getElementById('app'),notice=document.getElementById('message');
  let user=null,teams=[],canCreate=false,available=false,selected=null,view='signin',busy=false,epoch=0,checking=false,refreshSerial=0,invite=null;
  const roles=['owner','coach','player'];
  function el(tag,attrs={},...children){
    const n=document.createElement(tag);
    for(const [k,v]of Object.entries(attrs)){
      if(k.startsWith('on'))n.addEventListener(k.slice(2),v);
      else if(k==='className')n.className=v;
      else if(k==='disabled')n.disabled=!!v;
      else n.setAttribute(k,String(v));
    }
    for(const child of children.flat())if(child!=null)n.append(typeof child==='string'?document.createTextNode(child):child);
    return n;
  }
  const p=(text,cls='')=>el('p',{className:cls},text);
  const button=(text,fn,primary=false)=>el('button',{type:'button',className:primary?'primary':'',onclick:fn},text);
  function field(label,name,type='text',opts={}){
    const id='field-'+name, input=el('input',{id,name,type,required:true,...opts});
    return [el('label',{for:id},label),input];
  }
  function message(text){notice.textContent=text||'';}
  function clearTeams(){teams=[];canCreate=false;available=false;selected=null;invite=null;}
  function currentId(){return api.session()?.user?.id||null;}
  function setBusy(value){busy=value;root.setAttribute('aria-busy',String(value));for(const b of root.querySelectorAll('button'))if(!b.hasAttribute('data-signout'))b.disabled=value;}
  function failed(r){return r?.said||(r?.offline?'You need a connection for account and team changes.':'That request was not confirmed. Try again.');}
  function switchView(next){++epoch;api.cancelRecovery();view=next;setBusy(false);message('');render();}
  function focusTitle(){const h=root.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
  function signedOut(){++epoch;user=null;clearTeams();view='signin';checking=false;setBusy(false);render();}
  function signOut(){
    if(!window.confirm('Sign out of Gridlock?'))return;
    api.signOut();signedOut();message('Signed out.');focusTitle();
  }
  async function act(work,success){
    if(busy)return;
    const e=++epoch;setBusy(true);message('Working…');
    try{
      const r=await work();if(e!==epoch)return;
      if(!r?.ok){message(failed(r));return;}
      message('');await success(r);
    }catch{if(e===epoch)message('That request was not confirmed. Check your connection and try again.');}
    finally{if(e===epoch)setBusy(false);}
  }
  function form(fields,submit,fn){
    const f=el('form',{},...fields,el('div',{className:'row'},el('button',{type:'submit',className:'primary'},submit)));
    f.addEventListener('submit',e=>{e.preventDefault();if(!busy&&f.reportValidity())fn(new FormData(f),f);});return f;
  }
  function validTeams(r){
    return r&&Array.isArray(r.teams)&&typeof r.can_create==='boolean'&&r.teams.every(t=>
      t&&typeof t.id==='string'&&typeof t.name==='string'&&roles.includes(t.role)&&Number.isSafeInteger(t.revision)&&t.revision>0&&
      Array.isArray(t.members)&&t.members.every(m=>m&&typeof m.user_id==='string'&&typeof m.name==='string'&&roles.includes(m.role))&&
      t.members.some(m=>m.user_id===user.id&&m.role===t.role));
  }
  async function refresh(force=false){
    const session=api.session();
    if(!session){signedOut();return;}
    if((checking&&!force)||(!force&&busy)||view==='password')return;
    if(!user||user.id!==session.user.id){++epoch;user=session.user;clearTeams();view='teams';render();}
    const e=epoch,id=user.id,ticket=++refreshSerial;checking=true;
    try{
      const r=await api.teamAccess('list');
      if(e!==epoch||ticket!==refreshSerial||currentId()!==id)return;
      if(!r.ok||r.user?.id!==id||!validTeams(r.result)){
        clearTeams();render();message(r.ok?'The team reply could not be checked. Try again.':failed(r));return;
      }
      const next=r.result;
      const changed=!available||JSON.stringify(teams)!==JSON.stringify(next.teams)||canCreate!==next.can_create;
      teams=next.teams;canCreate=next.can_create;available=true;
      if(selected&&!teams.some(t=>t.id===selected)){selected=null;invite=null;message('Your team access changed. Choose a current team or ask the owner for help.');}
      if(invite&&!teams.some(t=>t.id===invite.team_id&&t.role==='owner'))invite=null;
      if(changed||force)render();
    }catch{if(e===epoch&&ticket===refreshSerial){clearTeams();render();message('Connect to check your team access.');}}
    finally{if(ticket===refreshSerial)checking=false;}
  }
  function auth(){
    const signup=view==='signup',reset=view==='reset',password=view==='password';
    const title=password?'Choose a new password':reset?'Reset your password':signup?'Create your player account':'Sign in to Gridlock Player';
    const fields=password?[]:field('Email','email','email',{autocomplete:'username',maxlength:254});
    if(!reset)fields.push(...field(password?'New password':'Password','password','password',{autocomplete:signup||password?'new-password':'current-password',...(signup||password?{minlength:8}:{}),maxlength:1024}));
    if(signup||password)fields.push(...field('Confirm password','confirm','password',{autocomplete:'new-password',minlength:8,maxlength:1024}));
    root.append(el('h1',{},title),p(password?'Set the password for your verified account.':reset?'Use the email for your Gridlock account.':'Use your own account. Your team code comes next.'));
    if(signup)root.append(p('Player accounts are in a private pilot. Use the email your team owner arranged with Gridlock.','warning'));
    root.append(form(fields,password?'Save password':reset?'Email reset link':signup?'Create account':'Sign in',(data,f)=>{
      const email=String(data.get('email')||'').trim(),pass=String(data.get('password')||'');
      if((signup||password)&&pass!==data.get('confirm')){message('The passwords do not match.');return;}
      act(()=>{
        for(const input of f.querySelectorAll('input[type=password]'))input.value='';
        return password?api.updatePassword(pass):reset?api.sendReset(email):signup?api.signUp(email,pass):api.signIn(email,pass);
      },async r=>{
        if(reset){message('If that account can receive a reset email, a link is on its way. Use the newest email.');return;}
        if(r.pendingConfirmation){view='signin';render();message('Check your email and confirm the account, then sign in here.');return;}
        if(!api.session()){message('Sign in with your confirmed Gridlock account.');return;}
        user=api.session().user;clearTeams();view='teams';render();await refresh(true);focusTitle();
      });
    }));
    const links=el('div',{className:'row'});
    if(view==='signin')links.append(button('Create account',()=>switchView('signup')),button('Forgot password?',()=>switchView('reset')));
    else links.append(button('Back to sign in',()=>switchView('signin')));
    root.append(links);
  }
  async function mutation(action,input,confirmText){
    const t=teams.find(x=>x.id===selected);if(!t)return;
    if(confirmText&&!window.confirm(confirmText))return;
    await act(()=>api.teamAccess(action,{team_id:t.id,revision:t.revision,...input}),async r=>{
      invite=action==='invite'?{...r.result.invite,team_id:t.id}:null;
      await refresh(true);
      message(action==='leave'?'You left the team.':action==='invite'?'Code ready. Share it privately with one person.':'Team updated.');
    });
  }
  function teamCard(t){
    const box=el('section',{className:'card','aria-label':'Team membership'},el('h2',{},t.name),p('Your role: '+t.role));
    box.append(p('Your account is connected to this team. Player tools and shared team data are coming soon.','muted'));
    const list=el('ul',{'aria-label':'Team members'});
    for(const m of t.members){
      const row=el('li',{},el('strong',{},m.name),p(m.role));
      if(t.role==='owner'&&m.user_id!==user.id){
        const select=el('select',{'aria-label':'Role for '+m.name},el('option',{value:'player'},'Player'),el('option',{value:'coach'},'Coach'));select.value=m.role;
        row.append(el('div',{className:'row'},select,button('Save role for '+m.name,()=>mutation('role',{user_id:m.user_id,role:select.value},'Change '+m.name+' to '+select.value+'?')),
          button('Remove '+m.name,()=>mutation('remove',{user_id:m.user_id},'Remove '+m.name+' from '+t.name+'?')),
          button('Make '+m.name+' the owner',()=>mutation('transfer',{user_id:m.user_id},'Make '+m.name+' the owner? You will become a coach, and unused join codes will stop working.'))));
      }
      list.append(row);
    }
    box.append(list);
    if(t.role==='owner'){
      const role=el('select',{'aria-label':'Invitation role'},el('option',{value:'player'},'Player'),el('option',{value:'coach'},'Coach'));
      box.append(el('h2',{},'Invite one person'),p('Each code works once and expires in seven days.'),el('div',{className:'row'},role,button('Create join code',()=>mutation('invite',{role:role.value}),true)),button('Review join codes',()=>reviewInvites(t)));
      if(invite?.team_id===t.id){
        const code=invite.code;
        box.append(el('section',{'aria-label':'New join code'},p('Share this '+invite.role+' code privately. It is shown only now.'),el('code',{},code),button('Copy code',async()=>{
          try{await navigator.clipboard.writeText(code);message('Code copied.');}catch{message('Select the code and copy it.');}
        })));
      }
    }else box.append(button('Leave team',()=>mutation('leave',{},'Leave '+t.name+'? Your Coach season stays saved.')));
    return box;
  }
  async function reviewInvites(t){
    await act(()=>api.teamAccess('invites',{team_id:t.id}),r=>{
      const list=el('section',{className:'card','aria-label':'Join codes'},el('h2',{},'Join codes'));
      for(const i of r.result.invites||[]){
        const state=i.revoked?'Revoked':i.used?'Used':Date.parse(i.expires_at)<=Date.now()?'Expired':'Ready';
        const row=el('div',{},p(i.role+' · '+state+' · expires '+new Date(i.expires_at).toLocaleDateString()));
        if(state==='Ready')row.append(button('Revoke code '+i.id.slice(0,8),()=>mutation('revoke',{invite_id:i.id},'Stop this unused join code?')));
        list.append(row);
      }
      if(!(r.result.invites||[]).length)list.append(p('No join codes yet.'));
      document.getElementById('invites')?.remove();list.id='invites';root.append(list);
    });
  }
  function membership(){
    root.append(el('h1',{},'Your teams'),p(user.email||'Signed in'),p('Join with the code your team owner gave you.'));
    const out=button('Sign out',signOut);out.setAttribute('data-signout','');
    root.append(el('div',{className:'row'},button('Refresh team access',()=>refresh(true)),out));
    if(!available){root.append(p('Team access needs to be confirmed online. Refresh to check, or ask your team owner for help.','warning'));return;}
    if(teams.length){
      const list=el('div',{className:'row','aria-label':'Choose team'});
      for(const t of teams)list.append(button(t.name+' · '+t.role,()=>{selected=t.id;invite=null;render();}));root.append(list);
      const current=teams.find(t=>t.id===selected);if(current)root.append(teamCard(current));
    }
    root.append(form([el('h2',{},'Join a team'),...field('Your name','display_name','text',{autocomplete:'name',maxlength:80}),...field('Team code','code','text',{autocomplete:'off',maxlength:64,spellcheck:'false',autocapitalize:'characters'})],'Join team',data=>act(()=>api.teamAccess('join',{display_name:String(data.get('display_name')).trim(),code:String(data.get('code')).trim()}),async r=>{
      selected=r.result.team?.id||null;invite=null;await refresh(true);message('You joined the team.');focusTitle();
    })));
    if(canCreate){
      let requestId=crypto.randomUUID();
      root.append(form([el('h2',{},'Create your team'),...field('Team name','team_name','text',{maxlength:80}),...field('Your name','owner_name','text',{autocomplete:'name',maxlength:80})],'Create team',data=>act(()=>api.teamAccess('create',{name:String(data.get('team_name')).trim(),display_name:String(data.get('owner_name')).trim(),request_id:requestId}),async r=>{
        requestId=crypto.randomUUID();selected=r.result.team?.id||null;await refresh(true);message('Team created. Make a join code to invite a player.');
      })));
    }
  }
  function render(){root.replaceChildren();if(view==='teams'&&user){membership();root.append(button('Your devices',()=>api.manageDevices()));}else auth();setBusy(busy);}
  async function boot(){
    for(const [label,key]of [['Privacy','privacyUrl'],['Support','supportUrl']]){
      try{const u=new URL(window.GRIDLOCK_CLOUD?.[key]);if(u.protocol==='https:'&&!u.username&&!u.password)document.getElementById('help').append(el('a',{href:u.href,target:'_blank',rel:'noopener noreferrer'},label));}catch{}
    }
    if(!api){root.replaceChildren(el('h1',{},'Player sign-in is not enabled here yet.'),p('Ask your team owner for the Player account link.'));return;}
    if(api.isAuthUrl(location.href)){
      root.replaceChildren(el('h1',{},'Checking your email link…'));
      const e=++epoch,r=await api.handleAuthUrl(location.href);if(e!==epoch)return;
      if(r?.ok&&r.recovery){view='password';render();return;}
      render();message(r?.ok&&r.confirmed?'Email confirmed. Sign in to join your team.':failed(r));return;
    }
    render();if(api.session())await refresh(true);
  }
  window.addEventListener('storage',()=>{
    if(api&&currentId()!==(user?.id||null)){signedOut();if(api.session())refresh(true);}
  });
  window.addEventListener('gridlock-security',()=>{if(user&&!api.securityReady())signedOut();});
  window.addEventListener('focus',()=>{if(user)refresh();});
  document.addEventListener('visibilitychange',()=>{if(user&&document.visibilityState==='visible')refresh();});
  setInterval(()=>{if(user&&document.visibilityState==='visible')refresh();},30000);
  boot().catch(()=>{root.replaceChildren(el('h1',{},'Your account could not be opened.'));message('Check your connection, then reload.');});
})();
