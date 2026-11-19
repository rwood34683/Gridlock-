type Settings={get(name:string):string|undefined};
type ClientFactory=(url:string,key:string,options:any)=>any;
// This endpoint cannot grant plans or edit a coach's season. Identity is taken
// only from verified Auth; the database transaction decides the single winner.
export function createHuntHandler(settings:Settings,createClient:ClientFactory){
  const url=settings.get("SUPABASE_URL")||"",key=settings.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const origins=(settings.get("ADMIN_ALLOWED_ORIGINS")||"").split(",").map(x=>x.trim()).filter(Boolean);
  return async(req:Request):Promise<Response>=>{
    const origin=req.headers.get("origin"),allowed=!origin||origins.includes(origin);
    const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin","X-Content-Type-Options":"nosniff"};
    if(origin&&allowed){headers["Access-Control-Allow-Origin"]=origin;headers["Access-Control-Allow-Headers"]="authorization, apikey, content-type";headers["Access-Control-Allow-Methods"]="POST, OPTIONS";}
    const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(!url||!key||!origins.length)return reply({ok:false,said:"The prize round is not available."},503);
    if(!allowed)return reply({ok:false},403);
    if(req.method==="OPTIONS")return origin?new Response(null,{status:204,headers}):reply({ok:false},403);
    if(req.method!=="POST")return reply({ok:false},405);
    const token=(req.headers.get("authorization")||"").match(/^Bearer ([^\s]+)$/i)?.[1];
    if(!token||token.length>16384)return reply({ok:false,said:"Sign in online first."},401);
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type")||""))return reply({ok:false},415);
    try{
      const reader=req.body?.getReader();if(!reader)return reply({ok:false},400);
      let size=0;const chunks:Uint8Array[]=[];
      try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>1024){await reader.cancel();return reply({ok:false},413);}chunks.push(p.value);}}finally{reader.releaseLock();}
      const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
      let b;try{b=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{return reply({ok:false},400);}
      if(!b||typeof b!=="object"||Array.isArray(b)||!["status","answer","claim"].includes(b.action))return reply({ok:false},400);
      const keys=b.action==="status"?["action"]:b.action==="answer"?["action","round","stage","choice"]:["action","round","code","team"];
      if(Object.keys(b).some(k=>!keys.includes(k))||Object.keys(b).length!==keys.length)return reply({ok:false},400);
      if(b.action!=="status"&&(typeof b.round!=="string"||!b.round||b.round.length>80))return reply({ok:false},400);
      if(b.action==="answer"&&(!Number.isInteger(b.stage)||b.stage<0||b.stage>3||!Number.isInteger(b.choice)||b.choice<0||b.choice>2))return reply({ok:false},400);
      if(b.action==="claim"&&(typeof b.code!=="string"||b.code.length>80||typeof b.team!=="string"||b.team.length>80||!b.team.trim()||/[\u0000-\u001f\u007f]/.test(b.team)))return reply({ok:false,said:"Enter the code and your team name."},400);
      const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const who=await db.auth.getUser(token),verified=await db.auth.getClaims(token),user=who.data?.user,claims=verified.data?.claims;
      if(who.error||verified.error||!user?.id||claims?.sub!==user.id)return reply({ok:false,said:"Sign in online first."},401);
      if(!user.email_confirmed_at)return reply({ok:false,said:"Confirm your email first."},403);
      if((user.factors||[]).some((f:any)=>f.status==="verified")&&claims.aal!=="aal2")return reply({ok:false,said:"Verify your authenticator first."},403);
      const r=await db.rpc("gridlock_hunt_request",{p_user:user.id,p_action:b.action,p_round:b.round??null,p_stage:b.stage??null,p_choice:b.choice??null,p_code:b.code??null,p_team:b.team?.trim()??null});
      if(r.error||!r.data)return reply({ok:false,said:"No claim confirmed. Try again later."},502);
      return reply(r.data);
    }catch{return reply({ok:false,said:"No claim confirmed. Try again later."},502);}
  };
}
