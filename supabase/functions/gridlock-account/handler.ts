type Settings = {get(name:string):string|undefined};
type ClientFactory = (url:string,key:string,options:any)=>any;
export function createAccountHandler(settings:Settings,createClient:ClientFactory,now=()=>Date.now()){
  const url=settings.get("SUPABASE_URL")||"", key=settings.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const origins=(settings.get("ADMIN_ALLOWED_ORIGINS")||"").split(",").map(v=>v.trim()).filter(Boolean);
  return async(req:Request):Promise<Response>=>{
    const origin=req.headers.get("origin"), allowed=!origin||origins.includes(origin);
    const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin","X-Content-Type-Options":"nosniff"};
    if(origin&&allowed){headers["Access-Control-Allow-Origin"]=origin;headers["Access-Control-Allow-Headers"]="authorization, apikey, content-type";headers["Access-Control-Allow-Methods"]="POST, OPTIONS";}
    const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(!url||!key||!origins.length)return reply({error:"Account service is not configured."},503);
    if(!allowed)return reply({error:"Origin not allowed."},403);
    if(req.method==="OPTIONS")return origin?new Response(null,{status:204,headers}):reply({error:"Origin required."},403);
    if(req.method!=="POST")return reply({error:"Use POST."},405);
    const token=(req.headers.get("authorization")||"").match(/^Bearer ([^\s]+)$/i)?.[1];
    if(!token||token.length>16384)return reply({error:"Sign in again."},401);
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type")||""))return reply({error:"Use JSON."},415);
    try{
      const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const who=await db.auth.getUser(token), verified=await db.auth.getClaims(token);
      const user=who.data?.user, claims=verified.data?.claims;
      if(who.error||verified.error||!user?.id||claims?.sub!==user.id)return reply({error:"Sign in again."},401);
      if(!user.email_confirmed_at)return reply({error:"Confirm your email first."},403);
      const recent=Array.isArray(claims.amr)&&claims.amr.some((m:any)=>m.method==="password"&&Number.isFinite(m.timestamp)&&m.timestamp*1000<=now()+30000&&m.timestamp*1000>=now()-300000);
      if(!recent)return reply({error:"Enter your password again before deleting your account."},403);
      if((user.factors||[]).some((f:any)=>f.status==="verified")&&claims.aal!=="aal2")return reply({error:"Verify your authenticator first."},403);
      const reader=req.body?.getReader();if(!reader)return reply({error:"Confirmation required."},400);
      let length=0;const chunks:Uint8Array[]=[];
      try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>512){await reader.cancel();return reply({error:"Request too large."},413);}chunks.push(part.value);}}finally{reader.releaseLock();}
      const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      let body;try{body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{return reply({error:"Invalid confirmation."},400);}
      if(!body||Array.isArray(body)||Object.keys(body).length!==1||body.confirmation!=="DELETE MY ACCOUNT")return reply({error:"Type DELETE MY ACCOUNT to confirm."},400);
      // Identity comes exclusively from the verified session. No target ID is accepted.
      const result=await db.auth.admin.deleteUser(user.id,false);
      if(result.error)return reply({error:"Your account could not be deleted. Nothing has been confirmed; try again."},502);
      return reply({ok:true});
    }catch{return reply({error:"Account service could not be reached."},502);}
  };
}
