/* Shared account verification UI. Only cloud builds include this file.
 * Secrets/codes stay in this dialog's memory and go only to Supabase Auth. */
(function(){
  'use strict';
  let active=null;
  function el(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n;}
  window.gridlockSecurityPrompt=function(bridge,manage=false){
    if(active)return active;
    active=new Promise(resolve=>{
      const dialog=el('dialog'),title=el('h2','Secure your account'),body=el('div'),note=el('p'),actions=el('div');
      const style=el('style');style.textContent='dialog.gridlock-security{background:#0b0c0d;color:#fff;border:1px solid #e5342f;border-radius:14px;padding:24px;max-width:460px;width:calc(100% - 32px);max-height:90dvh;overflow:auto;font:16px/1.5 system-ui}dialog.gridlock-security::backdrop{background:#000d}.gridlock-security *{box-sizing:border-box;overflow-wrap:anywhere}.gridlock-security button,.gridlock-security input,.gridlock-security select{font:inherit;min-height:48px;width:100%;margin:8px 0;padding:10px;color:#fff;background:#191b1d;border:1px solid #e5342f;border-radius:8px}.gridlock-security button:focus-visible,.gridlock-security input:focus-visible,.gridlock-security select:focus-visible{outline:3px solid white}.gridlock-security p,.gridlock-security label{color:#ff6159}.gridlock-security img{display:block;width:220px;max-width:100%;background:white;padding:8px}.gridlock-security code{display:block;user-select:all}';
      document.head.append(style);dialog.className='gridlock-security';dialog.style.boxSizing='border-box';dialog.setAttribute('aria-labelledby','gridlock-security-title');title.id='gridlock-security-title';note.setAttribute('role','status');
      dialog.append(title,body,note,actions);document.body.append(dialog);
      let finished=false,busy=false,factor=null;
      function done(ok){if(finished)return;finished=true;dialog.close();dialog.remove();style.remove();resolve(ok);}
      function btn(text,fn,container=body){const b=el('button',text);b.type='button';b.onclick=()=>run(fn);container.append(b);return b;}
      function input(label,type='text'){const id='security-'+body.querySelectorAll('input').length,l=el('label',label),v=el('input');l.htmlFor=id;v.id=id;v.type=type;body.append(l,v);return v;}
      async function run(fn){if(busy||finished)return;busy=true;note.textContent='Checking…';dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{await fn();}catch{if(!finished)note.textContent='Could not verify this step. Check your connection and try again.';}
        finally{busy=false;if(!finished)dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}}
      function message(r){note.textContent=r?.said||'That request was not confirmed. Try again.';}
      async function show(){
        const r=await bridge.status();if(finished)return;if(r.ok&&!manage){done(true);return;}
        body.replaceChildren();note.textContent='';
        if(r.code==='mfa_required'){
          title.textContent='Two-factor sign-in';
          body.append(el('p','Use an authenticator app. All coaches, owners, admins and players need this extra check.'));
          const f=await bridge.factors();if(finished)return;if(!f.ok){message(f);btn('Try again',show);return;}
          const verified=f.factors.filter(x=>x.factor_type==='totp'&&x.status==='verified');
          if(verified.length){
            const label=el('label','Authenticator'),select=el('select');select.id='security-factor';label.htmlFor=select.id;
            verified.forEach(x=>{const o=el('option',x.friendly_name||'Authenticator');o.value=x.id;select.append(o);});body.append(label,select);factor=select.value;select.onchange=()=>factor=select.value;codeInput();
          }else btn('Set up authenticator',async()=>{
            const e=await bridge.enroll();if(finished)return;if(!e.ok){message(e);return;}
            factor=e.id;body.replaceChildren(el('p','Scan this code in your authenticator, or enter the setup key. Keep the key somewhere private so you can recover access.'));
            const img=el('img');img.alt='Authenticator setup QR code';img.src=e.qr;body.append(img,el('code',e.secret));codeInput();
          });
          body.append(el('p','Lost your authenticator? Use your saved authenticator backup or contact support. A password-reset email does not remove two-factor protection.'));
        }else if(r.code==='device_required'||(r.ok&&manage&&r.required)){
          title.textContent='Your devices';body.append(el('p','Keep up to three signed-in browsers for your phone, tablet and laptop. Another browser or private window uses another place.'));
          const name=input('Name this device');name.maxLength=60;name.value=/Mobi|Android/i.test(navigator.userAgent)?'My phone or tablet':'My computer';
          if(!r.ok&&((r.devices||[]).length<3||r.reuseCurrent))btn('Use this device',async()=>{const a=await bridge.claim(name.value);if(a.ok)done(true);else message(a);});
          for(const d of r.devices||[]){
            body.append(el('p',d.label+(d.current?' · This device':'')));
            if(!r.ok)btn('Replace '+d.label,async()=>{if(!confirm('Replace '+d.label+'? Its cloud access will stop. Saved seasons stay on that device.'))return;const a=await bridge.claim(name.value,d.id);if(a.ok)done(true);else message(a);});
            else btn(d.current?'Sign out this device':'Remove '+d.label,async()=>{if(!confirm('Remove '+d.label+' from your approved devices? Its saved season will stay.'))return;const a=await bridge.revoke(d.id);if(d.current){done(false);return;}if(a.ok)await show();else message(a);});
          }
          if(r.ok)btn('Done',()=>done(true));
        }else if(r.ok&&!r.required){body.append(el('p','Device protection is prepared but has not been enabled yet.'));btn('Done',()=>done(true));}
        else{message(r);btn('Try again',show);}
      }
      function codeInput(){
        const code=input('Six-digit authenticator code');code.autocomplete='one-time-code';code.inputMode='numeric';code.maxLength=6;code.pattern='[0-9]{6}';
        const verify=async()=>{const value=code.value;code.value='';if(!/^\d{6}$/.test(value)){note.textContent='Enter the six-digit code from your authenticator.';return;}const v=await bridge.verify(factor,value);if(finished)return;if(v.ok)await show();else message(v);};
        btn('Verify',verify);code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run(verify);}};code.focus();
      }
      btn(manage?'Close':'Cancel sign-in',()=>done(false),actions);
      dialog.oncancel=e=>{e.preventDefault();if(!busy)done(false);};
      dialog.showModal();run(show);
      bridge.cancel=()=>done(false);
    }).finally(()=>{active=null;});
    return active;
  };
})();
