export const OFFER = 'coach-day-v1';
export const AMOUNT = 1997;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const STRIPE_API_VERSION = '2026-10-28.endive';
const encoder = new TextEncoder();
export function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function exactWebUrl(value, local = false) {
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || u.pathname !== '/' ||
      (u.protocol !== 'https:' && !(local && u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname)))) return null;
    return u;
  } catch { return null; }
}
// Used in receipts/tests; the database independently computes the same cutoff
// with PostgreSQL's America/New_York zone, never by adding 24 hours.
export function easternMidnight(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('Invalid payment time');
  const format = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
  const day = (ms) => format.format(new Date(ms));
  const start = seconds * 1000, date = day(start);
  let low = start, high = start + 26 * 3600000;
  while (high - low > 1) { const mid = Math.floor((low+high)/2); if(day(mid)===date) low=mid; else high=mid; }
  return high;
}
export async function signAccess(privateJwk, {user, plan, source, expires, audience, mode}, now = Date.now()) {
  if (!UUID.test(user) || !['free','program'].includes(plan) || !['test','live'].includes(mode))
    throw new Error('Invalid access');
  const issued = Math.floor(now/1000);
  const end = plan === 'free' ? issued+60 : Math.min(issued+86400, expires ? Math.floor(expires/1000) : issued+86400);
  if (!Number.isFinite(end) || end<=issued) throw new Error('Invalid access expiry');
  const header = base64url(encoder.encode(JSON.stringify({alg:'ES256',typ:'JWT'})));
  const payload = base64url(encoder.encode(JSON.stringify({
    iss:'gridlock-account',aud:audience,sub:user,plan,source,mode,iat:issued,exp:end,
    pass_exp:expires ? Math.floor(expires/1000) : null
  })));
  const key = await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const message = header+'.'+payload;
  return message+'.'+base64url(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(message))));
}
export async function readJson(req, limit=1024) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||'')) throw new Error('json');
  const reader=req.body?.getReader(); if(!reader)throw new Error('body');
  const chunks=[];let size=0;
  try { for(;;) { const p=await reader.read();if(p.done)break;size+=p.value.byteLength;
    if(size>limit){await reader.cancel();throw new Error('size');}chunks.push(p.value); } }
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function readRaw(req, limit=262144) {
  const reader=req.body?.getReader();if(!reader)throw new Error('body');
  let size=0;const chunks=[];
  try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;
    if(size>limit){await reader.cancel();throw new Error('size');}chunks.push(p.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const p of chunks){bytes.set(p,offset);offset+=p.length;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function metadata(order, owner) {
  return {gridlock_offer:OFFER,gridlock_order:order,gridlock_owner:owner};
}
export function boundMetadata(value) {
  const m=value?.metadata;
  return m?.gridlock_offer===OFFER && UUID.test(m.gridlock_order||'') && UUID.test(m.gridlock_owner||'') ? m : null;
}
export async function rpc(db,name,args) {
  const r=await db.rpc(name,args);if(r.error)throw new Error('Payment storage unavailable');return r.data;
}
