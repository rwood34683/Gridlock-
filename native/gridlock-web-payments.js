/* Web-only payment access. No Stripe key, card data or browser-created grant.
 * A signed receipt lets a coach finish the paid day without a signal.
 * Server checks remain authoritative for cloud writes and new purchases. */
(function () {
  "use strict";
  const cfg = window.GRIDLOCK_CLOUD, settings = cfg && cfg.payments;
  if (!settings || !["test","live"].includes(settings.mode) ||
      window.Capacitor?.isNativePlatform?.()) return;
  const jwk = settings.verificationKey;
  if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256" || jwk.d ||
      !/^[A-Za-z0-9_-]{43}$/.test(jwk.x) || !/^[A-Za-z0-9_-]{43}$/.test(jwk.y)) return;
  let grant = null, attempt = 0, buying = false, expiryTimer = null;
  let lastWall = Date.now(), lastTick = performance.now(), highWater = lastWall;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const keyFor = uid => "grindx.web.pass.v1:" + cfg.url + ":" + location.origin + ":" + settings.mode + ":" + uid;
  const user = () => window.gridlockCloud?.session()?.user?.id || null;
  function clock() {
    const wall = Date.now(), tick = performance.now();
    highWater = Math.max(highWater + Math.max(0,tick-lastTick), wall);
    lastTick = tick;
    // Refuse a backwards device clock, rather than extending a paid day.
    const backwards = wall < lastWall - 60000; lastWall = Math.max(lastWall,wall);
    return backwards ? Infinity : highWater;
  }
  function announce() { window.dispatchEvent(new CustomEvent("gridlock-payment-access")); }
  function clear() { ++attempt; grant = null; clearTimeout(expiryTimer); expiryTimer = null; }
  function current(uid) {
    if (!grant || grant.sub !== uid || user() !== uid || clock() >= grant.exp*1000) return null;
    return {plan:grant.plan,source:grant.source,expires:grant.pass_exp ? grant.pass_exp*1000 : grant.exp*1000};
  }
  function unpack(s) {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) throw Error("encoding");
    return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")), c=>c.charCodeAt(0));
  }
  async function verify(receipt, uid) {
    if (typeof receipt !== "string" || receipt.length>4096 || !uuid.test(uid)) throw Error("receipt");
    const parts=receipt.split("."); if(parts.length!==3)throw Error("parts");
    const decode = s => JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(unpack(s)));
    const h=decode(parts[0]), p=decode(parts[1]);
    if (h.alg!=="ES256" || h.typ!=="JWT" || Object.keys(h).some(k=>!["alg","typ"].includes(k))) throw Error("header");
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,unpack(parts[2]),
      new TextEncoder().encode(parts[0]+"."+parts[1]))) throw Error("signature");
    const now=clock()/1000;
    if(p.iss!=="gridlock-account" || p.aud!==location.origin || p.sub!==uid || p.mode!==settings.mode ||
      !["free","program"].includes(p.plan) || !["none","beta","existing","day-pass"].includes(p.source) ||
      !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp) ||
      p.iat>now+60 || p.exp<=now || p.exp<=p.iat || p.exp-p.iat>86400 ||
      (p.pass_exp!==null && (!Number.isSafeInteger(p.pass_exp) || p.pass_exp<p.exp)) ||
      (p.source==="day-pass" && !p.pass_exp)) throw Error("claims");
    return p;
  }
  async function refresh(uid) {
    const ticket=++attempt;
    if(!uuid.test(uid) || user()!==uid) { grant=null; return {ok:false}; }
    const same=()=>ticket===attempt && user()===uid;
    let result;
    try { result=await window.gridlockCloud.webPaymentRequest("access"); }
    catch { result={ok:false,offline:true}; }
    if(!same())return {ok:false};
    let receipt=result?.ok && result.user?.id===uid ? result.receipt : null;
    if(!receipt && result?.offline) { try {receipt=localStorage.getItem(keyFor(uid));}catch{} }
    try {
      const verified=await verify(receipt,uid); if(!same())return {ok:false};
      grant=verified;
      if(result?.ok)try {localStorage.setItem(keyFor(uid),receipt);}catch{}
      clearTimeout(expiryTimer);
      expiryTimer=setTimeout(()=>{grant=null;announce();},Math.max(1,verified.exp*1000-clock()));
      announce(); return {ok:true,...current(uid)};
    } catch {
      if(!same())return {ok:false};
      grant=null;
      // A refused/invalid online answer cannot fall back to an old paid copy.
      if(!result?.offline)try{localStorage.removeItem(keyFor(uid));}catch{}
      announce();
      return {ok:false,said:result?.offline ? "Go online once to check your pass. Your saved season is safe." :
        "Access could not be checked. Try again with a signal."};
    }
  }
  async function checkout(uid) {
    if(buying || !uuid.test(uid) || user()!==uid)return {ok:false,said:"Sign in and check your access first."};
    buying=true; const ticket=attempt;
    try {
      const r=await window.gridlockCloud.webPaymentRequest("checkout");
      if(ticket!==attempt || user()!==uid)return {ok:false,said:"Your account changed. Nothing was opened."};
      if(!r?.ok)return {ok:false,said:r?.said || "Checkout could not be opened. If you were charged, contact support before paying again."};
      if(r.alreadyActive || r.pending){await refresh(uid);return {ok:true,said:r.pending ?
        "Your payment is being checked. Do not pay again. Use Check access in a moment." : "Your access is ready."};}
      const url=new URL(r.url);
      if(url.protocol!=="https:" || url.hostname!=="checkout.stripe.com" || url.username || url.password)throw Error("destination");
      location.assign(url.href); return {ok:true};
    }catch{return {ok:false,said:"Checkout could not be opened. Your season is safe."};}
    finally{buying=false;}
  }
  window.gridlockWebPayments={current,refresh,checkout,clear,mode:settings.mode};
  window.addEventListener("storage",e=>{if(e.key==="grindx.cloud.session"){clear();announce();}});
  window.addEventListener("focus",()=>{const uid=user();if(uid)refresh(uid);});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){const uid=user();if(uid)refresh(uid);}});
  setInterval(()=>{if(document.visibilityState==="visible"){const uid=user();if(uid)refresh(uid);}},300000);
})();
